# Canonical Daily Authoring & Publishing Format

This file is the source of truth for every new chapter published after the legacy Chapters 01–06.

## Core rule: alignment is created during translation, never repaired afterward

Do **not** generate an English array and a Chinese array independently and try to align them by index later.

Instead:

1. Write the English chapter in normal novel paragraphs.
2. Split each paragraph into semantic translation units: normally one complete sentence, or one complete dialogue utterance with its attached dialogue tag/action when separating it would damage meaning.
3. Translate each unit immediately into Traditional Chinese.
4. Store the English unit and its translation together as one `pairs[]` object.
5. Preserve paragraph membership with the optional `paragraph` integer.

This guarantees that bilingual rendering remains aligned even when natural Chinese syntax merges or restructures clauses.

## Canonical machine source

Every new chapter begins as one authoring JSON object:

```json
{
  "bookSlug": "witcher-path-notes",
  "episode": 7,
  "publishedAt": "2026-09-04",
  "slug": "example-chapter-slug",
  "title": {
    "en": "Chapter Seven — Example Title",
    "zhHant": "第七章——示例章名",
    "zhHans": "第七章——示例章名"
  },
  "recap": {
    "en": "A short Previously recap containing only already-revealed information.",
    "zh": "只包含已揭露資訊的簡短前情提要。"
  },
  "pairs": [
    {
      "paragraph": 1,
      "en": "First complete English translation unit.",
      "zh": "第一個完整的繁體中文翻譯單位。"
    },
    {
      "paragraph": 1,
      "en": "Second complete English translation unit.",
      "zh": "第二個完整的繁體中文翻譯單位。"
    }
  ],
  "glossary": {
    "example": "例子、範例。"
  }
}
```

## Human-facing daily story format

The daily ChatGPT update should still be pleasant to read and copy:

1. English chapter title
2. `Previously: ...`
3. Full English story in normal novel paragraphs, with **no blank lines inserted as fake spacing inside the website data**
4. Difficult vocabulary / phrases with Traditional Chinese explanations
5. Traditional Chinese chapter title
6. Traditional Chinese recap
7. Full Traditional Chinese novel translation

The English and Chinese prose shown to the user may be reconstructed into natural paragraphs from `pairs[].paragraph`. The website publication payload remains pair-based.

## Publication pipeline

For every new chapter:

1. Determine the next episode from `data/stories.json`; never guess it.
2. Read the latest published chapter and continuity before writing the next installment.
3. Generate English prose and Traditional Chinese translation as aligned `pairs[]` from the start.
4. Validate:
   - no blank English/Chinese pair;
   - every pair has a corresponding translation;
   - title, recap, publication date, slug and episode are present;
   - no duplicate episode/slug.
5. Build content JSON with `schemaVersion: 2`, `pairs`, and derived `en`/`zh` arrays.
6. JSON encode as UTF-8, gzip once, then Base64 encode once.
7. Split the **single resulting Base64 string** into fixed 6000-character `.b64part` files. Never gzip individual chunks and never mix chunks produced by different compression runs.
8. Reassemble the exact written parts and verify: Base64 decode → gzip decompress → JSON parse → exact content equality.
9. Upload all part files first.
10. Only after every part exists and passes validation, update `data/stories.json` **last** with `formatVersion: 2` and `contentFileParts`.
11. GitHub Pages runs `python tools/validate_library.py` before deployment. If any referenced chapter is broken, deployment must fail rather than replace the last working site.
12. After deployment, verify the newest workflow concluded `success` before reporting publication complete.

## Local publisher

Prepare a canonical source JSON, then run:

```bash
python tools/publish_chapter.py drafts/chapter-07.json
python tools/validate_library.py
```

`publish_chapter.py` uses deterministic gzip (`mtime=0`), 6000-character parts, verifies the full round trip before editing `stories.json`, and writes metadata last.

## Lessons encoded from Chapters 01–06

- Never align independent English/Chinese arrays by index.
- Never accept a payload merely because every file exists; verify the concatenated payload actually decompresses.
- Never upload metadata before its content files are complete.
- Keep chunks comfortably below connector truncation limits.
- A Pages workflow success only proves deployment mechanics unless content integrity is tested; therefore integrity validation is now part of deployment.
- Content-load failures must not be treated conceptually as missing chapters when diagnosing problems.
- New chapters use one canonical format. Legacy formats remain supported only for backward compatibility.
