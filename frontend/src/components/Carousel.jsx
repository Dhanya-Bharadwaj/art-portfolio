import { useRef, useState } from "react";
import ProductCard from "./ProductCard";
import SectionTitle from "./SectionTitle";
import Wave from "./Wave";

const Chevron = ({ left }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={left ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

// Horizontal slider: swipe on touch, drag with a mouse, or use the arrows.
export default function Carousel({ artworks }) {
  const rail = useRef(null);
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });
  const [progress, setProgress] = useState(0);

  const items = [...artworks].sort((a, b) => (b.added || "").localeCompare(a.added || "") || a.order - b.order).slice(0, 8);

  const nudge = (d) => rail.current.scrollBy({ left: d * rail.current.clientWidth * 0.8, behavior: "smooth" });
  const onScroll = () => {
    const el = rail.current;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 0 ? el.scrollLeft / max : 0);
  };

  const down = (e) => {
    if (e.pointerType !== "mouse") return;
    const d = drag.current;
    d.down = true; d.moved = false; d.x = e.clientX; d.left = rail.current.scrollLeft;
    rail.current.classList.add("dragging");
  };
  const move = (e) => {
    const d = drag.current;
    if (!d.down) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 5) d.moved = true;
    rail.current.scrollLeft = d.left - dx;
  };
  const up = () => {
    drag.current.down = false;
    rail.current?.classList.remove("dragging");
  };
  const swallowClick = (e) => {
    if (drag.current.moved) {
      e.stopPropagation();
      e.preventDefault();
      drag.current.moved = false;
    }
  };

  return (
    <section className="band band-lav" id="fresh">
      <Wave color="#f3effc" className="wave-top" />
      <div className="section">
        <div className="section-head">
          <SectionTitle sub="The newest pieces, hot off the easel.">Fresh from the studio</SectionTitle>
          <div className="arrows">
            <button className="round" onClick={() => nudge(-1)} aria-label="Scroll left"><Chevron left /></button>
            <button className="round" onClick={() => nudge(1)} aria-label="Scroll right"><Chevron /></button>
          </div>
        </div>
        <div className="rail" ref={rail} onScroll={onScroll} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onClickCapture={swallowClick}>
          {items.map((a) => (
            <div className="rail-item" key={a.id}><ProductCard art={a} uniform /></div>
          ))}
        </div>
        <div className="rail-progress" aria-hidden="true"><i style={{ transform: `scaleX(${0.2 + progress * 0.8})` }} /></div>
      </div>
      <Wave color="#f3effc" flip className="wave-bottom" />
    </section>
  );
}
