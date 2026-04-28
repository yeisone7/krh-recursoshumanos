import { UnifiedCalendar } from '@/components/calendar/UnifiedCalendar';

export default function Calendario() {
  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Calendario Unificado</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Visualiza vacaciones, permisos, incapacidades, vencimientos de contratos y capacitaciones
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <UnifiedCalendar />
      </div>
    </div>
  );
}
