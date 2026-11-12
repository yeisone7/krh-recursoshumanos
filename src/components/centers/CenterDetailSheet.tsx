import { useId, type ReactNode } from 'react';
import { Building2, CalendarDays, Clock3, Layers, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCenterDetail } from '@/hooks/useCenterDetail';
import { CenterContractStatus, CenterDate, CenterStatus, type CenterProfile } from './CenterIdentity';

interface CenterDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  center: CenterProfile | null;
  returnFocusTo?: { readonly current: HTMLElement | null };
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium">{children || 'Sin definir'}</dd>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="min-w-0 rounded-xl border bg-card p-3.5 sm:p-4">
      <h3 id={headingId} className="mb-3 text-sm font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  );
}

function DetailList({ rows, loading, error, empty, showBars = false }: {
  rows: { key: string | number; name: string; count: number; type?: string }[];
  loading: boolean;
  error: boolean;
  empty: string;
  showBars?: boolean;
}) {
  if (loading) return <Skeleton className="h-16 w-full" aria-label="Cargando datos" />;
  if (error) return <p className="text-sm text-muted-foreground">No se pudieron cargar los datos.</p>;
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;

  const maxCount = rows[0].count || 1;
  return (
    <ul className="divide-y">
      {rows.map((row) => (
        <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 py-2 first:pt-0 last:pb-0">
          <span className="min-w-0 break-words text-sm font-medium">
            {row.name}
            {row.type && <span className="ml-2 text-xs font-normal text-muted-foreground">{row.type}</span>}
          </span>
          <span className="text-sm font-semibold tabular-nums">{row.count}<span className="sr-only"> personas</span></span>
          {showBars && (
            <div className="col-span-2 h-1 overflow-hidden rounded-full bg-primary/10" aria-hidden="true">
              <div className="h-full rounded-full bg-primary/70" style={{ width: `${(row.count / maxCount) * 100}%` }} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function CenterDetailSheet({ open, onOpenChange, center, returnFocusTo }: CenterDetailSheetProps) {
  const { isLoading, isLoadingShifts, isLoadingContracts, employeesError, shiftsError, contractsError,
    totalEmployees, positionCounts, shifts, areas, expiringContracts } = useCenterDetail(open ? center?.id : undefined);

  if (!center) return null;

  const location = [center.city, center.department].filter(Boolean).join(', ');
  const metrics = [
    { label: 'Personal', count: totalEmployees, loading: isLoading, error: employeesError, icon: Users },
    { label: 'Áreas', count: areas.length, loading: isLoading, error: employeesError, icon: Layers },
    { label: 'Turnos', count: shifts.length, loading: isLoadingShifts, error: shiftsError, icon: Clock3 },
    { label: 'Contratos por vencer', count: expiringContracts, loading: isLoadingContracts, error: contractsError, icon: CalendarDays },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl [&_[data-workspace-back]]:mx-4 [&_[data-workspace-back]]:mt-2"
        onCloseAutoFocus={(event) => {
          if (!returnFocusTo?.current?.isConnected) return;
          event.preventDefault();
          returnFocusTo.current.focus();
        }}>
        <SheetHeader className="shrink-0 space-y-0 border-b px-4 py-3 pr-12 text-left sm:px-5 sm:pr-12">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {center.code && <span className="break-all text-xs font-medium tabular-nums text-muted-foreground">{center.code}</span>}
                <CenterStatus active={center.is_active} />
              </div>
              <SheetTitle className="mt-1 break-words text-lg leading-tight tracking-tight sm:text-xl">{center.name}</SheetTitle>
              <SheetDescription className={location ? 'mt-0.5 break-words text-xs' : 'sr-only'}>
                {location || 'Ficha del centro de operación'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <dl className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-2 border-b bg-muted/25 px-4 py-2.5 sm:grid-cols-4 sm:px-5">
          {metrics.map(({ label, count, loading, error, icon: Icon }) => (
            <div key={label} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />{label}
                {label === 'Contratos por vencer' && <span className="sr-only"> en 30 días</span>}
              </dt>
              <dd className="pl-5 text-lg font-semibold leading-tight tabular-nums">
                {loading ? <Skeleton className="mt-0.5 h-5 w-8" /> : error ? '—' : count}
              </dd>
            </div>
          ))}
        </dl>

        <Tabs key={center.id} defaultValue="summary" className="flex min-h-0 flex-1 flex-col">
          <TabsList aria-label="Secciones de la ficha" className="grid w-full shrink-0 grid-cols-2 rounded-none border-x-0 border-t-0 bg-background px-4 sm:px-5">
            <TabsTrigger value="summary" className="px-2 py-1.5">Resumen</TabsTrigger>
            <TabsTrigger value="staff" className="px-2 py-1.5">Personal y turnos</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="m-0 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
            <DetailSection title="Operación y contacto">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <DetailField label="Cliente">{center.main_client}</DetailField>
                <DetailField label="Responsable">{center.manager_name}</DetailField>
                <DetailField label="Dirección">{center.address}</DetailField>
                <DetailField label="Teléfono">{center.phone}</DetailField>
              </dl>
            </DetailSection>
            <DetailSection title="Contrato comercial">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <DetailField label="Inicio"><CenterDate date={center.contract_start_date} /></DetailField>
                <DetailField label="Fin comercial"><CenterDate date={center.contract_commercial_date} /></DetailField>
                <DetailField label="Vencimiento"><CenterContractStatus endDate={center.contract_commercial_date} /></DetailField>
              </dl>
              {center.notes && (
                <div className="mt-3 border-t pt-3">
                  <p className="text-xs text-muted-foreground">Notas</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{center.notes}</p>
                </div>
              )}
            </DetailSection>
          </TabsContent>
          <TabsContent value="staff" className="m-0 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
            <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <DetailSection title="Personal por cargo">
                <DetailList rows={positionCounts.map(({ position_name, count }) => ({ key: position_name, name: position_name, count }))}
                  loading={isLoading} error={employeesError} empty="Sin personal asignado." showBars />
              </DetailSection>
              <div className="grid min-w-0 gap-3">
                <DetailSection title="Turnos y horarios">
                  <DetailList rows={shifts.map(({ name, type, employeeCount }, index) => ({ key: index, name, count: employeeCount, type: type === 'schedule' ? 'Horario' : 'Ciclo' }))}
                    loading={isLoadingShifts} error={shiftsError} empty="Sin turnos configurados." />
                </DetailSection>
                <DetailSection title="Áreas operativas">
                  <DetailList rows={areas.map(({ id, name, employeeCount }) => ({ key: id, name, count: employeeCount }))}
                    loading={isLoading} error={employeesError} empty="Sin áreas con personal asignado." />
                </DetailSection>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
