const siteInput = document.getElementById("siteInput");
const timeInput = document.getElementById("timeInput");
const addBtn = document.getElementById("addBtn");
const siteList = document.getElementById("siteList");

let limits = {};
let enabled = {};
let intervalId = null;

// Начальная загрузка
loadData();

function loadData() {
  chrome.storage.local.get(["siteLimits", "siteEnabled"], (result) => {
    limits = result.siteLimits || {};
    enabled = result.siteEnabled || {};
    updateList();
    startLiveUpdate();
  });
}

// Добавление нового сайта
addBtn.addEventListener("click", () => {
  const raw = siteInput.value.trim();
  const site = raw.replace(/^https?:\/\//, "").split("/")[0];
  const time = parseInt(timeInput.value);

  if (!site || isNaN(time) || time <= 0) {
    alert("Please enter a valid site and time (in minutes).");
    return;
  }

  limits[site] = time;
  enabled[site] = true;

  chrome.storage.local.set({ siteLimits: limits, siteEnabled: enabled }, () => {
    updateList();
    siteInput.value = "";
    timeInput.value = "";
  });
});

// Обновление списка
function updateList() {
  siteList.innerHTML = "";

  for (const [site, time] of Object.entries(limits)) {
    const isEnabled = enabled[site] !== false;

    const li = document.createElement("li");
    li.innerHTML = `
      <span><strong>${site}</strong> — ${time} min <span id="remaining-${site}">⌛ loading...</span></span>
      <div style="display: flex; gap: 6px; align-items: center;">
        <label class="switch">
          <input type="checkbox" data-site="${site}" class="toggleSwitch" ${isEnabled ? "checked" : ""}>
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
      const val = e.target.checked;
      enabled[site] = val;
      chrome.storage.local.set({ siteEnabled: enabled });
    });
  });

  // Обработчик редактирования
  document.querySelectorAll(".editBtn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const site = e.target.dataset.site;
      const current = parseInt(e.target.dataset.time);
      const newTime = prompt(`Edit time limit for ${site} (min):`, current);
      if (newTime && !isNaN(parseInt(newTime))) {
        limits[site] = parseInt(newTime);
        chrome.storage.local.set({ siteLimits: limits }, updateList);
      }
    });
  });
}

// Живой таймер
function startLiveUpdate() {
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(() => {
    for (const site of Object.keys(limits)) {
      chrome.runtime.sendMessage({ type: "getUsage", domain: "https://" + site }, (res) => {
        const remainingMs = (limits[site] * 60000) - (res?.used || 0);
        const min = Math.max(0, Math.floor(remainingMs / 60000));
        const sec = Math.max(0, Math.floor((remainingMs % 60000) / 1000));
        const display = `${min}m ${sec}s left`;
        const elem = document.getElementById(`remaining-${site}`);
        if (elem) elem.textContent = `⌛ ${display}`;
      });
    }
  }, 1000);
}