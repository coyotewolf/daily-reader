# Path Notes

A mobile-first bilingual daily-story reader designed for GitHub Pages.

## Features

- English only / 中文 only / bilingual display
- Font size controls from 80% to 170%
- Light / dark mode
- Reader preferences saved in the browser
- Mobile-first responsive layout
- No framework, database, or build step
- GitHub Pages deployment workflow included

## Add a new story

Edit `data/stories.json` and append a new object:

```json
{
  "episode": 2,
  "date": "2026-09-05",
  "slug": "your-story-slug",
  "title": {
    "en": "English Title",
    "zh": "中文標題"
  },
  "excerpt": "Short description.",
  "recap": "English recap for the previous episode.",
  "ending": "The Path continues tomorrow.",
  "paragraphs": [
    {
      "type": "narration",
      "en": "English paragraph.",
      "zh": "中文翻譯。"
    },
    {
      "type": "dialogue",
      "en": "“Dialogue.”",
      "zh": "「對話。」"
    }
  ]
}
```

`type` can be `narration` or `dialogue`.

## Deploy

The included `.github/workflows/pages.yml` deploys the repository as a GitHub Pages site whenever `main` changes.

If GitHub Pages is not enabled automatically on the first workflow run, open **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**, then rerun the workflow.

## Local preview

Because the site loads `data/stories.json` with `fetch`, use a tiny local HTTP server rather than opening `index.html` directly:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.
