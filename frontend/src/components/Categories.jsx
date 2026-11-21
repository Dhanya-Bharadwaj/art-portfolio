import { useMemo } from "react";
import Reveal from "./Reveal";
import SectionTitle from "./SectionTitle";
import Slideshow from "./Slideshow";
import { categoriesOf } from "../format";

// Big tiles for each main section (Miniatures, Mandala Art, Resin, Sketches ...)
export default function Categories({ artworks, onPick }) {
  const cats = useMemo(() => categoriesOf(artworks), [artworks]);
  if (cats.length < 2) return null;

  return (
    <section className="section" id="categories">
      <SectionTitle sub="Pick a world to explore.">Browse by category</SectionTitle>
      <div className="cat-grid">
        {cats.map((c, i) => {
          const sample = { title: c.name, accent: c.accent, image: c.covers[0], images: c.covers.slice(0, 6) };
          return (
            <Reveal key={c.name} dir="up" delay={i * 0.08}>
              <a href="#work" className="cat-tile" style={{ "--accent": c.accent }} onClick={() => onPick(c.name)} aria-label={`${c.name}, ${c.count} pieces`}>
                <div className="cat-media"><Slideshow art={sample} auto interval={2600} /></div>
                <div className="cat-info">
                  <div>
                    <h3>{c.name}</h3>
                    <span>{c.count} {c.count === 1 ? "piece" : "pieces"}</span>
                  </div>
                  <span className="cat-arrow" aria-hidden="true">→</span>
                </div>
              </a>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
