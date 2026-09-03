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

  const englishBody = fragment.querySelector("#englishBody");
  (story.content?.en || story.paragraphs?.map(p => p.en).filter(Boolean) || []).forEach(paragraph => {
    const p = document.createElement("p");
    p.className = "story-paragraph";
    p.innerHTML = tokenizeEnglish(paragraph);
    englishBody.appendChild(p);
  });

  const chineseBody = fragment.querySelector("#chineseBody");
  (story.content?.zh || story.paragraphs?.map(p => p.zh).filter(Boolean) || []).forEach(paragraph => {
    const p = document.createElement("p");
    p.className = "story-paragraph";
    p.textContent = paragraph;
    chineseBody.appendChild(p);
  });

  app.replaceChildren(fragment);
  document.title = `${localizedValue(story.title)} | ${localizedValue(book.title)}`;
  window.scrollTo({ top: 0 });
}