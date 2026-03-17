import React, { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import { getAccountByEmail, createAccount, getUniqueDisplayName } from "../services/accountService";
import NativeAccountConfirmModal from "./NativeAccountConfirmModal";

const generateUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const validateEmail = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return value && value.trim() && emailRegex.test(value.trim());
};

const NATIVE_MOCK_PARAM = "nativeMock";

const tryGetNativeUserData = () => {
  try {
    if (typeof window === "undefined") return null;

    // Dev: simulate native call in browser when ?nativeMock=1 in URL
    const urlParams = new URLSearchParams(window.location?.search || "");
    if (urlParams.get(NATIVE_MOCK_PARAM) === "1") {
      const mock = { name: "Test User", email: "test@example.com" };
      console.log("[NativeBridge] MOCK MODE - simulating native data:", mock);
      return mock;
    }

    if (!window.Android) {
      console.log("[NativeBridge] window.Android not found (running in browser)");
      return null;
    }
    if (typeof window.Android.getUserData !== "function") {
      console.log("[NativeBridge] window.Android.getUserData is not a function");
      return null;
    }
    const raw = window.Android.getUserData();
    console.log("[NativeBridge] getUserData() raw:", raw);
    if (!raw) {
      console.log("[NativeBridge] getUserData() returned empty");
      return null;
    }
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    console.log("[NativeBridge] Parsed data:", data);
    const name = (data?.name ?? "").trim();
    const email = (data?.email ?? "").trim();
    if (email && validateEmail(email)) {
      const result = { name: name || email.split("@")[0] || "user", email };
      console.log("[NativeBridge] Valid user data:", result);
      return result;
    }
    console.log("[NativeBridge] Invalid or missing email:", { name, email });
  } catch (e) {
    console.warn("[NativeBridge] Failed to get user data:", e);
  }
  return null;
};

/**
 * Handles native Android WebView bridge (window.Android.getUserData()).
 * On page load: if native data exists, login existing user or show confirm modal for new account creation (no OTP).
 */
function NativeBridgeHandler({ login, isLoggedIn }) {
  const [confirmModal, setConfirmModal] = useState({ open: false, name: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const processedRef = useRef(false);

  const handleNativeUserData = useCallback(
    async (userData) => {
      if (!userData || processedRef.current || isLoggedIn) return;

      processedRef.current = true;

      try {
        console.log("[NativeBridge] Processing user data:", userData);
        const existingAccount = await getAccountByEmail(userData.email);
        if (existingAccount) {
          console.log("[NativeBridge] Existing account found, logging in:", existingAccount.id);
          login({
            accountId: existingAccount.id,
            name: existingAccount.name || userData.name,
            email: existingAccount.email || userData.email,
          });
          toast.success("Signed in successfully!");
          return;
        }

        console.log("[NativeBridge] No existing account, showing confirm modal");
        setConfirmModal({ open: true, name: userData.name, email: userData.email });
      } catch (e) {
        console.error("[NativeBridge] Error:", e);
        toast.error("Failed to process sign-in.");
        processedRef.current = false;
      }
    },
    [login, isLoggedIn]
  );

  const handleConfirmCreate = async () => {
    const { name, email } = confirmModal;
    if (!email || !validateEmail(email)) return;

    setSubmitting(true);
    try {
      const uniqueName = await getUniqueDisplayName(name);
      console.log("[NativeBridge] Creating account:", { uniqueName, email });
      const docId = await createAccount({
        name: uniqueName,
        email: email.trim(),
        uuid: generateUUID(),
      });
      login({ accountId: docId, name: uniqueName, email: email.trim() });
      console.log("[NativeBridge] Account created:", docId);
      toast.success("Account created successfully!");
      setConfirmModal({ open: false, name: "", email: "" });
    } catch (e) {
      toast.error(e.message || "Failed to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseConfirm = () => {
    if (!submitting) {
      setConfirmModal({ open: false, name: "", email: "" });
      processedRef.current = false;
    }
  };

  useEffect(() => {
    console.log("[NativeBridge] Handler mounted, isLoggedIn:", isLoggedIn);
    if (isLoggedIn) return;

    const check = () => {
      const data = tryGetNativeUserData();
      if (data) handleNativeUserData(data);
    };

    check();
    const t1 = setTimeout(check, 200);
    const t2 = setTimeout(check, 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isLoggedIn, handleNativeUserData]);

  return (
    <NativeAccountConfirmModal
      isOpen={confirmModal.open}
      onClose={handleCloseConfirm}
      onConfirm={handleConfirmCreate}
      name={confirmModal.name}
      email={confirmModal.email}
      submitting={submitting}
    />
  );
}

export default NativeBridgeHandler;
