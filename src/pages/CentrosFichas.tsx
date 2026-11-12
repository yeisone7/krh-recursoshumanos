import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Search, X } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useOperationCenters } from '@/hooks/useCompanies';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CenterAnalyticalCard } from '@/components/centers/CenterAnalyticalCard';
import { CenterDetailSheet } from '@/components/centers/CenterDetailSheet';

const countFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const cardGrid = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-3';
const emptyCenters = [];

export default function CentrosFichas() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const { currentCompanyId } = useAuth();
  const { data: centers = emptyCenters, isLoading, isError, refetch } = useOperationCenters();
  const centerIds = useMemo(() => centers.map(({ id }) => id), [centers]);
  const detailCenter = centers.find(({ id }) => id === detailId) ?? null;

  const employees = useQuery({
    queryKey: ['company_total_employees', currentCompanyId, centerIds],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('employee_work_info')
        .select('id', { count: 'exact', head: true })
        .eq('is_current', true)
        .in('operation_center_id', centerIds);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentCompanyId && centerIds.length > 0,
  });

  const cities = [...new Set(centers.map(({ city }) => city).filter((city): city is string => Boolean(city)))]
    .sort((a, b) => a.localeCompare(b, 'es'));
  const query = searchQuery.trim().toLowerCase();
  const filteredCenters = centers.filter((center) => {
    const matchesSearch = !query || [
      center.name, center.code, center.main_client, center.city, center.department, center.manager_name,
    ].some((value) => value?.toLowerCase().includes(query));
    const matchesStatus = statusFilter === 'all' || ((center.is_active !== false) === (statusFilter === 'active'));
    return matchesSearch && matchesStatus && (cityFilter === 'all' || center.city === cityFilter);
  });

  const companyTotalEmployees = centers.length ? employees.data : 0;
  const activeCenters = centers.filter((center) => center.is_active !== false).length;
  const averageEmployees = centers.length ? (companyTotalEmployees ?? 0) / centers.length : 0;
  const hasFilters = Boolean(query) || statusFilter !== 'all' || cityFilter !== 'all';
  const stats = [
    { label: 'Centros', value: centers.length },
    { label: 'Centros activos', value: activeCenters },
    { label: 'Personal asignado', value: companyTotalEmployees, loading: employees.isLoading },
    { label: 'Personas por centro', value: companyTotalEmployees === undefined ? undefined : averageEmployees, loading: employees.isLoading },
  ];

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCityFilter('all');
    searchInput.current?.focus();
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-4">
      <header className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">Fichas técnicas de centros</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Personal, turnos y contratos por centro de operación.</p>
        </div>
      </header>

      {!currentCompanyId ? (
        <section className="rounded-xl border bg-card px-4 py-8 text-center">
          <h2 className="font-semibold">Empresa sin asignar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Contacta al administrador para acceder a las fichas de centros.</p>
        </section>
      ) : isError && !centers.length ? (
        <section role="alert" className="rounded-xl border bg-card px-4 py-8 text-center">
          <h2 className="font-semibold">No pudimos cargar las fichas</h2>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>Volver a intentar</Button>
        </section>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
            {stats.map(({ label, value, loading }) => (
              <div key={label} className="min-w-0 bg-card px-3 py-2.5 sm:px-4">
                <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 text-xl font-semibold leading-tight tabular-nums">
                  {isLoading || loading ? <Skeleton className="mt-1 h-5 w-9" /> : value === undefined ? '—' : countFormat.format(value)}
                </dd>
              </div>
            ))}
          </dl>

          <div className="space-y-2.5">
            <div role="group" aria-label="Filtros de centros" className="flex flex-wrap items-center gap-2">
              <div className="relative basis-full sm:min-w-56 sm:flex-1 sm:basis-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input ref={searchInput} aria-label="Buscar centros" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar centro, cliente o responsable" className="h-9 pl-9" />
              </div>
              <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-2 sm:flex-none sm:grid-cols-[8rem_11rem]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger aria-label="Estado del centro" className="h-9 min-w-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Estado: todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger aria-label="Ciudad del centro" className="h-9 min-w-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las ciudades</SelectItem>
                    {cities.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {hasFilters && <Button type="button" variant="ghost" size="icon" className="size-9" onClick={clearFilters} aria-label="Limpiar filtros" title="Limpiar filtros">
                <X className="size-4" aria-hidden="true" />
              </Button>}
            </div>
            <p role="status" className="text-xs text-muted-foreground">
              {isLoading ? 'Cargando fichas…' : `${filteredCenters.length} de ${centers.length} fichas`}
            </p>
          </div>

          {isLoading ? (
            <div className={cardGrid} aria-hidden="true">
              {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-60 rounded-xl" />)}
            </div>
          ) : filteredCenters.length === 0 ? (
            <section className="rounded-xl border border-dashed bg-card px-4 py-9 text-center">
              <h2 className="text-base font-semibold">{hasFilters ? 'No hay centros que coincidan' : 'Todavía no hay centros registrados'}</h2>
              {hasFilters && <Button type="button" variant="outline" size="sm" className="mt-3" onClick={clearFilters}>Quitar filtros</Button>}
            </section>
          ) : (
            <div className={cardGrid}>
              {filteredCenters.map((center) => (
                <CenterAnalyticalCard key={center.id} center={center} companyTotalEmployees={companyTotalEmployees}
                  onOpenDetail={(event) => {
                    detailTrigger.current = event.currentTarget;
                    setDetailId(center.id);
                  }} />
              ))}
            </div>
          )}

          <CenterDetailSheet open={!!detailCenter} onOpenChange={(open) => !open && setDetailId(null)}
            center={detailCenter} returnFocusTo={detailTrigger} />
        </>
      )}
    </div>
  );
}
