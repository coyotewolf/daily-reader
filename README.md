# Path Notes

A mobile-first bilingual serial-fiction reader for GitHub Pages.

## Reading format

Each published chapter contains:

1. Chapter title
2. Previously / 前情提要
3. Full English text
4. Full Traditional Chinese translation

The reader supports English-only, Chinese-only, and bilingual modes. New chapters are authored as explicit English/Chinese `pairs[]`, so bilingual mode can render the correct translation immediately after its English source instead of guessing alignment from two independent arrays.

## English word lookup

Long-press an English word in the title, Previously section, or English story text to show its Chinese meaning in context. A failed lookup never blocks the reader.

## Canonical daily publication format

For all new chapters, `AUTHORING_FORMAT.md` is the source of truth.

The key rule is: **alignment is created during translation, never repaired afterward.** English prose is split into semantic units and each unit is translated immediately into Traditional Chinese, producing one-to-one `pairs[]`.

New chapter metadata in `data/stories.json` uses:

```json
{
  "episode": 7,
  "publishedAt": "2026-09-04",
  "slug": "chapter-slug",
  "formatVersion": 2,
  "title": {
    "en": "English chapter title",
    "zhHant": "繁體中文章名",
    "zhHans": "简体中文章名"
  },
  "recap": {
    "en": "English Previously text.",
    "zh": "繁體中文前情提要。"
  },
  "contentFileParts": [
    "./data/chapter-07-content-01.b64part",
    "./data/chapter-07-content-02.b64part"
  ],
  "glossary": {}
}
```

The decoded content is schema version 2:

```json
{
  "schemaVersion": 2,
  "pairs": [
    {"paragraph": 1, "en": "English unit.", "zh": "中文翻譯單位。"}
  ],
  "en": ["English unit."],
  "zh": ["中文翻譯單位。"]
}
```

## Safe publishing pipeline

`tools/publish_chapter.py` implements the canonical build process:

1. validate the authoring JSON and every English/Chinese pair;
2. derive `en` and `zh` from `pairs` rather than independently;
3. UTF-8 JSON encode;
4. gzip **once** with deterministic `mtime=0`;
5. Base64 encode **once**;
6. split that single Base64 stream into fixed 6000-character `.b64part` files;
7. re-read the written parts and verify Base64 → gzip → JSON round-trip equality;
8. write `stories.json` only after the content parts are valid.

Example:

```bash
python tools/publish_chapter.py drafts/chapter-07.json
python tools/validate_library.py
```

## Deployment safety

GitHub Pages now runs:

```bash
python tools/validate_library.py
```

before every deployment. The validator checks every referenced chapter file/part, concatenates split payloads, verifies Base64, gzip, UTF-8 and JSON integrity, and requires complete `pairs[]` for `formatVersion: 2` chapters.

If validation fails, the broken commit is **not deployed**, so the previous working Pages version remains live.

## Daily automation

The daily Witcher story automation is responsible for the complete publication lifecycle: read the latest published chapter, continue the serial, generate aligned English/Traditional-Chinese pairs, upload content parts first, update `stories.json` last, then verify the GitHub Pages workflow succeeded.

The user-facing daily story remains formatted for comfortable reading and copying: English title + Previously + English story, vocabulary, then the complete Traditional Chinese novel translation. The machine publication payload is generated from the same pair-aligned source.

## Legacy chapters

Chapters 01–06 may retain older storage shapes for backward compatibility. New chapters must use `formatVersion: 2` and the canonical pair-based pipeline. Do not introduce new legacy formats.

## Local preview

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.
