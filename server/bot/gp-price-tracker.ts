import type { Client } from 'discord.js';
import { EmbedBuilder, TextChannel } from 'discord.js';
import { storage } from '../storage';

// ── Configurable constants (override via !gpconfig or tracker settings) ────────
export const TRACKER_DEFAULTS = {
  SELL_UNDERCUT:    0.01,   // how much below market we price our sell rate
  BUY_SELL_MARGIN:  0.04,   // gap between our sell and buy rate
  MIN_BUY_RATE:     0.16,   // absolute floor for buy rate
  MAX_BUY_RATE:     0.18,   // absolute ceiling for buy rate
  MIN_SELL_RATE:    0.15,   // sanity floor for sell rate
  MAX_SELL_RATE:    0.50,   // sanity ceiling for sell rate
  CHANGE_THRESHOLD: 0.003,  // skip update if price moved less than this
  CHECK_INTERVAL_MS: 30 * 60 * 1000, // 30 minutes
};

// ── In-memory state ───────────────────────────────────────────────────────────
let lastMarketPrice: number | null = null;
let lastUpdated: Date | null = null;
let trackerInterval: ReturnType<typeof setInterval> | null = null;

// ── Probemas parser ───────────────────────────────────────────────────────────
function parseProbemas(html: string): number | null {
  // Method 1: embedded GraphQL/JSON data — "sellPrice":{"__typename":"Money","currency":"USD","amount":X.XXX
  // The first match is the OSRS gold product (RS3 gold would be much cheaper ~0.03)
  const jsonMatches = [...html.matchAll(/"sellPrice":\{"__typename":"Money","currency":"USD","amount":([\d.]+)/g)]
    .map(m => parseFloat(m[1]))
    .filter(p => p >= 0.10 && p <= 0.60); // OSRS GP range sanity filter

  if (jsonMatches.length > 0) {
    // Use the lowest valid price found
    return Math.min(...jsonMatches);
  }

  // Method 2: displayed price pattern like $0.275<span .../M</span>
  const displayMatch = html.match(/\$([\d.]+)<span[^>]*>\/M<\/span>/);
  if (displayMatch) {
    const price = parseFloat(displayMatch[1]);
    if (price >= 0.10 && price <= 0.60) return price;
  }

  // Method 3: any dollar price in valid OSRS GP range near "/M"
  const nearM = [...html.matchAll(/\$([\d.]+)\s*(?:<[^>]+>)?\s*\/\s*[Mm]/g)]
    .map(m => parseFloat(m[1]))
    .filter(p => p >= 0.10 && p <= 0.60);
  if (nearM.length > 0) return Math.min(...nearM);

  return null;
}

// ── Fetch market price ─────────────────────────────────────────────────────────
async function fetchMarketPrice(): Promise<{ price: number; source: string } | null> {
  const sources = [
    {
      name: 'Probemas',
      url: 'https://www.probemas.com/osrs-gold',
      parse: parseProbemas,
    },
  ];

  for (const src of sources) {
    try {
      const resp = await fetch(src.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!resp.ok) {
        console.log(`[GP Tracker] ${src.name} returned HTTP ${resp.status}`);
        continue;
      }

      const html = await resp.text();
      const price = src.parse(html);
      if (price !== null) {
        console.log(`[GP Tracker] ✅ ${src.name}: $${price.toFixed(4)}/M`);
        return { price, source: src.name };
      }
      console.log(`[GP Tracker] ${src.name}: could not parse price from page`);
    } catch (err: any) {
      console.log(`[GP Tracker] ${src.name} error: ${err.message}`);
    }
  }

  return null;
}

// ── Calculate our rates ────────────────────────────────────────────────────────
export function calculateRates(marketPrice: number, config?: Partial<typeof TRACKER_DEFAULTS>) {
  const cfg = { ...TRACKER_DEFAULTS, ...config };

  let sellRate = Math.round((marketPrice - cfg.SELL_UNDERCUT) * 10000) / 10000;
  sellRate = Math.max(cfg.MIN_SELL_RATE, Math.min(cfg.MAX_SELL_RATE, sellRate));

  let buyRate = Math.round((sellRate - cfg.BUY_SELL_MARGIN) * 10000) / 10000;
  buyRate = Math.max(cfg.MIN_BUY_RATE, Math.min(cfg.MAX_BUY_RATE, buyRate));

  return { sellRate, buyRate };
}

// ── Update GP rates in DB ──────────────────────────────────────────────────────
async function updateRatesInDb(sellRate: number, buyRate: number): Promise<number> {
  const allRates = await storage.getGpRates();
  const active   = allRates.filter(r => r.isActive);
  let updated = 0;

  for (const rate of active) {
    const updates: Record<string, any> = { lastUpdated: new Date() };

    if (rate.methodCategory === 'selling') {
      updates.sellingRate = String(sellRate);
    } else if (rate.methodCategory === 'buying') {
      updates.buyingRate = String(buyRate);
    } else {
      // 'both'
      updates.sellingRate = String(sellRate);
      updates.buyingRate  = String(buyRate);
    }

    await storage.updateGpRate(rate.id, updates);
    updated++;
  }
  return updated;
}

// ── Post price update embed to Discord ────────────────────────────────────────
async function postPriceUpdateEmbed(
  botClient: Client,
  channelId: string,
  marketPrice: number,
  sellRate: number,
  buyRate: number,
  source: string,
  updatedCount: number,
): Promise<void> {
  try {
    const ch = await botClient.channels.fetch(channelId).catch(() => null) as TextChannel | null;
    if (!ch || typeof ch.send !== 'function') return;

    const margin = Math.round((sellRate - buyRate) * 10000) / 10000;
    const embed  = new EmbedBuilder()
      .setTitle('💰 GP Market Price Update')
      .setDescription(`Rates auto-updated from **${source}** — ${updatedCount} payment method(s) refreshed.`)
      .addFields(
        { name: '📊 Market Sell Price',   value: `**$${marketPrice.toFixed(4)}/M**`, inline: true },
        { name: '🟢 Our Sell Rate',       value: `**$${sellRate.toFixed(4)}/M**`,   inline: true },
        { name: '🔴 Our Buy Rate',        value: `**$${buyRate.toFixed(4)}/M**`,    inline: true },
        { name: '📉 Undercut vs Market',  value: `$${(marketPrice - sellRate).toFixed(4)}`,    inline: true },
        { name: '💵 Profit Margin / M',   value: `$${margin.toFixed(4)}`,           inline: true },
        { name: '⏰ Next Auto-Check',     value: 'In ~30 minutes',                  inline: true },
      )
      .setColor(0x00B347)
      .setFooter({ text: '🐲 Dragon Services • Auto GP Price Tracker' })
      .setTimestamp();

    await ch.send({ embeds: [embed] });
  } catch (err: any) {
    console.error('[GP Tracker] Failed to post embed:', err.message);
  }
}

// ── Core run function ──────────────────────────────────────────────────────────
export async function runPriceCheck(botClient?: Client, force = false): Promise<string> {
  const result = await fetchMarketPrice();
  if (!result) {
    return '❌ Could not fetch market price from any source. Existing rates unchanged.';
  }

  const { price: marketPrice, source } = result;

  // Skip if price hasn't moved enough (avoids noisy DB writes)
  if (!force && lastMarketPrice !== null &&
      Math.abs(marketPrice - lastMarketPrice) < TRACKER_DEFAULTS.CHANGE_THRESHOLD) {
    return `ℹ️ Price unchanged ($${marketPrice.toFixed(4)}/M). No update needed.`;
  }

  const { sellRate, buyRate } = calculateRates(marketPrice);
  const updatedCount = await updateRatesInDb(sellRate, buyRate);

  lastMarketPrice = marketPrice;
  lastUpdated     = new Date();

  // Persist last-seen price to ticket_settings for dashboard display
  try {
    await storage.setTicketSetting('gp_tracker_last_price',   String(marketPrice));
    await storage.setTicketSetting('gp_tracker_last_updated', lastUpdated.toISOString());
    await storage.setTicketSetting('gp_tracker_sell_rate',    String(sellRate));
    await storage.setTicketSetting('gp_tracker_buy_rate',     String(buyRate));
    await storage.setTicketSetting('gp_tracker_source',       source);
  } catch {}

  // Post to configured notify channel
  try {
    const channelId = await storage.getTicketSetting('gp_tracker_channel');
    if (channelId && botClient && botClient.isReady()) {
      await postPriceUpdateEmbed(botClient, channelId, marketPrice, sellRate, buyRate, source, updatedCount);
    }
  } catch {}

  console.log(`[GP Tracker] ✅ Market $${marketPrice.toFixed(4)} → sell $${sellRate.toFixed(4)} | buy $${buyRate.toFixed(4)} (${updatedCount} updated)`);
  return `✅ Market: **$${marketPrice.toFixed(4)}/M** | Sell: **$${sellRate.toFixed(4)}/M** | Buy: **$${buyRate.toFixed(4)}/M** (${updatedCount} rates updated)`;
}

// ── Public: start the scheduler ───────────────────────────────────────────────
export function startGpPriceTracker(botClient?: Client): void {
  if (trackerInterval) return; // already running

  console.log('💰 GP Price Tracker started — checks every 30 minutes');

  // Run immediately on start
  runPriceCheck(botClient, false).then(msg => console.log('[GP Tracker]', msg));

  trackerInterval = setInterval(() => {
    runPriceCheck(botClient, false).then(msg => console.log('[GP Tracker]', msg));
  }, TRACKER_DEFAULTS.CHECK_INTERVAL_MS);
}

// ── Public: status snapshot ───────────────────────────────────────────────────
export function getTrackerStatus() {
  return {
    lastMarketPrice,
    lastUpdated,
    isRunning: trackerInterval !== null,
  };
}
