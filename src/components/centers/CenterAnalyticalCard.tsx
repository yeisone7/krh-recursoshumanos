import { useId, type MouseEvent } from 'react';
import { ArrowUpRight, Building2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCenterDetail } from '@/hooks/useCenterDetail';
import { CenterContractStatus, CenterDate, CenterStatus, type CenterProfile } from './CenterIdentity';

const shareFormat = new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 1 });

interface Props {
  center: CenterProfile;
  companyTotalEmployees?: number;
  onOpenDetail: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function CenterAnalyticalCard({ center, companyTotalEmployees, onOpenDetail }: Props) {
  const headingId = useId();
  const { isLoading, employeesError, totalEmployees, areas, shifts, isLoadingShifts, shiftsError,
    expiringContracts, isLoadingContracts, contractsError } = useCenterDetail(center.id);
  const location = [center.city, center.department].filter(Boolean).join(', ');
  const share = companyTotalEmployees ? shareFormat.format(totalEmployees / companyTotalEmployees) : null;

  return (
    <article aria-labelledby={headingId} className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40">
      <div className="flex items-start gap-3 px-4 pt-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {center.code && <span className="break-all text-xs font-medium tabular-nums text-muted-foreground">{center.code}</span>}
            <CenterStatus active={center.is_active} />
          </div>
          <h2 id={headingId} className="mt-1 break-words text-base font-semibold leading-snug tracking-tight">{center.name}</h2>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{location || 'Ubicación sin definir'}</span>
          </p>
        </div>
      </div>

      <dl className="mx-4 mt-3 grid grid-cols-2 gap-3 border-y py-2.5 text-sm">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Cliente</dt>
          <dd className="break-words font-medium">{center.main_client || 'Sin definir'}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Responsable</dt>
          <dd className="break-words font-medium">{center.manager_name || 'Sin definir'}</dd>
        </div>
      </dl>

      <dl className="grid grid-cols-[1.4fr_1fr_1fr] gap-3 px-4 py-3">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Personal</dt>
          <dd className="text-xl font-semibold leading-tight tabular-nums text-primary">
            {isLoading ? <Skeleton className="mt-1 h-5 w-8" /> : employeesError ? '—' : totalEmployees}
          </dd>
          {share && !isLoading && !employeesError && <dd className="text-xs text-muted-foreground">{share} del total</dd>}
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Áreas</dt>
          <dd className="text-lg font-semibold tabular-nums">{isLoading ? <Skeleton className="mt-1 h-5 w-6" /> : employeesError ? '—' : areas.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Turnos</dt>
          <dd className="text-lg font-semibold tabular-nums">{isLoadingShifts ? <Skeleton className="mt-1 h-5 w-6" /> : shiftsError ? '—' : shifts.length}</dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-t bg-muted/25 px-4 py-2.5">
        <div className="space-y-1">
          {center.contract_commercial_date && <p className="text-xs text-muted-foreground">Fin comercial · <CenterDate date={center.contract_commercial_date} /></p>}
          <CenterContractStatus endDate={center.contract_commercial_date} />
          {!isLoadingContracts && !contractsError && expiringContracts > 0 && (
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              {expiringContracts} {expiringContracts === 1 ? 'contrato por vencer' : 'contratos por vencer'}
            </p>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" className="ml-auto gap-1.5 text-primary" aria-label={`Ver ficha de ${center.name}`} onClick={onOpenDetail}>
          Ver ficha <ArrowUpRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}
