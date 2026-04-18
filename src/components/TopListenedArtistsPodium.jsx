import React, { useMemo } from "react";
import { useListeningHistory } from "../context/ListeningHistoryContext";
import "./TopListenedArtistsPodium.css";

const PODIUM_ORDER = [
  { rank: 2, medal: "silver" },
  { rank: 1, medal: "gold" },
  { rank: 3, medal: "bronze" },
];

const MEDAL_EMOJI = {
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
};

const MedalEmoji = ({ medal, empty }) => (
  <span
    className={`top-artists-podium__medal-emoji ${empty ? "top-artists-podium__medal-emoji--empty" : ""}`}
    aria-hidden="true"
  >
    {MEDAL_EMOJI[medal]}
  </span>
);

const PodiumIcon = () => (
  <svg
    className="top-artists-podium__header-icon"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <defs>
      <linearGradient
        id="beatify-icon-gradient-podium"
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
      stroke="url(#beatify-icon-gradient-podium)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </g>
  </svg>
);

const TopListenedArtistsPodium = ({ onArtistClick, selectedArtist }) => {
  const { getTopArtists, artistCounts } = useListeningHistory();

  const slots = useMemo(() => {
    const top = getTopArtists(3);
    const byRank = (r) => top[r - 1];
    return PODIUM_ORDER.map(({ rank, medal }) => {
      const entry = byRank(rank);
      if (!entry) {
        return { rank, medal, empty: true };
      }
      return {
        rank,
        medal,
        name: entry.name,
        count: entry.count,
        empty: false,
      };
    });
  }, [artistCounts, getTopArtists]);

  const hasAny = slots.some((s) => !s.empty);

  return (
    <section
      className="top-artists-podium"
      aria-label="Your most listened artists"
    >
      <div className="top-artists-podium__header">
        <h4 className="top-artists-podium__title">
          <PodiumIcon />
          Your top artists
        </h4>
      </div>
      <div className="top-artists-podium__row">
        {slots.map((slot) => {
          const key = slot.empty ? `empty-${slot.rank}` : slot.name;
          if (slot.empty) {
            return (
              <div
                key={key}
                className={`top-artists-podium__slot top-artists-podium__slot--${slot.medal} top-artists-podium__slot--empty`}
              >
                <div className="top-artists-podium__badge-wrap">
                  <div
                    className={`top-artists-podium__ring top-artists-podium__ring--${slot.medal} top-artists-podium__ring--empty`}
                  >
                    <span className="top-artists-podium__badge-inner top-artists-podium__badge-inner--empty">
                      <MedalEmoji medal={slot.medal} empty />
                    </span>
                  </div>
                </div>
                <span className="top-artists-podium__rank">{slot.rank}</span>
                <span className="top-artists-podium__name top-artists-podium__name--muted">
                  —
                </span>
                <span className="top-artists-podium__count top-artists-podium__count--muted" />
              </div>
            );
          }

          const selected = selectedArtist === slot.name;

          return (
            <button
              key={key}
              type="button"
              className={`top-artists-podium__slot top-artists-podium__slot--${slot.medal} ${selected ? "top-artists-podium__slot--selected" : ""}`}
              onClick={() => onArtistClick?.(slot.name)}
            >
              <div className="top-artists-podium__badge-wrap">
                <div
                  className={`top-artists-podium__ring top-artists-podium__ring--${slot.medal}`}
                >
                  <span className="top-artists-podium__badge-inner">
                    <MedalEmoji medal={slot.medal} />
                  </span>
                </div>
              </div>
              <span className="top-artists-podium__rank">{slot.rank}</span>
              <span className="top-artists-podium__name">{slot.name}</span>
              <span className="top-artists-podium__count">
                {slot.count} {slot.count === 1 ? "play" : "plays"}
              </span>
            </button>
          );
        })}
      </div>
      {!hasAny && (
        <p className="top-artists-podium__hint">
          Play songs to see your most listened artists here.
        </p>
      )}
    </section>
  );
};

export default TopListenedArtistsPodium;
