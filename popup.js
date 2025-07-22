const siteInput = document.getElementById("siteInput");
const timeInput = document.getElementById("timeInput");
const addBtn = document.getElementById("addBtn");
const siteList = document.getElementById("siteList");

function normalizeSite(raw) {
  return raw.replace(/^https?:\/\//, "").split("/")[0];
}

function getRemainingTime(domain, limitMinutes, callback) {
  chrome.runtime.sendMessage({ type: "getUsage", domain }, (response) => {
    const used = response?.used || 0;
    const remaining = Math.max(limitMinutes * 60 * 1000 - used, 0);
    const min = Math.floor(remaining / 60000);
    const sec = Math.floor((remaining % 60000) / 1000);
    callback(`${min}m ${sec}s`);
  });
}

// Загрузка
function loadData() {
  chrome.storage.local.get(["siteLimits", "siteEnabled"], (result) => {
    const limits = result.siteLimits || {};
    const enabled = result.siteEnabled || {};
    updateList(limits, enabled);
  });
}

// Добавить лимит
addBtn.addEventListener("click", () => {
  const raw = siteInput.value.trim();
  const site = normalizeSite(raw);
  const time = parseInt(timeInput.value);

  if (!site || isNaN(time) || time <= 0) {
    alert("Please enter a valid site and time.");
    return;
  }

  chrome.storage.local.get(["siteLimits", "siteEnabled"], (result) => {
    const limits = result.siteLimits || {};
    const enabled = result.siteEnabled || {};

    limits[site] = time;
    enabled[site] = true;

    chrome.storage.local.set({ siteLimits: limits, siteEnabled: enabled }, loadData);
    siteInput.value = "";
    timeInput.value = "";
  });
});

// Отобразить список
function updateList(limits, enabled) {
  siteList.innerHTML = "";
  for (const [site, time] of Object.entries(limits)) {
    const li = document.createElement("li");

    const toggleId = `toggle-${site.replace(/\W/g, "_")}`;

    getRemainingTime(site, time, (leftTime) => {
      li.innerHTML = `
        <span>
          <strong>${site}</strong> — ${time} min<br/>
          <small>⏳ ${leftTime} left</small>
        </span>
        <label class="switch">
          <input type="checkbox" id="${toggleId}" ${enabled[site] !== false ? "checked" : ""}>
          <span class="slider round"></span>
        </label>
      `;

      // Обработчик переключателя
      li.querySelector(`#${toggleId}`).addEventListener("change", (e) => {
        chrome.storage.local.get("siteEnabled", (data) => {
          const status = data.siteEnabled || {};
          status[site] = e.target.checked;
          chrome.storage.local.set({ siteEnabled: status });
        });
      });

      siteList.appendChild(li);
    });
  }
}

// Запуск
loadData();