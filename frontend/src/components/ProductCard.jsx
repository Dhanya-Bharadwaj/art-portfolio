import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Slideshow from "./Slideshow";
import AddButton from "./AddButton";
import EnquireButton from "./EnquireButton";
import { useCart } from "../cart";
import { useViewer } from "../viewer";
import { hasPrice, metaLine, priceLabel, stockNote } from "../format";

export default function ProductCard({ art, uniform = false }) {
  const { shop } = useCart();
  const { openArt } = useViewer();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [7, -7]), { stiffness: 200, damping: 18 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-7, 7]), { stiffness: 200, damping: 18 });
  const canTilt = typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

  const onMove = (e) => {
    if (!canTilt) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  return (
    <figure className={art.stock > 0 ? "card" : "card is-sold"} style={{ "--accent": art.accent }}>
      <motion.div className="tilt" style={{ rotateX, rotateY, transformPerspective: 900 }} onMouseMove={onMove} onMouseLeave={onLeave}>
        <button className="card-btn" onClick={() => openArt(art.id)} aria-label={`View ${art.title}`}>
          <div className="frame" style={{ aspectRatio: uniform ? "4 / 5" : art.ratio }}>
            <Slideshow art={art} auto />
            {art.stock <= 0 && <span className="sold-badge">Sold</span>}
          </div>
        </button>
        <figcaption>
          <span className="card-title">{art.title}</span>
          <span className="card-meta">{metaLine(art)}</span>
          <span className="card-meta">{stockNote(art)}</span>
          <div className="buy-row">
            <span className={hasPrice(art) ? "price" : "price ask"}>{priceLabel(art, shop.currency)}</span>
            {art.stock > 0 && (hasPrice(art) ? <AddButton art={art} /> : <EnquireButton art={art} />)}
          </div>
        </figcaption>
      </motion.div>
    </figure>
  );
}
