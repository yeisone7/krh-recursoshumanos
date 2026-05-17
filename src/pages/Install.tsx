import { useState, useEffect } from "react";
import { Download, Smartphone, Monitor, Share2, Plus, MoreVertical, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallButtonState = "ready" | "installed" | "error";

const isAppInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [compatibilityIssues, setCompatibilityIssues] = useState<string[]>([]);
  const [installError, setInstallError] = useState<string | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const detectedIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(detectedIOS);

    const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    const issues: string[] = [];

    if (!window.isSecureContext && !isLocalhost) {
      issues.push("La app debe abrirse desde una conexión segura HTTPS.");
    }

    if (!("serviceWorker" in navigator) && !detectedIOS) {
      issues.push("Este navegador no tiene soporte para Service Worker.");
    }

    if (!document.querySelector('link[rel="manifest"]')) {
      issues.push("No se encontró el manifest de instalación de la aplicación.");
    }

    setCompatibilityIssues(issues);

    const displayModeQuery = window.matchMedia("(display-mode: standalone)");
    const refreshInstalledState = () => setIsInstalled(isAppInstalled());

    refreshInstalledState();

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallError(null);
    };

    const appInstalledHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallError(null);
    };

    const visibilityHandler = () => {
      if (document.visibilityState === "visible") refreshInstalledState();
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", appInstalledHandler);
    window.addEventListener("focus", refreshInstalledState);
    document.addEventListener("visibilitychange", visibilityHandler);
    displayModeQuery.addEventListener("change", refreshInstalledState);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", appInstalledHandler);
      window.removeEventListener("focus", refreshInstalledState);
      document.removeEventListener("visibilitychange", visibilityHandler);
      displayModeQuery.removeEventListener("change", refreshInstalledState);
    };
  }, []);

  const handleInstall = async () => {
    if (isInstalled) return;

    if (isIOS && !deferredPrompt) {
      setInstallError(null);
      return;
    }

    if (!deferredPrompt) {
      setInstallError("El navegador todavía no habilitó la instalación automática.");
      return;
    }

    try {
      setInstallError(null);
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      setDeferredPrompt(null);
    } catch {
      setInstallError("No se pudo iniciar la instalación. Inténtalo desde el menú del navegador.");
    }
  };

  const installButtonState: InstallButtonState = isInstalled
    ? "installed"
    : compatibilityIssues.length > 0 || installError
      ? "error"
      : "ready";

  const installButtonLabel =
    installButtonState === "installed"
      ? "Ya instalada"
      : installButtonState === "error"
        ? "Instalación no disponible"
        : "Instalar ahora";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6"
      >
        <div className="text-center space-y-3">
          <img src="/empatiq-install-icon.png" alt="EmpatiQ" className="w-20 h-20 mx-auto rounded-2xl shadow-lg" />
          <h1 className="text-2xl font-bold text-foreground">Instalar EmpatiQ</h1>
          <p className="text-muted-foreground text-sm">
            Agrega EmpatiQ a tu pantalla de inicio para acceder rápidamente sin abrir el navegador.
          </p>
        </div>

        {(compatibilityIssues.length > 0 || installError) && !isInstalled && (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-foreground font-medium">No es posible instalar EmpatiQ en este momento.</p>
                <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                  {installError && <li>{installError}</li>}
                  {compatibilityIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          onClick={handleInstall}
          className="w-full gap-2"
          size="lg"
          disabled={installButtonState !== "ready" || (!deferredPrompt && !isIOS)}
          variant={installButtonState === "error" ? "destructive" : "default"}
        >
          {installButtonState === "installed" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : installButtonState === "error" ? (
            <AlertCircle className="h-5 w-5" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          {installButtonLabel}
        </Button>

        {isInstalled ? (
          <Card className="border-accent/30 bg-accent/10">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className="h-6 w-6 text-accent shrink-0" />
              <p className="text-sm text-foreground font-medium">
                ¡EmpatiQ ya está instalada en tu dispositivo!
              </p>
            </CardContent>
          </Card>
        ) : isIOS ? (
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Instrucciones para iPhone / iPad
              </h2>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Toca el botón <Share2 className="inline h-4 w-4 mx-1" /> <strong>Compartir</strong> en la barra de Safari</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Desplázate y selecciona <Plus className="inline h-4 w-4 mx-1" /> <strong>Agregar a pantalla de inicio</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Toca <strong>Agregar</strong> para confirmar</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Monitor className="h-5 w-5 text-primary" />
                Instrucciones para Android / Escritorio
              </h2>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Toca el menú <MoreVertical className="inline h-4 w-4 mx-1" /> del navegador</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Selecciona <strong>&quot;Instalar aplicación&quot;</strong> o <strong>&quot;Agregar a pantalla de inicio&quot;</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Confirma la instalación</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-3 pt-2">
          {[
            { icon: Download, label: "Sin descargar\nde tienda" },
            { icon: Smartphone, label: "Acceso\ninstantáneo" },
            { icon: Monitor, label: "Funciona\noffline" },
          ].map(({ icon: Icon, label }, i) => (
            <div key={i} className="text-center space-y-1">
              <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-line">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Install;
