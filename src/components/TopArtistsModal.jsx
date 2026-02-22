import React from "react";
import { getImagePath } from "./Artists";
import "./TopArtistsModal.css";

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

const ChartIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="top-artists-modal__empty-icon"
  >
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);

const findArtistImage = (artistName, allArtists) => {
  if (!artistName || !allArtists?.length) return null;
  const lower = artistName.toLowerCase();
  const match = allArtists.find(
    (a) =>
      (a.name || "").toLowerCase().includes(lower) ||
      lower.includes((a.name || "").toLowerCase())
  );
  return match ? getImagePath(match.image) : null;
};

const TopArtistsModal = ({ isOpen, onClose, topArtists, allArtists }) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="top-artists-modal__overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="top-artists-modal" role="dialog" aria-labelledby="top-artists-title">
        <button
          type="button"
          className="top-artists-modal__close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <CloseIcon />
        </button>
        <h2 id="top-artists-title" className="top-artists-modal__title">
          Your Top Artists
        </h2>
        <p className="top-artists-modal__subtitle">
          Artists you listen to the most
        </p>

        {topArtists.length === 0 ? (
          <div className="top-artists-modal__empty">
            <ChartIcon />
            <p className="top-artists-modal__empty-text">
              No listening data yet. Start playing music to see your top artists here!
            </p>
          </div>
        ) : (
          <div className="top-artists-modal__list">
            {topArtists.map(({ name, count }, index) => {
              const imgSrc = findArtistImage(name, allArtists);
              const rank = index + 1;
              return (
                <div key={`${name}-${count}`} className="top-artists-modal__item">
                  <span className="top-artists-modal__rank">#{rank}</span>
                  <div className="top-artists-modal__avatar">
                    {imgSrc ? (
                      <img src={imgSrc} alt={name} />
                    ) : (
                      <span className="top-artists-modal__placeholder">
                        {name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="top-artists-modal__info">
                    <span className="top-artists-modal__name">{name}</span>
                    <span className="top-artists-modal__count">
                      {count} {count === 1 ? "play" : "plays"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default TopArtistsModal;
