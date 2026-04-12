import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { storage } from '../storage';
import type { InsertSytheVouch } from '@shared/schema';

const SYTHE_THREAD_URL = 'https://www.sythe.org/threads/4326552/osrs-services-vouchers/';
const SYTHE_THREAD_RSS_URL = 'https://www.sythe.org/threads/4326552/index.rss';
const SYTHE_VOUCH_CHANNEL_ID = '1414374807734190102';
const SCRAPE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface ParsedVouch {
  postId: string;
  authorUsername: string;
  authorProfileUrl: string | null;
  vouchContent: string;
  postUrl: string;
  postedAt: Date | null;
}

async function tryRssFeed(): Promise<ParsedVouch[]> {
  const vouches: ParsedVouch[] = [];
  
  try {
    console.log('[SytheScraper] Trying RSS feed...');
    
    // Try multiple RSS variations
    const rssUrls = [
      SYTHE_THREAD_RSS_URL,
      'https://www.sythe.org/threads/osrs-services-vouchers.4326552/index.rss',
      'https://www.sythe.org/forums/-/index.rss' // Forum-wide RSS
    ];
    
    for (const rssUrl of rssUrls) {
      try {
        const response = await fetch(rssUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Feedfetcher-Google; +http://www.google.com/feedfetcher.html)',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
          }
        });

        if (!response.ok) {
          console.log(`[SytheScraper] RSS ${rssUrl}: ${response.status}`);
          continue;
        }

        const xml = await response.text();
        
        if (xml.includes('cloudflare') || xml.includes('403') || xml.includes('challenge')) {
          console.log(`[SytheScraper] RSS ${rssUrl}: CloudFlare blocked`);
          continue;
        }
        
        // Parse RSS items
        const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
        let match;
        
        while ((match = itemPattern.exec(xml)) !== null) {
          const itemContent = match[1];
          
          // Extract post ID
          const guidMatch = itemContent.match(/<guid[^>]*>([^<]+)<\/guid>/i) ||
                            itemContent.match(/<link>([^<]+)<\/link>/i);
          if (!guidMatch) continue;
          
          const postIdMatch = guidMatch[1].match(/post-(\d+)|#post=(\d+)|post=(\d+)/i);
          const postId = postIdMatch ? (postIdMatch[1] || postIdMatch[2] || postIdMatch[3]) : null;
          if (!postId) continue;
          
          // Extract author
          const authorMatch = itemContent.match(/<dc:creator>([^<]+)<\/dc:creator>/i) ||
                              itemContent.match(/<author>([^<]+)<\/author>/i);
          const authorUsername = authorMatch ? authorMatch[1].trim() : 'Unknown';
          
          // Extract content
          const contentMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) ||
                               itemContent.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i);
          let vouchContent = '';
          
          if (contentMatch) {
            vouchContent = contentMatch[1]
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
          }
          
          if (!vouchContent || vouchContent.length < 10) continue;
          
          // Extract date
          const dateMatch = itemContent.match(/<pubDate>([^<]+)<\/pubDate>/i);
          const postedAt = dateMatch ? new Date(dateMatch[1]) : null;
          
          // Extract link
          const linkMatch = itemContent.match(/<link>([^<]+)<\/link>/i);
          const postUrl = linkMatch ? linkMatch[1] : `${SYTHE_THREAD_URL}post-${postId}`;
          
          vouches.push({
            postId,
            authorUsername,
            authorProfileUrl: null,
            vouchContent: vouchContent.substring(0, 2000),
            postUrl,
            postedAt
          });
        }
        
        if (vouches.length > 0) {
          console.log(`[SytheScraper] Found ${vouches.length} posts via RSS from ${rssUrl}`);
          return vouches;
        }
        
      } catch (error) {
        console.log(`[SytheScraper] RSS ${rssUrl} error:`, error);
        continue;
      }
    }
    
  } catch (error) {
    console.error('[SytheScraper] RSS feed error:', error);
  }
  
  console.log('[SytheScraper] RSS feeds unavailable or blocked');
  return vouches;
}

export async function scrapeSytheVouches(): Promise<ParsedVouch[]> {
  // Only use RSS feed - Sythe blocks all browser automation
  return await tryRssFeed();
}

export async function processNewVouches(client: Client): Promise<number> {
  let newVouchCount = 0;
  
  try {
    const scrapedVouches = await scrapeSytheVouches();
    
    if (scrapedVouches.length === 0) {
      console.log('[SytheScraper] No vouches found (RSS blocked or empty). Use !sythevouch command to post manually.');
      return 0;
    }
    
    const channel = await client.channels.fetch(SYTHE_VOUCH_CHANNEL_ID) as TextChannel | null;
    
    if (!channel) {
      console.error(`[SytheScraper] Could not find vouch channel: ${SYTHE_VOUCH_CHANNEL_ID}`);
      return 0;
    }
    
    for (const vouch of scrapedVouches) {
      const existing = await storage.getSytheVouch(vouch.postId);
      
      if (existing) {
        continue;
      }
      
      const newVouch = await storage.createSytheVouch({
        postId: vouch.postId,
        authorUsername: vouch.authorUsername,
        authorProfileUrl: vouch.authorProfileUrl,
        vouchContent: vouch.vouchContent,
        postUrl: vouch.postUrl,
        postedAt: vouch.postedAt,
        isPosted: false
      });
      
      const embed = createSytheVouchEmbed(vouch);
      
      try {
        const message = await channel.send({ embeds: [embed] });
        await storage.markSytheVouchPosted(newVouch.id, message.id);
        newVouchCount++;
        
        console.log(`[SytheScraper] Posted new vouch from ${vouch.authorUsername} (post-${vouch.postId})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (sendError) {
        console.error(`[SytheScraper] Failed to send vouch embed:`, sendError);
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
    .setDescription(vouch.vouchContent.length > 1024 
      ? vouch.vouchContent.substring(0, 1021) + '...' 
      : vouch.vouchContent)
    .addFields({
      name: '👤 From',
      value: vouch.authorProfileUrl 
        ? `[${vouch.authorUsername}](${vouch.authorProfileUrl})`
        : vouch.authorUsername,
      inline: true
    })
    .setTimestamp(vouch.postedAt || new Date())
    .setFooter({ 
      text: 'Sythe Forum Vouch',
      iconURL: 'https://www.sythe.org/favicon.ico'
    });
  
  if (vouch.postUrl) {
    embed.addFields({
      name: '🔗 View on Sythe',
      value: `[Open Post](${vouch.postUrl})`,
      inline: true
    });
  }
  
  return embed;
}

let scrapeIntervalId: NodeJS.Timeout | null = null;

export function startSytheScraper(client: Client): void {
  stopSytheScraper();
  
  console.log('[SytheScraper] Starting Sythe vouch scraper (RSS-only, 5 minute interval)...');
  console.log('[SytheScraper] Note: If RSS is blocked, use !sythevouch command to post manually.');
  
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
    console.log('[SytheScraper] Stopped Sythe vouch scraper');
  }
}
