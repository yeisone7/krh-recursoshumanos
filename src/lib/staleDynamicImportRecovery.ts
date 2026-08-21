const RECOVERY_STORAGE_KEY = "empatiq-stale-dynamic-import-recovery";
const RECOVERY_COOLDOWN_MS = 15_000;

export function isStaleDynamicImportError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return /failed to fetch dynamically imported module|importing a module script failed|expected a javascript-or-wasm module script/i.test(
    message,
  );
}

export async function recoverFromStaleDynamicImport(): Promise<void> {
  const attemptedAt = Number(window.sessionStorage.getItem(RECOVERY_STORAGE_KEY));
  const now = Date.now();

  if (now - attemptedAt < RECOVERY_COOLDOWN_MS) return;

  window.sessionStorage.setItem(RECOVERY_STORAGE_KEY, String(now));

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(async (registration) => {
          try {
            await registration.update();
            registration.waiting?.postMessage({ type: "SKIP_WAITING" });
          } catch {
            // La limpieza de caché y la recarga siguen siendo suficientes para recuperarse.
          }
        }),
      );
    }

    if ("caches" in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
    }
  } finally {
    const latestUrl = new URL(window.location.href);
    latestUrl.searchParams.set("refresh", String(now));
    window.location.replace(latestUrl.toString());
  }
}
