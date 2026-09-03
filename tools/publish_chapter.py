#!/usr/bin/env python3
import argparse
import base64
import gzip
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
PART_SIZE = 6000


def die(message):
    raise SystemExit(f"PUBLISH FAILED: {message}")


def clean_text(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def validate_source(src):
    required = ["bookSlug", "episode", "publishedAt", "slug", "title", "recap", "pairs"]
    for key in required:
        if key not in src:
            die(f"missing {key}")
    if not isinstance(src["pairs"], list) or not src["pairs"]:
        die("pairs[] must be a non-empty list")
    for i, pair in enumerate(src["pairs"], 1):
        if not clean_text(pair.get("en")) or not clean_text(pair.get("zh")):
            die(f"pair {i} has blank English or Chinese")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", src["slug"]):
        die("slug must be lowercase kebab-case")


def build_content(src):
    pairs = []
    for pair in src["pairs"]:
        item = {"en": clean_text(pair["en"]), "zh": clean_text(pair["zh"])}
        if pair.get("paragraph") is not None:
            item["paragraph"] = pair["paragraph"]
        pairs.append(item)
    return {
        "schemaVersion": 2,
        "pairs": pairs,
        "en": [p["en"] for p in pairs],
        "zh": [p["zh"] for p in pairs],
    }


def encode_content(content):
    raw = json.dumps(content, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    compressed = gzip.compress(raw, compresslevel=9, mtime=0)
    return base64.b64encode(compressed).decode("ascii")


def verify(encoded, expected):
    try:
        decoded = json.loads(gzip.decompress(base64.b64decode(encoded, validate=True)).decode("utf-8"))
    except Exception as exc:
        die(f"round-trip decode failed: {exc}")
    if decoded != expected:
        die("round-trip content differs from source")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", help="canonical authoring JSON")
    parser.add_argument("--replace", action="store_true")
    args = parser.parse_args()

    src = json.loads(Path(args.source).read_text(encoding="utf-8"))
    validate_source(src)
    content = build_content(src)
    encoded = encode_content(content)
    verify(encoded, content)

    ep = int(src["episode"])
    prefix = f"chapter-{ep:02d}-content"
    parts = [encoded[i:i + PART_SIZE] for i in range(0, len(encoded), PART_SIZE)]
    part_paths = []
    for i, part in enumerate(parts, 1):
        filename = f"{prefix}-{i:02d}.b64part"
        path = DATA / filename
        path.write_text(part, encoding="utf-8")
        part_paths.append(f"./data/{filename}")

    # Re-read exactly what was written, then verify again before touching stories.json.
    disk_encoded = "".join("".join((ROOT / p.replace("./", "", 1)).read_text(encoding="utf-8").split()) for p in part_paths)
    verify(disk_encoded, content)

    stories_path = DATA / "stories.json"
    library = json.loads(stories_path.read_text(encoding="utf-8"))
    book = next((b for b in library.get("books", []) if b.get("slug") == src["bookSlug"]), None)
    if not book:
        die(f"book {src['bookSlug']} not found")

    chapters = book.setdefault("chapters", [])
    existing = next((c for c in chapters if c.get("episode") == ep or c.get("slug") == src["slug"]), None)
    if existing and not args.replace:
        die("episode or slug already exists; use --replace intentionally")

    metadata = {
        "episode": ep,
        "publishedAt": src["publishedAt"],
        "slug": src["slug"],
        "formatVersion": 2,
        "title": src["title"],
        "recap": src["recap"],
        "contentFileParts": part_paths,
        "glossary": src.get("glossary", {}),
    }

    if existing:
        chapters[chapters.index(existing)] = metadata
    else:
        chapters.append(metadata)
    chapters.sort(key=lambda c: int(c.get("episode", 0)))

    # Metadata is deliberately written LAST, after all content parts passed round-trip validation.
    stories_path.write_text(json.dumps(library, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared chapter {ep}: {len(content['pairs'])} aligned pairs, {len(parts)} part(s), {len(encoded)} Base64 chars.")
    print("Run: python tools/validate_library.py before commit/push.")


if __name__ == "__main__":
    main()
