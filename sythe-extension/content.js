// Runs on the Sythe vouch thread page
const STORAGE_KEY = 'dragon_sent_vouch_ids';

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

  // Try XenForo 1.x structure first (li.message)
  let articles = document.querySelectorAll('li.message[id^="post-"]');
  let mode = 'xf1';

  // Fall back to XenForo 2.x (article.message)
  if (articles.length === 0) {
    articles = document.querySelectorAll('article.message');
    mode = 'xf2';
  }

  // Fall back to generic post containers
  if (articles.length === 0) {
    articles = document.querySelectorAll('[id^="post-"], [data-message-id]');
    mode = 'generic';
  }

  console.log(`[Dragon Services] Mode: ${mode}, found ${articles.length} post elements`);

  articles.forEach((article, index) => {
    // --- Get Post ID ---
    let postId =
      article.getAttribute('data-message-id') ||
      article.getAttribute('data-post-id') ||
      article.id?.replace('post-', '') ||
      String(index);

    // --- Get Author ---
    let author = '';
    const authorSelectors = [
      '.message-name .username',
      '.message-name a',
      '[itemprop="name"]',
      '.userText .username a',
      '.userText a.username',
      'h3.userText a',
      '.username strong',
      'a.username',
      '.posterDate strong a',
      '.messageUserInfo .username',
    ];
    for (const sel of authorSelectors) {
      const el = article.querySelector(sel);
      if (el && el.textContent.trim()) {
        author = el.textContent.trim();
        break;
      }
    }

    // --- Get Content ---
    let content = '';
    const contentSelectors = [
      '.bbWrapper',
      '.message-body .js-selectToQuote',
      '.message-body',
      '.messageText',
      '.messageText .messageTextEndMarker',
      'blockquote.messageText',
      '.entry-content',
      '.post-content',
    ];
    for (const sel of contentSelectors) {
      const el = article.querySelector(sel);
      if (el && el.innerText.trim()) {
        content = el.innerText.trim();
        break;
      }
    }

    console.log(`[Dragon Services] Post ${postId}: author="${author}" content length=${content.length}`);

    if (postId && author && content && content.length >= 5) {
      posts.push({ postId: String(postId), author, content });
    }
  });

  return posts;
}

async function sendToDiscord(webhookUrl, post) {
  try {
    const payload = {
      embeds: [
        {
          color: 0xFF6B35,
          title: '⭐ New Sythe Vouch - Dragon Services',
          description: `💬 *"${post.content.substring(0, 1000)}"*`,
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

    console.log(`[Dragon Services] Discord response for post ${post.postId}: ${response.status}`);
    return response.ok || response.status === 204;
  } catch (err) {
    console.error(`[Dragon Services] Fetch error for post ${post.postId}:`, err);
    return false;
  }
}

function showBanner(text, color, textColor = 'white') {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 99999;
    background: ${color}; color: ${textColor}; padding: 12px 20px;
    border-radius: 8px; font-weight: bold; font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 300px;
  `;
  banner.textContent = text;
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 6000);
}

async function run() {
  const webhookUrl = await getWebhookUrl();
  if (!webhookUrl) {
    showBanner('🐲 No webhook URL set. Open the extension popup to configure.', '#5865F2');
    return { error: 'no_webhook' };
  }

  const posts = parsePosts();
  console.log(`[Dragon Services] Total posts parsed: ${posts.length}`);

  if (posts.length === 0) {
    showBanner('⚠️ Could not read posts from this page. Try refreshing.', '#FEE75C', '#1a1a1a');
    return { error: 'no_posts' };
  }

  const sentIds = await getSentIds();
  const newPosts = posts.filter(p => !sentIds.includes(p.postId));

  console.log(`[Dragon Services] New posts to send: ${newPosts.length}`);

  if (newPosts.length === 0) {
    showBanner('✅ All vouches already posted — nothing new!', '#57F287', '#1a1a1a');
    return { sent: 0, total: posts.length };
  }

  let successCount = 0;
  for (const post of newPosts) {
    const ok = await sendToDiscord(webhookUrl, post);
    if (ok) {
      sentIds.push(post.postId);
      successCount++;
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  await saveSentIds(sentIds);

  if (successCount > 0) {
    showBanner(`🐲 ${successCount} vouch(es) posted to Discord!`, '#FF6B35');
  } else {
    showBanner('❌ Found new vouches but failed to post. Check your webhook URL.', '#ED4245');
  }

  return { sent: successCount, total: posts.length };
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'check_vouches') {
    run().then(result => sendResponse(result));
    return true;
  }
  if (msg.action === 'reset_sent') {
    saveSentIds([]).then(() => sendResponse({ done: true }));
    return true;
  }
  if (msg.action === 'debug_posts') {
    const posts = parsePosts();
    sendResponse({ posts: posts.slice(0, 3), total: posts.length });
    return true;
  }
});

// Auto-run on page load
run();
