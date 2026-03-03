import React, { useEffect } from "react";
import "./EmptyFavoritesModal.css";

const FavoriteIcon = ({ filled }) => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

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

const EmptyFavoritesModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="empty-fav-modal-overlay"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="empty-fav-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="empty-fav-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon />
        </button>
        <span className="empty-fav-modal__icon">
          <FavoriteIcon filled />
        </span>
        <p className="empty-fav-modal__text">Nothing in My Favorites</p>
        <p className="empty-fav-modal__hint">
          Add songs by clicking the heart icon on any track
        </p>
      </div>
    </div>
  );
};

export default EmptyFavoritesModal;
