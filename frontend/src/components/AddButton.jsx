import { useState } from "react";
import { motion } from "framer-motion";
import { useCart } from "../cart";

export default function AddButton({ art, className = "" }) {
  const { add, lines, openCart, maxFor } = useCart();
  const [just, setJust] = useState(false);
  const line = lines.find((l) => l.art.id === art.id);
  const maxed = line && line.qty >= maxFor(art);

  const onAdd = () => {
    add(art);
    setJust(true);
    setTimeout(() => setJust(false), 1400);
  };

  if (just) {
    return (
      <motion.button className={`add done ${className}`} initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }}>
        Added
      </motion.button>
    );
  }
  if (maxed) {
    return <button className={`add in-cart ${className}`} onClick={openCart}>In cart, view</button>;
  }
  return <button className={`add ${className}`} onClick={onAdd}>Add to cart</button>;
}
