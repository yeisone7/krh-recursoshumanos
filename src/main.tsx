import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { BrowserRouter } from "react-router-dom";
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

const root = createRoot(document.getElementById("root")!);
const isPublicLeaveRequest = window.location.pathname === "/solicitud-permiso"
  || window.location.pathname.startsWith("/solicitud-permiso/");

async function renderApplication() {
  if (isPublicLeaveRequest) {
    const { default: PublicLeaveRequest } = await import("./pages/PublicLeaveRequest.tsx");
    root.render(
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <PublicLeaveRequest />
      </BrowserRouter>,
    );
    return;
  }

  const { default: App } = await import("./App.tsx");
  root.render(<App />);
}

void renderApplication();

if (window.matchMedia('(display-mode: standalone)').matches) {
  document.body.classList.add('app-standalone');
}

window.requestAnimationFrame(() => {
  window.setTimeout(() => document.body.classList.add("app-ready"), 450);
});
