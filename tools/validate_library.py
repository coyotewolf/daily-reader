#!/usr/bin/env python3
import base64
import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def fail(message: str):
    raise SystemExit(f"VALIDATION FAILED: {message}")


def read_payload(chapter):
    if chapter.get("contentFileParts"):
        chunks = []
        for rel in chapter["contentFileParts"]:
            path = ROOT / rel.replace("./", "", 1)
            if not path.exists():
                fail(f"chapter {chapter.get('episode')} missing part {rel}")
            chunks.append("".join(path.read_text(encoding="utf-8").split()))
        encoded = "".join(chunks)
    elif chapter.get("contentFile"):
        path = ROOT / chapter["contentFile"].replace("./", "", 1)
        if not path.exists():
            fail(f"chapter {chapter.get('episode')} missing content file {chapter['contentFile']}")
        encoded = "".join(path.read_text(encoding="utf-8").split())
    else:
        fail(f"chapter {chapter.get('episode')} has no content file")

    try:
        raw = base64.b64decode(encoded, validate=True)
    except Exception as exc:
        fail(f"chapter {chapter.get('episode')} invalid Base64: {exc}")
    try:
        text = gzip.decompress(raw).decode("utf-8")
    except Exception as exc:
        fail(f"chapter {chapter.get('episode')} invalid gzip/UTF-8: {exc}")
    try:
        return json.loads(text)
    except Exception as exc:
        fail(f"chapter {chapter.get('episode')} invalid JSON: {exc}")


def validate_content(chapter, content):
    pairs = content.get("pairs") or []
    en = content.get("en") or []
    zh = content.get("zh") or []

    if not pairs and not en:
        fail(f"chapter {chapter.get('episode')} has no story content")

    if chapter.get("formatVersion", 1) >= 2:
        if not pairs:
            fail(f"chapter {chapter.get('episode')} formatVersion 2 requires pairs[]")
        for i, pair in enumerate(pairs, 1):
            if not isinstance(pair, dict):
                fail(f"chapter {chapter.get('episode')} pair {i} is not an object")
            if not str(pair.get("en", "")).strip() or not str(pair.get("zh", "")).strip():
                fail(f"chapter {chapter.get('episode')} pair {i} has blank English or Chinese")
        if en and len(en) != len(pairs):
            fail(f"chapter {chapter.get('episode')} en[] count != pairs[] count")
        if zh and len(zh) != len(pairs):
            fail(f"chapter {chapter.get('episode')} zh[] count != pairs[] count")


def main():
    index_path = DATA / "stories.json"
    library = json.loads(index_path.read_text(encoding="utf-8"))
    seen_slugs = set()
    checked = 0

    for book in library.get("books", []):
        episodes = set()
        for chapter in book.get("chapters", []):
            ep = chapter.get("episode")
            slug = chapter.get("slug")
            if ep in episodes:
                fail(f"duplicate episode {ep} in {book.get('slug')}")
            episodes.add(ep)
            key = (book.get("slug"), slug)
            if key in seen_slugs:
                fail(f"duplicate chapter slug {slug}")
            seen_slugs.add(key)
            content = read_payload(chapter)
            validate_content(chapter, content)
            checked += 1

    print(f"OK: validated {checked} chapter(s), including Base64 + gzip + JSON round-trip.")


if __name__ == "__main__":
    main()
