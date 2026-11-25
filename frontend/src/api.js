// All shop data (names, prices, image links) comes from the backend, which reads ONE file:
// backend/data/artworks.json  (or Firestore once you switch it on).
// Trailing slashes are removed so "https://api.example.com/" and "https://api.example.com" both work.
const BASE = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

export const DEFAULT_SHOP = { currency: "INR", shipping_fee: 150, home_state: "Karnataka", shipping_fee_other: 350, free_shipping_over: 0, payment_mode: "demo", razorpay_key_id: "" };

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "Something went wrong. Please check your details and try again.";
    throw new Error(detail);
  }
  return data;
}

export const getArtworks = () => request("/api/artworks");
export const getShopConfig = () => request("/api/config").catch(() => DEFAULT_SHOP);
export const createOrder = (payload) => request("/api/orders", { method: "POST", body: JSON.stringify(payload) });
export const verifyOrder = (payload) => request("/api/orders/verify", { method: "POST", body: JSON.stringify(payload) });
export const sendMessage = (payload) => request("/api/contact", { method: "POST", body: JSON.stringify(payload) });

// Quietly tells the shop that someone opened a piece or added it to the cart (this feeds "Best sellers").
// Each person is counted once per visit for each piece, and a failure is never shown to anyone.
export function trackEvent(id, event) {
  try {
    const key = `seen-${event}-${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch { /* storage unavailable: just send it */ }
  fetch(`${BASE}/api/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, event }),
    keepalive: true,
  }).catch(() => {});
}

export function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}
