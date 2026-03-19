import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase/config";
import "./CreateAccountModal.css";
import { createAndSendOtp, verifyOtp } from "../services/songRequestService";
import {
  createAccount,
  isEmailTaken,
  isNameTaken,
  getAccountByEmail,
  getUniqueDisplayName,
} from "../services/accountService";
import { tryGetNativeUserData } from "../utils/nativeUserData";

const CloseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

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
  if (!value.trim()) return "Please enter your email.";
  if (!emailRegex.test(value.trim()))
    return "Please enter a valid email address.";
  return null;
};

const OTP_LENGTH = 6;

const CreateAccountModal = ({ isOpen, onClose, onAccountCreated }) => {
  const [mode, setMode] = useState("create"); // "create" | "signin"
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [nativeUserData, setNativeUserData] = useState(null); // { name, email } from native when available
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [step, setStep] = useState("form"); // "form" | "otp"
  const [submitting, setSubmitting] = useState(false);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [error, setError] = useState("");
  const otpInputRefs = React.useRef([]);

  useEffect(() => {
    if (isOpen) {
      const data = tryGetNativeUserData();
      setNativeUserData(data);
    } else {
      setNativeUserData(null);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const noTrailingSpace =
      typeof value === "string" ? value.replace(/\s+$/, "") : value;
    setFormData((prev) => ({ ...prev, [name]: noTrailingSpace }));
    setError("");
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const trimmed = typeof value === "string" ? value.trim() : value;
    if (trimmed !== value) {
      setFormData((prev) => ({ ...prev, [name]: trimmed }));
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");

    const { name, email } = formData;
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    if (mode === "create") {
      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }
      const nameTaken = await isNameTaken(name.trim());
      if (nameTaken) {
        setError("This name is already used. Please choose another.");
        return;
      }
      const emailTaken = await isEmailTaken(email.trim());
      if (emailTaken) {
        setError("This email is already registered. Sign in instead.");
        return;
      }
    } else {
      const account = await getAccountByEmail(email.trim());
      if (!account) {
        setError("No account found with this email. Create an account first.");
        return;
      }
    }

    setSubmitting(true);
    try {
      await createAndSendOtp(email.trim(), (name || email).trim());
      setStep("otp");
      setOtp(Array(OTP_LENGTH).fill(""));
      setError("");
    } catch (err) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(index + digits.length, OTP_LENGTH - 1);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError("");
    if (digit && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyAndSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const otpDigits = otp.join("");
    if (otpDigits.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setSubmitting(true);
    try {
      const isValid = await verifyOtp(formData.email.trim(), otpDigits);
      if (!isValid) {
        setError("Invalid or expired OTP. Please request a new one.");
        setSubmitting(false);
        return;
      }

      if (mode === "signin") {
        const account = await getAccountByEmail(formData.email.trim());
        toast.success("Signed in successfully!");
        if (onAccountCreated)
          onAccountCreated({
            accountId: account?.id,
            name: account?.name || formData.email,
            email: account?.email || formData.email.trim(),
          });
        setFormData({ name: "", email: "" });
        setOtp(Array(OTP_LENGTH).fill(""));
        setStep("form");
        setMode("create");
        onClose();
      } else {
        const docId = await createAccount({
          name: formData.name.trim(),
          email: formData.email.trim(),
          uuid: generateUUID(),
        });
        toast.success("Account created successfully!");
        if (onAccountCreated)
          onAccountCreated({
            accountId: docId,
            name: formData.name.trim(),
            email: formData.email.trim(),
          });
        setFormData({ name: "", email: "" });
        setOtp(Array(OTP_LENGTH).fill(""));
        setStep("form");
        onClose();
      }
    } catch (err) {
      const msg = err.message || "Failed to create account. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToForm = () => {
    setStep("form");
    setOtp(Array(OTP_LENGTH).fill(""));
    setError("");
  };

  const handleNativeCreateAccount = async (e) => {
    e.preventDefault();
    if (!nativeUserData?.email) return;
    setError("");
    setSubmitting(true);
    try {
      const existingAccount = await getAccountByEmail(
        nativeUserData.email.trim(),
      );
      if (existingAccount) {
        toast.success("Signed in successfully!");
        if (onAccountCreated)
          onAccountCreated({
            accountId: existingAccount.id,
            name: existingAccount.name || nativeUserData.name,
            email: existingAccount.email || nativeUserData.email,
          });
        onClose();
        return;
      }
      const uniqueName = await getUniqueDisplayName(nativeUserData.name);
      const docId = await createAccount({
        name: uniqueName,
        email: nativeUserData.email.trim(),
        uuid: generateUUID(),
      });
      toast.success("Account created successfully!");
      if (onAccountCreated)
        onAccountCreated({
          accountId: docId,
          name: uniqueName,
          email: nativeUserData.email.trim(),
        });
      setFormData({ name: "", email: "" });
      onClose();
    } catch (err) {
      const msg = err.message || "Failed to create account. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const switchToSignIn = () => {
    setMode("signin");
    setFormData((prev) => ({ ...prev, name: "" }));
    setError("");
  };

  const switchToCreate = () => {
    setMode("create");
    setError("");
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const email = (user.email || "").trim();
      const displayName =
        (user.displayName || "").trim() || email.split("@")[0] || "user";

      if (!email) {
        setError("Google account has no email. Please use email sign-in.");
        setGoogleSigningIn(false);
        return;
      }

      const existingAccount = await getAccountByEmail(email);
      if (existingAccount) {
        toast.success("Signed in successfully!");
        if (onAccountCreated)
          onAccountCreated({
            accountId: existingAccount.id,
            name: existingAccount.name || displayName,
            email: existingAccount.email || email,
          });
        setFormData({ name: "", email: "" });
        setStep("form");
        setMode("create");
        onClose();
        return;
      }

      const uniqueName = await getUniqueDisplayName(displayName);
      const docId = await createAccount({
        name: uniqueName,
        email,
        uuid: user.uid,
      });
      toast.success("Account created successfully!");
      if (onAccountCreated)
        onAccountCreated({
          accountId: docId,
          name: uniqueName,
          email,
        });
      setFormData({ name: "", email: "" });
      setStep("form");
      onClose();
    } catch (err) {
      if (
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request"
      ) {
        setError("");
        return;
      }
      const msg = err.message || "Google sign-in failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setGoogleSigningIn(false);
    }
  };

  const handleClose = () => {
    if (!submitting && !googleSigningIn) {
      setFormData({ name: "", email: "" });
      setOtp(Array(OTP_LENGTH).fill(""));
      setStep("form");
      setMode("create");
      setError("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={handleClose} aria-hidden="true" />
      <div className="modal create-account-modal">
        <button
          type="button"
          className="modal__close-btn"
          onClick={handleClose}
          aria-label="Close modal"
          disabled={submitting || googleSigningIn}
        >
          <CloseIcon />
        </button>
        <div className="modal__content">
          <h3 className="modal__title">
            {step === "form"
              ? mode === "create"
                ? "Create an Account"
                : "Sign In"
              : "Verify Your Email"}
          </h3>
          <p className="create-account-modal__subtitle">
            {step === "form"
              ? mode === "create"
                ? "Get a better experience with a Beatify account."
                : "Sign in to your existing account."
              : `We've sent a 6-digit OTP to ${formData.email}. Enter it below to ${mode === "signin" ? "sign in" : "create your account"}.`}
          </p>

          {step === "form" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (nativeUserData) handleNativeCreateAccount(e);
                else handleSendOtp(e);
              }}
              className="create-account-form"
            >
              <button
                type="button"
                className="create-account-google-btn"
                onClick={handleGoogleSignIn}
                disabled={submitting || googleSigningIn}
              >
                <svg
                  className="create-account-google-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {googleSigningIn ? "Signing in..." : "Continue with Google"}
              </button>
              <div className="create-account-divider">
                <span>or</span>
              </div>
              {nativeUserData ? (
                <>
                  <p className="create-account-native-hint">
                    Create account as {nativeUserData.name} (
                    {nativeUserData.email})
                  </p>
                  {error && (
                    <p className="create-account-form-error">{error}</p>
                  )}
                  <div className="modal__actions create-account-modal__actions">
                    <button
                      type="button"
                      className="modal__btn modal__btn--submit"
                      onClick={handleNativeCreateAccount}
                      disabled={submitting || googleSigningIn}
                    >
                      {submitting
                        ? "Almost there..."
                        : "Continue With CarPool Account"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {mode === "create" && (
                    <div className="create-account-form-group">
                      <label htmlFor="accountName">User Name *</label>
                      <input
                        type="text"
                        id="accountName"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Create a unique username"
                        disabled={submitting || googleSigningIn}
                        required
                      />
                    </div>
                  )}
                  <div className="create-account-form-group">
                    <label htmlFor="accountEmail">Email *</label>
                    <input
                      type="email"
                      id="accountEmail"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter your email (OTP will be sent here)"
                      disabled={submitting || googleSigningIn}
                      required
                    />
                  </div>
                  {error && (
                    <p className="create-account-form-error">{error}</p>
                  )}
                  <div className="modal__actions create-account-modal__actions">
                    <button
                      type="submit"
                      className="modal__btn modal__btn--submit"
                      disabled={submitting || googleSigningIn}
                    >
                      {submitting ? "Sending OTP..." : "Send OTP"}
                    </button>
                  </div>
                </>
              )}
              {!nativeUserData && (
                <p className="create-account-modal__switch">
                  {mode === "create" ? (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="create-account-modal__switch-btn"
                        onClick={switchToSignIn}
                        disabled={submitting || googleSigningIn}
                      >
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>
                      Don&apos;t have an account?{" "}
                      <button
                        type="button"
                        className="create-account-modal__switch-btn"
                        onClick={switchToCreate}
                        disabled={submitting || googleSigningIn}
                      >
                        Create one
                      </button>
                    </>
                  )}
                </p>
              )}
            </form>
          ) : (
            <form
              onSubmit={handleVerifyAndSubmit}
              className="create-account-form"
            >
              <div className="create-account-form-group">
                <label htmlFor="otp">Enter OTP *</label>
                <div className="otp-input-wrapper">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={9}
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      disabled={submitting}
                      placeholder="_"
                      className="otp-input-box"
                      aria-label={`OTP digit ${index + 1}`}
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                    />
                  ))}
                </div>
              </div>
              {error && <p className="create-account-form-error">{error}</p>}
              <div className="modal__actions create-account-modal__actions">
                <button
                  type="button"
                  className="modal__btn modal__btn--secondary"
                  onClick={handleBackToForm}
                  disabled={submitting}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="modal__btn modal__btn--submit"
                  disabled={submitting || otp.join("").length !== 6}
                >
                  {submitting
                    ? "Verifying..."
                    : mode === "signin"
                      ? "Verify & Sign In"
                      : "Verify & Create Account"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default CreateAccountModal;
