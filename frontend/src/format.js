export const hasPrice = (a) => typeof a.price === "number" && a.price > 0;

export const money = (n, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

export const priceLabel = (a, currency) => (hasPrice(a) ? money(a.price, currency) : "Price on request");

export function stockNote(art) {
  if (art.stock <= 0) return "Sold";
  if (art.type === "Made to order") return "Made to order";
  if (art.type === "Print") return art.stock <= 5 ? `Print, only ${art.stock} left` : "Print";
  return art.stock === 1 ? "Handmade, one of one" : `Handmade, ${art.stock} available`;
}

// "Table Stands · Handmade miniature"
export const metaLine = (a) =>
  [a.group && a.group !== a.title ? a.group : "", a.medium, a.year].filter(Boolean).join(" · ");

// [{ name, count, covers[], accent }] in the order categories first appear
export function categoriesOf(artworks) {
  const map = new Map();
  for (const a of [...artworks].sort((x, y) => x.order - y.order)) {
    if (!map.has(a.category)) map.set(a.category, { name: a.category, count: 0, covers: [], accent: a.accent });
    const c = map.get(a.category);
    c.count += 1;
    c.covers.push(a.image);
  }
  return [...map.values()];
}

// one piece from every category first, then fill up, so the hero shows variety
export function pickFeatured(artworks, n) {
  const sorted = [...artworks].sort((x, y) => x.order - y.order);
  const seen = new Set();
  const picked = [];
  for (const a of sorted) if (!seen.has(a.category)) { seen.add(a.category); picked.push(a); }
  for (const a of sorted) if (picked.length < n && !picked.includes(a)) picked.push(a);
  return picked.slice(0, n);
}

export const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

// The home state (Karnataka) has one shipping rate and every other state has another.
// Returns null until a state has been chosen. The server works out the same number again when you pay.
export function shippingFor(shop, state, subtotal) {
  if (!state) return null;
  if (shop.free_shipping_over > 0 && subtotal >= shop.free_shipping_over) return 0;
  const home = (shop.home_state ?? "Karnataka").trim().toLowerCase();
  return state.trim().toLowerCase() === home ? shop.shipping_fee : (shop.shipping_fee_other ?? 350);
}
