let currentTabId = null;
let currentDomain = null;
let startTime = null;
let siteTimers = {};
let intervalId = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ siteLimits: {}, siteEnabled: {} });
});

function getDomain(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function updateActiveTab(tab) {
  const domain = getDomain(tab.url);
  if (!domain) return;

  if (currentDomain && startTime) {
    const now = Date.now();
    const elapsed = now - startTime;
    if (!siteTimers[currentDomain]) siteTimers[currentDomain] = 0;
    siteTimers[currentDomain] += elapsed;
  }

  currentTabId = tab.id;
  currentDomain = domain;
  startTime = Date.now();

  startInterval();
}

function startInterval() {
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(() => {
    if (!currentDomain || !startTime) return;

    chrome.storage.local.get(["siteLimits", "siteEnabled"], (data) => {
      const limitMinutes = data.siteLimits?.[currentDomain];
      const enabled = data.siteEnabled?.[currentDomain];
      if (!limitMinutes || enabled === false) return;

      const now = Date.now();
      const elapsed = now - startTime;
      const totalUsed = (siteTimers[currentDomain] || 0) + elapsed;

      if (totalUsed >= limitMinutes * 60 * 1000) {
        clearInterval(intervalId);
        chrome.tabs.update(currentTabId, {
          url: chrome.runtime.getURL("timeout.html")
        });
      }
    });
  }, 1000);
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, updateActiveTab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.status === 'complete') {
    updateActiveTab(tab);
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  chrome.tabs.query({ active: true, windowId }, (tabs) => {
    if (tabs[0]) updateActiveTab(tabs[0]);
  });
});

// Отдаём usage и enabled по запросу
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getUsage") {
    const now = Date.now();
    const domain = message.domain;
    const used = (siteTimers[domain] || 0) + ((domain === currentDomain) ? (now - startTime) : 0);
    sendResponse({ used });
    return true;
  }
});