import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "../cart";
import { money } from "../format";

const ICONS = {
  home: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8z" />,
  shop: <><rect x="4" y="5" width="16" height="14" rx="3" /><path d="M4 16l5-5 4 4 3-3 4 4" /></>,
  cart: <><path d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3L5 8z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  contact: <><rect x="3.5" y="5.5" width="17" height="13" rx="3" /><path d="M4 8l8 6 8-6" /></>,
};

const TABS = [
  { key: "home", label: "Home", href: "#top" },
  { key: "shop", label: "Shop", href: "#work" },
  { key: "cart", label: "Cart" },
  { key: "contact", label: "Contact", href: "#contact" },
];

// Thumb-friendly navigation for phones (hidden on bigger screens by CSS).
export default function MobileBar() {
  const { count, subtotal, shop, openCart, startCheckout } = useCart();
  const [active, setActive] = useState("home");

  useEffect(() => {
    let raf = 0;
    const calc = () => {
      raf = 0;
      const line = window.innerHeight * 0.6;
      const top = (id) => document.getElementById(id)?.getBoundingClientRect().top ?? Infinity;
      setActive(top("contact") < line ? "contact" : top("best-sellers") < line ? "shop" : "home");
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(calc); };
    calc();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <AnimatePresence>
        {count > 0 && (
          <motion.button
            key="cta" className="cta-bar" onClick={startCheckout}
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          >
            <span>{count} {count === 1 ? "item" : "items"} · {money(subtotal, shop.currency)}</span>
            <span className="cta-go">Checkout</span>
          </motion.button>
        )}
      </AnimatePresence>

      <nav className="tabbar" aria-label="Quick navigation">
        {TABS.map((t) => {
          const Tag = t.href ? "a" : "button";
          return (
            <Tag key={t.key} className={active === t.key ? "tab on" : "tab"} href={t.href} onClick={t.key === "cart" ? openCart : undefined} aria-label={t.key === "cart" ? `Cart, ${count} items` : undefined}>
              {active === t.key && <motion.span layoutId="tab-pill" className="tab-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="tab-ic">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[t.key]}</svg>
                {t.key === "cart" && count > 0 && (
                  <motion.span key={count} className="tab-badge" initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }}>{count}</motion.span>
                )}
              </span>
              <span className="tab-label">{t.label}</span>
            </Tag>
          );
        })}
      </nav>
    </>
  );
}
