/**
 * Shared utility for getting user data from native (Android WebView).
 * Returns { name, email } if valid, null otherwise.
 */
const validateEmail = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return value && value.trim() && emailRegex.test(value.trim());
};

const NATIVE_MOCK_PARAM = "nativeMock";

export function tryGetNativeUserData() {
  try {
    if (typeof window === "undefined") return null;

    // Dev: simulate native call in browser when ?nativeMock=1 in URL
    const urlParams = new URLSearchParams(window.location?.search || "");
    if (urlParams.get(NATIVE_MOCK_PARAM) === "1") {
      const mock = { name: "Test User", email: "test@example.com" };
      console.log("[NativeBridge] MOCK MODE - simulating native data:", mock);
      return mock;
    }

    if (!window.Android) return null;
    if (typeof window.Android.getUserData !== "function") return null;

    const raw = window.Android.getUserData();
    if (!raw) return null;

    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    const name = (data?.name ?? "").trim();
    const email = (data?.email ?? "").trim();

    if (email && validateEmail(email)) {
      return { name: name || email.split("@")[0] || "user", email };
    }
  } catch (e) {
    console.warn("[NativeBridge] Failed to get user data:", e);
  }
  return null;
}
