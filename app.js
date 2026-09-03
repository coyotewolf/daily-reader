const translations = {
  en: {
    librarySubtitle: "Bilingual Reading Library",
    backShelf: "← Back to library",
    readerSettings: "Reading settings",
    contentLanguage: "Story language",
    both: "Both",
    fontSmaller: "Decrease font size",
    fontLarger: "Increase font size",
    themeToLight: "Switch to light mode",
    themeToDark: "Switch to dark mode",
    shelfEyebrow: "MY LIBRARY",
    shelfTitle: "Library",
    shelfDescription: "Choose a book to start reading. Each book has its own table of contents and continuous chapters.",
    allBooks: "All books",
    contents: "Contents",
    chapters: "Chapters",
    backContents: "← Back to contents",
    previously: "Previously",
    readingComplete: "Finished",
    publicationProgress: "Publication progress",
    emptyShelf: "Your library is empty.",
    bookNotFound: "Book not found.",
    chapterNotFound: "Chapter not found.",
    ongoing: "Ongoing",
    completed: "Completed",
    hiatus: "On hiatus",
    volume: "VOLUME {n}",
    volumeShort: "VOL. {n}",
    bookCount: "{n} {unit}",
    publishedChapters: "{n} {unit} published",
    updated: "Updated {date}",
    neverUpdated: "No updates yet",
    lastUpdated: "Last updated {date}",
    progressLabel: "{current} / {total} chapters · {percent}%",
    chapterNumber: "CHAPTER {n}",
    docLibrary: "Path Notes | Bilingual Reading Library"
  },
  "zh-Hant": {
    librarySubtitle: "雙語閱讀書庫",
    backShelf: "← 回到書架",
    readerSettings: "閱讀設定",
    contentLanguage: "故事語言",
    both: "雙語",
    fontSmaller: "縮小字體",
    fontLarger: "放大字體",
    themeToLight: "切換日間模式",
    themeToDark: "切換夜間模式",
    shelfEyebrow: "我的書庫",
    shelfTitle: "書架",
    shelfDescription: "選一本書開始閱讀。每本書都有自己的目錄與連續章節。",
    allBooks: "所有書籍",
    contents: "目錄",
    chapters: "章節",
    backContents: "← 回到目錄",
    previously: "前情提要",
    readingComplete: "閱讀完畢",
    publicationProgress: "連載進度",
    emptyShelf: "書架目前是空的。",
    bookNotFound: "找不到這本書。",
    chapterNotFound: "找不到這個章節。",
    ongoing: "連載中",
    completed: "已完結",
    hiatus: "暫停連載",
    volume: "第 {n} 卷",
    volumeShort: "卷 {n}",
    bookCount: "{n} 本",
    publishedChapters: "已發布 {n} 章",
    updated: "更新 {date}",
    neverUpdated: "尚未更新",
    lastUpdated: "最後更新 {date}",
    progressLabel: "{current} / {total} 章 · {percent}%",
    chapterNumber: "第 {n} 章",
    docLibrary: "Path Notes｜雙語閱讀書庫"
  },
  "zh-Hans": {
    librarySubtitle: "双语阅读书库",
    backShelf: "← 返回书架",
    readerSettings: "阅读设置",
    contentLanguage: "故事语言",
    both: "双语",
    fontSmaller: "缩小字体",
    fontLarger: "放大字体",
    themeToLight: "切换日间模式",
    themeToDark: "切换夜间模式",
    shelfEyebrow: "我的书库",
    shelfTitle: "书架",
    shelfDescription: "选择一本书开始阅读。每本书都有自己的目录与连续章节。",
    allBooks: "所有书籍",
    contents: "目录",
    chapters: "章节",
    backContents: "← 返回目录",
    previously: "前情提要",
    readingComplete: "阅读完毕",
    publicationProgress: "连载进度",
    emptyShelf: "书架目前是空的。",
    bookNotFound: "找不到这本书。",
    chapterNotFound: "找不到这个章节。",
    ongoing: "连载中",
    completed: "已完结",
    hiatus: "暂停连载",
    volume: "第 {n} 卷",
    volumeShort: "卷 {n}",
    bookCount: "{n} 本",
    publishedChapters: "已发布 {n} 章",
    updated: "更新 {date}",
    neverUpdated: "尚未更新",
    lastUpdated: "最后更新 {date}",
    progressLabel: "{current} / {total} 章 · {percent}%",
    chapterNumber: "第 {n} 章",
    docLibrary: "Path Notes｜双语阅读书库"
  }
};

function detectSystemLocale() {
  const preferred = (navigator.languages?.[0] || navigator.language || "en").toLowerCase();
  if (!preferred.startsWith("zh")) return "en";
  if (preferred.includes("hans") || /-(cn|sg|my)(-|$)/.test(preferred)) return "zh-Hans";
  return "zh-Hant";
}

const state = {
  books: [],
  uiLocale: detectSystemLocale(),
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

function t(key, params = {}) {
  const table = translations[state.uiLocale] || translations.en;
  let value = table[key] ?? translations.en[key] ?? key;
  Object.entries(params).forEach(([name, replacement]) => {
    value = value.replaceAll(`{${name}}`, String(replacement));
  });
  return value;
}

function translateTree(scope) {
  scope.querySelectorAll?.("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });
  scope.querySelectorAll?.("[data-i18n-aria]").forEach(element => {
    element.setAttribute("aria-label", t(element.dataset.i18nAria));
  });
}

function localizedValue(value) {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);
  if (state.uiLocale === "en") return value.en ?? value.zh ?? value.zhHant ?? value.zhHans ?? "";
  if (state.uiLocale === "zh-Hans") return value.zhHans ?? value["zh-Hans"] ?? value.zh ?? value.zhHant ?? value.en ?? "";
  return value.zhHant ?? value["zh-Hant"] ?? value.zh ?? value.zhHans ?? value.en ?? "";
}

function statusText(status) {
  if (typeof status === "object") return localizedValue(status);
  const aliases = {
    ongoing: "ongoing", "連載中": "ongoing", "连载中": "ongoing",
    completed: "completed", "已完結": "completed", "已完结": "completed", "完結": "completed", "完结": "completed",
    hiatus: "hiatus", "暫停連載": "hiatus", "暂停连载": "hiatus"
  };
  const key = aliases[status] || status;
  return translations.en[key] ? t(key) : String(status || t("ongoing"));
}

function applySettings() {
  root.dataset.theme = state.theme;
  root.dataset.language = state.language;
  root.lang = state.uiLocale;
  root.style.setProperty("--reader-size", `${19 * state.fontScale}px`);
  fontSizeLabel.textContent = `${Math.round(state.fontScale * 100)}%`;
  document.querySelectorAll("[data-lang]").forEach(btn => {
    const active = btn.dataset.lang === state.language;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
  translateTree(document);
  themeToggle.textContent = state.theme === "dark" ? "☀" : "◐";
  const themeLabel = state.theme === "dark" ? t("themeToLight") : t("themeToDark");
  themeToggle.setAttribute("aria-label", themeLabel);
  themeToggle.title = themeLabel;
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
  return new Intl.DateTimeFormat(state.uiLocale, {
    year: "numeric", month: "short", day: "numeric"
  }).format(date);
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
  translateTree(fragment);
  const shelf = fragment.querySelector("#bookShelf");
  fragment.querySelector("#bookCount").textContent = t("bookCount", {
    n: state.books.length,
    unit: state.books.length === 1 ? "book" : "books"
  });

  if (!state.books.length) {
    shelf.innerHTML = `<div class="empty-state">${escapeHTML(t("emptyShelf"))}</div>`;
  } else {
    state.books.forEach((book, index) => {
      const lastUpdated = getLastUpdated(book);
      const progress = getProgress(book);
      const volume = book.volume || index + 1;
      const link = document.createElement("a");
      link.className = "book-card";
      link.href = `#/book/${encodeURIComponent(book.slug)}`;
      link.innerHTML = `
        <div class="book-cover theme-${escapeHTML(coverTheme(book, index))}" aria-hidden="true">
          <span>${escapeHTML(t("volumeShort", { n: String(volume).padStart(2, "0") }))}</span>
          <div class="cover-emblem">✦</div>
          <strong>${escapeHTML(localizedValue(book.coverTitle || book.title))}</strong>
          <small>${escapeHTML(localizedValue(book.coverMark || "PATH NOTES"))}</small>
        </div>
        <div class="book-card-copy">
          <div class="book-card-topline">
            <p class="eyebrow">${escapeHTML(t("volume", { n: volume }))}</p>
            <span class="status-chip">${escapeHTML(statusText(book.status || "ongoing"))}</span>
          </div>
          <h2>${escapeHTML(localizedValue(book.title))}</h2>
          <p>${escapeHTML(localizedValue(book.description))}</p>
          <div class="shelf-meta">
            <span>${escapeHTML(t("publishedChapters", { n: book.chapters.length, unit: book.chapters.length === 1 ? "chapter" : "chapters" }))}</span>
            <span>${lastUpdated ? escapeHTML(t("updated", { date: formatDate(lastUpdated) })) : escapeHTML(t("neverUpdated"))}</span>
          </div>
          ${progress ? `
            <div class="mini-progress" aria-label="${escapeHTML(t("publicationProgress"))} ${progress.percent}%">
              <span style="width:${progress.percent}%"></span>
            </div>
            <div class="mini-progress-label">${escapeHTML(t("progressLabel", progress))}</div>` : ""}
        </div>`;
      shelf.appendChild(link);
    });
  }

  app.replaceChildren(fragment);
  document.title = t("docLibrary");
  window.scrollTo({ top: 0 });
}

function renderBook(bookSlug) {
  setReaderMode(false);
  const book = findBook(bookSlug);
  if (!book) return renderNotFound("bookNotFound");

  const bookIndex = Math.max(0, state.books.indexOf(book));
  const volume = book.volume || bookIndex + 1;
  const lastUpdated = getLastUpdated(book);
  const progress = getProgress(book);
  const fragment = document.querySelector("#bookTemplate").content.cloneNode(true);
  translateTree(fragment);

  fragment.querySelector("#bookKicker").textContent = t("volume", { n: volume });
  fragment.querySelector("#bookTitle").textContent = localizedValue(book.title);
  fragment.querySelector("#bookDescription").textContent = localizedValue(book.description);
  fragment.querySelector("#bookStatus").textContent = statusText(book.status || "ongoing");
  fragment.querySelector("#publishedChaptersStat").textContent = t("publishedChapters", {
    n: book.chapters.length,
    unit: book.chapters.length === 1 ? "chapter" : "chapters"
  });
  fragment.querySelector("#lastUpdatedStat").textContent = lastUpdated
    ? t("lastUpdated", { date: formatDate(lastUpdated) })
    : t("neverUpdated");
  fragment.querySelector("#bookCoverKicker").textContent = t("volumeShort", { n: String(volume).padStart(2, "0") });
  fragment.querySelector("#bookCoverTitle").textContent = localizedValue(book.coverTitle || book.title);
  fragment.querySelector("#bookCoverMark").textContent = localizedValue(book.coverMark || "PATH NOTES");
  fragment.querySelector("#largeBookCover").classList.add(`theme-${coverTheme(book, bookIndex)}`);

  if (progress) {
    const progressBox = fragment.querySelector("#bookProgress");
    progressBox.hidden = false;
    fragment.querySelector("#bookProgressLabel").textContent = t("progressLabel", progress);
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
          <h3>${escapeHTML(localizedValue(chapter.title))}</h3>
          <small>${escapeHTML(formatDate(chapter.date))}</small>
        </div>
        <span class="arrow" aria-hidden="true">→</span>`;
      list.appendChild(link);
    });

  app.replaceChildren(fragment);
  document.title = `${localizedValue(book.title)} | Path Notes`;
  window.scrollTo({ top: 0 });
}

function renderStory(bookSlug, storySlug) {
  const book = findBook(bookSlug);
  if (!book) return renderNotFound("bookNotFound");
  const story = book.chapters.find(item => item.slug === storySlug);
  if (!story) return renderNotFound("chapterNotFound");

  setReaderMode(true);
  const fragment = document.querySelector("#readerTemplate").content.cloneNode(true);
  translateTree(fragment);
  const tocHref = `#/book/${encodeURIComponent(book.slug)}`;
  fragment.querySelector("#backToBook").href = tocHref;
  fragment.querySelector("#footerBackToBook").href = tocHref;
  fragment.querySelector("#storyMeta").textContent = `${localizedValue(book.title)} · ${t("chapterNumber", { n: String(story.episode).padStart(2, "0") })} · ${formatDate(story.date)}`;
  fragment.querySelector("#storyTitle").textContent = localizedValue(story.title);
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
  document.title = `${localizedValue(story.title)} | ${localizedValue(book.title)}`;
  window.scrollTo({ top: 0 });
}

function renderNotFound(key) {
  setReaderMode(false);
  app.innerHTML = `<div class="empty-state">${escapeHTML(t(key))}<br><br><a href="#/">${escapeHTML(t("backShelf"))}</a></div>`;
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
window.addEventListener("languagechange", () => {
  state.uiLocale = detectSystemLocale();
  applySettings();
  route();
});

async function boot() {
  applySettings();
  try {
    const response = await fetch("./data/stories.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.books = Array.isArray(data) ? [{
      slug: "witcher-path-notes",
      volume: 1,
      coverTitle: { en: "PATH NOTES", zh: "旅途札記" },
      coverMark: { en: "THE CONTINENT", zh: "大陸" },
      coverTheme: "ember",
      title: { en: "The Witcher: Path Notes", zh: "獵魔士：旅途札記" },
      description: {
        en: "Geralt travels the roads of the Continent between familiar events, one quiet contract and human choice at a time.",
        zh: "傑洛特行走於大陸的道路，在熟悉事件之間，一次次面對不起眼的委託與人的選擇。"
      },
      status: "ongoing",
      chapters: data
    }] : (data.books || []);
  } catch (error) {
    console.error("Unable to load library:", error);
    state.books = [];
  }
  route();
}

boot();
