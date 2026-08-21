import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import {
  isStaleDynamicImportError,
  recoverFromStaleDynamicImport,
} from "./lib/staleDynamicImportRecovery";
import { applyThemePreference, getStoredThemePreference } from "./lib/theme";

function recoverIfDynamicImportIsStale(error: unknown) {
  if (isStaleDynamicImportError(error)) {
    void recoverFromStaleDynamicImport();
  }
}

window.addEventListener("error", (event) => {
  recoverIfDynamicImportIsStale(event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  if (!isStaleDynamicImportError(event.reason)) return;

  event.preventDefault();
  void recoverFromStaleDynamicImport();
});

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(
      new CustomEvent("empatiq-app-update-available", {
        detail: { updateSW },
      }),
    );
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;

    window.setInterval(() => {
      if (navigator.onLine) {
        void registration.update();
      }
    }, 60 * 60 * 1000);
  },
});

applyThemePreference(getStoredThemePreference());

createRoot(document.getElementById("root")!).render(<App />);

if (window.matchMedia('(display-mode: standalone)').matches) {
  document.body.classList.add('app-standalone');
}

window.requestAnimationFrame(() => {
  window.setTimeout(() => document.body.classList.add("app-ready"), 450);
});
