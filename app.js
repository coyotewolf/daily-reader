const state = {
  stories: [],
  language: localStorage.getItem("pathnotes-language") || "both",
  theme: localStorage.getItem("pathnotes-theme") || (
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  ),
  fontScale: Number(localStorage.getItem("pathnotes-font") || "1")
};

const app = document.querySelector("#app");
const root = document.documentElement;
const themeToggle = document.querySelector("#themeToggle");
const fontSizeLabel = document.querySelector("#fontSizeLabel");

function applySettings() {
  root.dataset.theme = state.theme;
  root.dataset.language = state.language;
  root.style.setProperty("--reader-size", `${19 * state.fontScale}px`);
  fontSizeLabel.textContent = `${Math.round(state.fontScale * 100)}%`;

  document.querySelectorAll("[data-lang]").forEach(btn => {
    const active = btn.dataset.lang === state.language;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });

  themeToggle.textContent = state.theme === "dark" ? "☀" : "◐";
  themeToggle.setAttribute("aria-label", state.theme === "dark" ? "切換日間模式" : "切換夜間模式");
}

function saveSettings() {
  localStorage.setItem("pathnotes-language", state.language);
  localStorage.setItem("pathnotes-theme", state.theme);
  localStorage.setItem("pathnotes-font", String(state.fontScale));
}

function escapeHTML(value = "") {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("zh-Hant", {
    year: "numeric", month: "short", day: "numeric"
  }).format(date);
}

function renderHome() {
  const fragment = document.querySelector("#homeTemplate").content.cloneNode(true);
  const list = fragment.querySelector("#storyList");
  fragment.querySelector("#storyCount").textContent = `${state.stories.length} 篇`;

  if (!state.stories.length) {
    list.innerHTML = '<div class="empty-state">還沒有故事。把第一篇加入 data/stories.json 就會出現在這裡。</div>';
  } else {
    [...state.stories]
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach(story => {
        const link = document.createElement("a");
        link.className = "story-card";
        link.href = `#/story/${encodeURIComponent(story.slug)}`;
        link.innerHTML = `
          <div>
            <p class="date">${escapeHTML(formatDate(story.date))} · EP. ${String(story.episode).padStart(2, "0")}</p>
            <h3>${escapeHTML(story.title.en)}</h3>
            <p>${escapeHTML(story.title.zh)} · ${escapeHTML(story.excerpt || "")}</p>
          </div>
          <span class="arrow" aria-hidden="true">→</span>`;
        list.appendChild(link);
      });
  }

  app.replaceChildren(fragment);
  document.title = "Path Notes｜每日獵魔士雙語短篇";
  window.scrollTo({ top: 0 });
}

function renderStory(slug) {
  const story = state.stories.find(item => item.slug === slug);
  if (!story) {
    app.innerHTML = `<div class="empty-state">找不到這篇故事。<br><br><a href="#/">回到首頁</a></div>`;
    return;
  }

  const fragment = document.querySelector("#readerTemplate").content.cloneNode(true);
  fragment.querySelector("#storyMeta").textContent =
    `${formatDate(story.date)} · EPISODE ${String(story.episode).padStart(2, "0")}`;
  fragment.querySelector("#storyTitle").textContent = story.title.en;
  fragment.querySelector("#storySubtitle").textContent = story.title.zh;
  fragment.querySelector("#storyRecap").textContent = story.recap || "A new road begins.";
  fragment.querySelector("#endingLine").textContent = story.ending || "The Path continues tomorrow.";

  const body = fragment.querySelector("#storyBody");
  story.paragraphs.forEach(paragraph => {
    const pair = document.createElement("div");
    pair.className = `story-pair${paragraph.type === "dialogue" ? " dialogue" : ""}`;
    pair.innerHTML = `
      <p class="en" lang="en">${escapeHTML(paragraph.en)}</p>
      <p class="zh" lang="zh-Hant">${escapeHTML(paragraph.zh)}</p>`;
    body.appendChild(pair);
  });

  app.replaceChildren(fragment);
  document.title = `${story.title.en}｜Path Notes`;
  window.scrollTo({ top: 0 });
}

function route() {
  const match = location.hash.match(/^#\/story\/(.+)$/);
  if (match) renderStory(decodeURIComponent(match[1]));
  else renderHome();
}

document.querySelectorAll("[data-lang]").forEach(button => {
  button.addEventListener("click", () => {
    state.language = button.dataset.lang;
    saveSettings();
    applySettings();
  });
});

themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  saveSettings();
  applySettings();
});

document.querySelector("#fontDown").addEventListener("click", () => {
  state.fontScale = Math.max(.8, Math.round((state.fontScale - .1) * 10) / 10);
  saveSettings();
  applySettings();
});

document.querySelector("#fontUp").addEventListener("click", () => {
  state.fontScale = Math.min(1.7, Math.round((state.fontScale + .1) * 10) / 10);
  saveSettings();
  applySettings();
});

window.addEventListener("hashchange", route);

async function boot() {
  applySettings();
  try {
    const response = await fetch("./data/stories.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.stories = await response.json();
  } catch (error) {
    console.error("Unable to load stories:", error);
    state.stories = [];
  }
  route();
}

boot();
