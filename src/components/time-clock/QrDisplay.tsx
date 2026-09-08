import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Clock3, Loader2, RefreshCw, ShieldCheck, WifiOff } from 'lucide-react';
import { useIssueTimeClockQr } from '@/hooks/useTimeClock';
import type { TimeClockPoint } from '@/types/timeClock';
import { Button } from '@/components/ui/button';

export function QrDisplay({ point }: { point: TimeClockPoint }) {
  const { mutateAsync: issueQr } = useIssueTimeClockQr();
  const refreshing = useRef(false);
  const [challenge, setChallenge] = useState<{ token: string; expires_at: string } | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);

  const refresh = useCallback(async () => {
    if (!navigator.onLine || refreshing.current) return;
    refreshing.current = true;
    try { setChallenge(await issueQr(point.id)); } catch { setChallenge(null); }
    finally { refreshing.current = false; }
  }, [issueQr, point.id]);

  useEffect(() => { refresh(); const timer = window.setInterval(refresh, 25_000); return () => window.clearInterval(timer); }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(challenge ? Math.max(0, Math.ceil((new Date(challenge.expires_at).getTime() - Date.now()) / 1000)) : 0), 500);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.clearInterval(timer); window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, [challenge]);

  const url = challenge ? `${window.location.origin}/marcar?point=${point.id}&token=${challenge.token}` : '';
  return <div className="flex min-h-[calc(100vh-2rem)] flex-col items-center justify-center rounded-3xl bg-slate-950 p-6 text-white">
    <div className="mb-7 text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15"><Clock3 className="h-8 w-8 text-emerald-400" /></div><h1 className="text-3xl font-black sm:text-5xl">Marca tu asistencia</h1><p className="mt-2 text-lg text-slate-300">{point.name} · {point.operation_centers?.name}</p></div>
    <div className="rounded-[2rem] bg-white p-5 shadow-2xl shadow-emerald-500/10 sm:p-8">
      {!online ? <div className="flex h-64 w-64 flex-col items-center justify-center text-slate-700"><WifiOff className="mb-3 h-12 w-12" /> Sin conexión</div> : url && seconds > 0 ? <QRCodeSVG value={url} size={320} level="M" className="h-[min(64vw,320px)] w-[min(64vw,320px)]" /> : <div className="flex h-64 w-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>}
    </div>
    <div className="mt-6 flex items-center gap-3 rounded-full bg-white/10 px-5 py-3"><ShieldCheck className="h-5 w-5 text-emerald-400" /><span>Código antifraude · cambia en</span><strong className="tabular-nums">{seconds}s</strong></div>
    <Button variant="ghost" className="mt-3 text-slate-300 hover:bg-white/10 hover:text-white" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" /> Actualizar</Button>
  </div>;
}
