import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import ArtImage from "./ArtImage";

const VARIANTS = {
  fade: { enter: () => ({ opacity: 0, scale: 1.06 }), center: { opacity: 1, scale: 1 }, exit: () => ({ opacity: 0 }) },
  slide: { enter: (d) => ({ opacity: 0, x: d * 60 }), center: { opacity: 1, x: 0 }, exit: (d) => ({ opacity: 0, x: d * -60 }) },
};

const Chevron = ({ left }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={left ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

// The "moving images" of a card. Fills its parent box.
//  auto   : changes picture by itself (only while on screen)
//  index/onChange : let a parent control it (used by the artwork viewer)
export default function Slideshow({ art, auto = false, interval = 3200, effect = "fade", fit = "cover", index, onChange, arrows = false, swipe = false, badge = false, dots = true }) {
  const images = art.images?.length ? art.images : [art.image];
  const n = images.length;
  const [inner, setInner] = useState(0);
  const i = Math.min(index ?? inner, n - 1);
  const prev = useRef(i);
  const wrap = useRef(null);
  const inView = useInView(wrap, { margin: "120px" });
  const still = useReducedMotion();
  const jitter = useRef(Math.random() * 1400); // so cards don't all change at the same moment

  const set = (k) => (onChange ? onChange(k) : setInner(k));
  const step = (d) => set((i + d + n) % n);

  let dir = i >= prev.current ? 1 : -1;
  if (n > 2 && prev.current === n - 1 && i === 0) dir = 1;
  if (n > 2 && prev.current === 0 && i === n - 1) dir = -1;
  useEffect(() => { prev.current = i; }, [i]);

  useEffect(() => {
    if (!auto || still || n < 2 || !inView) return;
    const t = setTimeout(() => step(1), interval + jitter.current);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, still, n, inView, i, interval]);

  useEffect(() => {
    if (n > 1) new Image().src = images[(i + 1) % n]; // preload the next picture
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, n]);

  return (
    <div className={`slides ${fit}`} ref={wrap} style={{ "--accent": art.accent }}>
      <AnimatePresence initial={false} custom={dir}>
        <motion.div
          key={i} className="slide" custom={dir} variants={VARIANTS[effect]}
          initial="enter" animate="center" exit="exit" transition={{ duration: effect === "fade" ? 0.9 : 0.3 }}
          drag={swipe && n > 1 ? "x" : false} dragSnapToOrigin dragElastic={0.3} style={{ touchAction: "pan-y" }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60) step(1);
            else if (info.offset.x > 60) step(-1);
          }}
        >
          <ArtImage art={{ ...art, image: images[i] }} />
        </motion.div>
      </AnimatePresence>

      {badge && n > 1 && <span className="photo-count">{i + 1} / {n}</span>}
      {dots && n > 1 && (
        <span className="slide-dots" aria-hidden="true">
          {images.map((_, k) => <i key={k} className={k === i ? "on" : ""} />)}
        </span>
      )}
      {arrows && n > 1 && (
        <>
          <button className="slide-arrow l" onClick={() => step(-1)} aria-label="Previous photo"><Chevron left /></button>
          <button className="slide-arrow r" onClick={() => step(1)} aria-label="Next photo"><Chevron /></button>
        </>
      )}
    </div>
  );
}
