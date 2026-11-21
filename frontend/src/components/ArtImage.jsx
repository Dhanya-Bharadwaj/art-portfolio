import { useState } from "react";

// Shows the real image; if it's missing, shows a coloured placeholder instead.
export default function ArtImage({ art }) {
  const [failed, setFailed] = useState(false);
  const alt = art.medium ? `${art.title}, ${art.medium}` : art.title;

  if (failed) {
    return (
      <div className="art-fallback" style={{ "--accent": art.accent }} role="img" aria-label={art.title}>
        <span>{art.title}</span>
      </div>
    );
  }
  return <img src={art.image} alt={alt} loading="lazy" draggable="false" onError={() => setFailed(true)} />;
}
