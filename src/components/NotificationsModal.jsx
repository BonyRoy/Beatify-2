import React from "react";
import { Music2, Trash2, Check } from "lucide-react";
import "./NotificationsModal.css";

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

const formatDate = (createdAt) => {
  if (!createdAt) return "";
  const d = createdAt?.toDate?.() || new Date(createdAt);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
};

const NotificationsModal = ({ isOpen, onClose, notifications, onMarkRead, onRemove, onClearAll }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="modal notifications-modal">
        <button
          type="button"
          className="modal__close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon />
        </button>
        <div className="modal__content">
          <h3 className="modal__title">Notifications</h3>
          <p className="notifications-modal__subtitle">
            Your song request updates
          </p>

          {notifications.length === 0 ? (
            <div className="notifications-modal__empty">
              <Music2 size={40} strokeWidth={1.5} />
              <p>No notifications yet</p>
              <p className="notifications-modal__empty-hint">
                When we add a song you requested, you&apos;ll see it here.
              </p>
            </div>
          ) : (
            <>
              <div className="notifications-modal__actions">
                <button
                  type="button"
                  className="notifications-modal__clear-btn"
                  onClick={onClearAll}
                >
                  <Trash2 size={16} /> Clear all
                </button>
              </div>
              <ul className="notifications-modal__list">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`notifications-modal__item ${n.read ? "notifications-modal__item--read" : ""}`}
                  >
                    <div className="notifications-modal__item-content">
                      <div className="notifications-modal__item-icon">
                        <Music2 size={20} />
                      </div>
                      <div className="notifications-modal__item-body">
                        <p className="notifications-modal__item-title">
                          Song added: <strong>{n.songName || "Untitled"}</strong>
                          {n.album ? ` (${n.album})` : ""}
                        </p>
                        <p className="notifications-modal__item-meta">
                          {formatDate(n.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="notifications-modal__item-actions">
                      {!n.read && (
                        <button
                          type="button"
                          className="notifications-modal__item-btn"
                          onClick={() => onMarkRead(n.id)}
                          title="Mark as read"
                          aria-label="Mark as read"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="notifications-modal__item-btn notifications-modal__item-btn--remove"
                        onClick={() => onRemove(n.id)}
                        title="Remove"
                        aria-label="Remove notification"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationsModal;
