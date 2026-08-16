import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Link } from "react-router-dom";
import {
  Megaphone,
  Play,
  Pause,
  RotateCcw,
  Home,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import FeelsPlayer from "../components/FeelsPlayer";
import {
  fetchPlaylists,
  ensureFeelsPlaylists,
  FEELS_PLAYLISTS,
} from "../services/playlistService";

import "./Feels.css";

/* =========================================================
   SLIDES
========================================================= */

const SLIDES = FEELS_PLAYLISTS.map((playlist) => ({
  id: playlist.name.toLowerCase(),
  label: playlist.name,
  image: `/feels/${playlist.image}`,
  playlistName: playlist.name,
}));

const SLIDE_COUNT = SLIDES.length;

/* =========================================================
   LOOP SLIDES
========================================================= */

const LOOP_SLIDES =
  SLIDE_COUNT === 0
    ? []
    : [
        {
          ...SLIDES[SLIDE_COUNT - 1],
          loopKey: "clone-last",
        },

        ...SLIDES.map((slide, index) => ({
          ...slide,
          loopKey: `real-${index}`,
        })),

        {
          ...SLIDES[0],
          loopKey: "clone-first",
        },
      ];

const FIRST_REAL = 1;
const LAST_REAL = SLIDE_COUNT;
const CLONE_FIRST = SLIDE_COUNT + 1;
const CLONE_LAST = 0;

/* =========================================================
   AUDIO
========================================================= */

const TRUCK_HORN_SRC = encodeURI(
  "/feels/Musical North-Indian Truck Horn 4(MP3_160K).mp3",
);

const GANPATI_AARTI_SRC = encodeURI(
  "/feels/Ganesh Aarti_ JAI GANESH DEVA by Anuradha Paudwal with Hindi_ English LyricsI I Full Video Song(MP3_160K).mp3",
);

/* =========================================================
   GESTURE SETTINGS
========================================================= */

const SWIPE_THRESHOLD = 48;
const AXIS_LOCK = 10;
const WHEEL_THRESHOLD = 40;

/* =========================================================
   SHAYARI
========================================================= */

const TRUCK_SHAYARI = [
  "Raaste apne, andaaz apna,\nTruck apna aur swag bhi apna.",

  "Horn se pehchaan hai,\nDesi dil ki jaan hai.",

  "Manzil door hai toh kya hua,\nApna truck hai, safar mast hona chahiye.",

  "Diesel ka nasha, road ka junoon,\nTruck mera chale toh hil jaaye moon.",

  "Jinke sapne bade hote hain,\nUnke truck bhi full load hote hain.",

  "Na BMW ka shauk, na Audi ka craze,\nApna truck chale toh road pe bane maze.",

  "Zindagi bhi truck jaisi hai janaab,\nLoad jitna ho, horn utna hi dabaao.",

  "Desi khoon, desi style,\nTruck chale toh kilometre bole — wah bhai wah!",

  "Sadak meri mehfil, truck mera yaar,\nHorn bajta rahe, chalta rahe pyaar.",

  "Buri nazar wale tera muh kaala,\nApna truck wala sabse nirala.",
];

const GANPATI_SHAYARI = [
  "Ganpati Bappa aaye hain,\nKhushiyon ki saugaat laaye hain.",

  "Bappa ke aane se,\nHar dil mein roshni chha jaaye.",

  "Morya re Morya,\nBappa sabki sun le khamoshiyan.",

  "Jahan Bappa ka vaas hai,\nWahan khushiyon ka ehsaas hai.",

  "Bappa ka aashirwad rahe,\nHar din khushiyon se abaad rahe.",

  "Ganpati Bappa Morya,\nAgla baras tu jaldi aa.",

  "Mann mein shraddha,\nDil mein Bappa,\nHar pal rahe khushiyon ka jhilmil sa.",
];

const SALON_SHAYARI = [
  "Style apna, vibe apni,\nLook aisa ki nazar na hate.",

  "Baalo mein swag,\nAur attitude mein shine.",

  "Mirror mein dekha toh dil bola,\nBhai kya transformation hai!",

  "Look badlo, mood badlo,\nApni vibe ko upgrade karo.",

  "Desi style ho ya modern glow,\nApna look hamesha on point bro.",

  "Thoda glow, thoda style,\nAur confidence full-on mile.",

  "Hair set, outfit lit,\nAb toh selfie banti hai hit!",

  "Naya look, nayi feeling,\nApni personality ki full revealing.",
];

const NAVRATRI_SHAYARI = [
  "Maa ke rang mein rang jaaye dil,\nNavratri ka har pal lage khushiyon se khil.",

  "Dhol baje, taali baje,\nGarba ki raat dil ko saje.",

  "Maa Durga ka aashirwad rahe,\nHar kadam par khushiyon ka saath rahe.",

  "Rang birangi raat hai,\nGarba ki baat hi kuch aur hai.",

  "Jai Mata Di ka naara,\nKhushiyon se bhar de jag saara.",

  "Chaniya choli, dandiya ki raat,\nNavratri mein sabke saath.",

  "Maa ka naam ho zubaan pe,\nKhushiyan ho har armaan mein.",

  "Dhol ki beat aur garba ka rang,\nNavratri mein jhoome har ang.",
];

/* =========================================================
   SHAYARI CAROUSEL COMPONENT
========================================================= */

const ShayariCarousel = ({ items }) => {
  const [index, setIndex] = useState(0);

  if (!items?.length) {
    return null;
  }

  const previous = () => {
    setIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const next = () => {
    setIndex((prev) => (prev + 1) % items.length);
  };

  return (
    <div
      className="feels__shayari"
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="feels__shayari-arrow"
        onClick={previous}
        aria-label="Previous shayari"
      >
        <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
      </button>

      <div className="feels__shayari-content">
        <p>{items[index]}</p>

        <div className="feels__shayari-dots">
          {items.map((_, dotIndex) => (
            <button
              key={dotIndex}
              type="button"
              className={
                dotIndex === index
                  ? "feels__shayari-dot feels__shayari-dot--active"
                  : "feels__shayari-dot"
              }
              onClick={() => setIndex(dotIndex)}
              aria-label={`Go to shayari ${dotIndex + 1}`}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        className="feels__shayari-arrow"
        onClick={next}
        aria-label="Next shayari"
      >
        <ChevronRight size={20} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
};

/* =========================================================
   GESTURE IGNORE
========================================================= */

const isGestureIgnored = (target) =>
  Boolean(
    target?.closest?.(
      ".feels-player, .feels-sheet, .feels__nav, .feels__badge, .feels__horn, .feels__aarti-bar, .feels__shayari, button, input, a, label",
    ),
  );

/* =========================================================
   CAROUSEL LOGIC
========================================================= */

const logicalFromTrack = (trackIndex) => {
  if (SLIDE_COUNT === 0) {
    return 0;
  }

  if (trackIndex === CLONE_LAST) {
    return SLIDE_COUNT - 1;
  }

  if (trackIndex === CLONE_FIRST) {
    return 0;
  }

  return trackIndex - 1;
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

const Feels = () => {
  const [trackIndex, setTrackIndex] = useState(FIRST_REAL);

  const [animate, setAnimate] = useState(true);

  const [aartiPlaying, setAartiPlaying] = useState(false);

  const [aartiTime, setAartiTime] = useState(0);

  const [aartiDuration, setAartiDuration] = useState(0);

  const [playlistTrackIds, setPlaylistTrackIds] = useState({});

  const carouselRef = useRef(null);
  const trackRef = useRef(null);

  const hornAudioRef = useRef(null);
  const aartiAudioRef = useRef(null);

  const jumpingRef = useRef(false);

  const gestureRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    axis: null,
  });

  const wheelLockRef = useRef(0);

  const activeIndex = logicalFromTrack(trackIndex);

  const activeSlide = SLIDES[activeIndex] || SLIDES[0];

  /* =======================================================
     MAIN CAROUSEL NAVIGATION
  ======================================================= */

  const goTo = useCallback((index) => {
    if (!SLIDE_COUNT) {
      return;
    }

    const next = ((index % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT;

    setAnimate(true);
    setTrackIndex(next + 1);
  }, []);

  const goNext = useCallback(() => {
    if (!SLIDE_COUNT || jumpingRef.current) {
      return;
    }

    setAnimate(true);

    setTrackIndex((prev) => Math.min(prev + 1, CLONE_FIRST));
  }, []);

  const goPrev = useCallback(() => {
    if (!SLIDE_COUNT || jumpingRef.current) {
      return;
    }

    setAnimate(true);

    setTrackIndex((prev) => Math.max(prev - 1, CLONE_LAST));
  }, []);

  /* =======================================================
     INFINITE CAROUSEL
  ======================================================= */

  const handleTransitionEnd = useCallback(
    (event) => {
      if (event.target !== trackRef.current) {
        return;
      }

      if (event.propertyName && event.propertyName !== "transform") {
        return;
      }

      if (trackIndex === CLONE_FIRST) {
        jumpingRef.current = true;

        setAnimate(false);
        setTrackIndex(FIRST_REAL);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            jumpingRef.current = false;
            setAnimate(true);
          });
        });
      } else if (trackIndex === CLONE_LAST) {
        jumpingRef.current = true;

        setAnimate(false);
        setTrackIndex(LAST_REAL);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            jumpingRef.current = false;
            setAnimate(true);
          });
        });
      }
    },
    [trackIndex],
  );

  /* =======================================================
     LOAD PLAYLISTS
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await ensureFeelsPlaylists();

        const list = await fetchPlaylists();

        if (cancelled) {
          return;
        }

        const map = {};

        list.forEach((playlist) => {
          const key = String(playlist.name || "")
            .trim()
            .toLowerCase();

          map[key] = Array.isArray(playlist.trackIds) ? playlist.trackIds : [];
        });

        setPlaylistTrackIds(map);
      } catch (error) {
        console.error("Feels: failed to load playlists", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     PAGE LOCK + AUDIO CLEANUP
  ======================================================= */

  useEffect(() => {
    const html = document.documentElement;

    const body = document.body;

    html.classList.add("feels-page-lock");

    body.classList.add("feels-page-lock");

    return () => {
      html.classList.remove("feels-page-lock");

      body.classList.remove("feels-page-lock");

      if (hornAudioRef.current) {
        hornAudioRef.current.pause();
        hornAudioRef.current = null;
      }

      if (aartiAudioRef.current) {
        aartiAudioRef.current.pause();
        aartiAudioRef.current = null;
      }

      setAartiPlaying(false);
      setAartiTime(0);
      setAartiDuration(0);
    };
  }, []);

  /* =======================================================
     TOUCH / POINTER / WHEEL
  ======================================================= */

  useEffect(() => {
    const el = carouselRef.current;

    if (!el) {
      return undefined;
    }

    const resetGesture = () => {
      gestureRef.current = {
        active: false,
        startX: 0,
        startY: 0,
        axis: null,
      };
    };

    const finishSwipe = (clientX) => {
      const gesture = gestureRef.current;

      if (!gesture.active) {
        return;
      }

      const dx = clientX - gesture.startX;

      const axis = gesture.axis;

      resetGesture();

      if (axis !== "x" || Math.abs(dx) < SWIPE_THRESHOLD) {
        return;
      }

      if (dx < 0) {
        goNext();
      } else {
        goPrev();
      }
    };

    const onTouchStart = (event) => {
      if (isGestureIgnored(event.target)) {
        return;
      }

      if (event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];

      gestureRef.current = {
        active: true,
        startX: touch.clientX,
        startY: touch.clientY,
        axis: null,
      };
    };

    const onTouchMove = (event) => {
      const gesture = gestureRef.current;

      if (!gesture.active || event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];

      const dx = touch.clientX - gesture.startX;

      const dy = touch.clientY - gesture.startY;

      if (!gesture.axis) {
        if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) {
          return;
        }

        gesture.axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      }

      if (gesture.axis === "x") {
        event.preventDefault();
      }
    };

    const onTouchEnd = (event) => {
      if (!gestureRef.current.active) {
        return;
      }

      const touch = event.changedTouches[0];

      finishSwipe(touch?.clientX ?? gestureRef.current.startX);
    };

    const onPointerDown = (event) => {
      if (event.pointerType === "touch") {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (isGestureIgnored(event.target)) {
        return;
      }

      gestureRef.current = {
        active: true,
        startX: event.clientX,
        startY: event.clientY,
        axis: null,
      };

      try {
        el.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onPointerMove = (event) => {
      if (event.pointerType === "touch") {
        return;
      }

      const gesture = gestureRef.current;

      if (!gesture.active) {
        return;
      }

      const dx = event.clientX - gesture.startX;

      const dy = event.clientY - gesture.startY;

      if (!gesture.axis) {
        if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) {
          return;
        }

        gesture.axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      }

      if (gesture.axis === "x") {
        event.preventDefault();
      }
    };

    const onPointerUp = (event) => {
      if (event.pointerType === "touch") {
        return;
      }

      if (!gestureRef.current.active) {
        return;
      }

      finishSwipe(event.clientX);

      try {
        el.releasePointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onWheel = (event) => {
      if (isGestureIgnored(event.target)) {
        return;
      }

      const absX = Math.abs(event.deltaX);

      const absY = Math.abs(event.deltaY);

      if (absX < WHEEL_THRESHOLD || absX <= absY) {
        return;
      }

      event.preventDefault();

      const now = Date.now();

      if (now - wheelLockRef.current < 450) {
        return;
      }

      wheelLockRef.current = now;

      if (event.deltaX > 0) {
        goNext();
      } else {
        goPrev();
      }
    };

    const onEdgeTouchStart = (event) => {
      if (isGestureIgnored(event.target)) {
        return;
      }

      if (event.touches.length !== 1) {
        return;
      }

      const x = event.touches[0].clientX;

      const edge = 24;

      if (x <= edge || x >= window.innerWidth - edge) {
        gestureRef.current = {
          active: true,
          startX: x,
          startY: event.touches[0].clientY,
          axis: "x",
        };
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });

    el.addEventListener("touchmove", onTouchMove, { passive: false });

    el.addEventListener("touchend", onTouchEnd, { passive: true });

    el.addEventListener("touchcancel", resetGesture, { passive: true });

    el.addEventListener("pointerdown", onPointerDown);

    el.addEventListener("pointermove", onPointerMove);

    el.addEventListener("pointerup", onPointerUp);

    el.addEventListener("pointercancel", onPointerUp);

    el.addEventListener("wheel", onWheel, { passive: false });

    el.addEventListener("touchstart", onEdgeTouchStart, {
      passive: true,
      capture: true,
    });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);

      el.removeEventListener("touchmove", onTouchMove);

      el.removeEventListener("touchend", onTouchEnd);

      el.removeEventListener("touchcancel", resetGesture);

      el.removeEventListener("pointerdown", onPointerDown);

      el.removeEventListener("pointermove", onPointerMove);

      el.removeEventListener("pointerup", onPointerUp);

      el.removeEventListener("pointercancel", onPointerUp);

      el.removeEventListener("wheel", onWheel);

      el.removeEventListener("touchstart", onEdgeTouchStart, true);
    };
  }, [goNext, goPrev]);

  /* =======================================================
     TRUCK HORN
  ======================================================= */

  const playTruckHorn = useCallback((event) => {
    event.stopPropagation();
    event.preventDefault();

    if (aartiAudioRef.current) {
      aartiAudioRef.current.pause();
      aartiAudioRef.current.currentTime = 0;
      setAartiPlaying(false);
    }

    if (!hornAudioRef.current) {
      hornAudioRef.current = new Audio(TRUCK_HORN_SRC);
    }

    const audio = hornAudioRef.current;

    audio.currentTime = 0;

    audio.play().catch((error) => {
      console.error("Feels: truck horn failed", error);
    });
  }, []);

  /* =======================================================
     GANESH AARTI
  ======================================================= */

  const ensureAartiAudio = useCallback(() => {
    if (!aartiAudioRef.current) {
      const audio = new Audio(GANPATI_AARTI_SRC);

      audio.addEventListener("ended", () => {
        setAartiPlaying(false);
        setAartiTime(0);
      });

      audio.addEventListener("play", () => setAartiPlaying(true));

      audio.addEventListener("pause", () => {
        if (!audio.ended) {
          setAartiPlaying(false);
        }
      });

      audio.addEventListener("timeupdate", () => {
        setAartiTime(audio.currentTime || 0);
      });

      audio.addEventListener("loadedmetadata", () => {
        setAartiDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      });

      aartiAudioRef.current = audio;
    }

    return aartiAudioRef.current;
  }, []);

  const toggleGaneshAarti = useCallback(
    (event) => {
      event.stopPropagation();
      event.preventDefault();

      if (hornAudioRef.current) {
        hornAudioRef.current.pause();
        hornAudioRef.current.currentTime = 0;
      }

      const audio = ensureAartiAudio();

      if (audio.paused) {
        audio.play().catch((error) => {
          console.error("Feels: ganesh aarti failed", error);

          setAartiPlaying(false);
        });
      } else {
        audio.pause();
        setAartiPlaying(false);
      }
    },
    [ensureAartiAudio],
  );

  const restartGaneshAarti = useCallback(
    (event) => {
      event.stopPropagation();
      event.preventDefault();

      if (hornAudioRef.current) {
        hornAudioRef.current.pause();
        hornAudioRef.current.currentTime = 0;
      }

      const audio = ensureAartiAudio();

      audio.currentTime = 0;

      setAartiTime(0);

      audio.play().catch((error) => {
        console.error("Feels: ganesh aarti restart failed", error);

        setAartiPlaying(false);
      });
    },
    [ensureAartiAudio],
  );

  const seekGaneshAarti = useCallback(
    (event) => {
      event.stopPropagation();

      const audio = ensureAartiAudio();

      const next = Number(event.target.value);

      audio.currentTime = next;

      setAartiTime(next);
    },
    [ensureAartiAudio],
  );

  const aartiProgress =
    aartiDuration > 0 ? (aartiTime / aartiDuration) * 100 : 0;

  /* =======================================================
     PLAYLIST
  ======================================================= */

  const activeTrackIds = useMemo(() => {
    if (!activeSlide) {
      return [];
    }

    const key = String(activeSlide.playlistName || "").toLowerCase();

    return playlistTrackIds[key] || [];
  }, [activeSlide, playlistTrackIds]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="feels">
      {/* ===================================================
          NAVIGATION
      =================================================== */}

      <nav className="feels__nav" aria-label="Feels sections">
        <Link to="/" className="feels__home" aria-label="Back to home">
          <Home size={18} strokeWidth={2.2} aria-hidden="true" />
        </Link>

        <div className="feels__badges">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`feels__badge ${
                activeIndex === index ? "feels__badge--active" : ""
              }`}
              onClick={() => goTo(index)}
              aria-pressed={activeIndex === index}
            >
              {slide.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ===================================================
          MAIN CAROUSEL
      =================================================== */}

      <section
        ref={carouselRef}
        className="feels__carousel"
        aria-roledescription="carousel"
        aria-label="Feels scenes"
      >
        <div
          ref={trackRef}
          className={`feels__track ${animate ? "" : "feels__track--no-anim"}`}
          style={{
            transform: `translateX(-${trackIndex * 100}%)`,
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {LOOP_SLIDES.map((slide, index) => {
            const logical = logicalFromTrack(index);

            const isActive = index === trackIndex;

            return (
              <div
                key={slide.loopKey}
                className={`feels__slide ${
                  isActive ? "feels__slide--active" : ""
                }`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${logical + 1} of ${SLIDE_COUNT}: ${slide.label}`}
                aria-hidden={!isActive}
              >
                {/* =========================================
                      BACKGROUND IMAGE
                  ========================================= */}

                <div
                  className="feels__slide-media"
                  style={{
                    backgroundImage: `url(${slide.image})`,
                  }}
                  aria-hidden="true"
                />

                <div className="feels__slide-shade" aria-hidden="true" />

                {/* =========================================
                      SLIDE CONTENT
                  ========================================= */}

                <div className="feels__slide-copy">
                  <p className="feels__slide-title">{slide.label}</p>
                  <div className="feels__slide-preview" aria-hidden="true">
                    <img
                      className="feels__slide-preview-img"
                      src={slide.image}
                      alt=""
                    />
                  </div>

                  {/* =======================================
                        GANPATI
                    ======================================= */}

                  {slide.id === "ganpati" && (
                    <>
                      <div className="feels__aarti-bar">
                        <div className="feels__aarti-row">
                          <span className="feels__aarti-label">
                            Ganesh Aarti
                          </span>

                          <button
                            type="button"
                            className="feels__aarti-btn"
                            onClick={toggleGaneshAarti}
                            aria-label={
                              aartiPlaying
                                ? "Pause Ganesh Aarti"
                                : "Play Ganesh Aarti"
                            }
                          >
                            {aartiPlaying ? (
                              <Pause
                                size={18}
                                strokeWidth={2.2}
                                aria-hidden="true"
                              />
                            ) : (
                              <Play
                                size={18}
                                strokeWidth={2.2}
                                aria-hidden="true"
                              />
                            )}
                          </button>

                          <button
                            type="button"
                            className="feels__aarti-btn"
                            onClick={restartGaneshAarti}
                            aria-label="Restart Ganesh Aarti"
                          >
                            <RotateCcw
                              size={17}
                              strokeWidth={2.2}
                              aria-hidden="true"
                            />
                          </button>
                        </div>

                        <input
                          className="feels__aarti-range"
                          type="range"
                          min={0}
                          max={aartiDuration || 0}
                          step={0.1}
                          value={Math.min(aartiTime, aartiDuration || 0)}
                          onChange={seekGaneshAarti}
                          onPointerDown={(event) => event.stopPropagation()}
                          onTouchStart={(event) => event.stopPropagation()}
                          aria-label="Ganesh Aarti progress"
                          style={{
                            "--feels-aarti-progress": `${aartiProgress}%`,
                          }}
                        />
                      </div>

                      <ShayariCarousel items={GANPATI_SHAYARI} />
                    </>
                  )}

                  {/* =======================================
                        TRUCK
                    ======================================= */}

                  {slide.id === "truck" && (
                    <>
                      <button
                        type="button"
                        className="feels__horn"
                        onClick={playTruckHorn}
                        aria-label="Play truck horn"
                      >
                        <Megaphone
                          size={26}
                          strokeWidth={2.1}
                          aria-hidden="true"
                        />
                      </button>

                      <ShayariCarousel items={TRUCK_SHAYARI} />
                    </>
                  )}

                  {/* =======================================
                        SALON
                    ======================================= */}

                  {slide.id === "salon" && (
                    <ShayariCarousel items={SALON_SHAYARI} />
                  )}

                  {/* =======================================
                        NAVRATRI
                    ======================================= */}

                  {slide.id === "navratri" && (
                    <ShayariCarousel items={NAVRATRI_SHAYARI} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* =================================================
            MUSIC PLAYER
        ================================================= */}

        <FeelsPlayer
          trackIds={activeTrackIds}
          fallbackArt={activeSlide?.image}
        />
      </section>
    </div>
  );
};

export default Feels;
