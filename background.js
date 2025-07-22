let activeTabId = null;
let siteTimers = {};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ siteLimits: {} });
});

// Отслеживаем вкладку
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => {
    handleTab(tab);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.status === 'complete') {
    handleTab(tab);
  }
});

function handleTab(tab) {
  const url = new URL(tab.url);
  const domain = url.origin;

  chrome.storage.local.get('siteLimits', data => {
    const limits = data.siteLimits || {};
    const limit = limits[domain];
    if (!limit) return;

    const now = Date.now();
    if (!siteTimers[domain]) {
      siteTimers[domain] = {
        startTime: now,
        usedTime: 0
      };
    }

    const elapsed = now - siteTimers[domain].startTime;
    const totalUsed = siteTimers[domain].usedTime + elapsed;

    if (totalUsed >= limit * 60 * 1000) {
      // Время превышено — перенаправим или закроем
      chrome.tabs.update(tab.id, {
        url: chrome.runtime.getURL("timeout.html")
      });
    }
  });
}

// Когда вкладка неактивна — сохраняем использованное время
chrome.tabs.onActivated.addListener(() => updateTimers());
chrome.windows.onFocusChanged.addListener(() => updateTimers());

function updateTimers() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    if (!tab || !tab.url) return;

    const url = new URL(tab.url);
    const domain = url.origin;

    if (siteTimers[domain]) {
      const now = Date.now();
      const elapsed = now - siteTimers[domain].startTime;
      siteTimers[domain].usedTime += elapsed;
      siteTimers[domain].startTime = now;
    }
  });
}