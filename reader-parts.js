// Split story-content loader --------------------------------------------------
// Large gzip/base64 story payloads are stored as small text parts to avoid
// transport truncation. This loader concatenates the parts before decoding.

async function decodeCompressedStoryBase64(base64) {
  const payload = String(base64 || "").replace(/\s+/g, "");
  if (!payload) throw new Error("Empty story payload");

  const bytes = Uint8Array.from(atob(payload), char => char.charCodeAt(0));
  if (!("DecompressionStream" in window)) {
    throw new Error("This browser does not support compressed story content.");
  }

  const decompressed = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(decompressed).text());
}

async function loadCompressedStoryParts(paths) {
  if (!Array.isArray(paths) || !paths.length) throw new Error("Missing story parts");

  const parts = await Promise.all(paths.map(async path => {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return (await response.text()).trim();
  }));

  return decodeCompressedStoryBase64(parts.join(""));
}

const originalEnsureStoryContent = ensureStoryContent;
ensureStoryContent = async function ensureStoryContentWithParts(story) {
  if (story.content?.pairs?.length || story.content?.en?.length || story.paragraphs?.length) return story;

  if (Array.isArray(story.contentFileParts) && story.contentFileParts.length) {
    if (!story._contentPromise) {
      story._contentPromise = loadCompressedStoryParts(story.contentFileParts)
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

  return originalEnsureStoryContent(story);
};
