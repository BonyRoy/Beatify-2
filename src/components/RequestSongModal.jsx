import React, { useState } from "react";
import "./RequestSongModal.css";

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

const RequestSongModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    songName: "",
    album: "",
    userName: "",
    contactNumber: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { songName, album, userName, contactNumber } = formData;
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

    setSubmitting(true);
    try {
      await onSubmit({
        songName: songName.trim(),
        album: album.trim(),
        userName: userName.trim(),
        contactNumber: contactNumber.trim(),
      });
      setFormData({
        songName: "",
        album: "",
        userName: "",
        contactNumber: "",
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setFormData({
        songName: "",
        album: "",
        userName: "",
        contactNumber: "",
      });
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
          <h3 className="modal__title">Request a Song</h3>
          <p className="request-song-modal__subtitle">
            Can&apos;t find a song? Let us know and we&apos;ll try to add it!
          </p>
          <form onSubmit={handleSubmit} className="request-song-form">
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
                {submitting ? "Sending..." : "Send Request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default RequestSongModal;
