import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  fetchTrackPlayCounts,
  incrementTrackPlayCount as incrementTrackPlayCountService,
} from "../services/trackPlayCountsService";

const TrackPlayCountsContext = createContext();

export const useTrackPlayCounts = () => {
  const ctx = useContext(TrackPlayCountsContext);
  if (!ctx)
    throw new Error(
      "useTrackPlayCounts must be used within TrackPlayCountsProvider",
    );
  return ctx;
};

export const TrackPlayCountsProvider = ({ children }) => {
  const [counts, setCounts] = useState({});

  const loadCounts = useCallback(async () => {
    const data = await fetchTrackPlayCounts();
    setCounts(data);
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Refresh counts when app gains visibility (e.g. user returns to tab)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadCounts();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadCounts]);

  const getPlayCount = useCallback(
    (trackUuid) => {
      if (!trackUuid) return 0;
      return counts[trackUuid] ?? 0;
    },
    [counts],
  );

  const incrementPlayCount = useCallback((track) => {
    const uuid = track?.uuid || track?.id;
    if (!uuid) return;

    setCounts((prev) => ({
      ...prev,
      [uuid]: (prev[uuid] ?? 0) + 1,
    }));

    incrementTrackPlayCountService(uuid).catch(() => {
      setCounts((prev) => {
        const next = { ...prev };
        next[uuid] = Math.max(0, (next[uuid] ?? 1) - 1);
        return next;
      });
    });
  }, []);

  return (
    <TrackPlayCountsContext.Provider
      value={{
        getPlayCount,
        incrementPlayCount,
        counts,
        refreshCounts: loadCounts,
      }}
    >
      {children}
    </TrackPlayCountsContext.Provider>
  );
};
