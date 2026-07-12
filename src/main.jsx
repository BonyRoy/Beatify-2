import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import initIosSafeAreaTopFallback from "./safeAreaFix.js";
import App from "./App.jsx";

initIosSafeAreaTopFallback();
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
