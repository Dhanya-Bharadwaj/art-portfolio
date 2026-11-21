import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ProductCard from "./ProductCard";
import SectionTitle from "./SectionTitle";
import { categoriesOf, hasPrice } from "../format";

export default function Gallery({ artworks, category, setCategory }) {
  const cats = useMemo(() => categoriesOf(artworks), [artworks]);
  const [group, setGroup] = useState("All");
  const [sort, setSort] = useState("featured");
  const [availableOnly, setAvailableOnly] = useState(false);

  useEffect(() => setGroup("All"), [category]);

  // sub-filters (e.g. Food / Table Stands) appear only when a category has more than one group
  const groups = useMemo(() => {
    if (category === "All") return [];
    const g = [...new Set(artworks.filter((a) => a.category === category).map((a) => a.group).filter(Boolean))];
    return g.length > 1 ? g : [];
  }, [artworks, category]);

  const shown = useMemo(() => {
    const list = artworks.filter(
      (a) => (category === "All" || a.category === category) && (group === "All" || a.group === group) && (!availableOnly || a.stock > 0)
    );
    const low = (a) => (hasPrice(a) ? a.price : Infinity);
    const high = (a) => (hasPrice(a) ? a.price : -1);
    const cmp = {
      featured: (a, b) => a.order - b.order,
      low: (a, b) => (low(a) === low(b) ? 0 : low(a) < low(b) ? -1 : 1),
      high: (a, b) => high(b) - high(a),
    }[sort];
    return [...list].sort(cmp);
  }, [artworks, category, group, sort, availableOnly]);

  return (
    <section className="section" id="work">
      <SectionTitle sub="Tap any piece to see every photo, then add it to your cart.">The collection</SectionTitle>

      <div className="cat-tabs" role="tablist" aria-label="Category">
        {["All", ...cats.map((c) => c.name)].map((name) => (
          <button key={name} role="tab" aria-selected={category === name} className={category === name ? "cat-tab on" : "cat-tab"} onClick={() => setCategory(name)}>
            {name}
            <span className="n">{name === "All" ? artworks.length : cats.find((c) => c.name === name).count}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-row">
        <div className="filters" role="group" aria-label="More filters">
          {groups.length > 0 && ["All", ...groups].map((g) => (
            <button key={g} className={g === group ? "chip on" : "chip"} onClick={() => setGroup(g)}>{g}</button>
          ))}
          <button className={availableOnly ? "chip on" : "chip"} onClick={() => setAvailableOnly(!availableOnly)} aria-pressed={availableOnly}>Available only</button>
        </div>
        <label className="sort">
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Featured</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </label>
      </div>

      {shown.length === 0 && <p className="loading">Nothing matches those filters.</p>}

      <motion.div className="masonry" layout>
        <AnimatePresence mode="popLayout">
          {shown.map((a, i) => (
            <motion.div
              key={a.id}
              layout
              className="masonry-item"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.55, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <ProductCard art={a} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
