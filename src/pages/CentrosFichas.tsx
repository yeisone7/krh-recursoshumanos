import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  FileText,
  Filter,
  Layers,
  MapPin,
  Search,
  Users,
  X,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useOperationCenters } from '@/hooks/useCompanies';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CenterAnalyticalCard } from '@/components/centers/CenterAnalyticalCard';
import { CenterDetailSheet } from '@/components/centers/CenterDetailSheet';

export default function CentrosFichas() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [detailCenter, setDetailCenter] = useState<any | null>(null);

  const { currentCompanyId } = useAuth();
  const { data: centers = [], isLoading } = useOperationCenters();

  const centerIds = useMemo(() => centers.map((center) => center.id), [centers]);

  const { data: companyTotalEmployees = 0 } = useQuery({
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

  const cities = useMemo(() => {
    const citySet = new Set<string>();
    centers.forEach((center) => {
      if (center.city) citySet.add(center.city);
    });
    return Array.from(citySet).sort();
  }, [centers]);

  const filteredCenters = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return centers.filter((center) => {
      const matchesSearch = !query || [
        center.name,
        center.code,
        center.main_client,
        center.city,
        center.department,
        center.manager_name,
      ].some((value) => value?.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === 'all' ||
        ((center.is_active !== false) === (statusFilter === 'active'));

      const matchesCity = cityFilter === 'all' || center.city === cityFilter;

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [centers, searchQuery, statusFilter, cityFilter]);

  const activeCenters = centers.filter((center) => center.is_active !== false).length;
  const averageEmployees = centers.length > 0 ? companyTotalEmployees / centers.length : 0;
  const hasFilters = searchQuery || statusFilter !== 'all' || cityFilter !== 'all';

  const stats = [
    {
      label: 'Centros',
      value: centers.length,
      desc: 'Fichas registradas',
      icon: Building2,
      tone: 'text-sky-600 bg-sky-50 border-sky-100',
    },
    {
      label: 'Activos',
      value: activeCenters,
      desc: 'En operación',
      icon: CheckCircle2,
      tone: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      label: 'Personal',
      value: companyTotalEmployees,
      desc: 'Asignado a centros',
      icon: Users,
      tone: 'text-primary bg-primary/10 border-primary/15',
    },
    {
      label: 'Promedio',
      value: averageEmployees.toFixed(1),
      desc: 'Personas por centro',
      icon: Layers,
      tone: 'text-amber-600 bg-amber-50 border-amber-100',
    },
  ];

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCityFilter('all');
  };

  if (!currentCompanyId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="max-w-md border-border/80 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">No se encontró empresa</p>
            <p className="mt-2 text-sm text-muted-foreground">
              No tienes una empresa asignada. Contacta al administrador para habilitar tu acceso.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border/80 bg-background p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Operación
                </Badge>
                <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Fichas Técnicas de Centros
                </h1>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Consulta el estado operativo de cada centro, su personal asignado, distribución por cargos,
              turnos activos e indicadores contractuales.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:min-w-[560px]">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </span>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-md border ${stat.tone}`}>
                    <stat.icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border/80 bg-background p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <div className="relative flex-1 md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar por centro, cliente, ciudad o responsable..."
                className="h-11 pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 md:w-[170px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <SelectValue placeholder="Estado" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="h-11 md:w-[210px]">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <SelectValue placeholder="Ciudad" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las ciudades</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button type="button" variant="outline" className="h-11 gap-2" onClick={clearFilters}>
                <X className="h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>

          <div className="rounded-md border border-primary/15 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
            {filteredCenters.length} de {centers.length} fichas
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-[360px] rounded-lg" />
          ))}
        </div>
      ) : filteredCenters.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border bg-background p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold text-foreground">No se encontraron centros</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ajusta los filtros para ampliar los resultados disponibles.
          </p>
          {hasFilters && (
            <Button type="button" variant="outline" className="mt-5" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredCenters.map((center) => (
            <CenterAnalyticalCard
              key={center.id}
              center={center}
              companyTotalEmployees={companyTotalEmployees}
              onOpenDetail={() => setDetailCenter(center)}
            />
          ))}
        </div>
      )}

      <CenterDetailSheet
        open={!!detailCenter}
        onOpenChange={(open) => !open && setDetailCenter(null)}
        center={detailCenter}
      />
    </div>
  );
}
