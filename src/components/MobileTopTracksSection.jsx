import React, { useEffect, useRef, useState } from "react";
import { useAlbumArt } from "../context/AlbumArtContext";
import { useTrackPlayCounts } from "../context/TrackPlayCountsContext";
import "./MobileTopTracksSection.css";

const SCROLL_SPEED = 15;

/** Same as user-created playlist placeholder (.playlist__placeholder) */
const DefaultTrackArtIcon = () => (
  <svg
    className="mobile-top-track__placeholder-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255, 255, 255, 0.92)"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const MobileTopTrackTile = ({ track, isSelected, isPlaying, onPlay }) => {
  const { getAlbumArt, fetchAlbumArt } = useAlbumArt();
  const { getPlayCount } = useTrackPlayCounts();
  const trackIdentifier = track.uuid || track.id;
  const playCount = getPlayCount(trackIdentifier);
  const rootRef = useRef(null);
  const titleRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [scrollDuration, setScrollDuration] = useState(20);
  const [artImgFailed, setArtImgFailed] = useState(false);
  const albumArtUrl = getAlbumArt(track);
  const showAlbumImage = Boolean(albumArtUrl) && !artImgFailed;

  useEffect(() => {
    setArtImgFailed(false);
  }, [track.uuid, track.id, albumArtUrl]);

  useEffect(() => {
    if (albumArtUrl || !track.fileUrl) return;
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchAlbumArt(track);
      },
      { rootMargin: "100px", threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [track, albumArtUrl, fetchAlbumArt]);

  useEffect(() => {
    const checkOverflow = () => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (titleRef.current) {
            const titleEl = titleRef.current;
            const wrap = titleEl.closest(".mobile-top-track__title-wrap");
            const inner = titleEl.closest(".mobile-top-track__title-inner");
            if (wrap && inner) {
              const overflow =
                titleEl.scrollWidth > wrap.offsetWidth + 4;
              setShouldScroll(overflow);
              if (overflow) {
                const distance = inner.scrollWidth / 2;
                setScrollDuration(Math.max(distance / SCROLL_SPEED, 10));
              }
            }
          }
        }, 100);
      });
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [track.name]);

  return (
    <button
      type="button"
      ref={rootRef}
      className={`mobile-top-track ${isSelected ? "mobile-top-track--selected" : ""} ${isPlaying ? "mobile-top-track--playing" : ""}`}
      onClick={() => onPlay(track)}
    >
      <span className="mobile-top-track__row">
        <span className="mobile-top-track__art-wrap">
          {showAlbumImage ? (
            <img
              src={albumArtUrl}
              alt=""
              className="mobile-top-track__art"
              onError={() => setArtImgFailed(true)}
            />
          ) : (
            <span className="mobile-top-track__placeholder" aria-hidden="true">
              <DefaultTrackArtIcon />
            </span>
          )}
        </span>
        <span className="mobile-top-track__meta">
          <span className="mobile-top-track__title-wrap">
            <span
              className={`mobile-top-track__title-inner ${shouldScroll ? "mobile-top-track__title-inner--scroll" : ""}`}
              style={
                shouldScroll
                  ? { "--scroll-duration": `${scrollDuration}s` }
                  : undefined
              }
            >
              <span ref={titleRef} className="mobile-top-track__title">
                {track.name}
              </span>
              {shouldScroll && (
                <span className="mobile-top-track__title mobile-top-track__title--dup">
                  {track.name}
                </span>
              )}
            </span>
          </span>
          <span className="mobile-top-track__plays">
            {playCount}{" "}
            {playCount === 1 ? "play" : "plays"} this week
          </span>
        </span>
      </span>
    </button>
  );
};

const MobileTopTracksSection = ({
  tracks,
  currentTrackId,
  isPlaying,
  onTrackClick,
}) => {
  if (!tracks.length) return null;

  return (
    <section className="mobile-top-tracks" aria-label="Top 10 of the Week">
      <div className="mobile-top-tracks__header">
        <h4 className="mobile-top-tracks__title">
          <span className="mobile-top-tracks__icon" aria-hidden="true">
            <span className="mobile-top-tracks__icon-bar" />
            <span className="mobile-top-tracks__icon-bar" />
            <span className="mobile-top-tracks__icon-bar" />
          </span>
          Top 10 of the Week
        </h4>
      </div>
      <div className="mobile-top-tracks__grid">
        {tracks.map((track) => {
          const id = track.uuid || track.id;
          return (
            <MobileTopTrackTile
              key={id}
              track={track}
              isSelected={id === currentTrackId}
              isPlaying={isPlaying && id === currentTrackId}
              onPlay={onTrackClick}
            />
          );
        })}
      </div>
    </section>
  );
};

export default MobileTopTracksSection;
