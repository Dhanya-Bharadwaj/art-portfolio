#!/usr/bin/env python3
"""Scan frontend/public/art_images and (re)build artworks.json for the shop.

Run from the project folder, any time you add or change images:

    python tools/scan_art.py

Folder rules (inside frontend/public/art_images):

  <category>/                      -> a main section (Miniatures, Mandala Art, Resin, Sketches ...)
  <category>/some_image.jpg        -> a single piece on its own card
  <category>/<folder>/*.jpg        -> ONE card; all images in that folder become its moving slideshow
  <category>/<group>/<folder>/*.jpg -> same, and <group> becomes a filter chip (e.g. "Table Stands")

Things you edit by hand in artworks.json (price, title, description, stock ...) are kept
when you run the scanner again. New cards start with price = null, which shows
"Price on request" and an Enquire button until you set a price.
"""
import json
import re
import struct
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "frontend" / "public" / "art_images"
URL_BASE = "/art_images"
OUTPUTS = [ROOT / "backend" / "data" / "artworks.json"]  # the ONE catalog file
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}

# folder name -> how it is shown on the site
CATEGORY_NAMES = {
    "miniatures": "Miniatures",
    "dot_mandala_art": "Mandala Art",
    "mandala_art": "Mandala Art",
    "resin": "Resin",
    "sketches": "Sketches",
}
CATEGORY_ORDER = ["Miniatures", "Mandala Art", "Resin", "Sketches"]
MEDIUM = {"Miniatures": "Handmade miniature", "Mandala Art": "Dot mandala", "Resin": "Resin art", "Sketches": "Sketch"}
DESCRIPTION = {
    "Miniatures": "A handmade miniature, crafted with tiny details and lots of patience.",
    "Mandala Art": "A hand-painted dot mandala, made one dot at a time.",
    "Resin": "Handcrafted resin art, poured and finished by hand.",
    "Sketches": "An original hand-drawn sketch.",
}
ACCENTS = ["#F8C8DC", "#BFE8DA", "#CDBEF5", "#BFDDF7", "#FFE6A8", "#FFD3C2"]


# ---------- small helpers ----------
def natural_key(s):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", s)]


def titleize(name):
    words = re.sub(r"[_\-\s]+", " ", name).strip().split()
    return " ".join("&" if w.lower() == "n" else w.capitalize() for w in words)


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def norm(text):
    t = re.sub(r"[^a-z0-9]", "", text.lower())
    return t[:-1] if t.endswith("s") else t


def images_in(d):
    return sorted((p for p in d.iterdir() if p.is_file() and p.suffix.lower() in EXTS), key=lambda p: natural_key(p.name))


def subdirs(d):
    return sorted((p for p in d.iterdir() if p.is_dir() and not p.name.startswith(".")), key=lambda p: natural_key(p.name))


def url_of(path):
    parts = path.relative_to(IMG_DIR).parts
    return URL_BASE + "/" + "/".join(quote(p) for p in parts)


def put_cover_first(files, *names):
    """A photo named like its folder (food/foods.jpg, table_stands.jpg ...) becomes the cover."""
    targets = {norm(n) for n in names if n}
    for i, f in enumerate(files):
        if norm(f.stem) in targets:
            return [f] + files[:i] + files[i + 1:]
    return files


# ---------- image size (no extra libraries needed) ----------
def _exif_orientation(tiff):
    if len(tiff) < 8:
        return 1
    e = "<" if tiff[:2] == b"II" else ">"
    ifd = struct.unpack(e + "I", tiff[4:8])[0]
    if ifd + 2 > len(tiff):
        return 1
    for k in range(struct.unpack(e + "H", tiff[ifd:ifd + 2])[0]):
        at = ifd + 2 + k * 12
        if at + 12 > len(tiff):
            break
        if struct.unpack(e + "H", tiff[at:at + 2])[0] == 0x0112:
            return struct.unpack(e + "H", tiff[at + 8:at + 10])[0]
    return 1


def image_ratio(path):
    """width / height as the browser will show it, or 1.0 if it can't be read."""
    try:
        with open(path, "rb") as f:
            data = f.read(1 << 20)
        w = h = None
        orient = 1
        if data[:8] == b"\x89PNG\r\n\x1a\n":
            w, h = struct.unpack(">II", data[16:24])
        elif data[:2] == b"\xff\xd8":
            i = 2
            while i + 4 <= len(data):
                if data[i] != 0xFF:
                    i += 1
                    continue
                m = data[i + 1]
                if m == 0xFF or m == 0x01 or 0xD0 <= m <= 0xD8:
                    i += 1 if m == 0xFF else 2
                    continue
                if m == 0xD9:
                    break
                n = struct.unpack(">H", data[i + 2:i + 4])[0]
                seg = data[i + 4:i + 2 + n]
                if m == 0xE1 and seg[:6] == b"Exif\x00\x00":
                    orient = _exif_orientation(seg[6:])
                if m in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    h, w = struct.unpack(">HH", seg[1:5])
                    break
                i += 2 + n
        if not w or not h:
            return 1.0
        if orient in (5, 6, 7, 8):
            w, h = h, w
        return round(min(max(w / h, 0.72), 1.4), 3)  # keep the grid tidy
    except Exception:
        return 1.0


# ---------- build the list of cards ----------
def cards_for_category(cat_dir):
    cards = []
    for img in images_in(cat_dir):  # loose images: one card each
        cards.append({"key": img.relative_to(IMG_DIR).with_suffix("").as_posix(), "title": titleize(img.stem), "group": "", "files": [img]})

    def walk(d, group):
        files = images_in(d)
        if files:
            cards.append({
                "key": d.relative_to(IMG_DIR).as_posix(),
                "title": titleize(d.name),
                "group": group,
                "files": put_cover_first(files, d.name, group),
            })
        for sub in subdirs(d):
            walk(sub, group)

    for sub in subdirs(cat_dir):
        walk(sub, titleize(sub.name))
    return cards


def main():
    if not IMG_DIR.exists():
        sys.exit(f"Folder not found: {IMG_DIR}")

    existing = {}
    for p in OUTPUTS:
        if p.exists():
            try:
                existing = {a["id"]: a for a in json.loads(p.read_text(encoding="utf-8"))}
                break
            except Exception:
                pass

    folders = [d for d in subdirs(IMG_DIR)]
    def cat_rank(d):
        name = CATEGORY_NAMES.get(d.name.lower(), titleize(d.name))
        return (CATEGORY_ORDER.index(name) if name in CATEGORY_ORDER else 99, name)
    folders.sort(key=cat_rank)

    result, seen_ids, n = [], set(), 0
    for cat_dir in folders:
        cat = CATEGORY_NAMES.get(cat_dir.name.lower(), titleize(cat_dir.name))
        for card in cards_for_category(cat_dir):
            cid = slug(card["key"])
            seen_ids.add(cid)
            base = existing.get(cid, {})
            newest = max(f.stat().st_mtime for f in card["files"])
            urls = [url_of(f) for f in card["files"]]
            item = {  # the things you edit most come first
                "id": cid,
                "title": base.get("title", card["title"]),
                "price": base.get("price"),
                "stock": base.get("stock", 1),
                "type": base.get("type", "Original"),
                "hidden": base.get("hidden", False),
                "category": cat,
                "group": card["group"],
                "medium": base.get("medium", MEDIUM.get(cat, "Handmade")),
                "description": base.get("description", DESCRIPTION.get(cat, "Handmade with care.")),
                "accent": base.get("accent", ACCENTS[n % len(ACCENTS)]),
                "ratio": image_ratio(card["files"][0]),
                "image": urls[0],
                "images": urls,
                "added": base.get("added", datetime.fromtimestamp(newest, timezone.utc).isoformat()),
                "order": n,
            }
            for k, v in base.items():  # keep any extra fields you added yourself
                item.setdefault(k, v)
            result.append(item)
            n += 1

    gone = [i for i in existing if i not in seen_ids]
    text = json.dumps(result, indent=2, ensure_ascii=False)
    for out in OUTPUTS:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text, encoding="utf-8")

    print(f"Found {len(result)} cards:")
    for cat in dict.fromkeys(a["category"] for a in result):
        mine = [a for a in result if a["category"] == cat]
        print(f"  {cat}: {len(mine)} cards, {sum(len(a['images']) for a in mine)} images")
    missing = [a["title"] for a in result if not a["price"]]
    if missing:
        print(f"\n{len(missing)} cards have no price yet (shown as 'Price on request'). Set \"price\" in backend/data/artworks.json (that is the only file you edit).")
    if gone:
        print("\nNo longer found (removed from the list):", ", ".join(gone))


if __name__ == "__main__":
    main()
