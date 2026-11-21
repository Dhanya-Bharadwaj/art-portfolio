import { policies } from "../config";
import Reveal from "./Reveal";
import SectionTitle from "./SectionTitle";

export default function ShopInfo() {
  return (
    <section className="section" id="shop-info">
      <SectionTitle sub="The small print, written in plain words.">Shipping, returns and care</SectionTitle>
      <div className="policies">
        {policies.map((p, i) => (
          <Reveal key={p.title} dir="up" delay={i * 0.1} className="policy">
            <h3>{p.title}</h3>
            <p>{p.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
