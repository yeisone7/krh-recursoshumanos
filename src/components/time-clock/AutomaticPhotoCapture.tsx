import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  onCapture: (photo: File) => void;
  onCancel: () => void;
}

function cameraMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError")
    return "Permite el acceso a la cámara para registrar tu entrada.";
  if (error instanceof DOMException && error.name === "NotFoundError")
    return "No encontramos una cámara disponible en este dispositivo.";
  return "No fue posible tomar la foto. Revisa la cámara y vuelve a intentar.";
}

export function AutomaticPhotoCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const completed = useRef(false);
  const onCaptureRef = useRef(onCapture);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Solicitando permiso de cámara…");

  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    completed.current = false;
    setError("");
    setStatus("Solicitando permiso de cámara…");

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new DOMException("Camera unavailable", "NotFoundError");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 720 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) throw new Error("Video unavailable");
        video.srcObject = stream;
        await video.play();
        setStatus("Mira a la cámara. Tomaremos la foto automáticamente.");
        timer = window.setTimeout(async () => {
          try {
            if (cancelled || completed.current || !video.videoWidth) return;
            const maxWidth = 720;
            const scale = Math.min(1, maxWidth / video.videoWidth);
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            canvas
              .getContext("2d")
              ?.drawImage(video, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, "image/jpeg", 0.78),
            );
            if (!blob) throw new Error("Photo unavailable");
            completed.current = true;
            stream.getTracks().forEach((track) => track.stop());
            onCaptureRef.current(
              new File([blob], "entrada.jpg", { type: "image/jpeg" }),
            );
          } catch (cause) {
            stream.getTracks().forEach((track) => track.stop());
            if (!cancelled) setError(cameraMessage(cause));
          }
        }, 1200);
      } catch (cause) {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        if (!cancelled) setError(cameraMessage(cause));
      }
    }

    void start();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [attempt]);

  return (
    <Card>
      <CardHeader className="text-center">
        <Camera className="mx-auto h-8 w-8 text-primary" />
        <CardTitle>Foto de ingreso</CardTitle>
        <p className="text-sm text-muted-foreground">
          Esta foto quedará asociada a tu marcación como evidencia.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <video
          ref={videoRef}
          aria-label="Vista previa de la cámara"
          autoPlay
          muted
          playsInline
          className="aspect-square w-full rounded-xl bg-slate-950 object-cover [transform:scaleX(-1)]"
        />
        {!error && (
          <p role="status" className="flex items-center justify-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> {status}
          </p>
        )}
        {error && (
          <div role="alert" className="space-y-3 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            <p>{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reintentar
            </Button>
          </div>
        )}
        <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
          Cancelar
        </Button>
      </CardContent>
    </Card>
  );
}
