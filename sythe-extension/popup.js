const webhookInput = document.getElementById('webhookUrl');
const saveBtn = document.getElementById('saveBtn');
const checkBtn = document.getElementById('checkBtn');
const resetBtn = document.getElementById('resetBtn');
const statusEl = document.getElementById('status');
const onThreadSection = document.getElementById('onThreadSection');
const notOnThreadSection = document.getElementById('notOnThreadSection');

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = 'status ' + type;
}

function hideStatus() {
  statusEl.className = 'status';
}

// Load saved webhook URL
chrome.storage.local.get(['webhookUrl'], result => {
  if (result.webhookUrl) {
    webhookInput.value = result.webhookUrl;
  }
});

// Check if current tab is the Sythe thread
let currentTabId = null;
chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const tab = tabs[0];
  currentTabId = tab?.id;
  const url = tab?.url || '';
  const isOnThread =
    url.includes('sythe.org/threads/4326552') ||
    url.includes('sythe.org/threads/osrs-services-vouchers');

  if (isOnThread) {
    onThreadSection.style.display = 'block';
    notOnThreadSection.style.display = 'none';
  } else {
    onThreadSection.style.display = 'none';
    notOnThreadSection.style.display = 'block';
  }
});

// Save webhook URL
saveBtn.addEventListener('click', () => {
  const url = webhookInput.value.trim();
  if (!url.startsWith('https://discord.com/api/webhooks/') && !url.startsWith('https://discordapp.com/api/webhooks/')) {
    showStatus('❌ That doesn\'t look like a Discord webhook URL.', 'error');
    return;
  }
  chrome.storage.local.set({ webhookUrl: url }, () => {
    showStatus('✅ Webhook URL saved!', 'success');
    setTimeout(hideStatus, 3000);
  });
});

// Check and post new vouches
checkBtn.addEventListener('click', () => {
  const webhookUrl = webhookInput.value.trim();
  if (!webhookUrl) {
    showStatus('❌ Please save a webhook URL first.', 'error');
    return;
  }

  // Save webhook in case user typed without clicking save
  chrome.storage.local.set({ webhookUrl });

  checkBtn.disabled = true;
  checkBtn.textContent = '⏳ Checking...';
  showStatus('Scanning the page for new vouches...', 'info');

  chrome.tabs.sendMessage(currentTabId, { action: 'check_vouches' }, response => {
    checkBtn.disabled = false;
    checkBtn.textContent = '🔍 Check & Post New Vouches';

    if (chrome.runtime.lastError) {
      showStatus('❌ Could not connect to page. Refresh the Sythe thread and try again.', 'error');
      return;
    }

    if (!response) {
      showStatus('❌ No response from page. Try refreshing.', 'error');
      return;
    }

    if (response.error === 'no_webhook') {
      showStatus('❌ Webhook not set properly. Save it again.', 'error');
    } else if (response.error === 'no_posts') {
      showStatus('⚠️ Could not read posts. Open the console (F12) and look for [Dragon Services] logs.', 'error');
    } else {
      showStatus(`✅ Done! ${response.sent} new vouch(es) sent out of ${response.total} total on page.`, 'success');
    }
  });
});

// Reset sent IDs
resetBtn.addEventListener('click', () => {
  if (!confirm('This will re-post ALL vouches from the page to Discord. Are you sure?')) return;

  chrome.tabs.sendMessage(currentTabId, { action: 'reset_sent' }, () => {
    showStatus('🔄 Reset done. Click "Check & Post" to re-post all vouches.', 'info');
  });
});
