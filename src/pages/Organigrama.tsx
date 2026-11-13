import { Network } from 'lucide-react';
import { OrgChart } from '@/components/organigrama/OrgChart';
import { useAreas, usePositions } from '@/hooks/useSystemConfig';
import { useEmployees } from '@/hooks/useEmployees';

export default function Organigrama() {
  const areas = useAreas();
  const positions = usePositions();
  const employees = useEmployees();
  const queries = [areas, positions, employees];

  return (
    <div className="flex h-full min-h-[34rem] min-w-0 flex-col gap-3">
      <header className="flex shrink-0 items-center gap-3 rounded-xl border border-l-4 border-border border-l-primary bg-secondary px-3.5 py-3 text-secondary-foreground sm:px-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Network className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Organigrama</h1>
          <p className="text-xs leading-snug text-muted-foreground sm:text-sm">Explora la jerarquía, los cargos y las personas asignadas.</p>
        </div>
      </header>
      <OrgChart
        positions={positions.data}
        areas={areas.data}
        employees={employees.data}
        isLoading={queries.some(query => query.isLoading)}
        hasError={queries.some(query => query.isError)}
        onRetry={() => queries.filter(query => query.isError).forEach(query => void query.refetch())}
      />
    </div>
  );
}
