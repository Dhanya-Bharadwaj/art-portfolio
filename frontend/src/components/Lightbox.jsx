import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Slideshow from "./Slideshow";
import AddButton from "./AddButton";
import EnquireButton from "./EnquireButton";
import { useCart } from "../cart";
import { hasPrice, metaLine, priceLabel, stockNote } from "../format";

const slide = {
  enter: (d) => ({ x: d * 80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d) => ({ x: d * -80, opacity: 0 }),
};

export default function Lightbox({ art, dir, position, onClose, onPrev, onNext }) {
  const { shop, add, startCheckout } = useCart();
  const images = art.images?.length ? art.images : [art.image];
  const n = images.length;
  const [idx, setIdx] = useState(0);
  const i = Math.min(idx, n - 1);

  useEffect(() => setIdx(0), [art.id]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      // arrows flip through this piece's photos; with a single photo they move to the next piece
      if (e.key === "ArrowLeft") (n > 1 ? setIdx((x) => (x - 1 + n) % n) : onPrev());
      if (e.key === "ArrowRight") (n > 1 ? setIdx((x) => (x + 1) % n) : onNext());
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext, n]);

  const buyNow = () => {
    add(art);
    onClose();
    startCheckout();
  };

  return (
    <motion.div className="lb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true" aria-label={art.title}>
      <button className="lb-x" onClick={onClose} aria-label="Close">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <motion.div className="lb-inner" initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ type: "spring", damping: 24, stiffness: 260 }} onClick={(e) => e.stopPropagation()}>
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div key={art.id} className="lb-slide" style={{ "--accent": art.accent }} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.28 }}>
            <div className="lb-media">
              <div className="frame lb-frame" style={{ aspectRatio: art.ratio, "--r": art.ratio }}>
                <Slideshow art={art} effect="slide" fit="contain" index={i} onChange={setIdx} arrows swipe badge dots={false} />
              </div>
              {n > 1 && (
                <div className="thumbs" aria-label="All photos">
                  {images.map((src, k) => (
                    <button key={src} className={k === i ? "thumb-btn on" : "thumb-btn"} onClick={() => setIdx(k)} aria-label={`Photo ${k + 1} of ${n}`}>
                      <img src={src} alt="" loading="lazy" draggable="false" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lb-info">
              <h3>{art.title}</h3>
              <p className="lb-meta">{metaLine(art)}</p>
              <p>{art.description}</p>
              <div className="lb-buy">
                <span className={hasPrice(art) ? "price big" : "price ask"}>{priceLabel(art, shop.currency)}</span>
                <span className="card-meta">{stockNote(art)}</span>
                {art.stock <= 0 ? (
                  <p className="sold-note">This piece has found its home.</p>
                ) : hasPrice(art) ? (
                  <div className="lb-actions">
                    <AddButton art={art} />
                    <button className="add solid" onClick={buyNow}>Buy now</button>
                  </div>
                ) : (
                  <div className="lb-actions"><EnquireButton art={art} className="solid" onDone={onClose} /></div>
                )}
              </div>
              <div className="lb-nav">
                <button onClick={onPrev}>Previous piece</button>
                <span>{position}</span>
                <button onClick={onNext}>Next piece</button>
              </div>
              <button className="lb-close" onClick={onClose}>Close</button>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
