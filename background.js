let activeTabUrl = null;
let usage = {};
let limits = {};

function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function checkLimit(domain) {
  if (!limits[domain]) return;
  if (!usage[domain]) usage[domain] = 0;

  if (usage[domain] >= limits[domain]) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && extractDomain(tabs[0].url) === domain) {
        chrome.tabs.update(tabs[0].id, { url: chrome.runtime.getURL("timeout.html") });
      }
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["limits"], (result) => {
    limits = result.limits || {};
  });
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.limits) {
    limits = changes.limits.newValue || {};
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  activeTabUrl = extractDomain(tab.url);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    activeTabUrl = extractDomain(tab.url);
  }
});

setInterval(() => {
  if (!activeTabUrl) return;
  if (!limits[activeTabUrl]) return;

  usage[activeTabUrl] = (usage[activeTabUrl] || 0) + 1; 
  checkLimit(activeTabUrl);
}, 60 * 1000); 