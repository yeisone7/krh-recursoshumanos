import { UnifiedCalendar } from '@/components/calendar/UnifiedCalendar';

export default function Calendario() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendario Unificado</h1>
        <p className="text-muted-foreground">
          Visualiza vacaciones, permisos, incapacidades, vencimientos de contratos y capacitaciones
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <UnifiedCalendar />
      </div>
    </div>
  );
}
