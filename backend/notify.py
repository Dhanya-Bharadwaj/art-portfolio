"""Tells the shop owner when something happens: a new order, or a message from the contact form.

Three ways to get told. Each one switches on by itself when you fill in its settings,
and stays quiet when you don't, so you can start with just one.

  Email     Gmail:     SMTP_USER, SMTP_PASSWORD (a Google "app password"), NOTIFY_EMAIL
  WhatsApp  CallMeBot: WHATSAPP_PHONE, CALLMEBOT_APIKEY
  Telegram  your own bot: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

An alert that fails never breaks an order or a message. The customer's payment has already
gone through by then, so we just write a line in the server log and carry on.
"""
import html
import os
import re
import smtplib
import ssl
from concurrent.futures import ThreadPoolExecutor, wait
from email.message import EmailMessage

import httpx

TIMEOUT = 7  # seconds each channel gets, so a slow service can't hold the customer up
EMAIL_OK = re.compile(r"^\S+@\S+\.\S+$")


def _env(name: str) -> str:
    return os.getenv(name, "").strip()


def _one_line(text: str, limit: int = 150) -> str:
    """Email headers must be a single line."""
    return " ".join(str(text).split())[:limit]


def _rupees(n) -> str:
    try:
        return f"Rs {int(n):,}"
    except (TypeError, ValueError):
        return str(n)


# ---------- the three channels ----------
def _send_email(subject: str, text: str, html_body: str | None = None, reply_to: str | None = None) -> bool:
    user = _env("SMTP_USER")
    password = _env("SMTP_PASSWORD").replace(" ", "")  # Google shows app passwords with spaces
    to = _env("NOTIFY_EMAIL") or user
    if not (user and password and to):
        return False

    msg = EmailMessage()
    msg["Subject"] = _one_line(subject)
    msg["From"] = f"Dhanya's art shop <{user}>"
    msg["To"] = to
    if reply_to and EMAIL_OK.match(reply_to) and "\n" not in reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(text)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    host = _env("SMTP_HOST") or "smtp.gmail.com"
    port = int(_env("SMTP_PORT") or 465)
    with smtplib.SMTP_SSL(host, port, context=ssl.create_default_context(), timeout=TIMEOUT) as server:
        server.login(user, password)
        server.send_message(msg)
    return True


def _send_whatsapp(text: str) -> bool:
    phone, key = _env("WHATSAPP_PHONE"), _env("CALLMEBOT_APIKEY")
    if not (phone and key):
        return False
    r = httpx.get(
        "https://api.callmebot.com/whatsapp.php",
        params={"phone": phone, "text": text, "apikey": key},
        timeout=TIMEOUT,
    )
    r.raise_for_status()
    return True


def _send_telegram(text: str) -> bool:
    token, chat = _env("TELEGRAM_BOT_TOKEN"), _env("TELEGRAM_CHAT_ID")
    if not (token and chat):
        return False
    r = httpx.post(
        f"https://api.telegram.org/bot{token}/sendMessage",
        json={"chat_id": chat, "text": text},
        timeout=TIMEOUT,
    )
    r.raise_for_status()
    return True


def _run_all(jobs: dict) -> dict:
    """Runs every channel at the same time and waits a short while for them to finish."""
    pool = ThreadPoolExecutor(max_workers=max(len(jobs), 1))
    futures = {name: pool.submit(fn) for name, fn in jobs.items()}
    wait(futures.values(), timeout=TIMEOUT + 2)
    pool.shutdown(wait=False)

    result = {}
    for name, fut in futures.items():
        try:
            result[name] = bool(fut.result(timeout=0))
        except Exception as exc:  # noqa: BLE001 - an alert must never crash the request
            print(f"[notify] {name} failed: {type(exc).__name__}: {exc}")
            result[name] = False
    print(f"[notify] sent: {result}")
    return result


# ---------- order text ----------
def _order_lines(order: dict) -> list[str]:
    return [f"- {i['title']} x {i['qty']}  ({_rupees(i['price'] * i['qty'])})" for i in order.get("items", [])]


def _order_text(order: dict, headline: str) -> str:
    c = order.get("customer", {})
    lines = [
        headline,
        "",
        f"Order: {order.get('order_id')}",
        f"Total: {_rupees(order.get('total'))}  (items {_rupees(order.get('subtotal'))} + shipping {_rupees(order.get('shipping'))})",
        "",
        "Items:",
        *_order_lines(order),
        "",
        "Customer:",
        f"{c.get('name')}",
        f"Phone: {c.get('phone')}",
        f"Email: {c.get('email')}",
        "",
        "Ship to:",
        f"{c.get('address')}",
        f"{c.get('city')}, {c.get('state')} - {c.get('pincode')}",
    ]
    return "\n".join(lines)


def _order_html(order: dict, headline: str) -> str:
    e = html.escape  # customers type this text, so it is escaped before going into the email
    c = order.get("customer", {})
    rows = "".join(
        f"<tr><td style='padding:4px 12px 4px 0'>{e(str(i['title']))} x {int(i['qty'])}</td>"
        f"<td style='padding:4px 0;text-align:right'>{e(_rupees(i['price'] * i['qty']))}</td></tr>"
        for i in order.get("items", [])
    )
    return f"""
<div style="font-family:Arial,sans-serif;max-width:520px;color:#2f2a4a">
  <h2 style="margin:0 0 8px">{e(headline)}</h2>
  <p style="margin:0 0 16px">Order <b>{e(str(order.get('order_id')))}</b></p>
  <table style="width:100%;border-collapse:collapse">{rows}
    <tr><td style="padding:4px 12px 4px 0;color:#8a84a6">Shipping ({e(str(c.get('state')))})</td>
        <td style="padding:4px 0;text-align:right;color:#8a84a6">{e(_rupees(order.get('shipping')))}</td></tr>
    <tr><td style="padding:8px 12px 0 0;border-top:1px solid #ebe4f7"><b>Total</b></td>
        <td style="padding:8px 0 0;border-top:1px solid #ebe4f7;text-align:right"><b>{e(_rupees(order.get('total')))}</b></td></tr>
  </table>
  <h3 style="margin:20px 0 6px">Customer</h3>
  <p style="margin:0;line-height:1.6">{e(str(c.get('name')))}<br>
     Phone: {e(str(c.get('phone')))}<br>
     Email: {e(str(c.get('email')))}</p>
  <h3 style="margin:20px 0 6px">Ship to</h3>
  <p style="margin:0;line-height:1.6">{e(str(c.get('address')))}<br>
     {e(str(c.get('city')))}, {e(str(c.get('state')))} - {e(str(c.get('pincode')))}</p>
</div>"""


# ---------- what the shop calls ----------
def order_paid(order: dict) -> dict:
    """A new order has been paid for."""
    c = order.get("customer", {})
    headline = f"New order from {c.get('name')}: {_rupees(order.get('total'))}"
    text = _order_text(order, headline)
    short = _order_text(order, f"NEW ORDER {order.get('order_id')}").replace("\n\n", "\n")
    return _run_all({
        "email": lambda: _send_email(f"New order {order.get('order_id')}: {_rupees(order.get('total'))}", text, _order_html(order, headline), reply_to=c.get("email")),
        "whatsapp": lambda: _send_whatsapp(short),
        "telegram": lambda: _send_telegram(short),
    })


def order_needs_attention(order: dict) -> dict:
    """Someone paid, but the piece sold out a moment earlier. This one needs a refund."""
    c = order.get("customer", {})
    headline = f"ACTION NEEDED: {c.get('name')} paid but the piece was already sold"
    text = _order_text(order, headline) + "\n\nPlease refund this payment in the Razorpay dashboard."
    return _run_all({
        "email": lambda: _send_email(f"ACTION NEEDED: order {order.get('order_id')}", text, reply_to=c.get("email")),
        "whatsapp": lambda: _send_whatsapp(text),
        "telegram": lambda: _send_telegram(text),
    })


def contact_message(record: dict) -> dict:
    """Someone wrote to you through the 'Say hello' form. It lands in your inbox; just hit reply."""
    text = f"{record['name']} ({record['email']}) wrote:\n\n{record['message']}"
    html_body = (
        "<div style='font-family:Arial,sans-serif;max-width:520px;color:#2f2a4a'>"
        f"<h3 style='margin:0 0 8px'>New message from {html.escape(record['name'])}</h3>"
        f"<p style='margin:0 0 12px;color:#8a84a6'>{html.escape(record['email'])}</p>"
        f"<p style='white-space:pre-wrap;line-height:1.6;margin:0'>{html.escape(record['message'])}</p></div>"
    )
    return _run_all({
        "email": lambda: _send_email(f"New message from {record['name']}", text, html_body, reply_to=record["email"]),
    })
