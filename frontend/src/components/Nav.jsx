import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { artist } from "../config";
import { useCart } from "../cart";

export default function Nav() {
  const { count, openCart } = useCart();
  const [menu, setMenu] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  // slide away when scrolling down, back when scrolling up
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 240 && !menu);
    setScrolled(y > 20);
  });

  return (
    <motion.nav
      className={scrolled ? "nav scrolled" : "nav"}
      aria-label="Main"
      animate={hidden ? { y: "-150%" } : { y: 0 }}
      initial={{ y: "-150%" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <a href="#top" className="nav-name">{artist.name}</a>

      <div className={menu ? "nav-links open" : "nav-links"} onClick={() => setMenu(false)}>
        <a href="#work">Work</a>
        <a href="#how">How it works</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </div>

      <div className="nav-actions">
        <button className="cart-btn" onClick={openCart} aria-label={`Open cart, ${count} items`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3L5 8z" />
            <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
          </svg>
          {count > 0 && (
            <motion.span key={count} className="badge" initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }}>
              {count}
            </motion.span>
          )}
        </button>
        <button className="menu-btn" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
    </motion.nav>
  );
}
