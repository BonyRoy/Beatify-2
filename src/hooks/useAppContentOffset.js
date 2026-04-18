import { useLayoutEffect, useRef } from "react";

/** Fixed strips below the navbar that reserve vertical space for main content */
const SECOND_ROW_SELECTOR =
  ".artists-section:not(.artists-section--inline), .playlist-header-mobile, .moods-header-mobile";

/**
 * Sets --app-content-offset on <html> to the bottom edge of the fixed header stack
 * (navbar + optional artists / playlist / moods strip) so .app__content does not
 * need magic padding-top values that break when a strip is removed from the DOM.
 */
export function useAppContentOffset(enabled) {
  const roRef = useRef(null);
  const moTimerRef = useRef(0);

  useLayoutEffect(() => {
    if (!enabled) {
      document.documentElement.style.removeProperty("--app-content-offset");
      return;
    }

    const measure = () => {
      const nav = document.querySelector(".navbar");
      if (!nav) return;
      let bottom = nav.getBoundingClientRect().bottom;
      document.querySelectorAll(SECOND_ROW_SELECTOR).forEach((el) => {
        bottom = Math.max(bottom, el.getBoundingClientRect().bottom);
      });
      document.documentElement.style.setProperty(
        "--app-content-offset",
        `${Math.ceil(bottom)}px`,
      );
    };

    const setupResizeObservers = () => {
      if (roRef.current) {
        roRef.current.disconnect();
      }
      roRef.current = new ResizeObserver(() => measure());
      const nav = document.querySelector(".navbar");
      if (nav) roRef.current.observe(nav);
      document.querySelectorAll(SECOND_ROW_SELECTOR).forEach((el) => {
        roRef.current.observe(el);
      });
    };

    const onDomMaybeChanged = () => {
      clearTimeout(moTimerRef.current);
      moTimerRef.current = setTimeout(() => {
        setupResizeObservers();
        measure();
      }, 32);
    };

    setupResizeObservers();
    measure();

    const mo = new MutationObserver(onDomMaybeChanged);
    const root = document.getElementById("root");
    mo.observe(root ?? document.body, { childList: true, subtree: true });

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    return () => {
      clearTimeout(moTimerRef.current);
      mo.disconnect();
      if (roRef.current) {
        roRef.current.disconnect();
        roRef.current = null;
      }
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      document.documentElement.style.removeProperty("--app-content-offset");
    };
  }, [enabled]);
}
