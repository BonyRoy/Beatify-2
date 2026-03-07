import React, { useState, useEffect } from "react";
import { LogOut, User, ChevronDown, Mail, Bell } from "lucide-react";
import { getAccountById, updateAccountAvatar } from "../services/accountService";
import "./ProfileModal.css";

const AVATAR_STORAGE_KEY = "beatify_user_avatar";
const AVATARS = [
  { id: "one", src: "/Avatars/one.png" },
  { id: "two", src: "/Avatars/two.png" },
  { id: "three", src: "/Avatars/three.png" },
  { id: "four", src: "/Avatars/four.png" },
  { id: "five", src: "/Avatars/five.png" },
  { id: "six", src: "/Avatars/six.png" },
  { id: "seven", src: "/Avatars/seven.png" },
  { id: "eight", src: "/Avatars/eight.png" },
  { id: "nine", src: "/Avatars/nine.png" },
  { id: "ten", src: "/Avatars/ten.png" },
  { id: "leven", src: "/Avatars/leven.png" },
];

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

export const getStoredAvatar = () => {
  try {
    const stored = localStorage.getItem(AVATAR_STORAGE_KEY);
    return stored?.trim() || null;
  } catch {
    return null;
  }
};

export const setStoredAvatar = (avatarId) => {
  try {
    if (avatarId) {
      localStorage.setItem(AVATAR_STORAGE_KEY, avatarId);
    } else {
      localStorage.removeItem(AVATAR_STORAGE_KEY);
    }
  } catch (e) {
    console.error("Failed to save avatar:", e);
  }
};

const ProfileModal = ({
  isOpen,
  onClose,
  onOpenLogout,
  onOpenNotifications,
  onAvatarChange,
  userName,
  userEmail,
  accountId,
  notificationCount = 0,
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState(() => getStoredAvatar());
  const [avatarAccordionOpen, setAvatarAccordionOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loadAvatar = async () => {
        if (accountId) {
          try {
            const account = await getAccountById(accountId);
            const fbAvatar = account?.avatarId?.trim() || null;
            setSelectedAvatar(fbAvatar);
            setStoredAvatar(fbAvatar);
            onAvatarChange?.(fbAvatar);
            return;
          } catch {
            // Fallback to localStorage
          }
        }
        const local = getStoredAvatar();
        setSelectedAvatar(local);
        onAvatarChange?.(local);
      };
      loadAvatar();
    }
  }, [isOpen, accountId]);

  const handleSelectAvatar = async (avatarId) => {
    const newValue = selectedAvatar === avatarId ? null : avatarId;
    setSelectedAvatar(newValue);
    setStoredAvatar(newValue);
    onAvatarChange?.(newValue);

    if (accountId) {
      try {
        await updateAccountAvatar(accountId, newValue);
      } catch (e) {
        console.error("Failed to save avatar to Firebase:", e);
        // Avatar is already in localStorage, user can retry later
      }
    }
  };

  const handleLogoutClick = () => {
    onClose();
    onOpenLogout?.();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="modal profile-modal">
        <button
          type="button"
          className="modal__close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <CloseIcon />
        </button>
        <div className="modal__content">
          <h3 className="profile-modal__title">Profile</h3>

          <div className="profile-modal__user-info">
            <div className="profile-modal__user-avatar">
              {selectedAvatar ? (
                <img src={`/Avatars/${selectedAvatar}.png`} alt="Profile" />
              ) : (
                <User size={32} />
              )}
            </div>
            <div className="profile-modal__user-details">
              <p className="profile-modal__name">{userName || "Signed in"}</p>
              {userEmail ? (
                <p className="profile-modal__email">
                  <Mail size={14} />
                  {userEmail}
                </p>
              ) : null}
            </div>
          </div>

          <div className="profile-modal__accordion">
            <button
              type="button"
              className="profile-modal__accordion-trigger"
              onClick={() => setAvatarAccordionOpen((prev) => !prev)}
              aria-expanded={avatarAccordionOpen}
            >
              <span>Change avatar</span>
              <ChevronDown
                size={20}
                className={`profile-modal__accordion-icon ${avatarAccordionOpen ? "profile-modal__accordion-icon--open" : ""}`}
              />
            </button>
            <div
              className={`profile-modal__accordion-content ${avatarAccordionOpen ? "profile-modal__accordion-content--open" : ""}`}
            >
              <div className="profile-modal__avatar-grid">
                <button
                  type="button"
                  className={`profile-modal__avatar profile-modal__avatar--empty ${!selectedAvatar ? "profile-modal__avatar--selected" : ""}`}
                  onClick={() => handleSelectAvatar(null)}
                  aria-label="No avatar"
                >
                  <User size={24} />
                </button>
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    className={`profile-modal__avatar ${selectedAvatar === avatar.id ? "profile-modal__avatar--selected" : ""}`}
                    onClick={() => handleSelectAvatar(avatar.id)}
                    aria-label={`Avatar ${avatar.id}`}
                  >
                    <img src={avatar.src} alt={avatar.id} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {onOpenNotifications && (
            <button
              type="button"
              className="profile-modal__notifications-btn"
              onClick={() => {
                onClose();
                onOpenNotifications();
              }}
            >
              <Bell size={18} />
              Notifications
              {notificationCount > 0 && (
                <span className="profile-modal__notification-badge">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            className="profile-modal__logout-btn"
            onClick={handleLogoutClick}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default ProfileModal;
