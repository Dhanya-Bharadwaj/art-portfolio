// All shop data (names, prices, image links) comes from the backend, which reads ONE file:
// backend/data/artworks.json  (or Firestore once you switch it on).
const BASE = import.meta.env.VITE_API_URL || "";

export const DEFAULT_SHOP = { currency: "INR", shipping_fee: 150, free_shipping_over: 0, payment_mode: "demo", razorpay_key_id: "" };

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
