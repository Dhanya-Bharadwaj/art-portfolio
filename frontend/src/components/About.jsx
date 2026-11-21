import { useState } from "react";
import { motion } from "framer-motion";
import Reveal from "./Reveal";
import SectionTitle from "./SectionTitle";
import Wave from "./Wave";
import { artist } from "../config";

function Portrait() {
  const [failed, setFailed] = useState(false);
  const initials = artist.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  return (
    <div className="arch">
      {failed ? <span className="arch-initials">{initials}</span> : <img src="/artist.jpg" alt={`Portrait of ${artist.name}`} onError={() => setFailed(true)} />}
    </div>
  );
}

export default function About() {
  return (
    <section className="band band-peach" id="about">
      <Wave color="#fff4ee" className="wave-top" />
      <div className="section about-grid">
        <Reveal dir="left" className="portrait">
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
            <Portrait />
          </motion.div>
          <motion.span className="orb o1" animate={{ y: [0, 14, 0], x: [0, 8, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
          <motion.span className="orb o2" animate={{ y: [0, -16, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }} />
          <motion.span className="orb o3" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
        </Reveal>
        <Reveal dir="right" className="about-text">
          <SectionTitle>About the artist</SectionTitle>
          {artist.about.map((p, i) => (<p key={i}>{p}</p>))}
          <div className="btn-row">
            <a className="btn" href="#contact">Get in touch</a>
            <a className="btn ghost" href={artist.instagram} target="_blank" rel="noreferrer">{artist.handle}</a>
          </div>
        </Reveal>
      </div>
      <Wave color="#fff4ee" flip className="wave-bottom" />
    </section>
  );
}
