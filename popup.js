const siteInput = document.getElementById("siteInput");
const timeInput = document.getElementById("timeInput");
const addBtn = document.getElementById("addBtn");
const siteList = document.getElementById("siteList");

let timerInterval;

// Загружаем лимиты и статусы
function loadLimits() {
  chrome.storage.local.get(["siteLimits", "siteEnabled"], (data) => {
    const limits = data.siteLimits || {};
    const enabled = data.siteEnabled || {};
    updateList(limits, enabled);
  });
}

// Добавляем новый лимит
addBtn.addEventListener("click", () => {
  const raw = siteInput.value.trim();
  const site = raw.replace(/^https?:\/\//, "").split("/")[0];
  const time = parseInt(timeInput.value);

  if (!site || isNaN(time) || time <= 0) {
    alert("Please enter a valid site and time (in minutes).");
    return;
  }

  chrome.storage.local.get(["siteLimits", "siteEnabled"], (data) => {
    const limits = data.siteLimits || {};
    const enabled = data.siteEnabled || {};
    limits[site] = time;
    enabled[site] = true;

    chrome.storage.local.set({ siteLimits: limits, siteEnabled: enabled }, () => {
      siteInput.value = "";
      timeInput.value = "";
      updateList(limits, enabled);
    });
  });
});

// Обновление списка сайтов
function updateList(limits, enabledMap) {
  siteList.innerHTML = "";

  for (const [site, time] of Object.entries(limits)) {
    const enabled = enabledMap?.[site] !== false;

    const li = document.createElement("li");
    li.innerHTML = `
      <span>
        <strong>${site}</strong> — ${time} min 
        <span class="countdown" data-site="${site}">⏳</span>
      </span>
      <div style="display: flex; gap: 6px; align-items: center;">
        <label class="switch">
          <input type="checkbox" class="toggleSwitch" data-site="${site}" ${enabled ? "checked" : ""}>
          <span class="slider"></span>
        </label>
        <button class="editBtn" data-site="${site}" data-time="${time}">✏️</button>
      </div>
    `;
    siteList.appendChild(li);
  }

  // Обработчик переключателя
  document.querySelectorAll(".toggleSwitch").forEach((toggle) => {
    toggle.addEventListener("change", (e) => {
      const site = e.target.dataset.site;
      const isEnabled = e.target.checked;

      chrome.storage.local.get("siteEnabled", (res) => {
        const updated = res.siteEnabled || {};
        updated[site] = isEnabled;
        chrome.storage.local.set({ siteEnabled: updated });
      });
    });
  });

  // Обработчик редактирования лимита
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
            loadLimits();
          });
        });
      }
    });
  });

  // Обновляем таймер
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateTimers, 1000);
}

// Обновление таймера для всех сайтов
function updateTimers() {
  document.querySelectorAll(".countdown").forEach((span) => {
    const site = span.dataset.site;
    chrome.runtime.sendMessage({ type: "getUsage", domain: site }, (res) => {
      chrome.storage.local.get("siteLimits", (data) => {
        const limitMin = data.siteLimits?.[site];
        if (!limitMin) return;

        const used = res?.used || 0;
        const remaining = Math.max(0, limitMin * 60 * 1000 - used);
        const min = Math.floor(remaining / 60000);
        const sec = Math.floor((remaining % 60000) / 1000);
        span.textContent = `⏳ ${min}m ${sec}s`;
      });
    });
  });
}

// Старт
loadLimits();