import { UnifiedCalendar } from '@/components/calendar/UnifiedCalendar';

export default function Calendario() {
  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 sm:space-y-6">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-8 sm:p-10 border border-primary/10 shadow-sm">
        <div className="relative z-10">
          <h1 className="text-2xl font-black tracking-tight sm:text-4xl text-foreground uppercase">
            Calendario <span className="text-primary">Unificado</span>
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground sm:text-lg max-w-2xl leading-relaxed">
            Gestión integral de novedades laborales: visualiza vacaciones, permisos, incapacidades y compromisos en una sola vista inteligente.
          </p>
        </div>
        {/* Decorative element */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl" />
      </div>

      <div className="min-h-0 flex-1">
        <UnifiedCalendar />
      </div>
    </div>
  );
}
