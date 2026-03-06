import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import "./RequestSongModal.css";
import { createAndSendOtp, verifyOtp, submitSongRequest } from "../services/songRequestService";
import { useCreateAccount } from "../context/CreateAccountContext";

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

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const validatePhoneNumber = (value) => {
  if (!value || !value.trim()) return null;
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

const OTP_LENGTH = 6;

const RequestSongModal = ({ isOpen, onClose, onSubmit }) => {
  const { isLoggedIn, userName: authUserName, userEmail: authUserEmail } = useCreateAccount();

  const [songRows, setSongRows] = useState([{ songName: "", album: "" }]);
  const [formData, setFormData] = useState({
    userName: "",
    contactNumber: "",
    email: "",
  });
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [step, setStep] = useState("form"); // "form" | "otp"
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const otpInputRefs = React.useRef([]);

  // Auto-populate when signed in and modal opens
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

  const handleSongRowChange = (index, field, value) => {
    setSongRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setError("");
  };

  const addSongRow = () => {
    setSongRows((prev) => [...prev, { songName: "", album: "" }]);
  };

  const removeSongRow = (index) => {
    if (songRows.length <= 1) return;
    setSongRows((prev) => prev.filter((_, i) => i !== index));
  };

  const getValidSongRows = () => {
    return songRows.filter((row) => row.songName.trim() || row.album.trim());
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setError("");

    const validRows = getValidSongRows();
    if (validRows.length === 0) {
      setError("Please add at least one song with a song name.");
      return;
    }
    const hasValidSongName = validRows.some((r) => r.songName.trim());
    if (!hasValidSongName) {
      setError("Please enter at least one song name.");
      return;
    }

    if (!formData.userName.trim()) {
      setError("Please enter your name.");
      return;
    }
    const emailError = validateEmail(formData.email);
    if (emailError) {
      setError(emailError);
      return;
    }
    const phoneError = validatePhoneNumber(formData.contactNumber);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    if (isLoggedIn) {
      // Signed in: submit directly without OTP
      await submitAllRequests(validRows);
    } else {
      // Not signed in: send OTP first
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

  const submitAllRequests = async (rows) => {
    setSubmitting(true);
    try {
      const basePayload = {
        userName: formData.userName.trim(),
        contactNumber: (formData.contactNumber || "").trim() || null,
        email: formData.email.trim(),
      };
      for (const row of rows) {
        if (row.songName.trim()) {
          await submitSongRequest({
            ...basePayload,
            songName: row.songName.trim(),
            album: (row.album || "").trim() || "",
          });
        }
      }
      toast.success(
        rows.length === 1
          ? "Song request submitted successfully!"
          : `${rows.length} song requests submitted successfully!`
      );
      if (onSubmit) await onSubmit();
      resetForm();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSongRows([{ songName: "", album: "" }]);
    setFormData({
      userName: isLoggedIn ? authUserName || "" : "",
      contactNumber: "",
      email: isLoggedIn ? authUserEmail || "" : "",
    });
    setOtp(Array(OTP_LENGTH).fill(""));
    setStep("form");
    setError("");
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

      const validRows = getValidSongRows();
      await submitAllRequests(validRows);
    } catch (err) {
      setError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToForm = () => {
    setStep("form");
    setOtp(Array(OTP_LENGTH).fill(""));
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
            <form onSubmit={handleSubmitForm} className="request-song-form">
              <div className="request-song-form__table-wrapper">
                <table className="request-song-table">
                  <thead>
                    <tr>
                      <th>Song Name *</th>
                      <th>Album</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {songRows.map((row, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="text"
                            value={row.songName}
                            onChange={(e) =>
                              handleSongRowChange(index, "songName", e.target.value)
                            }
                            placeholder="Enter song name"
                            disabled={submitting}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={row.album}
                            onChange={(e) =>
                              handleSongRowChange(index, "album", e.target.value)
                            }
                            placeholder="Enter album"
                            disabled={submitting}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="request-song-table__remove-btn"
                            onClick={() => removeSongRow(index)}
                            disabled={submitting || songRows.length <= 1}
                            aria-label="Remove row"
                          >
                            <TrashIcon />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  type="button"
                  className="request-song-form__add-row"
                  onClick={addSongRow}
                  disabled={submitting}
                >
                  <PlusIcon /> Add another song
                </button>
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
                  placeholder={
                    isLoggedIn
                      ? "Your email"
                      : "Enter your email (OTP will be sent here)"
                  }
                  disabled={submitting}
                  required
                />
              </div>
              <div className="request-song-form-group">
                <label htmlFor="contactNumber">Contact Number (optional)</label>
                <input
                  type="tel"
                  id="contactNumber"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="Enter your contact number"
                  disabled={submitting}
                  inputMode="numeric"
                />
              </div>
              {error && <p className="request-song-form-error">{error}</p>}
              <div className="modal__actions request-song-modal__actions">
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
                      ? "Submit Request"
                      : "Send OTP"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndSubmit} className="request-song-form">
              <div className="request-song-form-group">
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

export default RequestSongModal;
