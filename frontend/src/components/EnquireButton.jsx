// For pieces without a price yet: jumps to the contact form with a ready message.
export default function EnquireButton({ art, className = "", onDone }) {
  const go = () => {
    window.dispatchEvent(new CustomEvent("enquire", { detail: { title: art.title } }));
    onDone?.();
  };
  return (
    <a href="#contact" className={`add ${className}`} onClick={go}>Enquire</a>
  );
}
