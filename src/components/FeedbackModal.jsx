import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  createAndSendOtp,
  verifyOtp,
  submitFeedback,
} from "../services/feedbackService";
import { useCreateAccount } from "../context/CreateAccountContext";
import "./FeedbackModal.css";

const OTP_LENGTH = 6;

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
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const validateEmail = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!value.trim()) return "Please enter your email.";
  if (!emailRegex.test(value.trim())) return "Please enter a valid email address.";
  return null;
};

const FeedbackModal = ({ isOpen, onClose }) => {
  const { isLoggedIn, userName: authUserName, userEmail: authUserEmail } =
    useCreateAccount();

  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    contactNumber: "",
    message: "",
  });
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [step, setStep] = useState("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const otpInputRefs = React.useRef([]);

  useEffect(() => {
    if (isOpen && isLoggedIn) {
      setFormData((prev) => ({
        ...prev,
        userName: authUserName || prev.userName,
        email: authUserEmail || prev.email,
      }));
    }
  }, [isOpen, isLoggedIn, authUserName, authUserEmail]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.userName.trim()) {
      setError("Please enter your name.");
      return;
    }
    const emailErr = validateEmail(formData.email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    if (!formData.message.trim()) {
      setError("Please enter your feedback message.");
      return;
    }

    if (isLoggedIn) {
      await doSubmit();
    } else {
      setSubmitting(true);
      try {
        await createAndSendOtp(formData.email.trim(), formData.userName.trim());
        setStep("otp");
        setOtp(Array(OTP_LENGTH).fill(""));
        setError("");
      } catch (err) {
        setError(err.message || "Failed to send OTP. Please try again.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      await submitFeedback({
        userName: formData.userName.trim(),
        email: formData.email.trim(),
        contactNumber: (formData.contactNumber || "").trim() || null,
        message: formData.message.trim(),
      });
      toast.success("Feedback submitted successfully!");
      resetForm();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to submit feedback. Please try again.");
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
      otpInputRefs.current[Math.min(index + digits.length, OTP_LENGTH - 1)]?.focus();
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
      await doSubmit();
    } catch (err) {
      setError(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      userName: (isLoggedIn && authUserName) ? authUserName : "",
      email: (isLoggedIn && authUserEmail) ? authUserEmail : "",
      contactNumber: "",
      message: "",
    });
    setOtp(Array(OTP_LENGTH).fill(""));
    setStep("form");
    setError("");
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={handleClose} aria-hidden="true" />
      <div className="modal feedback-modal">
        <button
          type="button"
          className="modal__close-btn"
          onClick={handleClose}
          aria-label="Close"
          disabled={submitting}
        >
          <CloseIcon />
        </button>
        <div className="modal__content">
          <h3 className="modal__title">
            {step === "form" ? "Send Feedback" : "Verify Your Email"}
          </h3>
          <p className="feedback-modal__subtitle">
            {step === "form"
              ? "Share your thoughts, suggestions, or report issues."
              : `We've sent a 6-digit OTP to ${formData.email}. Enter it below.`}
          </p>

          {step === "form" ? (
            <form onSubmit={handleSubmitForm} className="feedback-form">
              <div className="feedback-form-group">
                <label htmlFor="fb-userName">Name *</label>
                <input
                  type="text"
                  id="fb-userName"
                  name="userName"
                  value={formData.userName}
                  onChange={handleChange}
                  placeholder="Your name"
                  disabled={submitting}
                />
              </div>
              <div className="feedback-form-group">
                <label htmlFor="fb-email">Email *</label>
                <input
                  type="email"
                  id="fb-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={
                    isLoggedIn ? "Your email" : "Email (OTP will be sent here)"
                  }
                  disabled={submitting}
                />
              </div>
              <div className="feedback-form-group">
                <label htmlFor="fb-contactNumber">Mobile (optional)</label>
                <input
                  type="tel"
                  id="fb-contactNumber"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="Your mobile number"
                  disabled={submitting}
                  inputMode="numeric"
                />
              </div>
              <div className="feedback-form-group">
                <label htmlFor="fb-message">Message *</label>
                <textarea
                  id="fb-message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Your feedback..."
                  disabled={submitting}
                  rows={4}
                />
              </div>
              {error && <p className="feedback-form-error">{error}</p>}
              <div className="feedback-modal__actions">
                <button
                  type="submit"
                  className="modal__btn modal__btn--submit"
                  disabled={submitting}
                >
                  {submitting
                    ? isLoggedIn
                      ? "Submitting..."
                      : "Sending OTP..."
                    : isLoggedIn
                      ? "Submit"
                      : "Send OTP"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndSubmit} className="feedback-form">
              <div className="feedback-form-group">
                <label>Enter OTP *</label>
                <div className="otp-input-wrapper">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpInputRefs.current[i] = el)}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={9}
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otp[i] && i > 0) {
                          otpInputRefs.current[i - 1]?.focus();
                        }
                      }}
                      disabled={submitting}
                      placeholder="_"
                      className="otp-input-box"
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                    />
                  ))}
                </div>
              </div>
              {error && <p className="feedback-form-error">{error}</p>}
              <div className="feedback-modal__actions">
                <button
                  type="button"
                  className="modal__btn modal__btn--secondary"
                  onClick={() => {
                    setStep("form");
                    setOtp(Array(OTP_LENGTH).fill(""));
                    setError("");
                  }}
                  disabled={submitting}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="modal__btn modal__btn--submit"
                  disabled={submitting || otp.join("").length !== 6}
                >
                  {submitting ? "Verifying..." : "Verify & Submit"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default FeedbackModal;
