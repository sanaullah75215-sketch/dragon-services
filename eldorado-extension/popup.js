document.addEventListener('DOMContentLoaded', () => {
  const webhookInput = document.getElementById('webhookUrl');
  const status = document.getElementById('status');
  const saveBtn = document.getElementById('saveBtn');
  const postBtn = document.getElementById('postBtn');
  const resetBtn = document.getElementById('resetBtn');

  chrome.storage.local.get(['webhookUrl'], (result) => {
    if (result.webhookUrl) webhookInput.value = result.webhookUrl;
  });

  function setStatus(text, color) {
    status.textContent = text;
    status.style.color = color || '#e0e0e0';
  }

  saveBtn.addEventListener('click', () => {
    const url = webhookInput.value.trim();
    if (!url.startsWith('https://discord.com/api/webhooks/') && !url.startsWith('https://discordapp.com/api/webhooks/')) {
      setStatus('❌ Invalid webhook URL. Must start with https://discord.com/api/webhooks/', '#ED4245');
      return;
    }
    chrome.storage.local.set({ webhookUrl: url }, () => {
      setStatus('✅ Webhook URL saved!', '#57F287');
    });
  });

  function sendPost(tabId, retry) {
    chrome.tabs.sendMessage(tabId, { action: 'check_vouches' }, (response) => {
      if (chrome.runtime.lastError) {
        if (!retry) {
          // Try injecting the content script, then retry once
          chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['content.js'] }, () => {
            setTimeout(() => sendPost(tabId, true), 800);
          });
          setStatus('⏳ Injecting content script, retrying...', '#FF6B35');
          return;
        }
        setStatus('❌ Could not reach content script. Make sure you are on https://www.eldorado.gg/users/YOURNAME/reviews and reload the page.', '#ED4245');
        return;
      }
      if (response && response.error) {
        setStatus('⚠️ ' + response.error, '#FEE75C');
      } else if (response && response.alreadyPosted) {
        setStatus('✅ Already posted (same data). Use Reset to re-post.', '#57F287');
      } else if (response) {
        setStatus(`✅ Posted! Total: ${response.total || 'N/A'} | Rating: ${response.rating || 'N/A'}`, '#57F287');
      } else {
        setStatus('⚠️ No response from content script.', '#FEE75C');
      }
    });
  }

  postBtn.addEventListener('click', () => {
    setStatus('⏳ Posting vouch summary...', '#FF6B35');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        setStatus('❌ No active tab found.', '#ED4245');
        return;
      }
      const url = tabs[0].url || '';
      if (!/eldorado\.gg\/users\/[^/]+\/reviews/.test(url)) {
        setStatus('❌ Open your Eldorado reviews page first: https://www.eldorado.gg/users/YOURNAME/reviews', '#ED4245');
        return;
      }
      sendPost(tabs[0].id, false);
    });
  });

  resetBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'reset_sent' }, () => {
          setStatus('✅ Reset flag. Next run will post again.', '#57F287');
        });
      } else {
        chrome.storage.local.remove(['dragon_eldorado_last_posted'], () => {
          setStatus('✅ Reset flag.', '#57F287');
        });
      }
    });
  });
});
