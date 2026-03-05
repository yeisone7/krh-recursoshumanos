import { useState, useEffect } from "react";
import { Download, Smartphone, Monitor, Share2, Plus, MoreVertical, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6"
      >
        <div className="text-center space-y-3">
          <img src="/pwa-192x192.png" alt="KRH" className="w-20 h-20 mx-auto rounded-2xl shadow-lg" />
          <h1 className="text-2xl font-bold text-foreground">Instalar KRH</h1>
          <p className="text-muted-foreground text-sm">
            Agrega KRH a tu pantalla de inicio para acceder rápidamente sin abrir el navegador.
          </p>
        </div>

        {isInstalled ? (
          <Card className="border-emerald-500/30 bg-emerald-500/10">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
              <p className="text-sm text-foreground font-medium">
                ¡KRH ya está instalada en tu dispositivo!</p>
                ¡KRH ya está instalada en tu dispositivo!
              </p>
            </CardContent>
          </Card>
        ) : deferredPrompt ? (
          <Button onClick={handleInstall} className="w-full gap-2" size="lg">
            <Download className="h-5 w-5" />
            Instalar ahora
          </Button>
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
                  <span>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla de inicio"</strong></span>
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
