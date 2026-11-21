import { motion, useReducedMotion } from "framer-motion";

const FROM = (d, dist) => ({ up: { y: dist }, down: { y: -dist }, left: { x: -dist }, right: { x: dist }, none: {} }[d]);

// Slides + fades its children in when scrolled into view.
export default function Reveal({ as = "div", dir = "up", delay = 0, distance = 48, className, children, ...rest }) {
  const still = useReducedMotion();
  const Tag = motion[as];
  if (still) return <Tag className={className} {...rest}>{children}</Tag>;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, ...FROM(dir, distance) }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
