import { artist } from "../config";
import Reveal from "./Reveal";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <Reveal className="foot-brand">
          <h3>{artist.name}</h3>
          <p>{artist.tagline}</p>
        </Reveal>
        <Reveal delay={0.1} className="foot-cols">
          <div>
            <h4>Shop</h4>
            <a href="#best-sellers">Best sellers</a>
            <a href="#work">Collection</a>
            <a href="#how">How it works</a>
          </div>
          <div>
            <h4>Info</h4>
            <a href="#shop-info">Shipping and returns</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </div>
          <div>
            <h4>Follow</h4>
            <a href={artist.instagram} target="_blank" rel="noreferrer">{artist.handle}</a>
            <a href={`mailto:${artist.email}`}>Email</a>
          </div>
        </Reveal>
      </div>
      <div className="foot-big" aria-hidden="true">@dcolorheist</div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} {artist.name}. All artwork is original and belongs to the artist.</span>
        <a href="#top">Back to top</a>
      </div>
    </footer>
  );
}
