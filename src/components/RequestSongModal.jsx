import React, { useState } from "react";
import { toast } from "react-toastify";
import "./RequestSongModal.css";
import { createAndSendOtp, verifyOtp, submitSongRequest } from "../services/songRequestService";

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

const validatePhoneNumber = (value) => {
  const digitsOnly = value.replace(/\D/g, "");
  if (digitsOnly.length < 10) {
    return "Please enter a valid phone number (at least 10 digits).";
  }
  if (digitsOnly.length > 15) {
    return "Phone number is too long.";
  }
  return null;
};

const validateEmail = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!value.trim()) return "Please enter your email.";
  if (!emailRegex.test(value.trim())) return "Please enter a valid email address.";
  return null;
};

const RequestSongModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    songName: "",
    album: "",
    userName: "",
    contactNumber: "",
    email: "",
  });
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("form"); // "form" | "otp"
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");

    const { songName, album, userName, contactNumber, email } = formData;
    if (!songName.trim()) {
      setError("Please enter the song name.");
      return;
    }
    if (!album.trim()) {
      setError("Please enter the album name.");
      return;
    }
    if (!userName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!contactNumber.trim()) {
      setError("Please enter your contact number.");
      return;
    }
    const phoneError = validatePhoneNumber(contactNumber);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setSubmitting(true);
    try {
      await createAndSendOtp(email.trim(), userName.trim());
      setStep("otp");
      setOtp("");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyAndSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const otpDigits = otp.replace(/\D/g, "");
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

      await submitSongRequest({
        songName: formData.songName.trim(),
        album: formData.album.trim(),
        userName: formData.userName.trim(),
        contactNumber: formData.contactNumber.trim(),
        email: formData.email.trim(),
      });

      toast.success("Song request submitted successfully!");

      if (onSubmit) await onSubmit();

      setFormData({
        songName: "",
        album: "",
        userName: "",
        contactNumber: "",
        email: "",
      });
      setOtp("");
      setStep("form");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToForm = () => {
    setStep("form");
    setOtp("");
    setError("");
  };

  const handleClose = () => {
    if (!submitting) {
      setFormData({
        songName: "",
        album: "",
        userName: "",
        contactNumber: "",
        email: "",
      });
      setOtp("");
      setStep("form");
      setError("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="modal-overlay"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="modal request-song-modal">
        <button
          type="button"
          className="modal__close-btn"
          onClick={handleClose}
          aria-label="Close modal"
          disabled={submitting}
        >
          <CloseIcon />
        </button>
        <div className="modal__content">
          <h3 className="modal__title">
            {step === "form" ? "Request a Song" : "Verify Your Email"}
          </h3>
          <p className="request-song-modal__subtitle">
            {step === "form"
              ? "Can't find a song? Let us know and we'll try to add it!"
              : `We've sent a 6-digit OTP to ${formData.email}. Enter it below to submit your request.`}
          </p>

          {step === "form" ? (
            <form onSubmit={handleSendOtp} className="request-song-form">
              <div className="request-song-form-group">
                <label htmlFor="songName">Song Name *</label>
                <input
                  type="text"
                  id="songName"
                  name="songName"
                  value={formData.songName}
                  onChange={handleChange}
                  placeholder="Enter song name"
                  disabled={submitting}
                  required
                />
              </div>
              <div className="request-song-form-group">
                <label htmlFor="album">Album *</label>
                <input
                  type="text"
                  id="album"
                  name="album"
                  value={formData.album}
                  onChange={handleChange}
                  placeholder="Enter album name"
                  disabled={submitting}
                  required
                />
              </div>
              <div className="request-song-form-group">
                <label htmlFor="userName">Your Name *</label>
                <input
                  type="text"
                  id="userName"
                  name="userName"
                  value={formData.userName}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  disabled={submitting}
                  required
                />
              </div>
              <div className="request-song-form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email (OTP will be sent here)"
                  disabled={submitting}
                  required
                />
              </div>
              <div className="request-song-form-group">
                <label htmlFor="contactNumber">Contact Number *</label>
                <input
                  type="tel"
                  id="contactNumber"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="Enter your contact number"
                  disabled={submitting}
                  required
                />
              </div>
              {error && <p className="request-song-form-error">{error}</p>}
              <div className="modal__actions request-song-modal__actions">
                <button
                  type="submit"
                  className="modal__btn modal__btn--submit"
                  disabled={submitting}
                >
                  {submitting ? "Sending OTP..." : "Send OTP"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndSubmit} className="request-song-form">
              <div className="request-song-form-group">
                <label htmlFor="otp">Enter OTP *</label>
                <input
                  type="text"
                  id="otp"
                  name="otp"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  placeholder="Enter 6-digit OTP"
                  disabled={submitting}
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>
              {error && <p className="request-song-form-error">{error}</p>}
              <div className="modal__actions request-song-modal__actions">
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
                  disabled={submitting || otp.length !== 6}
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

export default RequestSongModal;
