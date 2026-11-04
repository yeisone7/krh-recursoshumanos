import { useState, useMemo } from 'react';
import { 
  Briefcase, Plus, Edit2, FileText, Search, 
  ArrowUpRight, Building2, LayoutGrid, TableIcon, GraduationCap, Shield, RefreshCw
} from 'lucide-react';

import { Card } from '@/components/ui/card';
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

type ViewMode = 'table' | 'cards';

const viewOptions = [
  { value: 'cards', label: 'Tarjetas', icon: LayoutGrid },
  { value: 'table', label: 'Tabla', icon: TableIcon },
] as const;

export default function CatalogosCargos() {
  const [showPositionForm, setShowPositionForm] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Omit<Position, 'areas'> | null>(null);
  const [profileTarget, setProfileTarget] = useState<{ id: string; name: string; area?: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Filters
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('all');

  const { data: positions = [], isLoading, isFetching, refetch } = usePositions();
  const { data: areas = [] } = useAreas();
  const { data: allProfiles = [] } = usePositionProfiles();

  const getProfile = (posId: string) => allProfiles.find(p => p.position_id === posId && p.is_current);
  const activeAreas = areas.filter(area => area.is_active);

  const filteredPositions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return positions.filter(pos => {
      const matchSearch = !term || [pos.name, pos.code, pos.areas?.name]
        .some(value => value?.toLowerCase().includes(term));
      const matchArea = filterArea === 'all' || pos.area_id === filterArea;
      return matchSearch && matchArea;
    });
  }, [positions, search, filterArea]);

  const profileCount = positions.filter(pos => getProfile(pos.id)).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-2 pb-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
            <Briefcase aria-hidden="true" className="size-4" />
            Catálogo de talento humano
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Cargos</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Consulta los cargos, sus niveles y perfiles laborales.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={() => refetch()} variant="outline" size="icon" aria-label="Actualizar cargos">
            <RefreshCw className={cn('size-4', isFetching && 'motion-safe:animate-spin')} />
          </Button>
          <Button onClick={() => { setSelectedPosition(null); setShowPositionForm(true); }} className="gap-2">
            <Plus className="size-4" />
            Nuevo cargo
          </Button>
        </div>
      </header>

      <dl aria-label="Resumen de cargos" className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4">
        {[
          { label: 'Total de cargos', value: positions.length },
          { label: 'Cargos activos', value: positions.filter(p => p.is_active).length },
          { label: 'Con perfil', value: profileCount },
          { label: 'Sin perfil', value: positions.length - profileCount },
        ].map(stat => (
          <div key={stat.label} className="flex flex-col gap-1 bg-card px-4 py-3.5 sm:px-5">
            <dt className="text-sm text-muted-foreground">{stat.label}</dt>
            <dd className="text-2xl font-semibold leading-tight tabular-nums tracking-tight text-foreground">
              {isLoading ? '—' : stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="cargos-directory" className="overflow-hidden rounded-xl border bg-card">
        <div className="space-y-4 border-b px-4 py-4 sm:px-5">
          <div>
            <h2 id="cargos-directory" className="text-lg font-semibold tracking-tight">Directorio de cargos</h2>
            {!isLoading && (
              <p role="status" className="mt-0.5 text-sm text-muted-foreground">
                {filteredPositions.length} de {positions.length} cargos
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-0 basis-full flex-1 sm:min-w-56 sm:basis-auto">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar cargos por nombre, código o área"
                placeholder="Buscar por nombre, código o área"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterArea} onValueChange={setFilterArea}>
              <SelectTrigger aria-label="Filtrar por área" className="w-full sm:w-48">
                <SelectValue placeholder="Todas las áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las áreas</SelectItem>
                {activeAreas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <div role="group" aria-label="Vista del directorio" className="hidden items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5 md:flex">
              {viewOptions.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant="ghost"
                  size="sm"
                  aria-pressed={viewMode === value}
                  className={cn('h-8 gap-1.5 rounded-md px-2.5', viewMode === value && 'bg-card text-primary shadow-sm')}
                  onClick={() => setViewMode(value)}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div>
            {isLoading ? (
              <div className="space-y-3 p-5">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredPositions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
                <Briefcase aria-hidden="true" className="mb-1 size-6 text-muted-foreground" />
                <h3 className="font-semibold">{positions.length === 0 ? 'Aún no hay cargos' : 'No se encontraron cargos'}</h3>
                <p className="text-sm text-muted-foreground">
                  {positions.length === 0 ? 'Usa Nuevo cargo para crear el primero.' : 'Prueba con otro nombre, código o área.'}
                </p>
              </div>
            ) : (
              <>
                {viewMode === 'table' && (
                  <div className="hidden md:block">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground pl-5">Cargo</TableHead>
                            <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground text-center">Código</TableHead>
                            <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground text-center">Área</TableHead>
                            <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground text-center">Nivel</TableHead>
                            <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground text-center">Perfil</TableHead>
                            <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground text-center">Estado</TableHead>
                            <TableHead className="text-right whitespace-nowrap text-xs font-semibold text-muted-foreground pr-5">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPositions.map(pos => (
                            <TableRow key={pos.id} className="last:border-0">
                              <TableCell className="min-w-44 py-3 pl-5 font-semibold">{pos.name}</TableCell>
                              <TableCell className="text-center">
                                <code className="whitespace-nowrap text-xs text-muted-foreground">{pos.code || '-'}</code>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="text-sm text-muted-foreground">{pos.areas?.name || '-'}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="whitespace-nowrap rounded font-medium">Nivel {pos.level}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge 
                                  className={cn(
                                    "whitespace-nowrap rounded border-none font-medium",
                                    getProfile(pos.id) ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {getProfile(pos.id) ? 'Con perfil' : 'Pendiente'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge 
                                  className={cn(
                                    "whitespace-nowrap rounded border-none font-medium",
                                    pos.is_active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {pos.is_active ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right pr-5">
                                <div className="flex justify-end gap-1">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="size-9"
                                    aria-label={'Abrir perfil de ' + pos.name}
                                    onClick={() => setProfileTarget({ id: pos.id, name: pos.name, area: pos.areas?.name })}
                                  >
                                    <FileText className="size-4 text-muted-foreground" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="size-9"
                                    aria-label={'Editar ' + pos.name}
                                    onClick={() => { setSelectedPosition(pos); setShowPositionForm(true); }}
                                  >
                                    <Edit2 className="size-4" />
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

                <div className={cn(
                  'grid grid-cols-1 gap-3 bg-muted/25 p-4 sm:grid-cols-2 xl:grid-cols-3',
                  viewMode === 'table' && 'md:hidden',
                )}>
                  {filteredPositions.map(pos => {
                    const profile = getProfile(pos.id);
                    return (
                      <Card key={pos.id} className="relative flex min-w-0 flex-col rounded-lg shadow-none transition-colors hover:border-primary/40 focus-within:border-primary/40">
                        <div className="flex flex-1 flex-col gap-3 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="rounded bg-primary/10 px-2 py-1 font-semibold text-primary">Nivel {pos.level}</span>
                              {pos.code && <span className="break-all font-mono text-muted-foreground">{pos.code}</span>}
                            </div>
                            <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', pos.is_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground')}>
                              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                              {pos.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>

                          <div>
                            <h3 className="break-words text-base font-semibold leading-snug tracking-tight text-foreground">{pos.name}</h3>
                            <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
                              <Building2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                              <span className="min-w-0 break-words">{pos.areas?.name || 'Sin área asignada'}</span>
                            </p>
                          </div>

                          {profile && (
                            <div className="space-y-2">
                              {profile.purpose && <p className="line-clamp-3 text-sm text-muted-foreground">{profile.purpose}</p>}
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {profile.education_level && <span className="inline-flex items-start gap-1.5"><GraduationCap aria-hidden="true" className="size-4 shrink-0" />{profile.education_level}</span>}
                                {profile.experience && <span className="inline-flex items-start gap-1.5"><Shield aria-hidden="true" className="size-4 shrink-0" />{profile.experience}</span>}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-x-2 border-t px-3 py-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn('gap-1.5 px-2 text-xs after:absolute after:inset-0 after:rounded-lg', profile ? 'text-primary' : 'text-muted-foreground')}
                            aria-label={profile ? 'Ver perfil de ' + pos.name : 'Abrir perfil pendiente de ' + pos.name}
                            onClick={() => setProfileTarget({ id: pos.id, name: pos.name, area: pos.areas?.name })}
                          >
                            <FileText aria-hidden="true" className="size-4" />
                            {profile ? 'Ver perfil' : 'Perfil pendiente'}
                            <ArrowUpRight aria-hidden="true" className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="relative z-10 gap-1.5 px-2 text-xs text-muted-foreground"
                            aria-label={'Editar ' + pos.name}
                            onClick={() => { setSelectedPosition(pos); setShowPositionForm(true); }}
                          >
                            <Edit2 aria-hidden="true" className="size-3.5" />
                            Editar
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
        </div>
      </section>

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
