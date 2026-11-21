import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Reveal from "./Reveal";
import { artist } from "../config";

function Word({ word, range, progress, still }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return <motion.span className="w" style={{ opacity: still ? 1 : opacity }}>{word} </motion.span>;
}

function Counter({ to }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.6, ease: "easeOut", onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>{v}</span>;
}

export default function Intro({ artworks }) {
  const ref = useRef(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.55"] });
  const words = artist.statement.split(" ");

  const stats = [
    { label: "Pieces in the shop", value: artworks.length, tone: "pink" },
    { label: "Available right now", value: artworks.filter((a) => a.stock > 0).length, tone: "mint" },
    { label: "Categories", value: new Set(artworks.map((a) => a.category)).size, tone: "sky" },
  ];

  return (
    <section className="section intro">
      <p className="statement" ref={ref}>
        {words.map((w, i) => (
          <Word key={i} word={w} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} still={still} />
        ))}
      </p>
      <div className="stats">
        {stats.map((s, i) => (
          <Reveal key={s.label} dir="up" delay={i * 0.12} className={`stat ${s.tone}`}>
            <strong><Counter to={s.value} /></strong>
            <span>{s.label}</span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
