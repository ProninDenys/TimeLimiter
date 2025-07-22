const siteInput = document.getElementById("siteInput");
const timeInput = document.getElementById("timeInput");
const addBtn = document.getElementById("addBtn");
const siteList = document.getElementById("siteList");

// Загрузка сохранённых лимитов при загрузке popup
chrome.storage.local.get(["siteLimits"], (result) => {
  const limits = result.siteLimits || {};
  updateList(limits);
});

// Обработка кнопки "Add Limit"
addBtn.addEventListener("click", () => {
  const rawInput = siteInput.value.trim();
  const domain = normalizeDomain(rawInput);
  const time = parseInt(timeInput.value);

  if (!domain || isNaN(time) || time <= 0) {
    alert("Please enter a valid site and time (in minutes).");
    return;
  }

  chrome.storage.local.get(["siteLimits"], (result) => {
    const limits = result.siteLimits || {};
    limits[domain] = time;
    chrome.storage.local.set({ siteLimits: limits }, () => {
      updateList(limits);
      siteInput.value = "";
      timeInput.value = "";
    });
  });
});

// Удаление лимита по кнопке ✕
function updateList(limits) {
  siteList.innerHTML = "";
  for (const [site, time] of Object.entries(limits)) {
    const li = document.createElement("li");
    li.innerHTML = `
      <span><strong>${site}</strong>: ${time} min</span>
      <button data-site="${site}" class="removeBtn">✕</button>`;
    siteList.appendChild(li);
  }

  // Назначаем обработчики кнопкам удаления
  document.querySelectorAll(".removeBtn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const siteToRemove = e.target.dataset.site;
      chrome.storage.local.get(["siteLimits"], (result) => {
        const limits = result.siteLimits || {};
        delete limits[siteToRemove];
        chrome.storage.local.set({ siteLimits: limits }, () => {
          updateList(limits);
        });
      });
    });
  });
}

// Функция для извлечения домена из ввода
function normalizeDomain(raw) {
  try {
    const url = new URL(raw.startsWith("http") ? raw : "https://" + raw);
    return url.hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}