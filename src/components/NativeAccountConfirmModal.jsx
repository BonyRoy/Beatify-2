import React from "react";
import "./NativeAccountConfirmModal.css";

const NativeAccountConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  name,
  email,
  submitting,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="native-account-confirm-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="modal native-account-confirm-modal">
        <div className="modal__content">
          <h3 className="modal__title">Create Beatify Account?</h3>
          <p className="native-account-confirm-modal__subtitle">
            Create an account with the following details from the app?
          </p>
          <div className="native-account-confirm-modal__details">
            <p>
              <strong>Name:</strong> {name}
            </p>
            <p>
              <strong>Email:</strong> {email}
            </p>
          </div>
          <div className="modal__actions native-account-confirm-modal__actions">
            <button
              type="button"
              className="modal__btn modal__btn--secondary"
              onClick={onClose}
              disabled={submitting}
            >
              No
            </button>
            <button
              type="button"
              className="modal__btn modal__btn--submit"
              onClick={onConfirm}
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Yes, Create Account"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NativeAccountConfirmModal;
