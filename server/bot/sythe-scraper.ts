import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { storage } from '../storage';
import type { InsertSytheVouch } from '@shared/schema';
import crypto from 'crypto';

const SYTHE_THREAD_URL = 'https://www.sythe.org/threads/4326552/osrs-services-vouchers/';
const SYTHE_THREAD_RSS_URL = 'https://www.sythe.org/threads/4326552/index.rss';
const SYTHE_VOUCH_CHANNEL_ID = '1414374807734190102';
const SCRAPE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

interface ParsedVouch {
  postId: string;
  authorUsername: string;
  authorProfileUrl: string | null;
  vouchContent: string;
  postUrl: string;
  postedAt: Date | null;
}

// Method 1: Jina Reader API — fetches through Jina's servers, handles anti-bot measures
async function tryJinaReader(): Promise<ParsedVouch[]> {
  const vouches: ParsedVouch[] = [];
  try {
    console.log('[SytheScraper] Trying Jina Reader API...');
    const jinaUrl = `https://r.jina.ai/${SYTHE_THREAD_URL}`;

    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain, text/markdown',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Return-Format': 'markdown',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      console.log(`[SytheScraper] Jina: ${response.status}`);
      return vouches;
    }

    const text = await response.text();

    if (!text || text.length < 100 || text.toLowerCase().includes('cloudflare') || text.toLowerCase().includes('just a moment')) {
      console.log('[SytheScraper] Jina: CloudFlare or empty response');
      return vouches;
    }

    console.log(`[SytheScraper] Jina: Got ${text.length} chars`);

    // Parse the markdown output — look for username patterns and vouch content
    // Jina formats forum posts like: "**Username** wrote:\n\ncontent" or similar
    const lines = text.split('\n');
    let currentAuthor: string | null = null;
    let contentBuffer: string[] = [];

    const flushVouch = () => {
      if (currentAuthor && contentBuffer.length > 0) {
        const content = contentBuffer.join('\n').trim();
        if (content.length >= 10) {
          const postId = 'jina-' + crypto.createHash('md5').update(`${currentAuthor}:${content.substring(0, 100)}`).digest('hex').substring(0, 12);
          vouches.push({
            postId,
            authorUsername: currentAuthor,
            authorProfileUrl: null,
            vouchContent: content.substring(0, 2000),
            postUrl: SYTHE_THREAD_URL,
            postedAt: null,
          });
        }
      }
      contentBuffer = [];
    };

    // Detect author lines — usually bold names or lines that look like "**Name**" or "# Name"
    const authorPatterns = [
      /^\*\*([A-Za-z0-9_\- .]{2,30})\*\*\s*(?:wrote|said|posted|replied)?:?\s*$/i,
      /^#{1,3}\s+([A-Za-z0-9_\- .]{2,30})\s*$/,
      /^>?\s*([A-Za-z0-9_\- .]{2,30})\s+(?:said|wrote):/i,
    ];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (contentBuffer.length > 0) contentBuffer.push('');
        continue;
      }

      let matchedAuthor: string | null = null;
      for (const pattern of authorPatterns) {
        const m = trimmed.match(pattern);
        if (m) { matchedAuthor = m[1].trim(); break; }
      }

      if (matchedAuthor) {
        flushVouch();
        currentAuthor = matchedAuthor;
      } else if (currentAuthor) {
        contentBuffer.push(trimmed);
      }
    }
    flushVouch();

    if (vouches.length > 0) {
      console.log(`[SytheScraper] Jina: Parsed ${vouches.length} potential vouches`);
    } else {
      // Fallback: split by long separator lines and treat each block as a post
      const blocks = text.split(/\n(?:-{3,}|={3,}|\*{3,})\n/);
      for (const block of blocks) {
        const trimmedBlock = block.trim();
        if (trimmedBlock.length < 15) continue;
        // Try to find an author name at the start
        const firstLine = trimmedBlock.split('\n')[0].replace(/[*#>]/g, '').trim();
        const restContent = trimmedBlock.split('\n').slice(1).join('\n').trim();
        if (firstLine.length >= 2 && firstLine.length <= 40 && restContent.length >= 10) {
          const postId = 'jina-' + crypto.createHash('md5').update(`${firstLine}:${restContent.substring(0, 100)}`).digest('hex').substring(0, 12);
          vouches.push({
            postId,
            authorUsername: firstLine,
            authorProfileUrl: null,
            vouchContent: restContent.substring(0, 2000),
            postUrl: SYTHE_THREAD_URL,
            postedAt: null,
          });
        }
      }
      if (vouches.length > 0) {
        console.log(`[SytheScraper] Jina (block fallback): Parsed ${vouches.length} potential vouches`);
      }
    }
  } catch (error) {
    console.log('[SytheScraper] Jina error:', (error as Error).message);
  }
  return vouches;
}

// Method 2: AllOrigins proxy — fetches through their server, returns raw HTML
async function tryAllOrigins(): Promise<ParsedVouch[]> {
  const vouches: ParsedVouch[] = [];
  try {
    console.log('[SytheScraper] Trying AllOrigins proxy...');
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(SYTHE_THREAD_URL)}`;

    const response = await fetch(proxyUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      console.log(`[SytheScraper] AllOrigins: ${response.status}`);
      return vouches;
    }

    const html = await response.text();

    if (!html || html.length < 200 || html.toLowerCase().includes('just a moment') || html.toLowerCase().includes('cloudflare')) {
      console.log('[SytheScraper] AllOrigins: CloudFlare blocked');
      return vouches;
    }

    console.log(`[SytheScraper] AllOrigins: Got ${html.length} chars — parsing HTML`);
    return parseXenForoHtml(html);
  } catch (error) {
    console.log('[SytheScraper] AllOrigins error:', (error as Error).message);
  }
  return vouches;
}

// Method 3: RSS feed
async function tryRssFeed(): Promise<ParsedVouch[]> {
  const vouches: ParsedVouch[] = [];
  const rssUrls = [
    SYTHE_THREAD_RSS_URL,
    'https://www.sythe.org/threads/osrs-services-vouchers.4326552/index.rss',
  ];

  for (const rssUrl of rssUrls) {
    try {
      console.log(`[SytheScraper] Trying RSS: ${rssUrl}`);
      const response = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Feedfetcher-Google; +http://www.google.com/feedfetcher.html)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) { console.log(`[SytheScraper] RSS ${response.status}`); continue; }

      const xml = await response.text();
      if (xml.includes('cloudflare') || xml.includes('challenge')) { console.log('[SytheScraper] RSS: CF blocked'); continue; }

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
          vouchContent = contentMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\n{3,}/g, '\n\n').trim();
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

// Parse XenForo HTML structure for posts
function parseXenForoHtml(html: string): ParsedVouch[] {
  const vouches: ParsedVouch[] = [];

  // XenForo post patterns
  const postPatterns = [
    /<article[^>]*class="[^"]*message[^"]*"[^>]*data-author="([^"]+)"[^>]*>([\s\S]*?)<\/article>/gi,
    /<div[^>]*class="[^"]*bbWrapper[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<blockquote[^>]*class="[^"]*message[^"]*"[^>]*>([\s\S]*?)<\/blockquote>/gi,
  ];

  // Try article-based extraction first (XenForo 2.x)
  const articlePattern = /<article[^>]*class="[^"]*message[^"]*"[^>]*data-author="([^"]+)"[^>]*data-content="[^"]*post-(\d+)"[^>]*>([\s\S]*?)<\/article>/gi;
  let match;
  while ((match = articlePattern.exec(html)) !== null) {
    const authorUsername = match[1];
    const postId = match[2];
    const articleContent = match[3];
    const contentMatch = articleContent.match(/<div[^>]*class="[^"]*bbWrapper[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (!contentMatch) continue;
    const vouchContent = contentMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\n{3,}/g, '\n\n').trim();
    if (vouchContent.length < 10) continue;
    vouches.push({ postId, authorUsername, authorProfileUrl: null, vouchContent: vouchContent.substring(0, 2000), postUrl: `${SYTHE_THREAD_URL}post-${postId}`, postedAt: null });
  }

  if (vouches.length > 0) {
    console.log(`[SytheScraper] HTML: Found ${vouches.length} posts via article pattern`);
  }
  return vouches;
}

export async function scrapeSytheVouches(): Promise<ParsedVouch[]> {
  // Try methods in order: Jina (CloudFlare bypass) → AllOrigins → RSS
  let vouches = await tryJinaReader();
  if (vouches.length > 0) return vouches;

  vouches = await tryAllOrigins();
  if (vouches.length > 0) return vouches;

  vouches = await tryRssFeed();
  if (vouches.length > 0) return vouches;

  console.log('[SytheScraper] All methods blocked. Use !sythevouch to post manually.');
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
        console.log(`[SytheScraper] Posted vouch from ${vouch.authorUsername}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (sendError) {
        console.error('[SytheScraper] Failed to send embed:', sendError);
      }
    }

    if (newVouchCount > 0) {
      console.log(`[SytheScraper] Posted ${newVouchCount} new vouches`);
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

  console.log('[SytheScraper] Starting (Jina → AllOrigins → RSS, 10 min interval)...');

  setTimeout(async () => {
    console.log('[SytheScraper] Running initial scrape...');
    await processNewVouches(client);
  }, 30000);

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
