import React, { useState, useEffect } from "react";
import "./BeatifyLoadingScreen.css";

const MusicIcon = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 24 24"
    fill="none"
    className="beatify-loading__icon"
  >
    <defs>
      <linearGradient id="beatify-loading-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <path
      d="M9 18V5l12-2v13"
      stroke="url(#beatify-loading-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="6"
      cy="18"
      r="3"
      stroke="url(#beatify-loading-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="18"
      cy="16"
      r="3"
      stroke="url(#beatify-loading-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PROMO_LOGGED_OUT = [
  "Create an account for a better experience",
  "Save your favorites & sync across devices",
  "Get personalized recommendations",
];

const PROMO_LOGGED_IN = [
  "Enjoy your favorite music",
  "Explore playlists by era",
  "Discover new artists",
];

const BeatifyLoadingScreen = () => {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    setVisible(true);

    const hideTimer = setTimeout(() => {
      setFading(true);
    }, 4000);

    const unmountTimer = setTimeout(() => {
      setVisible(false);
    }, 4400);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setPromoIndex((i) => (i + 1) % 3);
    }, 1200);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  const isLoggedIn = typeof window !== "undefined" && localStorage.getItem("beatify_logged_in") === "true";
  const promos = isLoggedIn ? PROMO_LOGGED_IN : PROMO_LOGGED_OUT;

  return (
    <div
      className={`beatify-loading ${fading ? "beatify-loading--fade-out" : ""}`}
      aria-hidden="true"
    >
      <div className="beatify-loading__content">
        <div className="beatify-loading__icon-wrap">
          <MusicIcon />
        </div>
        <h1 className="beatify-loading__title">Beatify</h1>
        <p
          className={`beatify-loading__promo beatify-loading__promo--${promoIndex}`}
          key={promoIndex}
        >
          {promos[promoIndex]}
        </p>
        <div className="beatify-loading__bar">
          <div className="beatify-loading__bar-fill" />
        </div>
      </div>
    </div>
  );
};

export default BeatifyLoadingScreen;
