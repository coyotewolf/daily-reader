# Daily Serial Publishing Format

This repository uses one canonical format for daily bilingual serial chapters.

## Reader order

Every published chapter is presented in this order:

1. English chapter title
2. `Previously` recap
3. Full English story
4. Full Traditional Chinese translation

The English and Chinese full texts are kept as separate complete sections rather than interleaved paragraph-by-paragraph. The reader may still switch between English, Chinese, or bilingual display.

## Required chapter metadata

Each chapter entry in `data/stories.json` must include:

```json
{
  "episode": 3,
  "publishedAt": "2026-08-31",
  "slug": "chapter-slug",
  "title": {
    "en": "Chapter Three — English Title",
    "zhHant": "第三章——中文標題",
    "zhHans": "第三章——简体标题"
  },
  "recap": {
    "en": "English Previously recap.",
    "zh": "繁體中文前情提要。"
  },
  "contentFile": "./data/chapter-03-content.json.gz.b64"
}
```

`publishedAt` is the actual publication date and must use `YYYY-MM-DD`.

## Story content file

Full chapter text is stored separately so the library and table of contents remain lightweight.

The decompressed JSON shape is:

```json
{
  "en": [
    "First English paragraph.",
    "Second English paragraph."
  ],
  "zh": [
    "第一段繁體中文翻譯。",
    "第二段繁體中文翻譯。"
  ]
}
```

The JSON is gzip-compressed and then base64-encoded into `data/chapter-XX-content.json.gz.b64`.

## Style rules

- No `Narrator:` labels.
- Keep the English story as continuous novel prose.
- Keep the Traditional Chinese translation complete and in the same narrative order.
- `Previously` is stored in both English and Traditional Chinese and follows the reader's EN / 中 / bilingual switch.
- The chapter title is English-first in bilingual mode.
- Publication date is always the real publication date, not the date the website was edited.

## Word lookup

English titles, English `Previously`, and the full English story are word-aware. Long-pressing an English word opens a quick Chinese translation popup.

Chapter-specific glossary entries may be added under `glossary` in the chapter metadata. They are checked before the online fallback translator.

## Publishing a new daily chapter

When a new daily story is ready:

1. Parse the English title, English `Previously`, full English text, and full Traditional Chinese translation.
2. Record the actual publication date in `publishedAt`.
3. Create the compressed chapter content file.
4. Append the chapter metadata to the correct book in `data/stories.json`.
5. Commit both files to `main`.
6. GitHub Pages deploys the updated site automatically.

This is the canonical workflow for future daily chapters.