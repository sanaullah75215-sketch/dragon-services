import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { storage } from '../storage';
import type { InsertSytheVouch } from '@shared/schema';
import crypto from 'crypto';

const SYTHE_THREAD_URL = 'https://www.sythe.org/threads/4326552/osrs-services-vouchers/';
const SYTHE_THREAD_RSS_URL = 'https://www.sythe.org/threads/4326552/index.rss';
const SYTHE_VOUCH_CHANNEL_ID = '1414374807734190102';
const SCRAPE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const FLARESOLVERR_URL = process.env.FLARESOLVERR_URL || 'http://flaresolverr:8191';

interface ParsedVouch {
  postId: string;
  authorUsername: string;
  authorProfileUrl: string | null;
  vouchContent: string;
  postUrl: string;
  postedAt: Date | null;
}

// Method 1: FlareSolverr — uses real Chrome browser to bypass CloudFlare
async function tryFlareSolverr(): Promise<ParsedVouch[]> {
  try {
    console.log('[SytheScraper] Trying FlareSolverr...');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(`${FLARESOLVERR_URL}/v1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cmd: 'request.get',
        url: SYTHE_THREAD_URL,
        maxTimeout: 55000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.log(`[SytheScraper] FlareSolverr: HTTP ${response.status}`);
      return [];
    }

    const data = await response.json() as any;

    if (data.status !== 'ok' || !data.solution?.response) {
      console.log(`[SytheScraper] FlareSolverr: Bad response — ${data.message || data.status}`);
      return [];
    }

    const html = data.solution.response as string;

    if (html.length < 500) {
      console.log('[SytheScraper] FlareSolverr: Response too short, likely blocked');
      return [];
    }

    console.log(`[SytheScraper] FlareSolverr: Got ${html.length} chars ✅`);
    return parseXenForoHtml(html);

  } catch (error) {
    const msg = (error as Error).message;
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch')) {
      console.log('[SytheScraper] FlareSolverr: Not reachable (container may be starting up)');
    } else {
      console.log('[SytheScraper] FlareSolverr error:', msg);
    }
    return [];
  }
}

// Method 2: RSS feed (sometimes works)
async function tryRssFeed(): Promise<ParsedVouch[]> {
  const vouches: ParsedVouch[] = [];
  const rssUrls = [
    SYTHE_THREAD_RSS_URL,
    'https://www.sythe.org/threads/osrs-services-vouchers.4326552/index.rss',
  ];

  for (const rssUrl of rssUrls) {
    try {
      console.log(`[SytheScraper] Trying RSS: ${rssUrl}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Feedfetcher-Google; +http://www.google.com/feedfetcher.html)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) { console.log(`[SytheScraper] RSS ${response.status}`); continue; }

      const xml = await response.text();
      if (xml.toLowerCase().includes('cloudflare') || xml.toLowerCase().includes('just a moment')) {
        console.log('[SytheScraper] RSS: CF blocked'); continue;
      }

      const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
      let match;
      while ((match = itemPattern.exec(xml)) !== null) {
        const itemContent = match[1];
        const guidMatch = itemContent.match(/<guid[^>]*>([^<]+)<\/guid>/i) || itemContent.match(/<link>([^<]+)<\/link>/i);
        if (!guidMatch) continue;
        const postIdMatch = guidMatch[1].match(/post-(\d+)|#post=(\d+)|post=(\d+)/i);
        const postId = postIdMatch ? (postIdMatch[1] || postIdMatch[2] || postIdMatch[3]) : null;
        if (!postId) continue;
        const authorMatch = itemContent.match(/<dc:creator>([^<]+)<\/dc:creator>/i) || itemContent.match(/<author>([^<]+)<\/author>/i);
        const authorUsername = authorMatch ? authorMatch[1].trim() : 'Unknown';
        const contentMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) || itemContent.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i);
        let vouchContent = '';
        if (contentMatch) {
          vouchContent = contentMatch[1]
            .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'")
            .replace(/\n{3,}/g, '\n\n').trim();
        }
        if (!vouchContent || vouchContent.length < 10) continue;
        const dateMatch = itemContent.match(/<pubDate>([^<]+)<\/pubDate>/i);
        const postedAt = dateMatch ? new Date(dateMatch[1]) : null;
        const linkMatch = itemContent.match(/<link>([^<]+)<\/link>/i);
        const postUrl = linkMatch ? linkMatch[1] : `${SYTHE_THREAD_URL}post-${postId}`;
        vouches.push({ postId, authorUsername, authorProfileUrl: null, vouchContent: vouchContent.substring(0, 2000), postUrl, postedAt });
      }
      if (vouches.length > 0) {
        console.log(`[SytheScraper] RSS: Found ${vouches.length} vouches`);
        return vouches;
      }
    } catch (error) {
      console.log(`[SytheScraper] RSS error:`, (error as Error).message);
    }
  }
  return vouches;
}

// Parse XenForo 2.x HTML to extract posts
function parseXenForoHtml(html: string): ParsedVouch[] {
  const vouches: ParsedVouch[] = [];

  // XenForo 2.x: <article class="message ..." data-author="Username" data-content="post-XXXXXX">
  const articlePattern = /<article[^>]*data-author="([^"]+)"[^>]*data-content="[^"]*post-(\d+)"[^>]*>([\s\S]*?)<\/article>/gi;
  let match;

  while ((match = articlePattern.exec(html)) !== null) {
    const authorUsername = match[1];
    const postId = match[2];
    const articleHtml = match[3];

    // Find the message body — bbWrapper div contains the actual post text
    const bbMatch = articleHtml.match(/<div[^>]*class="[^"]*bbWrapper[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (!bbMatch) continue;

    const vouchContent = bbMatch[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (vouchContent.length < 10) continue;

    // Try to get post date
    const dateMatch = articleHtml.match(/<time[^>]*datetime="([^"]+)"[^>]*>/i);
    const postedAt = dateMatch ? new Date(dateMatch[1]) : null;

    vouches.push({
      postId,
      authorUsername,
      authorProfileUrl: `https://www.sythe.org/members/${authorUsername.toLowerCase().replace(/\s+/g, '-')}/`,
      vouchContent: vouchContent.substring(0, 2000),
      postUrl: `${SYTHE_THREAD_URL}post-${postId}`,
      postedAt,
    });
  }

  if (vouches.length > 0) {
    console.log(`[SytheScraper] HTML parser: Found ${vouches.length} posts`);
  } else {
    console.log('[SytheScraper] HTML parser: No posts found (thread structure may differ)');
  }

  return vouches;
}

export async function scrapeSytheVouches(): Promise<ParsedVouch[]> {
  // FlareSolverr first (real Chrome browser, bypasses CloudFlare)
  let vouches = await tryFlareSolverr();
  if (vouches.length > 0) return vouches;

  // RSS fallback
  vouches = await tryRssFeed();
  if (vouches.length > 0) return vouches;

  console.log('[SytheScraper] All methods failed. Use !sythevouch to post manually.');
  return [];
}

export async function processNewVouches(client: Client): Promise<number> {
  let newVouchCount = 0;

  try {
    const scrapedVouches = await scrapeSytheVouches();

    if (scrapedVouches.length === 0) {
      return 0;
    }

    const channel = await client.channels.fetch(SYTHE_VOUCH_CHANNEL_ID) as TextChannel | null;
    if (!channel) {
      console.error(`[SytheScraper] Could not find vouch channel: ${SYTHE_VOUCH_CHANNEL_ID}`);
      return 0;
    }

    for (const vouch of scrapedVouches) {
      const existing = await storage.getSytheVouch(vouch.postId);
      if (existing) continue;

      const newVouch = await storage.createSytheVouch({
        postId: vouch.postId,
        authorUsername: vouch.authorUsername,
        authorProfileUrl: vouch.authorProfileUrl,
        vouchContent: vouch.vouchContent,
        postUrl: vouch.postUrl,
        postedAt: vouch.postedAt,
        isPosted: false,
      });

      const embed = createSytheVouchEmbed(vouch);

      try {
        const message = await channel.send({ embeds: [embed] });
        await storage.markSytheVouchPosted(newVouch.id, message.id);
        newVouchCount++;
        console.log(`[SytheScraper] ✅ Posted vouch from ${vouch.authorUsername} (post-${vouch.postId})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (sendError) {
        console.error('[SytheScraper] Failed to send embed:', sendError);
      }
    }

    if (newVouchCount > 0) {
      console.log(`[SytheScraper] Posted ${newVouchCount} new vouches total`);
    }
  } catch (error) {
    console.error('[SytheScraper] Error processing vouches:', error);
  }

  return newVouchCount;
}

function createSytheVouchEmbed(vouch: ParsedVouch): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🌟 New Sythe Vouch')
    .setDescription(vouch.vouchContent.length > 4096
      ? vouch.vouchContent.substring(0, 4093) + '...'
      : vouch.vouchContent)
    .addFields({
      name: '👤 From',
      value: vouch.authorProfileUrl
        ? `[${vouch.authorUsername}](${vouch.authorProfileUrl})`
        : vouch.authorUsername,
      inline: true,
    })
    .setTimestamp(vouch.postedAt || new Date())
    .setFooter({
      text: 'Sythe Forum Vouch',
      iconURL: 'https://www.sythe.org/favicon.ico',
    });

  if (vouch.postUrl && vouch.postUrl !== SYTHE_THREAD_URL) {
    embed.addFields({
      name: '🔗 View on Sythe',
      value: `[Open Post](${vouch.postUrl})`,
      inline: true,
    });
  }

  return embed;
}

let scrapeIntervalId: NodeJS.Timeout | null = null;

export function startSytheScraper(client: Client): void {
  stopSytheScraper();

  console.log('[SytheScraper] Starting (FlareSolverr → RSS, 10 min interval)...');

  // Wait 60s on startup to let FlareSolverr container fully boot
  setTimeout(async () => {
    console.log('[SytheScraper] Running initial scrape...');
    await processNewVouches(client);
  }, 60000);

  scrapeIntervalId = setInterval(async () => {
    await processNewVouches(client);
  }, SCRAPE_INTERVAL_MS);
}

export function stopSytheScraper(): void {
  if (scrapeIntervalId) {
    clearInterval(scrapeIntervalId);
    scrapeIntervalId = null;
    console.log('[SytheScraper] Stopped');
  }
}
