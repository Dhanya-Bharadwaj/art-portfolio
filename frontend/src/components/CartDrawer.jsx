import { useEffect, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import ArtImage from "./ArtImage";
import { useCart } from "../cart";
import { money } from "../format";

const QUERY = "(max-width: 700px)";

function useMobile() {
  const [m, setM] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const f = () => setM(mq.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return m;
}

// Slides in from the right on bigger screens; a swipe-down bottom sheet on phones.
export default function CartDrawer() {
  const { drawerOpen, closeCart, lines, count, subtotal, shipping, shippingKnown, total, freeShip, shop, setQty, remove, startCheckout, maxFor } = useCart();
  const mobile = useMobile();
  const controls = useDragControls();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => e.key === "Escape" && closeCart();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, closeCart]);

  const m = (n) => money(n, shop.currency);
  const off = mobile ? { y: "100%" } : { x: "100%" };
  const on = mobile ? { y: 0 } : { x: 0 };

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeCart} />
          <motion.aside
            className="drawer" role="dialog" aria-modal="true" aria-label="Shopping cart"
            initial={off} animate={on} exit={off}
            transition={{ type: "spring", damping: 32, stiffness: 300 }}
            drag={mobile ? "y" : false} dragListener={false} dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) closeCart(); }}
          >
            <header className="drawer-head" onPointerDown={(e) => mobile && controls.start(e)}>
              <span className="sheet-grab" aria-hidden="true" />
              <h2>Your cart</h2>
              <button className="icon-btn" onClick={closeCart} aria-label="Close cart">Close</button>
            </header>

            {lines.length === 0 ? (
              <div className="empty">
                <p>Your cart is empty. Pick something you love from the gallery.</p>
                <a href="#work" className="btn" onClick={closeCart}>Browse the work</a>
              </div>
            ) : (
              <>
                <ul className="lines">
                  {lines.map(({ art, qty }) => (
                    <li key={art.id} className="line">
                      <div className="thumb" style={{ "--accent": art.accent }}><ArtImage art={art} /></div>
                      <div className="line-info">
                        <span className="card-title">{art.title}</span>
                        <span className="card-meta">{art.type}</span>
                        {maxFor(art) > 1 ? (
                          <div className="qty">
                            <button onClick={() => setQty(art, qty - 1)} aria-label={`Fewer ${art.title}`}>−</button>
                            <span aria-live="polite">{qty}</span>
                            <button onClick={() => setQty(art, qty + 1)} aria-label={`More ${art.title}`} disabled={qty >= maxFor(art)}>+</button>
                          </div>
                        ) : null}
                      </div>
                      <div className="line-end">
                        <span className="price">{m(art.price * qty)}</span>
                        <button className="link-btn" onClick={() => remove(art.id)}>Remove</button>
                      </div>
                    </li>
                  ))}
                </ul>
                <footer className="drawer-foot">
                  <dl className="totals">
                    <div><dt>Subtotal ({count})</dt><dd>{m(subtotal)}</dd></div>
                    <div><dt>Shipping</dt><dd>{freeShip ? "Free" : shippingKnown ? m(shipping) : "At checkout"}</dd></div>
                    {shippingKnown && <div className="grand"><dt>Total</dt><dd>{m(total)}</dd></div>}
                  </dl>
                  {!shippingKnown && (
                    <p className="ship-note">
                      Shipping is {m(shop.shipping_fee)} within {shop.home_state ?? "Karnataka"} and {m(shop.shipping_fee_other ?? 350)} to other states. You'll choose your state at checkout.
                    </p>
                  )}
                  <button className="btn wide" onClick={startCheckout}>Checkout</button>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
