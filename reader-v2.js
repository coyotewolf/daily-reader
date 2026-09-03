async function loadCompressedStoryJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const base64 = (await response.text()).trim();
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));

  if (!("DecompressionStream" in window)) {
    throw new Error("This browser does not support compressed story content.");
  }

  const decompressed = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));

  return JSON.parse(await new Response(decompressed).text());
}

async function ensureStoryContent(story) {
  if (story.content?.en?.length || story.paragraphs?.length) return story;
  if (!story.contentFile) return story;

  if (!story._contentPromise) {
    story._contentPromise = loadCompressedStoryJson(story.contentFile)
      .then(content => {
        story.content = content;
        return story;
      })
      .catch(error => {
        story._contentPromise = null;
        throw error;
      });
  }

  return story._contentPromise;
}

function contextualHintText() {
  if (state.uiLocale === "zh-Hans") return "长按英文单词可按语境查看对应意思";
  if (state.uiLocale === "zh-Hant") return "長按英文單字可依語境查看對應意思";
  return "Long-press an English word for its meaning in context";
}

async function renderStory(bookSlug, storySlug) {
  const book = findBook(bookSlug);
  if (!book) return renderNotFound("bookNotFound");
  const story = book.chapters.find(item => item.slug === storySlug);
  if (!story) return renderNotFound("chapterNotFound");

  try {
    await ensureStoryContent(story);
  } catch (error) {
    console.error("Unable to load story content:", error);
    return renderNotFound("chapterNotFound");
  }

  setReaderMode(true);
  state.activeStory = story;
  const fragment = document.querySelector("#readerTemplate").content.cloneNode(true);
  translateTree(fragment);

  const tocHref = `#/book/${encodeURIComponent(book.slug)}`;
  fragment.querySelector("#backToBook").href = tocHref;
  fragment.querySelector("#footerBackToBook").href = tocHref;

  const publishedAt = chapterDate(story);
  fragment.querySelector("#storyMeta").textContent =
    `${t("chapterNumber", { n: story.episode })} · ${t("publishedOn", { date: formatDate(publishedAt) })}`;

  fragment.querySelector("#storyTitleEn").innerHTML = tokenizeEnglish(story.title?.en || "");
  fragment.querySelector("#storyTitleZh").textContent = story.title?.zh || story.title?.zhHant || "";

  fragment.querySelector("#storyRecapEn").innerHTML = tokenizeEnglish(story.recap?.en || "");
  fragment.querySelector("#storyRecapZh").textContent = story.recap?.zh || story.recap?.zhHant || "";

  const hint = fragment.querySelector(".word-hint");
  if (hint) hint.textContent = contextualHintText();

  const englishBody = fragment.querySelector("#englishBody");
  (story.content?.en || story.paragraphs?.map(p => p.en).filter(Boolean) || []).forEach((paragraph, index) => {
    const p = document.createElement("p");
    p.className = "story-paragraph";
    p.dataset.paragraphIndex = String(index);
    p.innerHTML = tokenizeEnglish(paragraph);
    englishBody.appendChild(p);
  });

  const chineseBody = fragment.querySelector("#chineseBody");
  (story.content?.zh || story.paragraphs?.map(p => p.zh).filter(Boolean) || []).forEach((paragraph, index) => {
    const p = document.createElement("p");
    p.className = "story-paragraph";
    p.dataset.paragraphIndex = String(index);
    p.textContent = paragraph;
    chineseBody.appendChild(p);
  });

  app.replaceChildren(fragment);
  document.title = `${localizedValue(story.title)} | ${localizedValue(book.title)}`;
  window.scrollTo({ top: 0 });
}

// Context-aware word lookup -------------------------------------------------
// The full sentence is translated internally so the selected word can be
// aligned to its context-specific Chinese meaning. Only that word meaning is
// ever shown in the popup; the sentence translation stays internal.

const CONTEXT_CACHE_KEY = "pathnotes-context-cache-v3";
let contextLookupSerial = 0;
let contextualLongPress = null;

function lookupLabels() {
  if (state.uiLocale === "zh-Hans") {
    return { approximate: "约", unavailable: "无法可靠判断这个词义" };
  }
  if (state.uiLocale === "zh-Hant") {
    return { approximate: "約", unavailable: "無法可靠判斷這個詞義" };
  }
  return { approximate: "Approx.", unavailable: "Could not reliably determine this meaning" };
}

(function installContextLookupStyle() {
  if (document.querySelector("#context-lookup-style")) return;
  const style = document.createElement("style");
  style.id = "context-lookup-style";
  style.textContent = `.lookup-word.context-pressed { background: var(--accent-soft); }`;
  document.head.appendChild(style);
})();

function normalizeContextSentence(sentence) {
  return String(sentence || "").replace(/\s+/g, " ").trim();
}

function contextHash(text) {
  let hash = 2166136261;
  const source = String(text || "");
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function readContextCache() {
  try {
    return JSON.parse(localStorage.getItem(CONTEXT_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeContextCache(cache) {
  try {
    const entries = Object.entries(cache).slice(-300);
    localStorage.setItem(CONTEXT_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Ignore private-mode/quota failures.
  }
}

function targetChineseLocale() {
  return state.uiLocale === "zh-Hans" ? "zh-CN" : "zh-TW";
}

function decodeTranslationEntities(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = String(value || "");
  return textarea.value;
}

async function translateContextText(text) {
  const target = targetChineseLocale();
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `en|${target}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    let translated = decodeTranslationEntities(data?.responseData?.translatedText || "").trim();

    if (!translated && Array.isArray(data?.matches)) {
      translated = decodeTranslationEntities(
        data.matches.find(item => item?.translation)?.translation || ""
      ).trim();
    }

    if (!translated) throw new Error("No translation");
    return translated;
  } finally {
    clearTimeout(timer);
  }
}

function sentenceContextForWord(wordElement) {
  const container = wordElement.closest(
    ".story-paragraph, #storyRecapEn, #storyTitleEn"
  ) || wordElement.parentElement;
  if (!container) return null;

  const fullText = container.textContent || "";
  if (!fullText.trim()) return null;

  const range = document.createRange();
  range.setStart(container, 0);
  range.setEndBefore(wordElement);
  const absoluteWordOffset = range.toString().length;
  const word = wordElement.textContent || wordElement.dataset.word || "";

  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    for (const segment of segmenter.segment(fullText)) {
      const start = segment.index;
      const end = start + segment.segment.length;
      if (absoluteWordOffset >= start && absoluteWordOffset < end) {
        const raw = segment.segment;
        const leading = raw.length - raw.trimStart().length;
        return {
          sentence: raw.trim(),
          word,
          wordOffset: Math.max(0, absoluteWordOffset - start - leading)
        };
      }
    }
  }

  const sentenceRegex = /[^.!?]+(?:[.!?]+["”’']*|$)/g;
  let match;
  while ((match = sentenceRegex.exec(fullText)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (absoluteWordOffset >= start && absoluteWordOffset < end) {
      const raw = match[0];
      const leading = raw.length - raw.trimStart().length;
      return {
        sentence: raw.trim(),
        word,
        wordOffset: Math.max(0, absoluteWordOffset - start - leading)
      };
    }
  }

  return {
    sentence: fullText.trim(),
    word,
    wordOffset: Math.max(0, absoluteWordOffset - (fullText.length - fullText.trimStart().length))
  };
}

function markWordInSentence(context, openMarker, closeMarker) {
  const sentence = context.sentence;
  const word = context.word;
  let offset = Math.min(Math.max(0, context.wordOffset), sentence.length);

  if (sentence.slice(offset, offset + word.length) !== word) {
    const normalizedWord = normalizeLookupWord(word);
    const candidates = [...sentence.matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)*/g)];
    const nearest = candidates
      .filter(match => normalizeLookupWord(match[0]) === normalizedWord)
      .sort((a, b) => Math.abs(a.index - offset) - Math.abs(b.index - offset))[0];
    if (nearest) offset = nearest.index;
  }

  return `${sentence.slice(0, offset)}${openMarker}${sentence.slice(offset, offset + word.length)}${closeMarker}${sentence.slice(offset + word.length)}`;
}

function extractMarkedMeaning(translated, markerPairs) {
  for (const [open, close] of markerPairs) {
    const start = translated.indexOf(open);
    if (start === -1) continue;
    const end = translated.indexOf(close, start + open.length);
    if (end === -1) continue;

    const meaning = translated.slice(start + open.length, end).trim();
    if (meaning && /[\u3400-\u9fff]/.test(meaning)) {
      return { meaning, aligned: true };
    }
  }
  return null;
}

async function fetchContextualWordTranslation(wordElement) {
  const context = sentenceContextForWord(wordElement);
  if (!context) throw new Error("No sentence context");

  const sentence = normalizeContextSentence(context.sentence);
  const word = context.word;
  const target = targetChineseLocale();
  const cache = readContextCache();
  const key = `${target}:${normalizeLookupWord(word)}:${contextHash(sentence)}`;
  if (cache[key]) return cache[key];

  const markedPrimary = markWordInSentence(context, "⟦", "⟧");
  const primaryTranslation = await translateContextText(markedPrimary);
  let result = extractMarkedMeaning(primaryTranslation, [
    ["⟦", "⟧"],
    ["【", "】"],
    ["[", "]"]
  ]);

  if (!result) {
    const markedSecondary = markWordInSentence(context, "[", "]");
    const secondaryTranslation = await translateContextText(markedSecondary);
    result = extractMarkedMeaning(secondaryTranslation, [
      ["[", "]"],
      ["【", "】"],
      ["⟦", "⟧"]
    ]);
  }

  if (!result) {
    // Translate the unmarked whole sentence as an internal contextual pass.
    // We deliberately do not expose that sentence translation to the UI.
    await translateContextText(sentence);

    const local = localWordTranslation(word);
    let fallback = local;
    if (!fallback) {
      try {
        fallback = await fetchWordTranslation(word);
      } catch {
        fallback = null;
      }
    }

    result = {
      meaning: fallback || lookupLabels().unavailable,
      aligned: false
    };
  }

  cache[key] = result;
  writeContextCache(cache);
  return result;
}

async function showContextualWordTranslation(wordElement) {
  if (!wordElement || !wordPopup) return;
  const word = wordElement.dataset.word || wordElement.textContent || "";
  if (!word.trim()) return;

  const serial = ++contextLookupSerial;
  const labels = lookupLabels();

  wordPopup.hidden = false;
  wordPopupSource.textContent = word;
  wordPopupTranslation.textContent = t("translating");

  // Remove any context line left behind by an older cached page/script version.
  wordPopup.querySelector(".word-popup-context")?.remove();
  positionWordPopup(wordElement);

  try {
    const result = await fetchContextualWordTranslation(wordElement);
    if (serial !== contextLookupSerial || wordPopupSource.textContent !== word) return;

    wordPopupTranslation.textContent = result.aligned
      ? result.meaning
      : `${labels.approximate} ${result.meaning}`;
  } catch (error) {
    console.warn("Contextual lookup failed:", error);
    if (serial !== contextLookupSerial || wordPopupSource.textContent !== word) return;
    wordPopupTranslation.textContent = t("translationUnavailable");
  }

  positionWordPopup(wordElement);
}

function clearContextualLongPress() {
  if (!contextualLongPress) return;
  clearTimeout(contextualLongPress.timer);
  contextualLongPress.word?.classList.remove("context-pressed");
  contextualLongPress = null;
}

document.addEventListener("pointerdown", event => {
  const word = event.target.closest?.(".lookup-word");
  if (!word) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;

  event.stopImmediatePropagation();
  clearContextualLongPress();
  word.classList.add("context-pressed");

  contextualLongPress = {
    word,
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    timer: setTimeout(() => {
      if (!contextualLongPress || contextualLongPress.word !== word) return;
      word.classList.remove("context-pressed");
      showContextualWordTranslation(word);
      if (navigator.vibrate) navigator.vibrate(8);
      contextualLongPress = null;
    }, 520)
  };
}, true);

document.addEventListener("pointermove", event => {
  if (!contextualLongPress || event.pointerId !== contextualLongPress.pointerId) return;
  if (Math.hypot(event.clientX - contextualLongPress.x, event.clientY - contextualLongPress.y) > 10) {
    clearContextualLongPress();
  }
}, true);

["pointerup", "pointercancel"].forEach(type => {
  document.addEventListener(type, event => {
    if (!contextualLongPress || event.pointerId !== contextualLongPress.pointerId) return;
    clearContextualLongPress();
  }, true);
});

document.addEventListener("contextmenu", event => {
  const word = event.target.closest?.(".lookup-word");
  if (!word) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  clearContextualLongPress();
  showContextualWordTranslation(word);
}, true);
