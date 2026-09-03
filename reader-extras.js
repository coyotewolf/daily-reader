const LINE_HEIGHT_MIN = 1.35;
const LINE_HEIGHT_MAX = 2.05;
const LINE_HEIGHT_STEP = 0.1;
const READER_CHROME_HIDE_DELAY = 2200;

function readSavedLineHeight() {
  const saved = Number(localStorage.getItem("pathnotes-line-height") || "1.65");
  if (!Number.isFinite(saved)) return 1.65;
  return Math.min(LINE_HEIGHT_MAX, Math.max(LINE_HEIGHT_MIN, saved));
}

let readerLineHeight = readSavedLineHeight();
let readerChromeTimer = null;

function lineHeightLocaleText(kind) {
  const locale = state?.uiLocale || "en";
  const table = {
    en: {
      down: "Decrease line spacing",
      up: "Increase line spacing",
      previous: "← Previous chapter",
      next: "Next chapter →"
    },
    "zh-Hant": {
      down: "縮小行距",
      up: "放大行距",
      previous: "← 上一章",
      next: "下一章 →"
    },
    "zh-Hans": {
      down: "缩小行距",
      up: "放大行距",
      previous: "← 上一章",
      next: "下一章 →"
    }
  };
  return (table[locale] || table.en)[kind];
}

function applyReaderLineHeight() {
  document.documentElement.style.setProperty("--reader-line-height", readerLineHeight.toFixed(2));
  const label = document.querySelector("#lineHeightLabel");
  if (label) label.textContent = readerLineHeight.toFixed(2).replace(/0$/, "");

  const down = document.querySelector("#lineHeightDown");
  const up = document.querySelector("#lineHeightUp");

  if (down) {
    down.setAttribute("aria-label", lineHeightLocaleText("down"));
    down.title = lineHeightLocaleText("down");
    down.disabled = readerLineHeight <= LINE_HEIGHT_MIN + 0.001;
  }
  if (up) {
    up.setAttribute("aria-label", lineHeightLocaleText("up"));
    up.title = lineHeightLocaleText("up");
    up.disabled = readerLineHeight >= LINE_HEIGHT_MAX - 0.001;
  }
}

function changeReaderLineHeight(delta) {
  readerLineHeight = Math.round((readerLineHeight + delta) * 100) / 100;
  readerLineHeight = Math.min(LINE_HEIGHT_MAX, Math.max(LINE_HEIGHT_MIN, readerLineHeight));
  localStorage.setItem("pathnotes-line-height", String(readerLineHeight));
  applyReaderLineHeight();
}

function chapterHref(book, chapter) {
  return `#/book/${encodeURIComponent(book.slug)}/story/${encodeURIComponent(chapter.slug)}`;
}

function addChapterNavigation(bookSlug, storySlug) {
  const reader = document.querySelector(".reader");
  if (!reader) return;

  reader.querySelector(".chapter-navigation")?.remove();
  const book = findBook(bookSlug);
  if (!book) return;

  const chapters = [...(book.chapters || [])].sort((a, b) => Number(a.episode) - Number(b.episode));
  const index = chapters.findIndex(chapter => chapter.slug === storySlug);
  if (index < 0) return;

  const previous = index > 0 ? chapters[index - 1] : null;
  const next = index < chapters.length - 1 ? chapters[index + 1] : null;
  if (!previous && !next) return;

  const nav = document.createElement("nav");
  nav.className = `chapter-navigation${!previous && next ? " single-next" : ""}`;
  nav.setAttribute("aria-label", state.uiLocale === "en" ? "Chapter navigation" : "章節導覽");

  if (previous) {
    const link = document.createElement("a");
    link.className = "chapter-nav-link previous";
    link.href = chapterHref(book, previous);
    link.innerHTML = `<span class="chapter-nav-label">${escapeHTML(lineHeightLocaleText("previous"))}</span><strong class="chapter-nav-title">${escapeHTML(localizedValue(previous.title))}</strong>`;
    nav.appendChild(link);
  }

  if (next) {
    const link = document.createElement("a");
    link.className = "chapter-nav-link next";
    link.href = chapterHref(book, next);
    link.innerHTML = `<span class="chapter-nav-label">${escapeHTML(lineHeightLocaleText("next"))}</span><strong class="chapter-nav-title">${escapeHTML(localizedValue(next.title))}</strong>`;
    nav.appendChild(link);
  }

  const footer = reader.querySelector(".story-footer");
  if (footer) footer.insertAdjacentElement("beforebegin", nav);
  else reader.appendChild(nav);
}

function clearReaderChromeTimer() {
  if (readerChromeTimer !== null) {
    window.clearTimeout(readerChromeTimer);
    readerChromeTimer = null;
  }
}

function isActualReaderPage() {
  return document.body.classList.contains("is-reader") && Boolean(document.querySelector(".reader"));
}

function hideReaderChrome() {
  if (!isActualReaderPage()) return;
  clearReaderChromeTimer();
  document.body.classList.add("reader-chrome-hidden");
}

function scheduleReaderChromeHide(delay = READER_CHROME_HIDE_DELAY) {
  clearReaderChromeTimer();
  if (!isActualReaderPage()) return;
  readerChromeTimer = window.setTimeout(() => {
    if (isActualReaderPage()) hideReaderChrome();
  }, delay);
}

function showReaderChrome(autoHide = true) {
  if (!isActualReaderPage()) return;
  document.body.classList.remove("reader-chrome-hidden");
  if (autoHide) scheduleReaderChromeHide();
}

function isReaderChromeInteractiveTarget(target) {
  return Boolean(target?.closest?.(
    ".topbar, .reader-tools, a, button, input, select, textarea, .lookup-word, .word-popup, .chapter-navigation"
  ));
}

function syncReaderEnhancements() {
  applyReaderLineHeight();

  const match = location.hash.match(/^#\/book\/([^/]+)\/story\/(.+)$/);
  if (match && document.querySelector(".reader")) {
    addChapterNavigation(decodeURIComponent(match[1]), decodeURIComponent(match[2]));
    document.body.classList.remove("reader-chrome-hidden");
    scheduleReaderChromeHide();
  } else {
    clearReaderChromeTimer();
    document.body.classList.remove("reader-chrome-hidden");
  }
}

document.querySelector("#lineHeightDown")?.addEventListener("click", () => {
  changeReaderLineHeight(-LINE_HEIGHT_STEP);
  showReaderChrome(true);
});

document.querySelector("#lineHeightUp")?.addEventListener("click", () => {
  changeReaderLineHeight(LINE_HEIGHT_STEP);
  showReaderChrome(true);
});

/* Tap the reading surface to restore the chrome. Controls and word lookup keep
   their own behavior and only restart the auto-hide countdown. */
document.addEventListener("click", event => {
  if (!isActualReaderPage()) return;

  if (isReaderChromeInteractiveTarget(event.target)) {
    if (!document.body.classList.contains("reader-chrome-hidden")) scheduleReaderChromeHide();
    return;
  }

  showReaderChrome(true);
}, true);

/* Scrolling or swiping means the user is actively reading: hide immediately. */
window.addEventListener("scroll", () => {
  if (isActualReaderPage()) hideReaderChrome();
}, { passive: true });

document.addEventListener("touchmove", () => {
  if (isActualReaderPage()) hideReaderChrome();
}, { passive: true });

/* The app replaces #app contents on every route. Observe that actual DOM
   change so chrome setup works regardless of which renderStory wrapper ran. */
const readerObserver = new MutationObserver(() => {
  window.requestAnimationFrame(syncReaderEnhancements);
});
readerObserver.observe(document.querySelector("#app"), { childList: true, subtree: false });

window.addEventListener("hashchange", () => {
  window.requestAnimationFrame(syncReaderEnhancements);
});

applyReaderLineHeight();
window.requestAnimationFrame(syncReaderEnhancements);
