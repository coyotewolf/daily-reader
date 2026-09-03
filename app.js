const state = {
  books: [],
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
}

function saveSettings() {
  localStorage.setItem("pathnotes-language", state.language);
  localStorage.setItem("pathnotes-theme", state.theme);
  localStorage.setItem("pathnotes-font", String(state.fontScale));
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("zh-Hant", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function findBook(slug) {
  return state.books.find(book => book.slug === slug);
}

function getLastUpdated(book) {
  if (!book?.chapters?.length) return null;
  return [...book.chapters].map(chapter => chapter.date).filter(Boolean).sort().at(-1) || null;
}

function getProgress(book) {
  const current = book.chapters?.length || 0;
  const total = Number(book.plannedChapters || 0);
  if (!total || total < current) return null;
  return { current, total, percent: Math.min(100, Math.round((current / total) * 100)) };
}

function coverTheme(book, index = 0) {
  return book.coverTheme || ["ember", "forest", "steel", "night"][index % 4];
}

function setReaderMode(active) {
  document.body.classList.toggle("is-reader", active);
}

function renderShelf() {
  setReaderMode(false);
  const fragment = document.querySelector("#shelfTemplate").content.cloneNode(true);
  const shelf = fragment.querySelector("#bookShelf");
  fragment.querySelector("#bookCount").textContent = `${state.books.length} 本`;

  if (!state.books.length) {
    shelf.innerHTML = '<div class="empty-state">書架目前是空的。</div>';
  } else {
    state.books.forEach((book, index) => {
      const lastUpdated = getLastUpdated(book);
      const progress = getProgress(book);
      const link = document.createElement("a");
      link.className = "book-card";
      link.href = `#/book/${encodeURIComponent(book.slug)}`;
      link.innerHTML = `
        <div class="book-cover theme-${escapeHTML(coverTheme(book, index))}" aria-hidden="true">
          <span>VOL. ${String(book.volume || index + 1).padStart(2, "0")}</span>
          <div class="cover-emblem">✦</div>
          <strong>${escapeHTML(book.coverTitle || book.title.en)}</strong>
          <small>${escapeHTML(book.coverMark || "PATH NOTES")}</small>
        </div>
        <div class="book-card-copy">
          <div class="book-card-topline">
            <p class="eyebrow">VOLUME ${escapeHTML(book.volume || index + 1)}</p>
            <span class="status-chip">${escapeHTML(book.status || "連載中")}</span>
          </div>
          <h2>${escapeHTML(book.title.en)}</h2>
          <p class="book-zh">${escapeHTML(book.title.zh)}</p>
          <p>${escapeHTML(book.description || "")}</p>
          <div class="shelf-meta">
            <span>${book.chapters.length} 章已發布</span>
            <span>${lastUpdated ? `更新 ${escapeHTML(formatDate(lastUpdated))}` : "尚未更新"}</span>
          </div>
          ${progress ? `
            <div class="mini-progress" aria-label="連載進度 ${progress.percent}%">
              <span style="width:${progress.percent}%"></span>
            </div>
            <div class="mini-progress-label">${progress.current} / ${progress.total} 章 · ${progress.percent}%</div>` : ""}
        </div>`;
      shelf.appendChild(link);
    });
  }

  app.replaceChildren(fragment);
  document.title = "Path Notes｜雙語閱讀書庫";
  window.scrollTo({ top: 0 });
}

function renderBook(bookSlug) {
  setReaderMode(false);
  const book = findBook(bookSlug);
  if (!book) return renderNotFound("找不到這本書。");

  const bookIndex = Math.max(0, state.books.indexOf(book));
  const lastUpdated = getLastUpdated(book);
  const progress = getProgress(book);
  const fragment = document.querySelector("#bookTemplate").content.cloneNode(true);

  fragment.querySelector("#bookKicker").textContent = `VOLUME ${book.volume || bookIndex + 1}`;
  fragment.querySelector("#bookTitle").textContent = book.title.en;
  fragment.querySelector("#bookSubtitle").textContent = book.title.zh;
  fragment.querySelector("#bookDescription").textContent = book.description || "";
  fragment.querySelector("#chapterCount").textContent = book.chapters.length;
  fragment.querySelector("#bookStatus").textContent = book.status || "連載中";
  fragment.querySelector("#bookLastUpdated").textContent = formatDate(lastUpdated);
  fragment.querySelector("#bookCoverKicker").textContent = `VOL. ${String(book.volume || bookIndex + 1).padStart(2, "0")}`;
  fragment.querySelector("#bookCoverTitle").textContent = book.coverTitle || book.title.en;
  fragment.querySelector("#bookCoverMark").textContent = book.coverMark || "PATH NOTES";
  fragment.querySelector("#largeBookCover").classList.add(`theme-${coverTheme(book, bookIndex)}`);

  if (progress) {
    const progressBox = fragment.querySelector("#bookProgress");
    progressBox.hidden = false;
    fragment.querySelector("#bookProgressLabel").textContent = `${progress.current} / ${progress.total} · ${progress.percent}%`;
    fragment.querySelector("#bookProgressBar").style.width = `${progress.percent}%`;
  }

  const list = fragment.querySelector("#chapterList");
  [...book.chapters]
    .sort((a, b) => a.episode - b.episode)
    .forEach(chapter => {
      const link = document.createElement("a");
      link.className = "chapter-row";
      link.href = `#/book/${encodeURIComponent(book.slug)}/story/${encodeURIComponent(chapter.slug)}`;
      link.innerHTML = `
        <div class="chapter-number">${String(chapter.episode).padStart(2, "0")}</div>
        <div class="chapter-copy">
          <h3>${escapeHTML(chapter.title.en)}</h3>
          <p>${escapeHTML(chapter.title.zh)}</p>
          <small>${escapeHTML(formatDate(chapter.date))}</small>
        </div>
        <span class="arrow" aria-hidden="true">→</span>`;
      list.appendChild(link);
    });

  app.replaceChildren(fragment);
  document.title = `${book.title.en}｜Path Notes`;
  window.scrollTo({ top: 0 });
}

function renderStory(bookSlug, storySlug) {
  const book = findBook(bookSlug);
  if (!book) return renderNotFound("找不到這本書。");
  const story = book.chapters.find(item => item.slug === storySlug);
  if (!story) return renderNotFound("找不到這個章節。");

  setReaderMode(true);
  const fragment = document.querySelector("#readerTemplate").content.cloneNode(true);
  const tocHref = `#/book/${encodeURIComponent(book.slug)}`;
  fragment.querySelector("#backToBook").href = tocHref;
  fragment.querySelector("#footerBackToBook").href = tocHref;
  fragment.querySelector("#storyMeta").textContent = `${book.title.en} · CHAPTER ${String(story.episode).padStart(2, "0")} · ${formatDate(story.date)}`;
  fragment.querySelector("#storyTitle").textContent = story.title.en;
  fragment.querySelector("#storySubtitle").textContent = story.title.zh;
  fragment.querySelector("#storyRecap").textContent = story.recap || "A new road begins.";
  fragment.querySelector("#endingLine").textContent = story.ending || "The Path continues tomorrow.";

  const body = fragment.querySelector("#storyBody");
  story.paragraphs.forEach(paragraph => {
    const pair = document.createElement("div");
    pair.className = `story-pair${paragraph.type === "dialogue" ? " dialogue" : ""}`;
    pair.innerHTML = `<p class="en" lang="en">${escapeHTML(paragraph.en)}</p><p class="zh" lang="zh-Hant">${escapeHTML(paragraph.zh)}</p>`;
    body.appendChild(pair);
  });

  app.replaceChildren(fragment);
  document.title = `${story.title.en}｜${book.title.en}`;
  window.scrollTo({ top: 0 });
}

function renderNotFound(message) {
  setReaderMode(false);
  app.innerHTML = `<div class="empty-state">${escapeHTML(message)}<br><br><a href="#/">回到書架</a></div>`;
}

function route() {
  const storyMatch = location.hash.match(/^#\/book\/([^/]+)\/story\/(.+)$/);
  if (storyMatch) return renderStory(decodeURIComponent(storyMatch[1]), decodeURIComponent(storyMatch[2]));
  const bookMatch = location.hash.match(/^#\/book\/(.+)$/);
  if (bookMatch) return renderBook(decodeURIComponent(bookMatch[1]));
  renderShelf();
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
    const data = await response.json();
    state.books = Array.isArray(data) ? [{
      slug: "witcher-path-notes",
      volume: 1,
      coverTitle: "PATH NOTES",
      coverMark: "THE CONTINENT",
      coverTheme: "ember",
      title: { en: "The Witcher: Path Notes", zh: "獵魔士：旅途札記" },
      description: "Geralt travels the roads of the Continent between familiar events, one quiet contract and human choice at a time.",
      status: "連載中",
      chapters: data
    }] : (data.books || []);
  } catch (error) {
    console.error("Unable to load library:", error);
    state.books = [];
  }
  route();
}

boot();
