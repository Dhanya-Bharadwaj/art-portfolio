import { motion } from "framer-motion";
import Reveal from "./Reveal";
import SectionTitle from "./SectionTitle";
import Wave from "./Wave";

const icon = (children) => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

const STEPS = [
  {
    title: "Choose your piece",
    text: "Browse the collection, open anything that catches your eye and add it to your cart.",
    tone: "pink",
    icon: icon(<><rect x="4" y="5" width="16" height="14" rx="3" /><path d="M4 16l5-5 4 4 3-3 4 4" /><circle cx="9" cy="9.5" r="1.2" /></>),
  },
  {
    title: "Pay securely",
    text: "Checkout takes a minute. Payment is handled by Razorpay, so your card details never touch this site.",
    tone: "lav",
    icon: icon(<><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  },
  {
    title: "Packed and shipped",
    text: "Your art is wrapped with care and sent on its way once your payment is confirmed.",
    tone: "mint",
    icon: icon(<><path d="M3.5 8L12 4l8.5 4v8L12 20l-8.5-4V8z" /><path d="M3.5 8L12 12l8.5-4M12 12v8" /></>),
  },
];

export default function Process() {
  return (
    <section className="band band-mint" id="how">
      <Wave color="#eef8f4" className="wave-top" />
      <div className="section">
        <SectionTitle sub="Three simple steps from screen to wall.">How it works</SectionTitle>
        <div className="steps">
          <motion.div className="steps-line" aria-hidden="true" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 1.4, ease: "easeInOut" }} />
          {STEPS.map((s, i) => (
            <Reveal key={s.title} dir={i === 0 ? "left" : i === 2 ? "right" : "up"} delay={i * 0.12} className="step">
              <motion.div className={`step-icon ${s.tone}`} animate={{ y: [0, -6, 0] }} transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}>
                {s.icon}
              </motion.div>
              <span className="step-no">0{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
      <Wave color="#eef8f4" flip className="wave-bottom" />
    </section>
  );
}
