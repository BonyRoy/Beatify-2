import { notifyHeaderStackChanged } from "./hooks/useAppContentOffset";

/** Opened from iPhone/Android home-screen shortcut (installed PWA). */
export function isStandaloneApp() {
  return (
    navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

function measureEnvSafeTop() {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;left:-9999px;top:0;padding-top:env(safe-area-inset-top);visibility:hidden";
  document.documentElement.appendChild(probe);
  const inset = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  document.documentElement.removeChild(probe);
  return inset;
}

/**
 * Browser tab: no extra top inset (fixes empty white band in mobile Safari preview).
 * Home-screen shortcut: respect notch / status bar via CSS env() or a small JS fallback.
 */
export function applyIosSafeAreaTopFallback() {
  const root = document.documentElement;
  const standalone = isStandaloneApp();

  if (standalone) {
    document.body.classList.add("app-standalone");
    const envInset = measureEnvSafeTop();
    if (envInset >= 20) {
      root.style.removeProperty("--navbar-safe-top");
    } else if (/iPhone|iPod/i.test(navigator.userAgent)) {
      root.style.setProperty("--navbar-safe-top", "47px");
    } else {
      root.style.removeProperty("--navbar-safe-top");
    }
  } else {
    document.body.classList.remove("app-standalone");
    root.style.setProperty("--navbar-safe-top", "0px");
  }

  notifyHeaderStackChanged();
}

export default function initIosSafeAreaTopFallback() {
  applyIosSafeAreaTopFallback();
  window.addEventListener("resize", applyIosSafeAreaTopFallback);
  window.addEventListener("orientationchange", applyIosSafeAreaTopFallback);
}
