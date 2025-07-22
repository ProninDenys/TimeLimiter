const siteInput = document.getElementById("siteInput");
const timeInput = document.getElementById("timeInput");
const addBtn = document.getElementById("addBtn");
const siteList = document.getElementById("siteList");

// Загружаем лимиты
chrome.storage.local.get(["siteLimits"], (result) => {
  const limits = result.siteLimits || {};
  updateList(limits);
});

addBtn.addEventListener("click", () => {
  const raw = siteInput.value.trim();
  const site = raw.replace(/^https?:\/\//, "").split("/")[0];
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

function updateList(limits) {
  siteList.innerHTML = "";
  for (const [site, time] of Object.entries(limits)) {
    const li = document.createElement("li");

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = true;
    toggle.className = "toggleSwitch";
    toggle.dataset.site = site;

    const label = document.createElement("label");
    label.className = "siteLabel";
    label.innerHTML = `<strong>${site}</strong><br><small>${time} min / day</small>`;

    li.appendChild(label);
    li.appendChild(toggle);
    siteList.appendChild(li);
  }

  document.querySelectorAll(".toggleSwitch").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const site = e.target.dataset.site;

      chrome.storage.local.get(["siteLimits"], (result) => {
        const limits = result.siteLimits || {};

        if (e.target.checked) {
          // Включаем обратно (например, 10 мин)
          limits[site] = limits[site] || 10;
        } else {
          delete limits[site];
        }

        chrome.storage.local.set({ siteLimits: limits }, () => {
          updateList(limits);
        });
      });
    });
  });
}