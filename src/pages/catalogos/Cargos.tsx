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

import { useState, useMemo } from 'react';
import { 
  Briefcase, Plus, Edit2, FileText, Search, 
  TableIcon, LayoutList, GraduationCap, Shield, Users,
  Settings2
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

  const profileCount = positions.filter((p: any) => hasProfile(p.id)).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header - Flat Style */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Gestión de Posiciones</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
              Cargos / Estructura
            </h1>
            <p className="text-slate-500 text-sm max-w-xl font-medium">
              Define y gestiona las posiciones jerárquicas y perfiles profesionales de la compañía.
            </p>
          </div>
          
          <Button 
            onClick={() => { setSelectedPosition(null); setShowPositionForm(true); }}
            className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs transition-all shadow-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            NUEVO CARGO
          </Button>
        </div>
      </div>

      {/* Stats Summary - Flat Style */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Cargos', value: positions.length, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Perfiles Config', value: profileCount, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Cargos Activos', value: positions.filter(p => p.is_active).length, icon: Users, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'Sin Perfil', value: positions.length - profileCount, icon: Shield, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat) => (
          <Card key={stat.label} className="border border-slate-200 shadow-none bg-white rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                    {isLoading ? <Skeleton className="h-8 w-12" /> : stat.value}
                  </p>
                </div>
                <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center shrink-0", stat.bg, stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filters Bar - Flat Style */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, código o área..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 pl-10 bg-slate-50 border-slate-200 rounded-lg focus:bg-white transition-all text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="h-10 w-full lg:w-[200px] rounded-lg bg-white border-slate-200 text-sm">
              <SelectValue placeholder="Filtrar por Área" />
            </SelectTrigger>
            <SelectContent className="rounded-lg border-slate-200 bg-white">
              <SelectItem value="all">Todas las áreas</SelectItem>
              {activeAreas.map((a: any) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200">
            <Button 
              size="sm" 
              variant={viewMode === 'table' ? 'default' : 'ghost'} 
              className={cn(
                "h-8 px-3 rounded-md font-bold uppercase tracking-widest text-[9px] gap-2 transition-all shadow-none", 
                viewMode === 'table' ? "bg-white text-blue-600 shadow-sm border-slate-200" : "text-slate-500 hover:text-slate-700"
              )}
              onClick={() => setViewMode('table')}
            >
              <TableIcon className="w-3.5 h-3.5" /> Tabla
            </Button>
            <Button 
              size="sm" 
              variant={viewMode === 'agenda' ? 'default' : 'ghost'} 
              className={cn(
                "h-8 px-3 rounded-md font-bold uppercase tracking-widest text-[9px] gap-2 transition-all shadow-none", 
                viewMode === 'agenda' ? "bg-white text-blue-600 shadow-sm border-slate-200" : "text-slate-500 hover:text-slate-700"
              )}
              onClick={() => setViewMode('agenda')}
            >
              <LayoutList className="w-3.5 h-3.5" /> Agenda
            </Button>
          </div>
        </div>
      </div>

      <Card className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-none">
        <div className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 w-full bg-slate-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredPositions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="h-16 w-16 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                <Briefcase className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">No hay cargos registrados</h3>
                <p className="text-slate-500 text-sm font-medium">
                  {positions.length === 0 ? 'Comienza creando la primera posición laboral.' : 'No se encontraron cargos con los filtros aplicados.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="min-h-0">
              {viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="hover:bg-transparent border-slate-200">
                        <TableHead className="font-bold uppercase tracking-widest text-[10px] text-slate-500 pl-6 py-4">Información del Cargo</TableHead>
                        <TableHead className="font-bold uppercase tracking-widest text-[10px] text-slate-500 text-center">Código</TableHead>
                        <TableHead className="font-bold uppercase tracking-widest text-[10px] text-slate-500 text-center">Área</TableHead>
                        <TableHead className="font-bold uppercase tracking-widest text-[10px] text-slate-500 text-center">Nivel</TableHead>
                        <TableHead className="font-bold uppercase tracking-widest text-[10px] text-slate-500 text-center">Perfil</TableHead>
                        <TableHead className="font-bold uppercase tracking-widest text-[10px] text-slate-500 text-center">Estado</TableHead>
                        <TableHead className="text-right font-bold uppercase tracking-widest text-[10px] text-slate-500 pr-6">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPositions.map((pos: any) => (
                        <TableRow key={pos.id} className="group border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="py-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 font-black text-sm">
                                {pos.name.charAt(0)}
                              </div>
                              <span className="font-bold text-slate-900 text-sm">{pos.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <code className="bg-slate-100 px-2.5 py-1 rounded text-[10px] font-mono font-bold text-slate-600 uppercase border border-slate-200">{pos.code || '-'}</code>
                          </TableCell>
                          <TableCell className="text-center text-xs font-medium text-slate-500">{pos.areas?.name || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="rounded-md font-bold text-[10px] bg-slate-100 text-slate-600 uppercase border-none">N{pos.level}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              className={cn(
                                "h-6 px-2.5 rounded-md border-none font-bold text-[10px] uppercase tracking-wider",
                                hasProfile(pos.id) ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-300"
                              )}
                            >
                              {hasProfile(pos.id) ? '✓ Configurado' : 'Sin perfil'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              className={cn(
                                "h-6 px-2.5 rounded-md border-none font-bold text-[10px] uppercase tracking-wider",
                                pos.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                              )}
                            >
                              {pos.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                onClick={() => setProfileTarget({ id: pos.id, name: pos.name, area: pos.areas?.name })}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                  {filteredPositions.map((pos: any) => {
                    const prof = getProfile(pos.id);
                    return (
                      <Card
                        key={pos.id}
                        className="group relative rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:bg-slate-50/50 cursor-pointer shadow-none"
                        onClick={() => setProfileTarget({ id: pos.id, name: pos.name, area: pos.areas?.name })}
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0">
                              <h3 className="text-base font-bold tracking-tight text-slate-900 truncate uppercase">
                                {pos.name}
                              </h3>
                              <div className="mt-1 flex items-center gap-2">
                                {pos.code && <Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-200 h-5 px-1.5">{pos.code}</Badge>}
                                <Badge className="text-[9px] font-bold uppercase rounded-md h-5 bg-slate-100 text-slate-500 border-none px-1.5">Nivel {pos.level}</Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge 
                                className={cn(
                                  "h-5 px-2 rounded-md border-none font-bold text-[9px] uppercase tracking-wider",
                                  pos.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                                )}
                              >
                                {pos.is_active ? 'Activo' : 'Inactivo'}
                              </Badge>
                              <Button 
                                size="icon" 
                                variant="ghost"
                                className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100"
                                onClick={e => { e.stopPropagation(); setSelectedPosition(pos); setShowPositionForm(true); }}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                              <Users className="w-3.5 h-3.5 text-blue-500" />
                              <span>{pos.areas?.name || 'Área no asignada'}</span>
                            </div>

                            {prof ? (
                              <div className="space-y-2">
                                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 font-medium">
                                  {prof.purpose}
                                </p>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {prof.education_level && (
                                    <Badge variant="outline" className="text-[9px] font-bold border-slate-200 bg-white gap-1 rounded-md h-5 px-2">
                                      <GraduationCap className="w-3 h-3 text-blue-500" />{prof.education_level}
                                    </Badge>
                                  )}
                                  {prof.experience && (
                                    <Badge variant="outline" className="text-[9px] font-bold border-slate-200 bg-white gap-1 rounded-md h-5 px-2">
                                      <Shield className="w-3 h-3 text-blue-500" />{prof.experience}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-slate-50 border border-dashed border-slate-200">
                                <FileText className="w-3.5 h-3.5 text-slate-300" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">Perfil pendiente de configurar</span>
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
          )}
        </div>
      </Card>

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
