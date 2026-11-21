import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { artist } from "../config";

const COLORS = ["#f8c8dc", "#cdbef5", "#bfe8da", "#bfddf7"];

const seenBefore = () => {
  try { return !!sessionStorage.getItem("seen-intro"); } catch { return false; }
};

// Four pastel curtains slide up after a short welcome.
export default function Loader({ ready }) {
  const [done, setDone] = useState(seenBefore);
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setElapsed(true), 1500);
    return () => clearTimeout(t);
  }, [done]);

  useEffect(() => {
    if (elapsed && ready) {
      setDone(true);
      try { sessionStorage.setItem("seen-intro", "1"); } catch { /* ignore */ }
    }
  }, [elapsed, ready]);

  return (
    <AnimatePresence>
      {!done && [
        ...COLORS.map((c, i) => (
          <motion.div
            key={`p${i}`} className="loader-panel" aria-hidden="true"
            style={{ left: `${i * 25}%`, background: c }}
            exit={{ y: "-100%" }} transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1], delay: i * 0.07 }}
          />
        )),
        <motion.div
          key="name" className="loader-name" role="status" aria-label="Loading"
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6 }}
        >
          {artist.name}
          <motion.span className="loader-bar" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.4, ease: "easeInOut" }} />
        </motion.div>,
      ]}
    </AnimatePresence>
  );
}
