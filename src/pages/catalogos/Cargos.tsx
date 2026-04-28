import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Plus, Edit2, FileText, Search, Filter, TableIcon, LayoutList, X, GraduationCap, Shield, Users } from 'lucide-react';

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
    <div className="space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <div className="shrink-0 rounded-lg bg-primary/10 p-2">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Cargos</h1>
              <p className="text-muted-foreground mt-1">Gestiona los cargos y perfiles de la organización</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              <Users className="w-3 h-3" />{positions.length} cargos
            </Badge>
            <Badge variant="outline" className="text-xs gap-1 bg-success/10 text-success border-success/20">
              <FileText className="w-3 h-3" />{profileCount} perfiles
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, código o área..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterArea} onValueChange={setFilterArea}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las áreas</SelectItem>
                {activeAreas.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterProfile} onValueChange={setFilterProfile}>
              <SelectTrigger className="w-full lg:w-[160px]">
                <SelectValue placeholder="Perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="with">Con perfil</SelectItem>
                <SelectItem value="without">Sin perfil</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{filteredPositions.length} de {positions.length} cargos</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={clearFilters}>
                <X className="w-3 h-3 mr-1" />Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Listado de Cargos</CardTitle>
            <CardDescription>Cargos y posiciones disponibles</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {/* View mode toggle */}
            <div className="flex w-full items-center rounded-md border sm:w-auto">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      variant={viewMode === 'table' ? 'default' : 'ghost'} 
                      className="h-8 flex-1 rounded-r-none px-2 sm:flex-none"
                      onClick={() => setViewMode('table')}
                    >
                      <TableIcon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Vista tabla</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      variant={viewMode === 'agenda' ? 'default' : 'ghost'} 
                      className="h-8 flex-1 rounded-l-none px-2 sm:flex-none"
                      onClick={() => setViewMode('agenda')}
                    >
                      <LayoutList className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Vista agenda</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Button onClick={() => { setSelectedPosition(null); setShowPositionForm(true); }} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />Nuevo Cargo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : filteredPositions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {positions.length === 0 ? 'No hay cargos registrados. Crea el primero.' : 'No se encontraron cargos con los filtros aplicados.'}
            </div>
          ) : (
            <>
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
                    className={pos.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-muted'}
                  >
                    {pos.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                ),
                fields: [
                  { label: 'Área', value: pos.areas?.name || '—', className: 'col-span-2' },
                  { label: 'Código', value: pos.code || '—' },
                  { label: 'Nivel', value: pos.level || '—' },
                  {
                    label: 'Perfil',
                    value: hasProfile(pos.id) ? 'Configurado' : 'Sin perfil',
                    className: 'col-span-2',
                  },
                ],
                actions: (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setProfileTarget({ id: pos.id, name: pos.name, area: pos.areas?.name })}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Perfil
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectedPosition(pos); setShowPositionForm(true); }}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  </>
                ),
              }))}
            />
            <div className="hidden md:block">
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions.map((pos: any) => (
                  <TableRow key={pos.id}>
                    <TableCell className="font-medium">{pos.name}</TableCell>
                    <TableCell>{pos.code || '-'}</TableCell>
                    <TableCell>{pos.areas?.name || '-'}</TableCell>
                    <TableCell>{pos.level}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={hasProfile(pos.id) ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}
                      >
                        {hasProfile(pos.id) ? 'Configurado' : 'Sin perfil'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={pos.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-muted'}
                      >
                        {pos.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => setProfileTarget({ id: pos.id, name: pos.name, area: pos.areas?.name })}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver/Crear Perfil</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => { setSelectedPosition(pos); setShowPositionForm(true); }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar Cargo</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            /* Agenda / List View */
            <div className="space-y-3">
              {filteredPositions.map((pos: any) => {
                const prof = getProfile(pos.id);
                return (
                  <motion.div
                    key={pos.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/30"
                    onClick={() => setProfileTarget({ id: pos.id, name: pos.name, area: pos.areas?.name })}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">{pos.name}</h3>
                          {pos.code && <Badge variant="outline" className="text-[10px] shrink-0">{pos.code}</Badge>}
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] shrink-0 ${pos.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-muted'}`}
                          >
                            {pos.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                        <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {pos.areas?.name && <span>📁 {pos.areas.name}</span>}
                          {pos.level && <span>📊 Nivel {pos.level}</span>}
                        </div>
                        {prof ? (
                          <div className="space-y-1">
                            <p className="text-sm text-foreground/80 line-clamp-2">{prof.purpose}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {prof.education_level && (
                                <Badge variant="secondary" className="text-[10px] gap-1">
                                  <GraduationCap className="w-3 h-3" />{prof.education_level}
                                </Badge>
                              )}
                              {prof.experience && (
                                <Badge variant="secondary" className="text-[10px] gap-1">
                                  <Shield className="w-3 h-3" />{prof.experience}
                                </Badge>
                              )}
                              {prof.reports_to && (
                                <Badge variant="outline" className="text-[10px]">Reporta a: {prof.reports_to}</Badge>
                              )}
                              {Array.isArray(prof.functions) && prof.functions.length > 0 && (
                                <Badge variant="outline" className="text-[10px]">{prof.functions.length} funciones</Badge>
                              )}
                              {Array.isArray(prof.skills) && prof.skills.length > 0 && (
                                <Badge variant="outline" className="text-[10px]">{prof.skills.length} competencias</Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Sin perfil configurado</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-1 sm:ml-3 sm:justify-end">
                        <Badge 
                          variant="outline" 
                          className={hasProfile(pos.id) ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}
                        >
                          {hasProfile(pos.id) ? '✓ Perfil' : 'Sin perfil'}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={e => { e.stopPropagation(); setSelectedPosition(pos); setShowPositionForm(true); }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
            </div>
            </>
          )}
        </CardContent>
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
