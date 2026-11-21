"""Razorpay payments. PAYMENT_MODE=demo skips the gateway so you can test the flow."""
import hashlib
import hmac
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

MODE = os.getenv("PAYMENT_MODE", "demo")
KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
CURRENCY = os.getenv("CURRENCY", "INR")

if MODE == "razorpay" and not (KEY_ID and KEY_SECRET):
    raise RuntimeError("PAYMENT_MODE=razorpay needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET")
if MODE == "demo":
    print("WARNING: PAYMENT_MODE=demo. Payments are NOT real. Do not deploy like this.")


def create_gateway_order(amount_minor: int, receipt: str) -> dict:
    """amount_minor is in paise (rupees x 100)."""
    if MODE == "demo":
        return {"id": f"demo_{receipt}"}
    r = httpx.post(
        "https://api.razorpay.com/v1/orders",
        auth=(KEY_ID, KEY_SECRET),
        json={"amount": amount_minor, "currency": CURRENCY, "receipt": receipt},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()


def verify_signature(gateway_order_id: str, payment_id: str, signature: str) -> bool:
    if MODE == "demo":
        return True
    expected = hmac.new(KEY_SECRET.encode(), f"{gateway_order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or "")
