// Split story-content loader --------------------------------------------------
// Large gzip/base64 story payloads are stored as small text parts to avoid
// transport truncation. This loader concatenates the parts before decoding.

function parseStoryJsonText(text) {
  const source = String(text || "").replace(/^\uFEFF/, "").trim();
  if (!source) throw new Error("Empty decompressed story JSON");
  try {
    return JSON.parse(source);
  } catch (firstError) {
    // Be tolerant of accidental transport text before/after the JSON payload.
    const start = source.indexOf("{");
    const end = source.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(source.slice(start, end + 1));
    throw firstError;
  }
}

async function decodeCompressedStoryBase64(base64) {
  let payload = String(base64 || "").replace(/\s+/g, "");
  if (!payload) throw new Error("Empty story payload");

  // Base64 transports occasionally omit padding. Restore it before atob().
  const remainder = payload.length % 4;
  if (remainder) payload += "=".repeat(4 - remainder);

  let bytes;
  try {
    bytes = Uint8Array.from(atob(payload), char => char.charCodeAt(0));
  } catch (error) {
    throw new Error(`Invalid story Base64: ${error.message}`);
  }

  if (!("DecompressionStream" in window)) {
    throw new Error("This browser does not support compressed story content.");
  }

  try {
    const decompressed = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    return parseStoryJsonText(await new Response(decompressed).text());
  } catch (error) {
    throw new Error(`Unable to decompress story content: ${error.message}`);
  }
}

async function loadCompressedStoryParts(paths) {
  if (!Array.isArray(paths) || !paths.length) throw new Error("Missing story parts");

  // Fetch in declared order. This is intentionally sequential so a browser or
  // intermediary cannot race/cache part responses in a surprising order.
  const parts = [];
  for (const path of paths) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetch(`${path}${separator}v=3`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    const part = (await response.text()).replace(/\s+/g, "");
    if (!part) throw new Error(`${path}: empty part`);
    parts.push(part);
  }

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
          console.error(`Story ${story.slug || story.episode || "unknown"} failed to load`, error);
          throw error;
        });
    }
    return story._contentPromise;
  }

  return originalEnsureStoryContent(story);
};
