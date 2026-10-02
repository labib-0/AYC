"use client";

import { useEffect } from "react";

/**
 * Global guard to prevent mouse-wheel events from incrementing or decrementing
 * numeric input (<input type="number">) values anywhere across the application.
 *
 * Temporarily blurs the focused numeric input on wheel, allowing the mouse-wheel
 * to scroll the page/container smoothly while preventing accidental value changes.
 * Normal typing, keyboard arrows, copy-paste, programmatic updates, and +/- buttons
 * continue working without interruption.
 */
export default function GlobalNumberInputWheelGuard() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        activeEl instanceof HTMLInputElement &&
        activeEl.type === "number"
      ) {
        activeEl.blur();
      }

      const target = e.target;
      if (
        target &&
        target instanceof HTMLInputElement &&
        target.type === "number"
      ) {
        if (target === activeEl) {
          target.blur();
        }
      }
    };

    // Attach passive wheel listener globally to capture scroll actions without blocking page scroll
    window.addEventListener("wheel", handleWheel, { passive: true, capture: true });

    return () => {
      window.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, []);

  return null;
}

/**
 * Safe wheel event handler for React input elements.
 * Blurs on wheel to ensure page scrolls and number does not change.
 */
export const handleNumberInputWheel = (e: React.WheelEvent<HTMLInputElement>) => {
  e.currentTarget.blur();
};
