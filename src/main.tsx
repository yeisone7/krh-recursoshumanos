import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { applyThemePreference, getStoredThemePreference } from "./lib/theme";

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
