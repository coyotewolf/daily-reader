// Paired bilingual renderer ---------------------------------------------------
// In bilingual mode, English and Chinese are interleaved. Single-language
// modes still use the same DOM and are controlled by the existing CSS rules.

function splitEnglishSentences(text) {
  const value = String(text || "").trim();
  if (!value) return [];

  if (typeof Intl.Segmenter === "function") {
    try {
      return [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(value)]
        .map(item => item.segment.trim())
        .filter(Boolean);
    } catch {
      // Fall through to regex.
    }
  }

  return value.match(/[^.!?]+(?:[.!?]+[”"']*|$)/g)?.map(s => s.trim()).filter(Boolean) || [value];
}

function splitChineseSentences(text) {
  const value = String(text || "").trim();
  if (!value) return [];
  return value.match(/[^。！？!?]+(?:[。！？!?]+[」』”"']*|$)/g)?.map(s => s.trim()).filter(Boolean) || [value];
}

function expandPairToSentencePairs(pair) {
  const en = String(pair?.en || "").trim();
  const zh = String(pair?.zh || "").trim();
  if (!en && !zh) return [];

  const enSentences = splitEnglishSentences(en);
  const zhSentences = splitChineseSentences(zh);

  // Only split further when sentence counts line up exactly. Otherwise keep
  // the original paragraph/utterance pair so translations never drift.
  if (enSentences.length > 1 && enSentences.length === zhSentences.length) {
    return enSentences.map((sentence, index) => ({
      en: sentence,
      zh: zhSentences[index]
    }));
  }

  return [{ en, zh }];
}

function storyPairs(story) {
  if (Array.isArray(story.content?.pairs) && story.content.pairs.length) {
    return story.content.pairs.flatMap(expandPairToSentencePairs);
  }

  const en = story.content?.en || story.paragraphs?.map(p => p.en).filter(Boolean) || [];
  const zh = story.content?.zh || story.paragraphs?.map(p => p.zh).filter(Boolean) || [];
  const count = Math.max(en.length, zh.length);
  const pairs = [];

  for (let i = 0; i < count; i += 1) {
    pairs.push({ en: en[i] || "", zh: zh[i] || "" });
  }

  return pairs.flatMap(expandPairToSentencePairs);
}

function isDialoguePair(pair) {
  const value = String(pair?.en || pair?.zh || "").trim();
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
    const wrapper = document.createElement("div");
    wrapper.className = `story-pair${isDialoguePair(pair) ? " dialogue" : ""}`;
    wrapper.dataset.pairIndex = String(index);

    if (pair.en) {
      const en = document.createElement("p");
      en.className = "en content-en";
      en.lang = "en";
      en.innerHTML = tokenizeEnglish(pair.en);
      wrapper.appendChild(en);
    }

    if (pair.zh) {
      const zh = document.createElement("p");
      zh.className = "zh content-zh";
      zh.lang = "zh-Hant";
      zh.textContent = pair.zh;
      wrapper.appendChild(zh);
    }

    storyBody.appendChild(wrapper);
  });

  app.replaceChildren(fragment);
  document.title = `${localizedValue(story.title)} | ${localizedValue(book.title)}`;
  window.scrollTo({ top: 0 });
};
