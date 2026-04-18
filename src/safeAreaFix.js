/**
 * iOS Safari / Home Screen PWA often reports env(safe-area-inset-top) as 0px in stylesheets
 * while the page still paints under the translucent status bar. Measuring padding-top: env(...)
 * via getComputedStyle usually returns the real inset; when it is still too small on iPhone,
 * we set --app-safe-top so the navbar and main offset stay below the status bar.
 */
export default function applyIosSafeAreaTopFallback() {
  if (!/iPhone/.test(navigator.userAgent)) return;

  const narrowPortraitPhone = window.matchMedia("(max-width: 480px)").matches;
  if (!narrowPortraitPhone) return;

  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;left:-9999px;top:0;padding-top:env(safe-area-inset-top);visibility:hidden";
  document.documentElement.appendChild(probe);
  const pt = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  document.documentElement.removeChild(probe);

  /* If this is ~0, env() is broken for stylesheets; if ~44–59, trust it */
  const fallbackPx = 48;
  if (pt < 20) {
    document.documentElement.style.setProperty("--app-safe-top", `${fallbackPx}px`);
  }
}
