import { motion, useReducedMotion } from "framer-motion";

const A = "M0,64 C240,120 480,0 720,40 C960,80 1200,120 1440,50 L1440,120 L0,120 Z";
const B = "M0,40 C240,0 480,110 720,70 C960,30 1200,0 1440,70 L1440,120 L0,120 Z";

// A softly moving wave edge. `color` is the colour of the area it fills.
export default function Wave({ color = "#fbf8ff", flip = false, className = "" }) {
  const still = useReducedMotion();
  return (
    <svg className={`wave ${flip ? "flip" : ""} ${className}`} viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
      <motion.path d={A} style={{ fill: color }} animate={still ? undefined : { d: [A, B, A] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
    </svg>
  );
}
