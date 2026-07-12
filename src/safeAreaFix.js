import { notifyHeaderStackChanged } from "./hooks/useAppContentOffset";

/** Navbar mobile CSS uses fixed padding — keep this at 0 so nothing adds extra top inset. */
export function applyIosSafeAreaTopFallback() {
  document.documentElement.style.setProperty("--navbar-safe-top", "0px");
  notifyHeaderStackChanged();
}

export default function initIosSafeAreaTopFallback() {
  applyIosSafeAreaTopFallback();
  window.addEventListener("resize", applyIosSafeAreaTopFallback);
  window.addEventListener("orientationchange", applyIosSafeAreaTopFallback);
}
