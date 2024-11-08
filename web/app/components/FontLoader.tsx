"use client";

import { useEffect, useState } from "react";

const FontLoader: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    if ("fonts" in document) {
      Promise.all([
        document.fonts.load("1em var(--font-body)"),
        document.fonts.load("1em var(--font-heading)"),
      ])
        .then(() => {
          setFontsLoaded(true);
        })
        .catch((error) => {
          console.error("Font loading failed:", error);
          setFontsLoaded(true); // Set to true even if loading fails to prevent indefinite waiting
        });
    } else {
      setFontsLoaded(true); // For browsers that don't support document.fonts
    }
  }, []);

  return (
    <style jsx global>{`
      body {
        opacity: ${fontsLoaded ? 1 : 0};
        transition: opacity 0.3s ease;
      }
    `}</style>
  );
};

export default FontLoader;
