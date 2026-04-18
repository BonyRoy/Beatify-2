import React from "react";
import "./EraScrollSection.css";

const EraClockIcon = () => (
  <svg
    className="era-scroll__header-icon"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <defs>
      <linearGradient
        id="beatify-icon-gradient-era"
        x1="0%"
        y1="0%"
        x2="100%"
        y2="100%"
      >
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <g
      fill="none"
      stroke="url(#beatify-icon-gradient-era)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </g>
  </svg>
);

const eraBadgeClass = (era) =>
  `home__era-badge home__era-badge--${era.replace(/\s/g, "")}`;

const EraScrollSection = ({ eras, selectedEra, onEraClick }) => {
  if (!eras || eras.length === 0) return null;

  return (
    <section className="era-scroll" aria-label="Browse by era">
      <div className="era-scroll__header">
        <h4 className="era-scroll__title">
          <EraClockIcon />
          Era
        </h4>
      </div>
      <div className="era-scroll__strip-wrap">
        <div className="era-scroll__strip">
          {eras.map((era) => (
            <button
              key={era}
              type="button"
              className={`era-scroll__chip ${eraBadgeClass(era)} ${selectedEra === era ? "home__era-badge--selected" : ""}`}
              onClick={() => onEraClick?.(era)}
            >
              {era}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EraScrollSection;
