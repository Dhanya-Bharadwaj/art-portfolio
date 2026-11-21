import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { DEFAULT_SHOP, getArtworks, getShopConfig } from "./api";
import { CartProvider, useCart } from "./cart";
import { ViewerProvider } from "./viewer";
import Loader from "./components/Loader";
import ScrollProgress from "./components/ScrollProgress";
import Nav from "./components/Nav";
import MobileBar from "./components/MobileBar";
import HeroSlider from "./components/HeroSlider";
import Intro from "./components/Intro";
import Categories from "./components/Categories";
import Carousel from "./components/Carousel";
import Gallery from "./components/Gallery";
import Process from "./components/Process";
import ShopInfo from "./components/ShopInfo";
import About from "./components/About";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import Checkout from "./components/Checkout";

function Overlays() {
  const { checkoutOpen } = useCart();
  return (
    <>
      <CartDrawer />
      <AnimatePresence>{checkoutOpen && <Checkout key="checkout" />}</AnimatePresence>
    </>
  );
}

export default function App() {
  const [artworks, setArtworks] = useState(null);
  const [shop, setShop] = useState(DEFAULT_SHOP);
  const [loadError, setLoadError] = useState(false);
  const [category, setCategory] = useState("All");

  const load = useCallback(() => {
    setLoadError(false);
    getArtworks().then(setArtworks).catch(() => setLoadError(true));
    getShopConfig().then(setShop);
  }, []);
  useEffect(() => { load(); }, [load]);

  const hasItems = artworks && artworks.length > 0;

  return (
    <CartProvider artworks={artworks || []} shop={shop}>
      <ViewerProvider artworks={artworks || []}>
        <Loader ready={!!artworks || loadError} />
        <ScrollProgress />
        <Nav />

        {loadError && (
          <div className="state-msg">
            <h2>We couldn't load the shop</h2>
            <p>Please check your connection and try again.</p>
            <button className="btn" onClick={load}>Try again</button>
          </div>
        )}
        {artworks && !hasItems && (
          <div className="state-msg"><h2>New work is on its way</h2><p>Please check back soon.</p></div>
        )}

        {hasItems && (
          <>
            <HeroSlider artworks={artworks} />
            <main>
              <Intro artworks={artworks} />
              <Categories artworks={artworks} onPick={setCategory} />
              <Carousel artworks={artworks} />
              <Gallery artworks={artworks} category={category} setCategory={setCategory} />
              <Process />
              <ShopInfo />
              <About />
              <Contact />
            </main>
            <Footer />
            <MobileBar />
          </>
        )}
        <Overlays />
      </ViewerProvider>
    </CartProvider>
  );
}
