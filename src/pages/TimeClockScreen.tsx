import { useParams } from 'react-router-dom';
import { QrDisplay } from '@/components/time-clock';
import { useTimeClockPoints } from '@/hooks/useTimeClock';

export default function TimeClockScreen() {
  const { pointId } = useParams();
  const { data: points = [], isLoading } = useTimeClockPoints();
  const point = points.find(item => item.id === pointId);
  if (isLoading) return <div className="flex min-h-screen items-center justify-center">Cargando pantalla…</div>;
  if (!point) return <div className="flex min-h-screen items-center justify-center">Punto de marcación no disponible.</div>;
  return <div className="min-h-screen bg-slate-950 p-2 sm:p-4"><QrDisplay point={point} /></div>;
}
