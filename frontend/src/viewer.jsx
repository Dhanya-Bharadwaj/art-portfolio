import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Lightbox from "./components/Lightbox";

const Ctx = createContext(null);
export const useViewer = () => useContext(Ctx);

export function ViewerProvider({ artworks, children }) {
  const [id, setId] = useState(null);
  const [dir, setDir] = useState(1);
  const index = artworks.findIndex((a) => a.id === id);

  const close = useCallback(() => setId(null), []);
  const step = useCallback(
    (d) => {
      setDir(d);
      setId((cur) => {
        const i = artworks.findIndex((a) => a.id === cur);
        return artworks[(i + d + artworks.length) % artworks.length].id;
      });
    },
    [artworks]
  );
  const value = useMemo(() => ({ openArt: (aid) => { setDir(1); setId(aid); } }), []);

  return (
    <Ctx.Provider value={value}>
      {children}
      <AnimatePresence>
        {index >= 0 && (
          <Lightbox
            key="lightbox"
            art={artworks[index]}
            dir={dir}
            position={`${index + 1} of ${artworks.length}`}
            onClose={close}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
          />
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
