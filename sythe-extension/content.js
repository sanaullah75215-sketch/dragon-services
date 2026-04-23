// Runs on the Sythe vouch thread page
// Reads all posts and sends new ones to Discord via webhook

const STORAGE_KEY = 'dragon_sent_vouch_ids';
const THREAD_URL = 'https://www.sythe.org/threads/4326552/';

function getWebhookUrl() {
  return new Promise(resolve => {
    chrome.storage.local.get(['webhookUrl'], result => {
      resolve(result.webhookUrl || null);
    });
  });
}

function getSentIds() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY], result => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

function saveSentIds(ids) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEY]: ids }, resolve);
  });
}

function parsePosts() {
  const posts = [];

  // XenForo 2.x structure
  const articles = document.querySelectorAll('article.message');

  articles.forEach(article => {
    // Get post ID
    const postId = article.getAttribute('data-message-id') || article.id;
    if (!postId) return;

    // Get username
    const authorEl =
      article.querySelector('.message-name .username') ||
      article.querySelector('[itemprop="name"]') ||
      article.querySelector('.username');
    const author = authorEl ? authorEl.textContent.trim() : 'Unknown';

    // Get post content
    const bodyEl =
      article.querySelector('.bbWrapper') ||
      article.querySelector('.message-body .js-selectToQuote') ||
      article.querySelector('.message-userContent');
    const content = bodyEl ? bodyEl.innerText.trim() : '';

    if (postId && author && content) {
      posts.push({ postId: String(postId), author, content });
    }
  });

  return posts;
}

async function sendToDiscord(webhookUrl, post) {
  const payload = {
    embeds: [
      {
        color: 0xFF6B35,
        title: '⭐ New Sythe Vouch - Dragon Services',
        description: `💬 *"${post.content.substring(0, 500)}"*`,
        fields: [
          {
            name: '👤 From',
            value: `**${post.author}**`,
            inline: true
          },
          {
            name: '🔗 Source',
            value: '[Sythe Thread](https://www.sythe.org/threads/4326552/)',
            inline: true
          }
        ],
        footer: {
          text: '🐲 Dragon Services • Sythe Vouch Auto-Poster'
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return response.ok;
}

async function run() {
  const webhookUrl = await getWebhookUrl();
  if (!webhookUrl) {
    console.log('[Dragon Services] No webhook URL set. Open the extension popup to configure.');
    return;
  }

  const posts = parsePosts();
  if (posts.length === 0) {
    console.log('[Dragon Services] No posts found on page.');
    return;
  }

  const sentIds = await getSentIds();
  const newPosts = posts.filter(p => !sentIds.includes(p.postId));

  console.log(`[Dragon Services] Found ${posts.length} posts, ${newPosts.length} new.`);

  let successCount = 0;
  for (const post of newPosts) {
    // Skip very short posts (likely not real vouches)
    if (post.content.length < 10) continue;

    const ok = await sendToDiscord(webhookUrl, post);
    if (ok) {
      sentIds.push(post.postId);
      successCount++;
      // Small delay between posts to avoid rate limiting
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  await saveSentIds(sentIds);

  // Show result badge on page
  if (successCount > 0) {
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 99999;
      background: #FF6B35; color: white; padding: 12px 20px;
      border-radius: 8px; font-weight: bold; font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    banner.textContent = `🐲 ${successCount} new vouch(es) posted to Discord!`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 5000);
  } else if (newPosts.length === 0) {
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 99999;
      background: #57F287; color: #1a1a1a; padding: 12px 20px;
      border-radius: 8px; font-weight: bold; font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    banner.textContent = '✅ All vouches already posted — nothing new!';
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 4000);
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'check_vouches') {
    run().then(() => sendResponse({ done: true }));
    return true;
  }
  if (msg.action === 'reset_sent') {
    saveSentIds([]).then(() => sendResponse({ done: true }));
    return true;
  }
});

// Auto-run on page load
run();
