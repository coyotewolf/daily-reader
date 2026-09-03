// Paired bilingual renderer ---------------------------------------------------
// In bilingual mode, English and Chinese are interleaved. Single-language
// modes still use the same DOM and are controlled by the existing CSS rules.

function cleanStoryText(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function splitEnglishSentences(text) {
  const value = cleanStoryText(text);
  if (!value) return [];

  if (typeof Intl.Segmenter === "function") {
    try {
      return [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(value)]
        .map(item => cleanStoryText(item.segment))
        .filter(Boolean);
    } catch {
      // Fall through to regex.
    }
  }

  return value.match(/[^.!?]+(?:[.!?]+[”"']*|$)/g)?.map(s => cleanStoryText(s)).filter(Boolean) || [value];
}

function splitChineseSentences(text) {
  const value = cleanStoryText(text);
  if (!value) return [];
  return value.match(/[^。！？!?]+(?:[。！？!?]+[」』”"']*|$)/g)?.map(s => cleanStoryText(s)).filter(Boolean) || [value];
}

function expandPairToSentencePairs(pair) {
  const en = cleanStoryText(pair?.en);
  const zh = cleanStoryText(pair?.zh);
  if (!en && !zh) return [];

  const enSentences = splitEnglishSentences(en);
  const zhSentences = splitChineseSentences(zh);

  if (enSentences.length > 1 && enSentences.length === zhSentences.length) {
    return enSentences
      .map((sentence, index) => ({ en: sentence, zh: zhSentences[index] }))
      .filter(item => item.en || item.zh);
  }

  return [{ en, zh }];
}

function storyPairs(story) {
  if (Array.isArray(story.content?.pairs) && story.content.pairs.length) {
    return story.content.pairs
      .flatMap(expandPairToSentencePairs)
      .filter(pair => cleanStoryText(pair.en) || cleanStoryText(pair.zh));
  }

  const en = story.content?.en || story.paragraphs?.map(p => p.en).filter(Boolean) || [];
  const zh = story.content?.zh || story.paragraphs?.map(p => p.zh).filter(Boolean) || [];
  const count = Math.max(en.length, zh.length);
  const pairs = [];

  for (let i = 0; i < count; i += 1) {
    const pair = { en: cleanStoryText(en[i]), zh: cleanStoryText(zh[i]) };
    if (pair.en || pair.zh) pairs.push(pair);
  }

  return pairs.flatMap(expandPairToSentencePairs).filter(pair => pair.en || pair.zh);
}

function isDialoguePair(pair) {
  const value = cleanStoryText(pair?.en || pair?.zh);
  return /^[“"「『]/.test(value);
}

renderStory = async function renderStoryPaired(bookSlug, storySlug) {
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
  if (hint && typeof contextualHintText === "function") hint.textContent = contextualHintText();

  const storyBody = fragment.querySelector("#storyBody");
  storyBody.replaceChildren();

  storyPairs(story).forEach((pair, index) => {
    const enText = cleanStoryText(pair.en);
    const zhText = cleanStoryText(pair.zh);
    if (!enText && !zhText) return;

    const wrapper = document.createElement("div");
    wrapper.className = `story-pair${isDialoguePair(pair) ? " dialogue" : ""}`;
    wrapper.dataset.pairIndex = String(index);

    if (enText) {
      const en = document.createElement("p");
      en.className = "en content-en";
      en.lang = "en";
      en.innerHTML = tokenizeEnglish(enText);
      wrapper.appendChild(en);
    }

    if (zhText) {
      const zh = document.createElement("p");
      zh.className = "zh content-zh";
      zh.lang = "zh-Hant";
      zh.textContent = zhText;
      wrapper.appendChild(zh);
    }

    if (wrapper.childElementCount) storyBody.appendChild(wrapper);
  });

  app.replaceChildren(fragment);
  document.title = `${localizedValue(story.title)} | ${localizedValue(book.title)}`;
  window.scrollTo({ top: 0 });
};
