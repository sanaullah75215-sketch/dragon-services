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
chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const tab = tabs[0];
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

  checkBtn.disabled = true;
  checkBtn.textContent = '⏳ Checking...';
  showStatus('Scanning the page for new vouches...', 'info');

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'check_vouches' }, response => {
      checkBtn.disabled = false;
      checkBtn.textContent = '🔍 Check & Post New Vouches';
      if (chrome.runtime.lastError) {
        showStatus('❌ Could not connect to the page. Try refreshing the Sythe thread.', 'error');
      } else {
        showStatus('✅ Done! Check your Discord vouch channel.', 'success');
      }
    });
  });
});

// Reset sent IDs so all vouches get re-posted
resetBtn.addEventListener('click', () => {
  if (!confirm('This will re-post ALL vouches from the page to Discord. Are you sure?')) return;

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'reset_sent' }, () => {
      showStatus('🔄 Reset done. Click "Check & Post" to re-post all vouches.', 'info');
    });
  });
});
