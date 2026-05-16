import { useState, useMemo } from 'react';
import { Users, Plus, Edit2, CheckCircle2, XCircle, Info, Search, Filter, Settings2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { useAreas } from '@/hooks/useSystemConfig';
import { AreaFormDialog } from '@/components/config';
import type { Area } from '@/types/config';

export default function CatalogosAreas() {
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: areas = [], isLoading } = useAreas();

  const filteredAreas = useMemo(() => {
    return areas.filter(area => 
      area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      area.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [areas, searchTerm]);

  const stats = useMemo(() => ({
    total: areas.length,
    active: areas.filter(a => a.is_active).length,
    inactive: areas.filter(a => !a.is_active).length,
    hierarchies: areas.filter(a => a.parent_id).length
  }), [areas]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header - Flat Style */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Estructura Organizacional</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
              Áreas y Departamentos
            </h1>
            <p className="text-slate-500 text-sm max-w-xl font-medium">
              Gestión centralizada de la jerarquía organizacional y departamentos de la empresa.
            </p>
          </div>
          
          <Button 
            onClick={() => { setSelectedArea(null); setShowAreaForm(true); }}
            className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs transition-all shadow-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            NUEVA ÁREA
          </Button>
        </div>
      </div>

      {/* Grid de Estadísticas - Flat Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Áreas', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Activas', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Inactivas', value: stats.inactive, icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-50' },
          { label: 'Jerarquías', value: stats.hierarchies, icon: Info, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((kpi, i) => (
          <Card key={i} className="border border-slate-200 shadow-none bg-white rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                    {isLoading ? <Skeleton className="h-8 w-12" /> : kpi.value}
                  </p>
                </div>
                <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center shrink-0", kpi.bg, kpi.color)}>
                  <kpi.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Listado - Flat Style */}
      <Card className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-none">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-lg focus:bg-white transition-all text-sm"
            />
          </div>
          <Button variant="outline" className="h-10 px-4 rounded-lg border-slate-200 font-bold text-slate-600 text-sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 w-full bg-slate-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredAreas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="h-16 w-16 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                <Users className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">No se encontraron áreas</h3>
                <p className="text-slate-500 text-sm font-medium">
                  {searchTerm ? 'Prueba con otro término de búsqueda.' : 'Comienza creando la primera área organizacional.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent border-slate-200">
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 pl-6 py-4">Nombre de Área</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 text-center">Código</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Descripción</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 text-center">Estado</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-widest text-slate-500">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAreas.map((area) => (
                    <TableRow key={area.id} className="group border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 font-black text-sm">
                            {area.name.charAt(0)}
                          </div>
                          <span className="font-bold text-sm text-slate-900">{area.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <code className="bg-slate-100 px-2.5 py-1 rounded text-[10px] font-mono font-bold text-slate-600 uppercase border border-slate-200">{area.code || '-'}</code>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="text-xs text-slate-500 font-medium truncate">{area.description || 'Sin descripción'}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className={cn(
                            "h-6 px-2.5 rounded-md border-none font-bold text-[10px] uppercase tracking-wider",
                            area.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                          )}
                        >
                          {area.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => { setSelectedArea(area); setShowAreaForm(true); }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>

      <AreaFormDialog 
        open={showAreaForm} 
        onOpenChange={setShowAreaForm} 
        area={selectedArea} 
      />
    </div>
  );
}
