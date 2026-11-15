// Runs on Eldorado.gg seller reviews pages
// Posts ONE consolidated vouch summary (total vouches, rating %, latest 4-5 vouches) to Discord
const STORAGE_KEY = 'dragon_eldorado_last_posted';

const MAX_LATEST = 5;

function getWebhookUrl() {
  return new Promise(resolve => {
    chrome.storage.local.get(['webhookUrl'], result => {
      resolve(result.webhookUrl || null);
    });
  });
}

function getLastPosted() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY], result => {
      resolve(result[STORAGE_KEY] || null);
    });
  });
}

function setLastPosted(value) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEY]: value }, resolve);
  });
}

function showBanner(text, color, textColor = 'white') {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 99999;
    background: ${color}; color: ${textColor}; padding: 12px 20px;
    border-radius: 8px; font-weight: bold; font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 320px;
  `;
  banner.textContent = text;
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 6000);
}

// Wait for reviews to render (Angular SPA loads them async)
async function waitForReviews(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const items = document.querySelectorAll('eld-feedback-list-item');
    if (items.length > 0) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return document.querySelectorAll('eld-feedback-list-item').length > 0;
}

function parseSummary() {
  const summary = {
    seller: null,
    rating: null,
    totalReviews: null,
    latest: [],
  };

  // Seller name
  const nameEl = document.querySelector('.profile__username.large, .profile__username');
  if (nameEl) summary.seller = nameEl.textContent.trim();

  // Rating %
  const feedbackEl = document.querySelector('eld-user-profile-feedback');
  if (feedbackEl) {
    const txt = feedbackEl.textContent.trim();
    const m = txt.match(/(\d+(?:\.\d+)?)\s*%/);
    if (m) summary.rating = m[1] + '%';
  }

  // Total reviews
  const reviewBtn = document.querySelector('button.review-count');
  if (reviewBtn) {
    const txt = reviewBtn.textContent.trim();
    const m = txt.match(/([\d,]+)\s*review/i);
    if (m) summary.totalReviews = m[1];
  }

  // Latest reviews (first MAX_LATEST on page = most recent, default tab "All")
  const items = Array.from(document.querySelectorAll('eld-feedback-list-item'));
  for (const item of items.slice(0, MAX_LATEST)) {
    const catEl = item.querySelector('span.xs\\:max-w-37\\.5, span[class*="max-w-25"], span[class*="truncate"]');
    const reviewerEl = item.querySelector('div.text-secondary.text-sm');
    const timeEl = item.querySelector('eld-feedback-date p, p.text-secondary.text-xs');
    const textEl = item.querySelector('p.text-secondary.text-sm.wrap-anywhere, p[class*="wrap-anywhere"]');

    const review = {
      category: catEl ? catEl.textContent.trim() : '',
      reviewer: reviewerEl ? reviewerEl.textContent.trim() : '',
      time: timeEl ? timeEl.textContent.trim() : '',
      text: textEl ? textEl.textContent.trim() : '',
    };
    if (review.category || review.reviewer || review.text) {
      summary.latest.push(review);
    }
  }

  return summary;
}

function formatSummary(summary) {
  const lines = [];
  lines.push(`**Seller:** ${summary.seller || 'Unknown'}`);
  lines.push(`**Rating:** ${summary.rating || 'N/A'}`);
  lines.push(`**Total Vouches/Reviews:** ${summary.totalReviews || 'N/A'}`);
  lines.push('');
  lines.push(`**Latest ${summary.latest.length} Vouches:**`);
  summary.latest.forEach((r, i) => {
    const cat = r.category || 'Review';
    const reviewer = r.reviewer || 'Anonymous';
    const time = r.time || '';
    const text = r.text ? ` — "${r.text.substring(0, 200)}${r.text.length > 200 ? '…' : ''}"` : '';
    lines.push(`${i + 1}. **${cat}** | ${reviewer} ${time}${text}`);
  });
  return lines.join('\n');
}

async function sendToDiscord(webhookUrl, summary) {
  try {
    const description = formatSummary(summary);
    const payload = {
      embeds: [
        {
          color: 0xFF6B35,
          title: '⭐ Eldorado Vouch Summary — Dragon Services',
          description: description.substring(0, 4096),
          fields: [
            {
              name: '📊 Rating',
              value: summary.rating || 'N/A',
              inline: true
            },
            {
              name: '📝 Total Reviews',
              value: summary.totalReviews || 'N/A',
              inline: true
            },
            {
              name: '👤 Seller',
              value: summary.seller || 'Unknown',
              inline: true
            }
          ],
          footer: {
            text: '🐲 Dragon Services • Eldorado Vouch Summary'
          },
          timestamp: new Date().toISOString(),
          url: window.location.href
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log(`[Dragon Services Eldorado] Discord response: ${response.status}`);
    return response.ok || response.status === 204;
  } catch (err) {
    console.error('[Dragon Services Eldorado] Fetch error:', err);
    return false;
  }
}

async function run() {
  const webhookUrl = await getWebhookUrl();
  if (!webhookUrl) {
    showBanner('🐲 No webhook URL set. Open the extension popup to configure.', '#5865F2');
    return { error: 'no_webhook' };
  }

  const ok = await waitForReviews();
  if (!ok) {
    showBanner('⚠️ Reviews did not load. Try refreshing the page.', '#FEE75C', '#1a1a1a');
    return { error: 'no_reviews' };
  }

  const summary = parseSummary();
  console.log('[Dragon Services Eldorado] Parsed summary:', JSON.stringify(summary, null, 2));

  if (!summary.totalReviews && summary.latest.length === 0) {
    showBanner('⚠️ Could not read reviews from this page. Try refreshing.', '#FEE75C', '#1a1a1a');
    return { error: 'parse_failed' };
  }

  // Avoid duplicate posts: if already posted with same signature, skip
  const last = await getLastPosted();
  const sig = `${summary.seller}|${summary.totalReviews}|${summary.latest.length}`;
  if (last === sig) {
    showBanner('✅ Summary already posted — nothing new! Use Reset to re-post.', '#57F287', '#1a1a1a');
    return { sent: 0, total: summary.totalReviews, alreadyPosted: true };
  }

  const okSend = await sendToDiscord(webhookUrl, summary);
  if (okSend) {
    const sig = `${summary.seller}|${summary.totalReviews}|${summary.latest.length}`;
    await setLastPosted(sig);
    showBanner(`🐲 Eldorado vouch summary posted to Discord!`, '#FF6B35');
    return { sent: 1, total: summary.totalReviews, rating: summary.rating };
  } else {
    showBanner('❌ Failed to post. Check your webhook URL.', '#ED4245');
    return { sent: 0, error: 'send_failed' };
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'check_vouches') {
    run().then(result => sendResponse(result));
    return true;
  }
  if (msg.action === 'reset_sent') {
    setLastPosted(null).then(() => sendResponse({ done: true }));
    return true;
  }
  if (msg.action === 'debug_posts') {
    waitForReviews().then(() => {
      const summary = parseSummary();
      sendResponse({ summary, total: summary.totalReviews });
    });
    return true;
  }
});

// Auto-run on page load (one-time post)
run(false);
