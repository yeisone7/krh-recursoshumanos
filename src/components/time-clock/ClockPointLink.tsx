import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, QrCode, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clockRpc } from "@/lib/timeClockApi";
import type { TimeClockPoint } from "@/types/timeClock";
import { toast } from "sonner";

export function ClockPointLink({ point }: { point: TimeClockPoint }) {
  const [link, setLink] = useState<{ token: string; enabled: boolean } | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const url = link ? `${window.location.origin}/asistencia/${link.token}` : "";
  async function manage(action: string) {
    setBusy(true);
    try {
      setLink(
        await clockRpc("time_clock_manage_link", {
          _point_id: point.id,
          _action: action,
        }),
      );
      setOpen(true);
      setConfirm(false);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo obtener el enlace",
      );
    } finally {
      setBusy(false);
    }
  }
  async function download(poster: boolean) {
    try {
      const QRCode = await import("qrcode");
      const png = await QRCode.toDataURL(url, {
        width: 1200,
        margin: 4,
        errorCorrectionLevel: "M",
      });
      if (!poster) {
        const a = document.createElement("a");
        a.href = png;
        a.download = `asistencia-${point.id}.png`;
        a.click();
        return;
      }
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF();
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(25);
      pdf.text("Registra tu asistencia", 105, 30, { align: "center" });
      pdf.setFontSize(15);
      pdf.text(pdf.splitTextToSize(point.name, 170), 105, 46, {
        align: "center",
      });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.text(point.operation_centers?.name || "", 105, 64, {
        align: "center",
      });
      pdf.addImage(png, "PNG", 35, 75, 140, 140);
      pdf.setFontSize(13);
      pdf.text(
        [
          "1. Escanea el QR con tu celular.",
          "2. Ingresa tu cédula y PIN personal.",
          "3. Permite la ubicación y confirma tu marcación.",
        ],
        25,
        233,
      );
      pdf.setFontSize(10);
      pdf.text(
        "¿Necesitas tu PIN o ayuda? Contacta a RRHH o al supervisor.",
        105,
        263,
        { align: "center" },
      );
      pdf.save(`cartel-asistencia-${point.id}.pdf`);
    } catch {
      toast.error("No se pudo descargar el QR. Intenta nuevamente.");
    }
  }
  return (
    <>
      <Button
        variant="outline"
        className="w-full"
        disabled={!point.is_active || busy}
        onClick={() => manage("get")}
      >
        <QrCode className="mr-2 h-4 w-4" /> Enlace y QR
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{point.name}</DialogTitle>
            <DialogDescription>
              Publica este QR en la sede. Cada empleado ingresa con su cédula y
              PIN.
            </DialogDescription>
          </DialogHeader>
          {link?.enabled ? (
            <>
              <div className="mx-auto rounded-xl border bg-white p-3">
                <QRCodeSVG value={url} size={220} level="M" />
              </div>
              <p className="break-all rounded-lg bg-muted p-3 text-xs">{url}</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(url)
                      .then(() => toast.success("Enlace copiado"))
                      .catch(() =>
                        toast.error("Copia el enlace que aparece arriba."),
                      )
                  }
                >
                  <Copy className="mr-1 h-4 w-4" /> Copiar
                </Button>
                <Button variant="outline" onClick={() => download(false)}>
                  <Download className="mr-1 h-4 w-4" /> PNG
                </Button>
                <Button variant="outline" onClick={() => download(true)}>
                  <Printer className="mr-1 h-4 w-4" /> Cartel
                </Button>
              </div>
            </>
          ) : (
            <p className="rounded-lg bg-amber-50 p-4 text-amber-800">
              El enlace está desactivado.
            </p>
          )}
          {confirm ? (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm">
                El QR anterior dejará de funcionar. Deberás reemplazar los
                carteles publicados.
              </p>
              <div className="flex gap-2">
                <Button disabled={busy} onClick={() => manage("regenerate")}>
                  Regenerar enlace
                </Button>
                <Button variant="outline" onClick={() => setConfirm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between gap-2">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setConfirm(true)}
              >
                Regenerar enlace
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => manage(link?.enabled ? "disable" : "enable")}
              >
                {link?.enabled ? "Desactivar enlace" : "Activar enlace"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
