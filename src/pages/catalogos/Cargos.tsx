import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, Plus, Edit2, FileText, Search, Filter, 
  TableIcon, LayoutList, X, GraduationCap, Shield, Users 
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
import { usePositionProfiles, useCurrentPositionProfile } from '@/hooks/usePositionProfiles';
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

  const { data: positions = [], isLoading } = usePositions();
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

  const hasActiveFilters = search || filterArea !== 'all' || filterProfile !== 'all' || filterStatus !== 'all';

  const clearFilters = () => {
    setSearch('');
    setFilterArea('all');
    setFilterProfile('all');
    setFilterStatus('all');
  };

  const profileCount = positions.filter((p: any) => hasProfile(p.id)).length;

  return (
    <div className="flex h-full min-h-0 flex-col space-y-6 sm:space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-8 sm:p-10 border border-border shadow-sm">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-md shadow-primary/10">
              <Briefcase className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight sm:text-4xl text-foreground uppercase leading-tight">
                Cargos / <span className="text-primary">Estructura</span>
              </h1>
              <p className="mt-2 text-sm font-medium text-muted-foreground sm:text-lg max-w-2xl leading-relaxed">
                Define y gestiona las posiciones jerárquicas y perfiles profesionales.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => { setSelectedPosition(null); setShowPositionForm(true); }}
            className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 transition-all hover:scale-105 shadow-lg shadow-primary/20"
          >
            <Plus className="h-3.5 w-3.5" /> 
            Nuevo Cargo
          </Button>
        </div>
        {/* Decorative elements */}
        
        
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Cargos', value: positions.length, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
          { label: 'Perfiles Config', value: profileCount, icon: FileText, color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
          { label: 'Cargos Activos', value: positions.filter(p => p.is_active).length, icon: Users, color: 'text-info', bg: 'bg-info/10', border: 'border-info/20' },
          { label: 'Sin Perfil', value: positions.length - profileCount, icon: Shield, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "relative overflow-hidden rounded-[2rem] border-2 bg-card p-6 transition-all duration-300 hover:shadow-sm",
              stat.border
            )}
          >
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
                <h2 className="text-3xl font-black tracking-tight text-foreground">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : stat.value}
                </h2>
              </div>
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shadow-inner", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Buscar por nombre, código o área..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-12 pl-11 rounded-2xl bg-card border-2 border-border/50 focus-visible:ring-primary/20 transition-all shadow-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="h-12 w-full lg:w-[180px] rounded-2xl bg-card border-2 border-border/50">
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border bg-card">
              <SelectItem value="all">Todas las áreas</SelectItem>
              {activeAreas.map((a: any) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-card border-2 border-border/50 ">
            <Button 
              size="sm" 
              variant={viewMode === 'table' ? 'default' : 'ghost'} 
              className={cn("h-9 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 transition-all", viewMode === 'table' ? "shadow-md" : "")}
              onClick={() => setViewMode('table')}
            >
              <TableIcon className="w-3.5 h-3.5" /> Tabla
            </Button>
            <Button 
              size="sm" 
              variant={viewMode === 'agenda' ? 'default' : 'ghost'} 
              className={cn("h-9 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 transition-all", viewMode === 'agenda' ? "shadow-md" : "")}
              onClick={() => setViewMode('agenda')}
            >
              <LayoutList className="w-3.5 h-3.5" /> Agenda
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-[2.5rem] border-2 border-border/50 bg-card p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-foreground uppercase">Cargos Disponibles</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">Gestión detallada de posiciones y perfiles asociados.</p>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : filteredPositions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-[2rem] border-border/50">
            {positions.length === 0 ? 'No hay cargos registrados. Crea el primero.' : 'No se encontraron cargos con los filtros aplicados.'}
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            <MobileCardList
              className="md:hidden"
              emptyMessage="No se encontraron cargos"
              items={filteredPositions.map((pos: any) => ({
                id: pos.id,
                title: pos.name,
                subtitle: pos.areas?.name || 'Sin área asignada',
                badge: (
                  <Badge
                    variant="outline"
                    className={cn("rounded-lg border-2", pos.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-card border-muted-foreground/10')}
                  >
                    {pos.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                ),
                fields: [
                  { label: 'Área', value: pos.areas?.name || '—', className: 'col-span-2 font-bold' },
                  { label: 'Código', value: pos.code || '—' },
                  { label: 'Nivel', value: pos.level || '—' },
                ],
                actions: (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl flex-1 border-2"
                      onClick={() => setProfileTarget({ id: pos.id, name: pos.name, area: pos.areas?.name })}
                    >
                      <FileText className="w-4 h-4 mr-2" /> Perfil
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl flex-1 border-2"
                      onClick={() => { setSelectedPosition(pos); setShowPositionForm(true); }}
                    >
                      <Edit2 className="w-4 h-4 mr-2" /> Editar
                    </Button>
                  </div>
                ),
              }))}
            />
            
            <div className="hidden md:block">
              {viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <Table className="min-w-[860px]">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b-2">
                        <TableHead className="font-black uppercase tracking-widest text-[10px]">Cargo</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px]">Código</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px]">Área</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px]">Nivel</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px]">Perfil</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px]">Estado</TableHead>
                        <TableHead className="text-right font-black uppercase tracking-widest text-[10px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPositions.map((pos: any) => (
                        <TableRow key={pos.id} className="group transition-colors hover:bg-primary/[0.02] border-b border-border/50">
                          <TableCell className="font-bold text-foreground py-4">{pos.name}</TableCell>
                          <TableCell className="text-sm font-medium text-muted-foreground">{pos.code || '-'}</TableCell>
                          <TableCell className="text-sm font-medium text-muted-foreground">{pos.areas?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="rounded-lg font-bold">N{pos.level}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={cn("rounded-lg border-2 transition-all", hasProfile(pos.id) ? 'bg-success/10 text-success border-success/20' : 'bg-card text-muted-foreground border-transparent')}
                            >
                              {hasProfile(pos.id) ? '✓ Configurado' : 'Sin perfil'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={cn("rounded-lg border-2", pos.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-card border-transparent')}
                            >
                              {pos.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                                onClick={() => setProfileTarget({ id: pos.id, name: pos.name, area: pos.areas?.name })}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                                onClick={() => { setSelectedPosition(pos); setShowPositionForm(true); }}
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
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {filteredPositions.map((pos: any, i: number) => {
                    const prof = getProfile(pos.id);
                    return (
                      <motion.div
                        key={pos.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group relative overflow-hidden rounded-[2rem] border-2 border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-md cursor-pointer"
                        onClick={() => setProfileTarget({ id: pos.id, name: pos.name, area: pos.areas?.name })}
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0">
                              <h3 className="text-lg font-black tracking-tight text-foreground truncate group-hover:text-primary transition-colors uppercase">
                                {pos.name}
                              </h3>
                              <div className="mt-1 flex items-center gap-2">
                                {pos.code && <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest">{pos.code}</Badge>}
                                <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest rounded-lg">Nivel {pos.level}</Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={cn("rounded-lg border-2 text-[10px] font-black uppercase tracking-widest", pos.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-card border-transparent')}
                              >
                                {pos.is_active ? 'Activo' : 'Inactivo'}
                              </Badge>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-8 w-8 rounded-xl"
                                onClick={e => { e.stopPropagation(); setSelectedPosition(pos); setShowPositionForm(true); }}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                              <Users className="w-3.5 h-3.5" />
                              <span className="uppercase tracking-widest text-[9px]">{pos.areas?.name || 'Área no asignada'}</span>
                            </div>

                            {prof ? (
                              <div className="space-y-3">
                                <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2 italic">
                                  "{prof.purpose}"
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {prof.education_level && (
                                    <Badge variant="outline" className="text-[10px] font-bold border-primary/20 gap-1 rounded-lg">
                                      <GraduationCap className="w-3 h-3" />{prof.education_level}
                                    </Badge>
                                  )}
                                  {prof.experience && (
                                    <Badge variant="outline" className="text-[10px] font-bold border-primary/20 gap-1 rounded-lg">
                                      <Shield className="w-3 h-3" />{prof.experience}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-card border border-dashed border-border/50">
                                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Perfil pendiente de configurar</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Interactive hover indicator */}
                        <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">
                          <FileText className="w-5 h-5 text-primary/40" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
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
