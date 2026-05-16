import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Edit2, CheckCircle2, XCircle, Info, Search, Filter, Settings2, RefreshCw } from 'lucide-react';

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

  const { data: areas = [], isLoading, refetch } = useAreas();

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
    <div className="space-y-8 max-w-7xl mx-auto px-2">
      {/* Header Premium Flat */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-8 h-8 stroke-[2.5] text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Áreas</h1>
              <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest">ESTRUCTURA</Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Jerarquía y departamentos de la compañía</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="h-14 w-14 rounded-2xl border-slate-100 bg-white hover:bg-slate-50 transition-all shrink-0"
          >
            <RefreshCw className={cn("w-5 h-5 text-slate-400", isLoading && "animate-spin")} />
          </Button>
          <Button 
            onClick={() => { setSelectedArea(null); setShowAreaForm(true); }}
            className="h-14 px-10 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 group flex-1 md:flex-none"
          >
            <Plus className="w-4 h-4 mr-3 stroke-[2.5] group-hover:scale-110 transition-transform" />
            NUEVA ÁREA
          </Button>
        </div>
      </motion.div>

      {/* KPI Grid Flat Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-1">
        {[
          { label: 'Total Áreas', value: stats.total, icon: Users, color: 'text-slate-900', bg: 'bg-slate-50' },
          { label: 'Activas', value: stats.active, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Inactivas', value: stats.inactive, icon: XCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Jerarquías', value: stats.hierarchies, icon: Info, color: 'text-primary', bg: 'bg-primary/5' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="p-6 rounded-[2rem] bg-white border border-slate-100 flex flex-col items-center text-center space-y-2"
          >
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
              <stat.icon className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tighter">
                {isLoading ? '...' : stat.value}
              </p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="px-1">
        <div className="rounded-[2.5rem] bg-white border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative group flex-1 max-w-xl">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
              </div>
              <Input
                placeholder="BUSCAR POR NOMBRE O CÓDIGO..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-14 pl-14 rounded-2xl bg-slate-50 border-none focus-visible:ring-4 ring-primary/5 transition-all font-black text-[10px] uppercase tracking-widest"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Filter className="w-4 h-4" />
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Settings2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="p-0">
            {isLoading ? (
              <div className="p-10 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredAreas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200">
                  <Users className="h-12 w-12" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sin resultados</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {searchTerm ? 'Prueba con otro término de búsqueda.' : 'Comienza creando la primera área estratégica.'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <MobileCardList
                  className="md:hidden"
                  items={filteredAreas.map(area => ({
                    id: area.id,
                    title: area.name,
                    subtitle: area.description || 'Sin descripción corporativa',
                    badge: <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-100 bg-slate-50 h-5 px-2 rounded-lg">{area.code || 'S/C'}</Badge>,
                    fields: [
                      {
                        label: 'ESTADO',
                        value: (
                          <Badge 
                            className={cn(
                              "h-5 px-3 rounded-md border-none font-black text-[8px] uppercase tracking-widest",
                              area.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                            )}
                          >
                            {area.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        ),
                      }
                    ],
                    actions: (
                      <Button 
                        variant="outline" 
                        className="w-full h-10 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100 hover:bg-primary hover:text-white transition-all" 
                        onClick={() => { setSelectedArea(area); setShowAreaForm(true); }}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-2.5" /> EDITAR ÁREA
                      </Button>
                    )
                  }))}
                />

                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent border-slate-100">
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pl-10 py-6">Estructura / Departamento</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Código</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400">Descripción</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Estado</TableHead>
                        <TableHead className="text-right font-black uppercase tracking-widest text-[10px] text-slate-400 pr-10">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAreas.map((area) => (
                        <TableRow key={area.id} className="group border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                          <TableCell className="pl-10 py-6">
                            <div className="flex items-center gap-5">
                              <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary font-black text-sm group-hover:scale-110 transition-transform">
                                {area.name.charAt(0)}
                              </div>
                              <div className="space-y-1">
                                <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{area.name}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID: {area.id.split('-')[0]}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <code className="bg-white px-3 py-1.5 rounded-xl text-[10px] font-mono font-black text-slate-600 uppercase border border-slate-100">{area.code || '-'}</code>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed">{area.description || 'Sin descripción corporativa'}</p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              className={cn(
                                "h-8 px-4 rounded-xl border-none font-black text-[9px] uppercase tracking-widest",
                                area.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                              )}
                            >
                              {area.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-10">
                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-12 w-12 rounded-2xl hover:bg-primary hover:text-white transition-all active:scale-90 border border-transparent hover:border-primary/20"
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
              </div>
            )}
          </div>
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
