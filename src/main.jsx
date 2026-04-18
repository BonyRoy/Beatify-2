import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import applyIosSafeAreaTopFallback from "./safeAreaFix.js";
import App from "./App.jsx";

applyIosSafeAreaTopFallback();
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
