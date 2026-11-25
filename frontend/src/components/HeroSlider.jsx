import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ArtImage from "./ArtImage";
import Wave from "./Wave";
import { artist } from "../config";
import { metaLine, pickFeatured } from "../format";
import { useViewer } from "../viewer";

const DURATION = 5500;

const introDelay = () => {
  try { return sessionStorage.getItem("seen-intro") ? 0.15 : 1.7; } catch { return 0.15; }
};

const letters = {
  hidden: { y: "120%", scale: 0.6 },
  show: { y: 0, scale: 1, transition: { type: "spring", damping: 10, stiffness: 130 } },
};

// where each card sits in the stack: 0 = front, 1/2 = peeking behind, last = just swiped away
function pose(off, n) {
  if (off === 0) return { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, zIndex: 5 };
  if (off === 1) return { x: 46, y: 10, scale: 0.93, rotate: 5, opacity: 1, zIndex: 4 };
  if (off === 2) return { x: 86, y: 20, scale: 0.86, rotate: 9, opacity: 0.95, zIndex: 3 };
  if (off === n - 1) return { x: -150, y: 0, scale: 0.95, rotate: -12, opacity: 0, zIndex: 6 };
  return { x: 110, y: 30, scale: 0.8, rotate: 12, opacity: 0, zIndex: 1 };
}

function DeckCard({ art, off, n, onOpen, onPick, onSwipe }) {
  const active = off === 0;
  return (
    <motion.div
      className="deck-card"
      style={{ "--accent": art.accent }}
      initial={false}
      animate={pose(off, n)}
      transition={{ type: "spring", stiffness: 130, damping: 20 }}
      drag={active ? "x" : false}
      dragSnapToOrigin
      dragElastic={0.45}
      onDragEnd={(_, info) => {
        if (info.offset.x < -70) onSwipe(1);
        else if (info.offset.x > 70) onSwipe(-1);
      }}
      onTap={() => (active ? onOpen() : onPick())}
      role="button"
      tabIndex={active ? 0 : -1}
      aria-label={active ? `View ${art.title}` : `Show ${art.title}`}
      onKeyDown={(e) => e.key === "Enter" && (active ? onOpen() : onPick())}
    >
      <div className="deck-img"><ArtImage art={art} /></div>
    </motion.div>
  );
}

function Star({ size, color, style, delay, still }) {
  return (
    <motion.svg
      className="deco" width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true"
      animate={still ? undefined : { scale: [0.7, 1.15, 0.7], rotate: [0, 25, 0], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 3.4, repeat: Infinity, delay, ease: "easeInOut" }}
    >
      <path d="M12 1c1 6 5 10 11 11-6 1-10 5-11 11-1-6-5-10-11-11 6-1 10-5 11-11z" fill={color} />
    </motion.svg>
  );
}

export default function HeroSlider({ artworks }) {
  const { openArt } = useViewer();
  const still = useReducedMotion();
  const slides = useMemo(() => pickFeatured(artworks, 5), [artworks]);
  const n = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const cur = slides[index];
  const words = artist.name.split(" ");
  const delay = introDelay();

  const go = useCallback((d) => setIndex((i) => (i + d + n) % n), [n]);

  useEffect(() => {
    if (still || paused || n < 2) return;
    const t = setTimeout(() => go(1), DURATION);
    return () => clearTimeout(t);
  }, [index, paused, still, go, n]);

  return (
    <header className="hero" id="top" style={{ "--accent": cur.accent }}>
      <div className="hero-bg" />
      <motion.div className="blob b1" animate={still ? undefined : { x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="blob b2" animate={still ? undefined : { x: [0, -60, 0], y: [0, 40, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />

      <div className="hero-grid">
        <div className="hero-text">
          <motion.h1 className="hero-name" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: delay } } }} aria-label={artist.name}>
            {words.map((word, i) => (
              <span className="word" key={i} aria-hidden="true">
                {[...word].map((ch, j) => (
                  <span className="mask" key={j}><motion.span variants={letters} className="letter">{ch}</motion.span></span>
                ))}
              </span>
            ))}
          </motion.h1>
          <motion.p className="hero-tagline" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay + 0.7, duration: 0.7 }}>
            {artist.tagline}
          </motion.p>
          <motion.div className="btn-row" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay + 0.9, duration: 0.7 }}>
            <a href="#work" className="btn">Shop the work</a>
            <a href="#how" className="btn ghost">How it works</a>
          </motion.div>
        </div>

        <motion.div className="deck-wrap" initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: delay + 0.2, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
          <Star size={34} color="#ffe6a8" style={{ top: "0%", left: "4%" }} still={still} />
          <Star size={22} color="#f8c8dc" style={{ top: "14%", right: "0%" }} delay={0.9} still={still} />
          <Star size={26} color="#bfddf7" style={{ bottom: "26%", left: "0%" }} delay={1.7} still={still} />

          <motion.div animate={still ? undefined : { y: [0, -9, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
            <div className="deck">
              {slides.map((a, i) => (
                <DeckCard key={a.id} art={a} off={(i - index + n) % n} n={n} onOpen={() => openArt(a.id)} onPick={() => setIndex(i)} onSwipe={go} />
              ))}
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div key={cur.id} className="deck-caption" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }} transition={{ duration: 0.28 }}>
              <h2>{cur.title}</h2>
              <p>{metaLine(cur)}</p>
              <div className="caption-row">
                <button className="add solid" onClick={() => openArt(cur.id)}>View product</button>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="deck-controls">
            <button className="round" onClick={() => go(-1)} aria-label="Previous artwork">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <div className="dots">
              {slides.map((s, i) => (
                <button key={s.id} className={i === index ? "dot active" : "dot"} onClick={() => setIndex(i)} aria-label={`Go to ${s.title}`}>
                  <i key={i === index ? `a${index}` : "x"} className={paused ? "paused" : ""} style={{ animationDuration: `${DURATION}ms`, animationName: still ? "none" : undefined, width: i === index && still ? "100%" : undefined }} />
                </button>
              ))}
            </div>
            <button className="round" onClick={() => go(1)} aria-label="Next artwork">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </motion.div>
      </div>

      <Wave color="#fbf8ff" className="hero-wave" />
    </header>
  );
}
