"""Sync artworks.json -> Firestore.   Run:  python seed_firestore.py

Safe to run again and again:
  * NEW cards are added in full.
  * cards that already exist only get their picture fields refreshed
    (images, category, group, order). Your prices, stock, titles and descriptions
    that you edited in the Firebase console are NOT touched.
Use  python seed_firestore.py --force  to overwrite everything from the file
(careful: this resets prices and stock to what the file says).
"""
import json
import sys
from pathlib import Path

import db

FOLDER_FIELDS = ("category", "group", "image", "images", "ratio", "order")

items = json.loads((Path(__file__).parent / "data" / "artworks.json").read_text(encoding="utf-8"))
coll = db._firestore().collection("artworks")
existing = {d.id for d in coll.stream()}
force = "--force" in sys.argv

added = refreshed = 0
for item in items:
    data = {k: v for k, v in item.items() if k != "id"}
    if item["id"] not in existing or force:
        coll.document(item["id"]).set(data)
        added += 1
    else:
        coll.document(item["id"]).update({k: data[k] for k in FOLDER_FIELDS if k in data})
        refreshed += 1

gone = existing - {i["id"] for i in items}
print(f"Added {added}, refreshed {refreshed}.")
if gone:
    print("In Firestore but no longer in the file (left alone; set hidden=true to remove from the shop):", ", ".join(sorted(gone)))
