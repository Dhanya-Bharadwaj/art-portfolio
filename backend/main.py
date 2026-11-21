import os
import secrets
import uuid

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import db
import payments

SHIPPING_FEE = int(os.getenv("SHIPPING_FEE", "150"))
FREE_SHIPPING_OVER = int(os.getenv("FREE_SHIPPING_OVER", "0"))  # 0 = never free
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")

app = FastAPI(title="Art Shop API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Customer(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(pattern=r"^\S+@\S+\.\S+$", max_length=120)
    phone: str = Field(min_length=7, max_length=15)
    address: str = Field(min_length=5, max_length=300)
    city: str = Field(min_length=2, max_length=80)
    state: str = Field(min_length=2, max_length=80)
    pincode: str = Field(min_length=4, max_length=10)


class OrderItem(BaseModel):
    id: str
    qty: int = Field(ge=1, le=10)


class OrderIn(BaseModel):
    items: list[OrderItem] = Field(min_length=1, max_length=20)
    customer: Customer


class VerifyIn(BaseModel):
    order_id: str
    razorpay_payment_id: str = ""
    razorpay_signature: str = ""


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: str = Field(min_length=3, max_length=120)
    message: str = Field(min_length=1, max_length=2000)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/config")
def shop_config():
    return {
        "currency": payments.CURRENCY,
        "shipping_fee": SHIPPING_FEE,
        "free_shipping_over": FREE_SHIPPING_OVER,
        "payment_mode": payments.MODE,
        "razorpay_key_id": payments.KEY_ID if payments.MODE == "razorpay" else "",
    }


@app.get("/api/artworks")
def list_artworks():
    return db.get_artworks()


@app.get("/api/artworks/{art_id}")
def get_artwork(art_id: str):
    art = db.get_artwork(art_id)
    if not art:
        raise HTTPException(404, "Artwork not found")
    return art


@app.post("/api/orders")
def create_order(body: OrderIn):
    """Prices and stock always come from the server, never from the browser."""
    arts = {a["id"]: a for a in db.get_artworks(fresh=True)}
    lines, seen = [], set()
    for it in body.items:
        if it.id in seen:
            raise HTTPException(400, "Duplicate item in order")
        seen.add(it.id)
        art = arts.get(it.id)
        if not art:
            raise HTTPException(404, "An item in your cart no longer exists")
        if not art.get("price"):
            raise HTTPException(409, f'"{art["title"]}" is available on request. Please enquire about it.')
        if art.get("stock", 0) < it.qty:
            raise HTTPException(409, f'"{art["title"]}" is no longer available in that quantity.')
        lines.append({"id": art["id"], "title": art["title"], "price": art["price"], "qty": it.qty})

    subtotal = sum(l["price"] * l["qty"] for l in lines)
    shipping = 0 if FREE_SHIPPING_OVER and subtotal >= FREE_SHIPPING_OVER else SHIPPING_FEE
    total = subtotal + shipping
    order_id = "ORD-" + uuid.uuid4().hex[:8].upper()

    try:
        gw = payments.create_gateway_order(total * 100, order_id)
    except Exception:
        raise HTTPException(502, "Payment service is unavailable. Please try again in a moment.")

    db.save_order({
        "order_id": order_id, "status": "created", "gateway_order_id": gw["id"],
        "items": lines, "subtotal": subtotal, "shipping": shipping, "total": total,
        "currency": payments.CURRENCY, "customer": body.customer.model_dump(),
    })
    return {
        "order_id": order_id, "gateway_order_id": gw["id"], "amount": total * 100,
        "currency": payments.CURRENCY, "mode": payments.MODE, "key_id": payments.KEY_ID,
    }


@app.post("/api/orders/verify")
def verify_order(body: VerifyIn):
    order = db.get_order(body.order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    if order["status"] == "paid":
        return {"ok": True, "order_id": order["order_id"]}
    if not payments.verify_signature(order["gateway_order_id"], body.razorpay_payment_id, body.razorpay_signature):
        raise HTTPException(400, "Payment could not be verified.")
    order, ok = db.mark_paid(body.order_id, body.razorpay_payment_id or "demo")
    if not ok:
        raise HTTPException(409, "Sorry, this piece was just bought by someone else. Your payment will be refunded.")
    return {"ok": True, "order_id": order["order_id"]}


@app.post("/api/contact")
def contact(body: ContactIn):
    # messages are stored as orders-like records in local mode via a simple file
    import json
    from datetime import datetime, timezone

    record = {**body.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    if db.USE_FIRESTORE:
        db._firestore().collection("messages").add(record)
    else:
        with open(db.DATA_DIR / "messages.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
    return {"ok": True}


@app.get("/api/admin/orders")
def admin_orders(x_admin_token: str = Header(default="")):
    if not ADMIN_TOKEN or not secrets.compare_digest(x_admin_token, ADMIN_TOKEN):
        raise HTTPException(403, "Forbidden")
    return db.list_orders()
