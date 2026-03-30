import { useState, useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Building2, MapPin, Phone, User, Calendar, FileText,
  Users, Clock, Layers, AlertTriangle, Briefcase, Search, Filter
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useOperationCenters } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { CenterAnalyticalCard } from '@/components/centers/CenterAnalyticalCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function CentrosFichas() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');

  const { currentCompanyId } = useAuth();
  const { data: centers = [], isLoading } = useOperationCenters();

  // Total employees across all centers in the company
  const { data: companyTotalEmployees = 0 } = useQuery({
    queryKey: ['company_total_employees', currentCompanyId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('employee_work_info')
        .select('id', { count: 'exact', head: true })
        .eq('is_current', true)
        .in('operation_center_id', centers.map(c => c.id));
      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentCompanyId && centers.length > 0,
  });

  // Unique cities for filter
  const cities = useMemo(() => {
    const set = new Set<string>();
    centers.forEach(c => { if (c.city) set.add(c.city); });
    return Array.from(set).sort();
  }, [centers]);

  // Filtered centers
  const filteredCenters = useMemo(() => {
    let result = centers;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.main_client?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.manager_name?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      result = result.filter(c => (c.is_active !== false) === isActive);
    }

    if (cityFilter !== 'all') {
      result = result.filter(c => c.city === cityFilter);
    }

    return result;
  }, [centers, searchQuery, statusFilter, cityFilter]);

  if (!currentCompanyId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No tienes una empresa asignada. Contacta al administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
          Fichas Técnicas de Centros
        </h1>
        <p className="text-muted-foreground mt-1">
          Vista analítica detallada por centro de operación
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, código, cliente, ciudad..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Ciudad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las ciudades</SelectItem>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">
              {filteredCenters.length} centro{filteredCenters.length !== 1 ? 's' : ''} encontrado{filteredCenters.length !== 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[500px] w-full rounded-lg" />
          ))}
        </div>
      ) : filteredCenters.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No se encontraron centros</h3>
          <p className="text-muted-foreground">
            Ajusta los filtros o la búsqueda para ver resultados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCenters.map(center => (
            <CenterAnalyticalCard key={center.id} center={center} companyTotalEmployees={companyTotalEmployees} />
          ))}
        </div>
      )}
    </div>
  );
}
