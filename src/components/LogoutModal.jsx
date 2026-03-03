import React from "react";
import { LogOut } from "lucide-react";
import "./LogoutModal.css";

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

const LogoutModal = ({ isOpen, onClose, onLogout }) => {
  if (!isOpen) return null;

  const handleLogout = () => {
    onLogout?.();
    onClose();
  };

  return (
    <>
      <div
        className="modal-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="modal logout-modal">
        <button
          type="button"
          className="modal__close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <CloseIcon />
        </button>
        <div className="modal__content">
          <h3 className="modal__title">Logout</h3>
          <p className="logout-modal__subtitle">
            Are you sure you want to sign out?
          </p>
          <div className="logout-modal__actions">
            <button
              type="button"
              className="modal__btn modal__btn--secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="modal__btn modal__btn--logout"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LogoutModal;
