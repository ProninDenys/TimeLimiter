const siteInput = document.getElementById("siteInput");
const timeInput = document.getElementById("timeInput");
const addBtn = document.getElementById("addBtn");
const siteList = document.getElementById("siteList");

// Загрузка сохранённых лимитов
chrome.storage.local.get(["siteLimits"], (result) => {
  const limits = result.siteLimits || {};
  updateList(limits);
});

// Преобразует ввод в origin (например, https://example.com)
function normalizeSite(input) {
  try {
    if (!input.startsWith("http")) {
      input = "https://" + input;
    }
    const url = new URL(input);
    return url.origin;
  } catch {
    return null;
  }
}

// Добавление нового лимита
addBtn.addEventListener("click", () => {
  const raw = siteInput.value.trim();
  const site = normalizeSite(raw);
  const time = parseInt(timeInput.value);

  if (!site || isNaN(time) || time <= 0) {
    alert("Please enter a valid site and time (in minutes).");
    return;
  }

  chrome.storage.local.get(["siteLimits"], (result) => {
    const limits = result.siteLimits || {};
    limits[site] = time;
    chrome.storage.local.set({ siteLimits: limits }, () => {
      updateList(limits);
      siteInput.value = "";
      timeInput.value = "";
    });
  });
});

// Отображение списка лимитов
function updateList(limits) {
  siteList.innerHTML = "";
  for (const [site, time] of Object.entries(limits)) {
    const li = document.createElement("li");
    li.innerHTML = `<span><strong>${site}</strong>: ${time} min</span>
      <button data-site="${site}" class="removeBtn">✕</button>`;
    siteList.appendChild(li);
  }

  // Кнопки удаления
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