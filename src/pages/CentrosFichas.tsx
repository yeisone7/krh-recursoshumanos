import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Building2, 
  Check, 
  Users, 
  Layers, 
  FileText, 
  Search, 
  Filter, 
  MapPin 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOperationCenters } from '@/hooks/useCompanies';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CenterAnalyticalCard } from '@/components/centers/CenterAnalyticalCard';

export default function CentrosFichas() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');

  const { currentCompanyId } = useAuth();
  const { data: centers = [], isLoading } = useOperationCenters();

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

  const cities = useMemo(() => {
    const set = new Set<string>();
    centers.forEach(c => { if (c.city) set.add(c.city); });
    return Array.from(set).sort();
  }, [centers]);

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

  const stats = useMemo(() => ([
    { label: 'CENTROS', value: centers.length, desc: 'Sedes registradas', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'ACTIVOS', value: centers.filter(c => c.is_active !== false).length, desc: 'En operación', icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'PERSONAL', value: companyTotalEmployees, desc: 'Nómina total', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'PROMEDIO', value: centers.length > 0 ? (companyTotalEmployees / centers.length).toFixed(1) : 0, desc: 'Por sede', icon: Layers, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  ]), [centers, companyTotalEmployees]);

  if (!currentCompanyId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Card className="max-w-md border-none shadow-2xl bg-background ">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="p-4 rounded-3xl bg-primary/10 text-primary w-fit mx-auto mb-6">
              <Building2 className="w-12 h-12" />
            </div>
            <p className="text-lg font-black text-foreground uppercase tracking-tight mb-2">No se encontró empresa</p>
            <p className="text-muted-foreground text-sm font-medium">
              No tienes una empresa asignada. Contacta al administrador para habilitar tu acceso.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Premium Header */}
      <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/5 px-6 py-8 sm:px-10 sm:py-10 border-b border-border ">
        
        
        
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary shadow-xl shadow-primary/20 text-primary-foreground transform -rotate-3 transition-transform hover:rotate-0 duration-300">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline" className="text-primary border-border font-bold uppercase tracking-[0.2em] text-[9px] px-2 py-0">
                  Operación / Analítica
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter mt-1">Fichas Técnicas de Centros</h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-xl leading-relaxed">
              Monitoreo analítico y operativo de sedes, personal asignado y estados contractuales en tiempo real.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:min-w-[550px]">
            {stats.map((stat, i) => (
              <div key={i} className="group relative overflow-hidden p-4 rounded-[1.5rem] bg-background border border-border shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500">
                <div className={`absolute top-2 right-2 p-1.5 rounded-lg ${stat.bg} ${stat.color} opacity-30 group-hover:opacity-100 transition-opacity`}>
                   <stat.icon className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">{stat.label}</p>
                  <p className={`text-2xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                  <p className="text-[9px] font-bold text-muted-foreground/60 leading-none truncate">{stat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-30 px-6 py-4 sm:px-10 bg-background border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          <div className="relative w-full sm:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar por nombre, cliente, ciudad..."
              className="pl-11 h-12 rounded-2xl bg-background border-border focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold placeholder:font-normal"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12 w-full sm:w-[160px] rounded-2xl bg-background border-border font-bold text-xs uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  <SelectValue placeholder="Estado" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border shadow-2xl">
                <SelectItem value="all" className="font-bold text-xs uppercase p-3">Todos</SelectItem>
                <SelectItem value="active" className="font-bold text-xs uppercase p-3">Activos</SelectItem>
                <SelectItem value="inactive" className="font-bold text-xs uppercase p-3">Inactivos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="h-12 w-full sm:w-[180px] rounded-2xl bg-background border-border font-bold text-xs uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <SelectValue placeholder="Ciudad" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border shadow-2xl">
                <SelectItem value="all" className="font-bold text-xs uppercase p-3">Todas las ciudades</SelectItem>
                {cities.map(city => (
                  <SelectItem key={city} value={city} className="font-bold text-xs uppercase p-3">{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="hidden sm:flex items-center px-4 h-12 bg-primary/10 rounded-2xl border border-border ">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.1em] whitespace-nowrap">
                {filteredCenters.length} COINCIDENCIAS
              </span>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6 sm:p-10">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-[550px] w-full rounded-[2.5rem]" />
            ))}
          </div>
        ) : filteredCenters.length === 0 ? (
          <div className="text-center py-32 opacity-30">
            <Building2 className="w-20 h-20 mx-auto mb-6" />
            <p className="text-xl font-black uppercase tracking-[0.2em]">No se encontraron centros</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredCenters.map(center => (
              <CenterAnalyticalCard key={center.id} center={center} companyTotalEmployees={companyTotalEmployees} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
