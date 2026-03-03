import React, { createContext, useContext, useState } from "react";
import RequestSongModal from "../components/RequestSongModal";

const RequestSongContext = createContext(null);

export function RequestSongProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openRequestSong = () => setIsOpen(true);
  const closeRequestSong = () => setIsOpen(false);

  return (
    <RequestSongContext.Provider value={{ openRequestSong, closeRequestSong }}>
      {children}
      <RequestSongModal
        isOpen={isOpen}
        onClose={closeRequestSong}
        onSubmit={() => {}}
      />
    </RequestSongContext.Provider>
  );
}

export function useRequestSong() {
  const ctx = useContext(RequestSongContext);
  if (!ctx) {
    throw new Error("useRequestSong must be used within RequestSongProvider");
  }
  return ctx;
}
