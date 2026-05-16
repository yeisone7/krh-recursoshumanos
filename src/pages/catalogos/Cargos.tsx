import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, Plus, Edit2, FileText, Search, 
  TableIcon, LayoutList, GraduationCap, Shield, Users,
  Settings2, Filter, RefreshCw
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { usePositions, useAreas } from '@/hooks/useSystemConfig';
import { usePositionProfiles } from '@/hooks/usePositionProfiles';
import { PositionFormDialog, PositionProfileDetailDialog } from '@/components/config';
import { MobileCardList } from '@/components/shared/MobileCardList';
import type { Position } from '@/types/config';

type ViewMode = 'table' | 'agenda';

export default function CatalogosCargos() {
  const [showPositionForm, setShowPositionForm] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [profileTarget, setProfileTarget] = useState<{ id: string; name: string; area?: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('agenda');

  // Filters
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [filterProfile, setFilterProfile] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: positions = [], isLoading, refetch } = usePositions();
  const { data: areas = [] } = useAreas();
  const { data: allProfiles = [] } = usePositionProfiles();

  const hasProfile = (posId: string) => allProfiles.some((p: any) => p.position_id === posId && p.is_current);
  const getProfile = (posId: string) => allProfiles.find((p: any) => p.position_id === posId && p.is_current);

  const activeAreas = useMemo(() => areas.filter((a: any) => a.is_active), [areas]);

  const filteredPositions = useMemo(() => {
    return positions.filter((pos: any) => {
      const matchSearch = !search || 
        pos.name.toLowerCase().includes(search.toLowerCase()) ||
        (pos.code && pos.code.toLowerCase().includes(search.toLowerCase())) ||
        (pos.areas?.name && pos.areas.name.toLowerCase().includes(search.toLowerCase()));
      
      const matchArea = filterArea === 'all' || pos.area_id === filterArea;
      const matchProfile = filterProfile === 'all' || 
        (filterProfile === 'with' && hasProfile(pos.id)) ||
        (filterProfile === 'without' && !hasProfile(pos.id));
      const matchStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && pos.is_active) ||
        (filterStatus === 'inactive' && !pos.is_active);
      
      return matchSearch && matchArea && matchProfile && matchStatus;
    });
  }, [positions, search, filterArea, filterProfile, filterStatus, allProfiles]);

  const profileCount = positions.filter((p: any) => hasProfile(p.id)).length;

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
            <Briefcase className="w-8 h-8 stroke-[2.5] text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Cargos</h1>
              <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest">PERFILES</Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestión de posiciones y perfiles laborales</p>
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
            onClick={() => { setSelectedPosition(null); setShowPositionForm(true); }}
            className="h-14 px-10 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 group flex-1 md:flex-none"
          >
            <Plus className="w-4 h-4 mr-3 stroke-[2.5] group-hover:scale-110 transition-transform" />
            NUEVO CARGO
          </Button>
        </div>
      </motion.div>

      {/* KPI Grid Flat Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-1">
        {[
          { label: 'Total Cargos', value: positions.length, icon: Briefcase, color: 'text-slate-900', bg: 'bg-slate-50' },
          { label: 'Perfiles Config', value: profileCount, icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Cargos Activos', value: positions.filter(p => p.is_active).length, icon: Users, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'Sin Perfil', value: positions.length - profileCount, icon: Shield, color: 'text-orange-500', bg: 'bg-orange-50' },
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
          <div className="p-8 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="relative group flex-1 max-w-xl">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
              </div>
              <Input
                placeholder="BUSCAR POR NOMBRE, CÓDIGO O ÁREA..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-14 pl-14 rounded-2xl bg-slate-50 border-none focus-visible:ring-4 ring-primary/5 transition-all font-black text-[10px] uppercase tracking-widest"
              />
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-4">
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="h-14 w-full md:w-[240px] rounded-2xl bg-slate-50 border-none font-black text-[10px] uppercase tracking-widest shadow-inner">
                  <SelectValue placeholder="FILTRAR POR ÁREA" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none bg-white shadow-2xl">
                  <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">TODAS LAS ÁREAS</SelectItem>
                  {activeAreas.map((a: any) => (
                    <SelectItem key={a.id} value={a.id} className="text-[10px] font-black uppercase tracking-widest">{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 p-2 rounded-[1.5rem] bg-slate-50 shadow-inner">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={cn(
                    "h-10 px-6 rounded-xl font-black uppercase tracking-widest text-[9px] gap-2 transition-all", 
                    viewMode === 'table' ? "bg-primary text-white" : "text-slate-400 hover:text-slate-600"
                  )}
                  onClick={() => setViewMode('table')}
                >
                  <TableIcon className="w-4 h-4" /> TABLA
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={cn(
                    "h-10 px-6 rounded-xl font-black uppercase tracking-widest text-[9px] gap-2 transition-all", 
                    viewMode === 'agenda' ? "bg-primary text-white" : "text-slate-400 hover:text-slate-600"
                  )}
                  onClick={() => setViewMode('agenda')}
                >
                  <LayoutList className="w-4 h-4" /> AGENDA
                </Button>
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
            ) : filteredPositions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200">
                  <Briefcase className="h-12 w-12" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sin cargos</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {positions.length === 0 ? 'Comienza creando la primera posición laboral.' : 'No se encontraron resultados.'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <MobileCardList
                  className="md:hidden"
                  items={filteredPositions.map(pos => ({
                    id: pos.id,
                    title: pos.name,
                    subtitle: pos.areas?.name || 'Área no asignada',
                    badge: <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-100 bg-slate-50 h-5 px-2 rounded-lg">{pos.code || 'S/C'}</Badge>,
                    fields: [
                      {
                        label: 'NIVEL',
                        value: <Badge variant="secondary" className="rounded-lg font-black text-[9px] bg-slate-100 text-slate-600 uppercase border-none px-3 h-6">N{pos.level}</Badge>,
                      },
                      {
                        label: 'PERFIL',
                        value: (
                          <Badge 
                            className={cn(
                              "h-6 px-3 rounded-lg border-none font-black text-[8px] uppercase tracking-widest",
                              hasProfile(pos.id) ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-300"
                            )}
                          >
                            {hasProfile(pos.id) ? 'COMPLETO' : 'PENDIENTE'}
                          </Badge>
                        ),
                      }
                    ],
                    actions: (
                      <div className="flex gap-2 w-full mt-2">
                        <Button variant="outline" className="flex-1 h-11 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100 hover:bg-slate-50" onClick={() => setProfileTarget({ id: pos.id, name: pos.name, area: pos.areas?.name })}>
                          <FileText className="w-3.5 h-3.5 mr-2" /> PERFIL
                        </Button>
                        <Button variant="outline" className="flex-1 h-11 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-100 hover:bg-primary hover:text-white transition-all" onClick={() => { setSelectedPosition(pos); setShowPositionForm(true); }}>
                          <Edit2 className="w-3.5 h-3.5 mr-2" /> EDITAR
                        </Button>
                      </div>
                    )
                  }))}
                />

                <div className="hidden md:block">
                  {viewMode === 'table' ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="hover:bg-transparent border-slate-100">
                            <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 pl-10 py-6">Información del Cargo</TableHead>
                            <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Código</TableHead>
                            <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Área</TableHead>
                            <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Nivel</TableHead>
                            <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Perfil</TableHead>
                            <TableHead className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Estado</TableHead>
                            <TableHead className="text-right font-black uppercase tracking-widest text-[10px] text-slate-400 pr-10">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPositions.map((pos: any) => (
                            <TableRow key={pos.id} className="group border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                              <TableCell className="py-6 pl-10">
                                <div className="flex items-center gap-5">
                                  <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary font-black text-sm group-hover:scale-110 transition-transform">
                                    {pos.name.charAt(0)}
                                  </div>
                                  <div className="space-y-1">
                                    <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{pos.name}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID: {pos.id.split('-')[0]}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <code className="bg-white px-3 py-1.5 rounded-xl text-[10px] font-mono font-black text-slate-600 uppercase border border-slate-100">{pos.code || '-'}</code>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">{pos.areas?.name || '-'}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="rounded-xl font-black text-[9px] bg-slate-100 text-slate-600 uppercase border-none px-4 h-8">N{pos.level}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge 
                                  className={cn(
                                    "h-8 px-4 rounded-xl border-none font-black text-[9px] uppercase tracking-widest",
                                    hasProfile(pos.id) ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-300"
                                  )}
                                >
                                  {hasProfile(pos.id) ? '✓ COMPLETO' : 'SIN PERFIL'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge 
                                  className={cn(
                                    "h-8 px-4 rounded-xl border-none font-black text-[9px] uppercase tracking-widest",
                                    pos.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                                  )}
                                >
                                  {pos.is_active ? 'ACTIVO' : 'INACTIVO'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right pr-10">
                                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all gap-3">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-12 w-12 rounded-2xl hover:bg-slate-50 transition-all active:scale-90 border border-transparent hover:border-slate-100"
                                    onClick={() => setProfileTarget({ id: pos.id, name: pos.name, area: pos.areas?.name })}
                                  >
                                    <FileText className="w-5 h-5 text-slate-400" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-12 w-12 rounded-2xl hover:bg-primary hover:text-white transition-all active:scale-90 border border-transparent hover:border-primary/20"
                                    onClick={() => { setSelectedPosition(pos); setShowPositionForm(true); }}
                                  >
                                    <Edit2 className="w-5 h-5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-10 bg-slate-50/30">
                      {filteredPositions.map((pos: any) => {
                        const prof = getProfile(pos.id);
                        return (
                          <Card
                            key={pos.id}
                            className="group relative rounded-[2.5rem] border border-slate-100 bg-white p-8 transition-all duration-500 cursor-pointer hover:scale-[1.02]"
                            onClick={() => setProfileTarget({ id: pos.id, name: pos.name, area: pos.areas?.name })}
                          >
                            <div className="space-y-8">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 space-y-2">
                                  <h3 className="text-base font-black tracking-tight text-slate-900 truncate uppercase">
                                    {pos.name}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    {pos.code && <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-100 bg-slate-50 h-6 px-3 rounded-lg">{pos.code}</Badge>}
                                    <Badge className="text-[9px] font-black uppercase rounded-lg h-6 bg-primary/10 text-primary border-none px-3">NIVEL {pos.level}</Badge>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                  <Badge 
                                    className={cn(
                                      "h-6 px-3 rounded-lg border-none font-black text-[8px] uppercase tracking-widest",
                                      pos.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                                    )}
                                  >
                                    {pos.is_active ? 'ACTIVO' : 'INACTIVO'}
                                  </Badge>
                                  <Button 
                                    size="icon" 
                                    variant="ghost"
                                    className="h-10 w-10 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-white transition-all duration-300 border border-transparent hover:border-primary/20"
                                    onClick={e => { e.stopPropagation(); setSelectedPosition(pos); setShowPositionForm(true); }}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
    
                              <div className="space-y-6">
                                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                                  <div className="h-2 w-2 rounded-full bg-primary" />
                                  <span className="truncate">{pos.areas?.name || 'SIN ÁREA ASIGNADA'}</span>
                                </div>
    
                                {prof ? (
                                  <div className="space-y-5">
                                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3 font-black uppercase tracking-tight px-1">
                                      {prof.purpose}
                                    </p>
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
                                      {prof.education_level && (
                                        <Badge variant="outline" className="text-[9px] font-black border-slate-100 bg-slate-50 text-slate-500 gap-2 rounded-xl h-8 px-4">
                                          <GraduationCap className="w-3.5 h-3.5 text-primary" />{prof.education_level}
                                        </Badge>
                                      )}
                                      {prof.experience && (
                                        <Badge variant="outline" className="text-[9px] font-black border-slate-100 bg-slate-50 text-slate-500 gap-2 rounded-xl h-8 px-4">
                                          <Shield className="w-3.5 h-3.5 text-primary" />{prof.experience}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center py-6 px-4 rounded-[2rem] bg-slate-50 border border-dashed border-slate-200 transition-colors group-hover:bg-white group-hover:border-primary/20">
                                    <FileText className="w-6 h-6 text-slate-200 mb-2 group-hover:text-primary/20 transition-colors" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 italic group-hover:text-primary/40 transition-colors">Perfil estratégico pendiente</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <PositionFormDialog 
        open={showPositionForm} 
        onOpenChange={setShowPositionForm} 
        position={selectedPosition} 
      />

      {profileTarget && (
        <PositionProfileDetailDialog
          open={!!profileTarget}
          onOpenChange={(open) => { if (!open) setProfileTarget(null); }}
          positionId={profileTarget.id}
          positionName={profileTarget.name}
          areaName={profileTarget.area}
        />
      )}
    </div>
  );
}
