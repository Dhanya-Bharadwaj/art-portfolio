# """Data layer. Local JSON files now; set USE_FIRESTORE=true to use Firestore."""
# import json
# import os
# import time
# from datetime import datetime, timezone
# from pathlib import Path

# from dotenv import load_dotenv

# load_dotenv()

# DATA_DIR = Path(__file__).parent / "data"
# STATE_FILE = DATA_DIR / "state.json"  # local mode only: orders + units sold
# USE_FIRESTORE = os.getenv("USE_FIRESTORE", "false").lower() == "true"
# _client = None


# def _now() -> str:
#     return datetime.now(timezone.utc).isoformat()


# def _firestore():
#     global _client
#     if _client is None:
#         import firebase_admin
#         from firebase_admin import credentials, firestore

#         cred = credentials.Certificate(os.getenv("FIREBASE_CREDENTIALS", "serviceAccountKey.json"))
#         firebase_admin.initialize_app(cred)
#         _client = firestore.client()
#     return _client


# # ---------- local state ----------
# def _base_artworks() -> list[dict]:
#     return json.loads((DATA_DIR / "artworks.json").read_text(encoding="utf-8"))


# def _load_state() -> dict:
#     if STATE_FILE.exists():
#         return json.loads(STATE_FILE.read_text(encoding="utf-8"))
#     return {"orders": {}, "sold": {}}


# def _save_state(state: dict) -> None:
#     STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")


# # ---------- artworks ----------
# CACHE_SECONDS = int(os.getenv("CACHE_SECONDS", "60"))
# _cache = {"at": 0.0, "items": None}


# def _normalize(a: dict) -> dict:
#     """Tolerate hand-edited data (a price typed as text, a missing stock ...)."""
#     price = a.get("price")
#     try:
#         price = int(float(price)) if price not in (None, "") else None
#     except (TypeError, ValueError):
#         price = None
#     a["price"] = price or None
#     try:
#         a["stock"] = int(a.get("stock", 1))
#     except (TypeError, ValueError):
#         a["stock"] = 1
#     a.setdefault("images", [a["image"]] if a.get("image") else [])
#     if not a.get("image") and a["images"]:
#         a["image"] = a["images"][0]
#     return a


# def get_artworks(fresh: bool = False) -> list[dict]:
#     """Visible artworks in display order. Firestore reads are cached briefly to save quota."""
#     if USE_FIRESTORE:
#         now = time.time()
#         if not fresh and _cache["items"] is not None and now - _cache["at"] < CACHE_SECONDS:
#             return _cache["items"]
#         docs = [{"id": d.id, **d.to_dict()} for d in _firestore().collection("artworks").stream()]
#         items = sorted((_normalize(a) for a in docs if not a.get("hidden")), key=lambda a: a.get("order", 9999))
#         _cache.update(at=now, items=items)
#         return items
#     sold = _load_state()["sold"]
#     items = [{**a, "stock": max(a.get("stock", 1) - sold.get(a["id"], 0), 0)} for a in _base_artworks() if not a.get("hidden")]
#     return [_normalize(a) for a in items]


# def get_artwork(art_id: str) -> dict | None:
#     return next((a for a in get_artworks() if a["id"] == art_id), None)


# # ---------- orders ----------
# def save_order(order: dict) -> None:
#     order["created_at"] = _now()
#     if USE_FIRESTORE:
#         _firestore().collection("orders").document(order["order_id"]).set(order)
#     else:
#         state = _load_state()
#         state["orders"][order["order_id"]] = order
#         _save_state(state)


# def get_order(order_id: str) -> dict | None:
#     if USE_FIRESTORE:
#         snap = _firestore().collection("orders").document(order_id).get()
#         return snap.to_dict() if snap.exists else None
#     return _load_state()["orders"].get(order_id)


# def list_orders() -> list[dict]:
#     if USE_FIRESTORE:
#         docs = _firestore().collection("orders").order_by("created_at", direction="DESCENDING").stream()
#         return [d.to_dict() for d in docs]
#     return sorted(_load_state()["orders"].values(), key=lambda o: o["created_at"], reverse=True)


# def mark_paid(order_id: str, payment_id: str) -> tuple[dict, bool]:
#     """Marks an order paid and reduces stock. Returns (order, ok).
#     ok=False means the item sold out before this payment was confirmed (refund needed)."""
#     if USE_FIRESTORE:
#         result = _fs_mark_paid(order_id, payment_id)
#         _cache["items"] = None  # stock changed: refresh on next read
#         return result

#     state = _load_state()
#     order = state["orders"][order_id]
#     if order["status"] == "paid":
#         return order, True
#     arts = {a["id"]: a for a in _base_artworks()}
#     for i in order["items"]:
#         if arts[i["id"]]["stock"] - state["sold"].get(i["id"], 0) < i["qty"]:
#             order.update(status="needs_attention", payment_id=payment_id)
#             _save_state(state)
#             return order, False
#     for i in order["items"]:
#         state["sold"][i["id"]] = state["sold"].get(i["id"], 0) + i["qty"]
#     order.update(status="paid", payment_id=payment_id, paid_at=_now())
#     _save_state(state)
#     return order, True


# def _fs_mark_paid(order_id: str, payment_id: str) -> tuple[dict, bool]:
#     from firebase_admin import firestore

#     client = _firestore()
#     order_ref = client.collection("orders").document(order_id)

#     @firestore.transactional
#     def run(tx):
#         order = order_ref.get(transaction=tx).to_dict()
#         if order["status"] == "paid":
#             return order, True
#         pairs = []
#         for i in order["items"]:
#             ref = client.collection("artworks").document(i["id"])
#             pairs.append((ref, ref.get(transaction=tx).to_dict(), i["qty"]))
#         if any(data.get("stock", 0) < qty for _, data, qty in pairs):
#             tx.update(order_ref, {"status": "needs_attention", "payment_id": payment_id})
#             return {**order, "status": "needs_attention"}, False
#         for ref, data, qty in pairs:
#             tx.update(ref, {"stock": data["stock"] - qty})
#         tx.update(order_ref, {"status": "paid", "payment_id": payment_id, "paid_at": _now()})
#         return {**order, "status": "paid"}, True

#     return run(client.transaction())



"""Data layer. Local JSON files now; set USE_FIRESTORE=true to use Firestore."""
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

DATA_DIR = Path(__file__).parent / "data"
STATE_FILE = DATA_DIR / "state.json"  # local mode only: orders + units sold
USE_FIRESTORE = os.getenv("USE_FIRESTORE", "false").lower() == "true"
_client = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _firestore():
    global _client
    if _client is None:
        import firebase_admin
        from firebase_admin import credentials, firestore

        # On Vercel there is no key file: the whole JSON lives in FIREBASE_CREDENTIALS_JSON.
        # Locally we fall back to the serviceAccountKey.json file.
        raw_json = os.getenv("FIREBASE_CREDENTIALS_JSON", "").strip()
        if raw_json:
            cred = credentials.Certificate(json.loads(raw_json))
        else:
            cred = credentials.Certificate(os.getenv("FIREBASE_CREDENTIALS", "serviceAccountKey.json"))
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        _client = firestore.client()
    return _client


# ---------- local state ----------
def _base_artworks() -> list[dict]:
    return json.loads((DATA_DIR / "artworks.json").read_text(encoding="utf-8"))


def _load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return {"orders": {}, "sold": {}}


def _save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")


# ---------- artworks ----------
CACHE_SECONDS = int(os.getenv("CACHE_SECONDS", "60"))
_cache = {"at": 0.0, "items": None}


def _normalize(a: dict) -> dict:
    """Tolerate hand-edited data (a price typed as text, a missing stock ...)."""
    price = a.get("price")
    try:
        price = int(float(price)) if price not in (None, "") else None
    except (TypeError, ValueError):
        price = None
    a["price"] = price or None
    try:
        a["stock"] = int(a.get("stock", 1))
    except (TypeError, ValueError):
        a["stock"] = 1
    a.setdefault("images", [a["image"]] if a.get("image") else [])
    if not a.get("image") and a["images"]:
        a["image"] = a["images"][0]
    return a


def get_artworks(fresh: bool = False) -> list[dict]:
    """Visible artworks in display order. Firestore reads are cached briefly to save quota."""
    if USE_FIRESTORE:
        now = time.time()
        if not fresh and _cache["items"] is not None and now - _cache["at"] < CACHE_SECONDS:
            return _cache["items"]
        docs = [{"id": d.id, **d.to_dict()} for d in _firestore().collection("artworks").stream()]
        items = _with_popularity(sorted((_normalize(a) for a in docs if not a.get("hidden")), key=lambda a: a.get("order", 9999)))
        _cache.update(at=now, items=items)
        return items
    sold = _load_state()["sold"]
    items = [{**a, "stock": max(a.get("stock", 1) - sold.get(a["id"], 0), 0)} for a in _base_artworks() if not a.get("hidden")]
    return _with_popularity([_normalize(a) for a in items])


def get_artwork(art_id: str) -> dict | None:
    return next((a for a in get_artworks() if a["id"] == art_id), None)


# ---------- what people look at (feeds the "Best sellers" row) ----------
STAT_FIELDS = {"view": "views", "cart": "cart_adds"}   # what the website may report
POINTS = {"views": 1, "cart_adds": 3, "sold": 10}      # a sale counts far more than a look
_stats_cache = {"at": 0.0, "items": None}


def _empty_stat() -> dict:
    return {"views": 0, "cart_adds": 0, "sold": 0}


def get_stats(fresh: bool = False) -> dict[str, dict]:
    """{art_id: {views, cart_adds, sold}}. In Firestore mode it is kept for a short while to save reads."""
    if USE_FIRESTORE:
        now = time.time()
        if not fresh and _stats_cache["items"] is not None and now - _stats_cache["at"] < CACHE_SECONDS:
            return _stats_cache["items"]
        out = {}
        for d in _firestore().collection("artwork_stats").stream():
            out[d.id] = {**_empty_stat(), **{k: int(v) for k, v in d.to_dict().items() if k in POINTS}}
        _stats_cache.update(at=now, items=out)
        return out
    state = _load_state()
    out = {art_id: {**_empty_stat(), **s} for art_id, s in state.get("stats", {}).items()}
    for art_id, qty in state["sold"].items():
        out.setdefault(art_id, _empty_stat())["sold"] = qty
    return out


def _score(stat: dict) -> int:
    return sum(points * stat.get(field, 0) for field, points in POINTS.items())


def _with_popularity(items: list[dict]) -> list[dict]:
    """Adds one number per piece. If the stats can't be read, the shop still works (everything scores 0)."""
    try:
        stats = get_stats()
    except Exception as exc:  # noqa: BLE001
        print(f"[stats] could not read: {exc}")
        stats = {}
    for a in items:
        a["popularity"] = _score(stats.get(a["id"], {}))
    return items


def track(art_id: str, event: str) -> None:
    """Adds one to the 'views' or 'cart_adds' counter of a piece."""
    field = STAT_FIELDS[event]
    if USE_FIRESTORE:
        from firebase_admin import firestore

        _firestore().collection("artwork_stats").document(art_id).set(
            {field: firestore.Increment(1), "last_seen": _now()}, merge=True
        )
        return
    state = _load_state()
    stat = state.setdefault("stats", {}).setdefault(art_id, {})
    stat[field] = stat.get(field, 0) + 1
    _save_state(state)


def record_sales(order: dict) -> None:
    """Counts the pieces of a freshly paid order as 'sold'. (Local mode already keeps its own count.)"""
    if not USE_FIRESTORE:
        return
    from firebase_admin import firestore

    client = _firestore()
    for i in order.get("items", []):
        client.collection("artwork_stats").document(i["id"]).set(
            {"sold": firestore.Increment(int(i["qty"])), "last_seen": _now()}, merge=True
        )


# ---------- orders ----------
def save_order(order: dict) -> None:
    order["created_at"] = _now()
    if USE_FIRESTORE:
        _firestore().collection("orders").document(order["order_id"]).set(order)
    else:
        state = _load_state()
        state["orders"][order["order_id"]] = order
        _save_state(state)


def get_order(order_id: str) -> dict | None:
    if USE_FIRESTORE:
        snap = _firestore().collection("orders").document(order_id).get()
        return snap.to_dict() if snap.exists else None
    return _load_state()["orders"].get(order_id)


def list_orders() -> list[dict]:
    if USE_FIRESTORE:
        docs = _firestore().collection("orders").order_by("created_at", direction="DESCENDING").stream()
        return [d.to_dict() for d in docs]
    return sorted(_load_state()["orders"].values(), key=lambda o: o["created_at"], reverse=True)


def mark_paid(order_id: str, payment_id: str) -> tuple[dict, bool]:
    """Marks an order paid and reduces stock. Returns (order, ok).
    ok=False means the item sold out before this payment was confirmed (refund needed)."""
    if USE_FIRESTORE:
        result = _fs_mark_paid(order_id, payment_id)
        _cache["items"] = None  # stock changed: refresh on next read
        return result

    state = _load_state()
    order = state["orders"][order_id]
    if order["status"] == "paid":
        return order, True
    arts = {a["id"]: a for a in _base_artworks()}
    for i in order["items"]:
        if arts[i["id"]]["stock"] - state["sold"].get(i["id"], 0) < i["qty"]:
            order.update(status="needs_attention", payment_id=payment_id)
            _save_state(state)
            return order, False
    for i in order["items"]:
        state["sold"][i["id"]] = state["sold"].get(i["id"], 0) + i["qty"]
    order.update(status="paid", payment_id=payment_id, paid_at=_now())
    _save_state(state)
    return order, True


def _fs_mark_paid(order_id: str, payment_id: str) -> tuple[dict, bool]:
    from firebase_admin import firestore

    client = _firestore()
    order_ref = client.collection("orders").document(order_id)

    @firestore.transactional
    def run(tx):
        order = order_ref.get(transaction=tx).to_dict()
        if order["status"] == "paid":
            return order, True
        pairs = []
        for i in order["items"]:
            ref = client.collection("artworks").document(i["id"])
            pairs.append((ref, ref.get(transaction=tx).to_dict(), i["qty"]))
        if any(data.get("stock", 0) < qty for _, data, qty in pairs):
            tx.update(order_ref, {"status": "needs_attention", "payment_id": payment_id})
            return {**order, "status": "needs_attention"}, False
        for ref, data, qty in pairs:
            tx.update(ref, {"stock": data["stock"] - qty})
        tx.update(order_ref, {"status": "paid", "payment_id": payment_id, "paid_at": _now()})
        return {**order, "status": "paid"}, True

    return run(client.transaction())