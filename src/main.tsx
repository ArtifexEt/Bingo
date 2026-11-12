import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { initializeLanguage, setLanguage } from "./i18n";
import { parseRoute } from "./navigation";
import "./style.css";

initializeLanguage();
const entryLanguage = parseRoute(location.href).language;
if (entryLanguage) setLanguage(entryLanguage);
registerSW({ immediate: true });
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
