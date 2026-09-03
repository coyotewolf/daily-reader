# Path Notes

A mobile-first bilingual serial-fiction reader for GitHub Pages.

## Current reading format

Each published chapter is rendered in this order:

1. Chapter title
2. Previously / 前情提要
3. Full English text
4. Full Chinese translation

The reader supports English-only, Chinese-only, and bilingual modes. Font-size controls apply to the story body **and** the Previously section. UI language follows the device/browser system language independently from story-language mode.

## English word lookup

Long-press an English word in the title, Previously section, or English story text to show a quick Chinese translation above the word.

Lookup order:

1. The chapter's local `glossary` when an entry is available.
2. Cached translations already stored in the browser.
3. Online single-word lookup for words not already cached.

A failed lookup never blocks the reader.

## Daily publication schema

Book/chapter metadata lives in `data/stories.json`. A chapter entry has this shape:

```json
{
  "episode": 3,
  "publishedAt": "2026-09-04",
  "slug": "chapter-slug",
  "title": {
    "en": "English chapter title",
    "zhHant": "繁體中文章名",
    "zhHans": "简体中文章名"
  },
  "recap": {
    "en": "English Previously text.",
    "zh": "繁體中文前情提要。"
  },
  "contentFile": "./data/chapter-03-content.json.gz.b64",
  "glossary": {
    "example": "例子、範例。"
  }
}
```

The full story text is stored separately so the library index remains small. The decoded chapter content is:

```json
{
  "en": [
    "First English paragraph.",
    "Second English paragraph."
  ],
  "zh": [
    "第一段中文翻譯。",
    "第二段中文翻譯。"
  ]
}
```

The content JSON is gzip-compressed and then stored as Base64 text in the chapter's `contentFile`.

## Publishing a new daily chapter

For every new daily Witcher installment:

- keep the actual publication date in `publishedAt`;
- preserve the English chapter title and English Previously recap;
- store the full English story as ordered paragraphs;
- store the complete Traditional Chinese translation as ordered paragraphs;
- add useful known vocabulary to `glossary` when available;
- add the chapter metadata to the correct book in `data/stories.json`;
- commit to `main`.

GitHub Pages deploys automatically after the commit. This means future daily stories can be published without changing the website code—only chapter data/content needs to be added.

## Existing imported serial

The recovered full chapter currently imported is:

- Chapter Two — **The Thing That Knows Your Name**
- Publication date: **2026-08-30**

The earlier short demo chapter is no longer the canonical serial format.

## Local preview

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.
