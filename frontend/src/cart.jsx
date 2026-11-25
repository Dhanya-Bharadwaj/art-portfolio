import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { trackEvent } from "./api";
import { shippingFor } from "./format";

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

const KEY = "art-cart-v1";
const MAX_QTY = 10;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function CartProvider({ artworks, shop, children }) {
  const [items, setItems] = useState(load);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [shipState, setShipState] = useState(""); // chosen at checkout; decides the shipping charge

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
  }, [items]);

  // Join cart ids with live artwork data (price/stock), drop anything sold out or removed.
  const lines = useMemo(
    () =>
      items
        .map((i) => ({ art: artworks.find((a) => a.id === i.id), qty: i.qty }))
        .filter((l) => l.art && l.art.stock > 0 && l.art.price > 0)
        .map((l) => ({ ...l, qty: Math.min(l.qty, l.art.stock, MAX_QTY) })),
    [items, artworks]
  );

  const count = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((n, l) => n + l.qty * l.art.price, 0);
  const freeShip = shop.free_shipping_over > 0 && subtotal >= shop.free_shipping_over;
  const fee = shipState ? shippingFor(shop, shipState, subtotal) : null;
  const shippingKnown = lines.length === 0 || freeShip || fee !== null; // false until a state is chosen
  const shipping = lines.length === 0 || freeShip ? 0 : fee ?? 0;
  const total = subtotal + shipping;

  const maxFor = (art) => Math.min(art.stock, MAX_QTY);

  const add = useCallback((art) => {
    trackEvent(art.id, "cart");
    setItems((prev) => {
      const cur = prev.find((i) => i.id === art.id);
      const qty = Math.min((cur ? cur.qty : 0) + 1, Math.min(art.stock, MAX_QTY));
      return cur ? prev.map((i) => (i.id === art.id ? { ...i, qty } : i)) : [...prev, { id: art.id, qty }];
    });
  }, []);

  const setQty = (art, qty) =>
    setItems((prev) => prev.map((i) => (i.id === art.id ? { ...i, qty: Math.max(1, Math.min(qty, maxFor(art))) } : i)));
  const remove = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clear = () => setItems([]);

  const value = {
    shop, lines, count, subtotal, shipping, shippingKnown, shipState, setShipState, total, freeShip, maxFor,
    add, setQty, remove, clear,
    drawerOpen, openCart: () => setDrawerOpen(true), closeCart: () => setDrawerOpen(false),
    checkoutOpen, closeCheckout: () => setCheckoutOpen(false),
    startCheckout: () => { setDrawerOpen(false); setCheckoutOpen(true); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
