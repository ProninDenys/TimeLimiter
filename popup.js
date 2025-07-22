// Расширим popup.js для:
// 1. Сохранения состояния переключателя (вкл/выкл сайта)
// 2. Редактирования лимита
// 3. Показа оставшегося времени

const siteInput = document.getElementById("siteInput");
const timeInput = document.getElementById("timeInput");
const addBtn = document.getElementById("addBtn");
const siteList = document.getElementById("siteList");

// Загрузка лимитов
chrome.storage.local.get(["siteLimits", "disabledSites"], (result) => {
  const limits = result.siteLimits || {};
  const disabled = result.disabledSites || {};
  updateList(limits, disabled);
});

// Добавление лимита
addBtn.addEventListener("click", () => {
  const raw = siteInput.value.trim();
  const site = raw.replace(/^https?:\/\//, "").split("/")[0];
  const time = parseInt(timeInput.value);

  if (!site || isNaN(time) || time <= 0) {
    alert("Please enter a valid site and time (in minutes).”);
    return;
  }

  chrome.storage.local.get(["siteLimits", "disabledSites"], (result) => {
    const limits = result.siteLimits || {};
    const disabled = result.disabledSites || {};
    limits[site] = time;
    disabled[site] = false; // по умолчанию включен
    chrome.storage.local.set({ siteLimits: limits, disabledSites: disabled }, () => {
      updateList(limits, disabled);
      siteInput.value = "";
      timeInput.value = "";
    });
  });
});

// Обновление списка сайтов
function updateList(limits, disabledSites) {
  siteList.innerHTML = "";
  for (const [site, time] of Object.entries(limits)) {
    const isDisabled = disabledSites?.[site] || false;

    const li = document.createElement("li");
    li.innerHTML = `
      <span><strong>${site}</strong>: ${time} min <span id="remaining-${site}"></span></span>
      <div style="display: flex; gap: 6px; align-items: center;">
        <label class="switch">
          <input type="checkbox" data-site="${site}" class="toggleSwitch" ${isDisabled ? "" : "checked"}>
          <span class="slider"></span>
        </label>
        <button class="editBtn" data-site="${site}" data-time="${time}">✎</button>
      </div>
    `;
    siteList.appendChild(li);
  }

  // Обработчик переключателя
  document.querySelectorAll(".toggleSwitch").forEach((toggle) => {
    toggle.addEventListener("change", (e) => {
      const site = e.target.dataset.site;
      const value = !e.target.checked;
      chrome.storage.local.get("disabledSites", (result) => {
        const disabled = result.disabledSites || {};
        disabled[site] = value;
        chrome.storage.local.set({ disabledSites: disabled });
      });
    });
  });

  // Обработчик редактирования
  document.querySelectorAll(".editBtn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const site = e.target.dataset.site;
      const current = parseInt(e.target.dataset.time);
      const newTime = prompt(`Edit time limit for ${site} (min):`, current);
      if (newTime && !isNaN(parseInt(newTime))) {
        chrome.storage.local.get("siteLimits", (result) => {
          const limits = result.siteLimits || {};
          limits[site] = parseInt(newTime);
          chrome.storage.local.set({ siteLimits: limits }, () => {
            chrome.storage.local.get("disabledSites", (res2) => {
              updateList(limits, res2.disabledSites || {});
            });
          });
        });
      }
    });
  });

  // Подгрузка оставшегося времени
  chrome.runtime.sendMessage({ action: "getUsage" }, (usage = {}) => {
    for (const [site, usedMs] of Object.entries(usage)) {
      const limit = limits[site] * 60 * 1000;
      const remaining = Math.max(0, limit - usedMs);
      const elem = document.getElementById(`remaining-${site}`);
      if (elem) {
        const min = Math.floor(remaining / 60000);
        const sec = Math.floor((remaining % 60000) / 1000);
        elem.textContent = ` — ${min}m ${sec}s left`;
      }
    }
  });
}