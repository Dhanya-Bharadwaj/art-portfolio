import { motion } from "framer-motion";
import Reveal from "./Reveal";

export default function SectionTitle({ children, sub }) {
  return (
    <Reveal className="title-wrap">
      <h2>{children}</h2>
      <svg className="squiggle" viewBox="0 0 120 12" aria-hidden="true">
        <motion.path
          d="M2 8 Q 12 0 22 8 T 42 8 T 62 8 T 82 8 T 102 8 T 118 8"
          fill="none" stroke="#cdbef5" strokeWidth="4" strokeLinecap="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
          viewport={{ once: true }} transition={{ duration: 1.1, delay: 0.35 }}
        />
      </svg>
      {sub && <p className="title-sub">{sub}</p>}
    </Reveal>
  );
}
