"use client";

import { useEffect } from "react";

const useAutoScrollOnFocus = () => {
  useEffect(() => {
    const handleFocus = (event: any) => {
      const target = event.target;

      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        // Scroll the input into view when focused
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100); // Delay is needed for the keyboard to pop up first
      }
    };

    const handleFocusOut = () => {
      // When the keyboard is exited (focus out), zoom out to normal view
      window.scrollTo(0, 0);
    };

    // Add event listeners
    document.addEventListener("focusin", handleFocus);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      // Cleanup event listeners
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);
};

export default function AutoScrollWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  useAutoScrollOnFocus();
  return <>{children}</>;
}
