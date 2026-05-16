import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Edit2, CheckCircle2, XCircle, Info, Search, Filter } from 'lucide-react';

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
import { MobileCardList } from '@/components/shared/MobileCardList';
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
    <div className="space-y-6">
      {/* Header Premium - Clean Sky Style */}
      <div className="bg-card border-none shadow-sm rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1 w-10 bg-primary rounded-full" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Estructura Organizacional</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Áreas y Departamentos
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl leading-relaxed font-medium">
              Gestión centralizada de la jerarquía organizacional y departamentos de la empresa.
            </p>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <Button 
              onClick={() => { setSelectedArea(null); setShowAreaForm(true); }}
              className="h-11 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" />
              NUEVA ÁREA
            </Button>
          </div>
        </div>
      </div>

      {/* Grid de Estadísticas - Clean Sky Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Áreas', value: stats.total, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Activas', value: stats.active, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Inactivas', value: stats.inactive, icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-100' },
          { label: 'Jerarquías', value: stats.hierarchies, icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        ].map((kpi, i) => (
          <Card key={i} className="border-none shadow-sm bg-card hover:shadow-md transition-all duration-300 group rounded-2xl overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 sm:p-3 rounded-xl ${kpi.bg} group-hover:scale-110 transition-transform shrink-0`}>
                  <kpi.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${kpi.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-black tracking-tight truncate leading-none mb-1">
                    {isLoading ? <Skeleton className="h-6 w-8" /> : kpi.value}
                  </p>
                  <p className="text-[10px] sm:text-[11px] font-bold text-foreground/80 leading-tight uppercase tracking-widest">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Listado - Clean Sky Style */}
      <div className="bg-card border-none shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-background border-none rounded-xl shadow-sm focus-visible:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 h-8 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wider">
              {filteredAreas.length} {filteredAreas.length === 1 ? 'Área' : 'Áreas'}
            </Badge>
          </div>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : filteredAreas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No se encontraron áreas</h3>
              <p className="text-muted-foreground max-w-xs mx-auto text-sm mt-1">
                {searchTerm ? 'Prueba con otro término de búsqueda o limpia los filtros.' : 'Comienza creando la primera área organizacional.'}
              </p>
              {searchTerm && (
                <Button variant="link" onClick={() => setSearchTerm('')} className="mt-2 text-primary font-bold">
                  Limpiar búsqueda
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground pl-6">Nombre</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Código</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Descripción</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Estado</TableHead>
                      <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAreas.map((area) => (
                      <TableRow key={area.id} className="group border-none hover:bg-muted/20 transition-colors">
                        <TableCell className="pl-6 py-4">
                          <span className="font-bold text-sm text-foreground">{area.name}</span>
                        </TableCell>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-[10px] font-mono text-muted-foreground uppercase">{area.code || '-'}</code>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="text-xs text-muted-foreground truncate">{area.description || 'Sin descripción'}</p>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "gap-1.5 text-[10px] font-bold uppercase py-0 px-2.5 h-6 rounded-full border-none shadow-sm",
                              area.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 text-slate-400"
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", area.is_active ? "bg-emerald-500" : "bg-slate-400")} />
                            {area.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary"
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

              {/* Mobile View */}
              <div className="md:hidden">
                <MobileCardList
                  items={filteredAreas.map((area) => ({
                    id: area.id,
                    title: area.name,
                    subtitle: area.description || 'Sin descripción',
                    badge: (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold uppercase h-5 rounded-full border-none shadow-sm",
                          area.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 text-slate-400"
                        )}
                      >
                        {area.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    ),
                    fields: [
                      { label: 'Código', value: area.code || '—' },
                    ],
                    actions: (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full rounded-xl mt-2 border-primary/20 text-primary hover:bg-primary/5 font-bold text-[10px] uppercase tracking-wider"
                        onClick={() => { setSelectedArea(area); setShowAreaForm(true); }}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-2" />
                        Editar Área
                      </Button>
                    ),
                  }))}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <AreaFormDialog 
        open={showAreaForm} 
        onOpenChange={setShowAreaForm} 
        area={selectedArea} 
      />
    </div>
  );
}
