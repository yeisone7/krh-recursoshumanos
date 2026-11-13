import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  ArrowDown, ArrowUp, BriefcaseBusiness, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp,
  Focus, ListTree, Maximize, Minimize, Minus, Network, Plus, Search, Users, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspaceActive } from '@/components/workspace/WorkspacePaneContext';
import { cn } from '@/lib/utils';
import { OrgChartNode, OrgPerson } from './OrgChartNode';
import { buildOrgTree, filterOrgTree, normalizeOrgSearch, type ChartEmployee, type ChartPosition, type PositionNode } from './orgChartTree';
import './orgChart.css';

type Area = { id: string; name: string };
type View = 'map' | 'list';
type BranchMode = 'default' | 'all' | 'none';
const emptyPositions: ChartPosition[] = [];
const emptyEmployees: ChartEmployee[] = [];
const emptyAreas: Area[] = [];
const minZoom = 0.35;
const maxZoom = 1.8;
const margin = 30;
const clampZoom = (value: number) => Math.max(minZoom, Math.min(maxZoom, value));

interface OrgChartProps {
  positions?: ChartPosition[];
  areas?: Area[];
  employees?: ChartEmployee[];
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
}

export function OrgChart({ positions = emptyPositions, areas = emptyAreas, employees = emptyEmployees, isLoading, hasError, onRetry }: OrgChartProps) {
  const active = useWorkspaceActive();
  const [search, setSearch] = useState('');
  const [areaId, setAreaId] = useState('all');
  const [view, setView] = useState<View>('map');
  const [mode, setMode] = useState<BranchMode>('default');
  const [overrides, setOverrides] = useState(new Map<string, boolean>());
  const [resultIndex, setResultIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [zoom, setZoom] = useState(() => window.matchMedia('(max-width: 639px)').matches ? 0.85 : 1);
  const [size, setSize] = useState({ width: 0, height: 0, treeWidth: 0, treeHeight: 0 });
  const shell = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const tree = useRef<HTMLDivElement>(null);
  const searchField = useRef<HTMLInputElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const lastNodeButton = useRef<HTMLElement | null>(null);
  const zoomAnchor = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const centerOnResize = useRef(true);
  const drag = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);

  const roots = useMemo(() => buildOrgTree(positions, areas, employees), [positions, areas, employees]);
  const query = normalizeOrgSearch(search);
  const filtered = Boolean(query) || areaId !== 'all';
  const data = useMemo(() => filterOrgTree(roots, query, areaId), [roots, query, areaId]);
  const resultIds = useMemo(() => [...data.matches], [data]);
  const currentResult = filtered ? resultIds[Math.min(resultIndex, resultIds.length - 1)] : undefined;
  const selected = useMemo(() => {
    const pending = [...roots];
    while (pending.length) {
      const node = pending.pop()!;
      if (node.id === selectedId) return node;
      pending.push(...node.children);
    }
    return null;
  }, [roots, selectedId]);

  useEffect(() => {
    if (!active) return;
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape' && full && !document.fullscreenElement) setFull(false);
      if (event.key !== '/' || (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable], [role="dialog"], [role="listbox"]'))) return;
      if (!searchField.current) return;
      event.preventDefault();
      searchField.current.focus();
    };
    const handleFullscreen = () => setFull(document.fullscreenElement === shell.current);
    document.addEventListener('keydown', handleShortcut);
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => {
      document.removeEventListener('keydown', handleShortcut);
      document.removeEventListener('fullscreenchange', handleFullscreen);
    };
  }, [active, full]);

  useEffect(() => {
    if (active) return;
    if (document.fullscreenElement === shell.current) void document.exitFullscreen().catch(() => {});
    setFull(false);
  }, [active]);

  useLayoutEffect(() => {
    if (view !== 'map' || !viewport.current || !tree.current) return;
    const map = viewport.current;
    const content = tree.current;
    const measure = () => {
      if (!map.clientWidth || !map.clientHeight) return;
      const next = { width: map.clientWidth, height: map.clientHeight, treeWidth: content.offsetWidth, treeHeight: content.offsetHeight };
      setSize(previous => previous.width === next.width && previous.height === next.height &&
        previous.treeWidth === next.treeWidth && previous.treeHeight === next.treeHeight ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(map);
    observer.observe(content);
    return () => observer.disconnect();
  }, [view, data.roots.length, isLoading, hasError]);

  const stageWidth = Math.max(size.width, size.treeWidth * zoom + margin * 2);
  const stageHeight = Math.max(size.height, size.treeHeight * zoom + margin + 72);
  const treeLeft = (stageWidth - size.treeWidth * zoom) / 2;

  useLayoutEffect(() => {
    const map = viewport.current;
    if (!map || !size.width) return;
    const anchor = zoomAnchor.current;
    if (anchor) {
      map.scrollLeft = treeLeft + anchor.x * zoom - anchor.left;
      map.scrollTop = margin + anchor.y * zoom - anchor.top;
      zoomAnchor.current = null;
    } else if (centerOnResize.current) {
      map.scrollLeft = (stageWidth - size.width) / 2;
      map.scrollTop = 0;
      centerOnResize.current = false;
    }
  }, [size, treeLeft, stageWidth, zoom, view, filtered, data.roots.length]);

  useLayoutEffect(() => {
    if (!currentResult) return;
    const node = [...(shell.current?.querySelectorAll<HTMLElement>('[data-org-map-node], [data-org-list-node]') ?? [])]
      .find(element => (element.dataset.orgMapNode ?? element.dataset.orgListNode) === currentResult);
    const scroller = node?.closest<HTMLElement>('.org-scroll');
    if (!node || !scroller) return;
    const bounds = node.getBoundingClientRect();
    const frame = scroller.getBoundingClientRect();
    const top = bounds.top < frame.top ? bounds.top - frame.top :
      bounds.bottom > frame.bottom - 60 ? bounds.bottom - frame.bottom + 60 : 0;
    scroller.scrollBy({
      left: view === 'map' ? bounds.left - frame.left + (bounds.width - frame.width) / 2 : 0,
      top,
    });
  }, [currentResult, view, size.treeWidth, size.treeHeight]);

  useEffect(() => {
    if (selected) detailHeading.current?.focus();
  }, [selected]);

  const changeZoom = useCallback((value: number, point?: { left: number; top: number }) => {
    const map = viewport.current;
    const next = clampZoom(value);
    if (!map || next === zoom) return;
    const { left, top } = point ?? { left: map.clientWidth / 2, top: map.clientHeight / 2 };
    zoomAnchor.current = { x: (map.scrollLeft + left - treeLeft) / zoom, y: (map.scrollTop + top - margin) / zoom, left, top };
    setZoom(next);
  }, [treeLeft, zoom]);

  useEffect(() => {
    const map = viewport.current;
    if (!map || view !== 'map') return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const bounds = map.getBoundingClientRect();
      changeZoom(zoom * Math.exp(-event.deltaY * 0.007), { left: event.clientX - bounds.left, top: event.clientY - bounds.top });
    };
    map.addEventListener('wheel', wheel, { passive: false });
    return () => map.removeEventListener('wheel', wheel);
  }, [changeZoom, zoom, view, data.roots.length, isLoading, hasError]);

  const fitMap = () => {
    const map = viewport.current;
    if (!map || !size.treeWidth) return;
    const next = clampZoom(Math.min(1, (size.width - margin * 2) / size.treeWidth, (size.height - margin - 72) / size.treeHeight));
    zoomAnchor.current = null;
    if (next === zoom) map.scrollTo({ left: (stageWidth - size.width) / 2, top: 0 });
    else {
      centerOnResize.current = true;
      setZoom(next);
    }
  };

  const toggleFullscreen = async () => {
    const element = shell.current;
    if (!element) return;
    if (document.fullscreenElement === element) {
      await document.exitFullscreen().catch(() => {});
    } else if (full) {
      setFull(false);
    } else {
      try {
        if (!element.requestFullscreen) throw new Error('Fullscreen unavailable');
        await element.requestFullscreen();
      } catch {
        setFull(true);
      }
    }
  };

  const updateSearch = (value: string) => {
    if (!normalizeOrgSearch(value)) centerOnResize.current = true;
    setSearch(value);
    setResultIndex(0);
    setOverrides(new Map());
  };
  const updateArea = (value: string) => {
    if (value === 'all' && !query) centerOnResize.current = true;
    setAreaId(value);
    setResultIndex(0);
    setOverrides(new Map());
  };
  const changeView = (next: View) => {
    if (next === view) return;
    centerOnResize.current = true;
    setView(next);
  };
  const setBranches = (next: BranchMode) => {
    setOverrides(new Map());
    setMode(next);
  };
  const isExpanded = (node: PositionNode, depth: number) =>
    overrides.get(node.id) ?? (mode === 'all' || (mode === 'default' && (depth === 0 || (filtered && data.ancestors.has(node.id)))));
  const toggleBranch = (node: PositionNode, depth: number) => {
    setOverrides(previous => new Map(previous).set(node.id, !isExpanded(node, depth)));
  };
  const moveResult = (direction: number) => {
    if (!resultIds.length) return;
    setBranches('default');
    setResultIndex(index => (index + direction + resultIds.length) % resultIds.length);
  };
  const selectNode = (id: string) => {
    lastNodeButton.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedId(id);
  };
  const closeDetail = () => {
    setSelectedId(null);
    lastNodeButton.current?.focus();
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || (event.target instanceof Element && event.target.closest('button'))) return;
    const map = event.currentTarget;
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: map.scrollLeft, top: map.scrollTop };
    map.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    event.currentTarget.scrollLeft = start.left + start.x - event.clientX;
    event.currentTarget.scrollTop = start.top + start.y - event.clientY;
  };

  const renderMapNode = (node: PositionNode, depth: number) => {
    const expanded = isExpanded(node, depth);
    return (
      <OrgChartNode key={node.id} position={node} root={depth === 0} expanded={expanded}
        onToggle={() => toggleBranch(node, depth)} onSelect={() => selectNode(node.id)}
        matched={filtered && data.matches.has(node.id)} current={currentResult === node.id}>
        {expanded && node.children.map(child => renderMapNode(child, depth + 1))}
      </OrgChartNode>
    );
  };

  const renderListNode = (node: PositionNode, depth: number): React.ReactNode => {
    const expanded = isExpanded(node, depth);
    return (
      <li key={node.id} className="min-w-0">
        <div data-org-list-node={node.id}
          className={cn('flex min-w-0 items-center gap-1.5 rounded-lg px-1 py-1 hover:bg-muted/75',
            filtered && data.matches.has(node.id) && 'bg-primary/5', currentResult === node.id && 'ring-1 ring-inset ring-primary/60')}
          style={{ marginInlineStart: Math.min(depth, 8) * 12 }}>
          {node.children.length ? (
            <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-expanded={expanded}
              aria-label={`${expanded ? 'Contraer' : 'Expandir'} subordinados de ${node.name}`} onClick={() => toggleBranch(node, depth)}>
              {expanded ? <ChevronDown /> : <ChevronRight />}
            </Button>
          ) : <span className="size-8 shrink-0" />}
          <button type="button" onClick={() => selectNode(node.id)} className="grid min-w-0 flex-1 gap-1 rounded-md px-1 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-center">
            <span className="min-w-0 break-words text-sm font-semibold">{node.name}</span>
            <span className="min-w-0 break-words text-xs text-muted-foreground">{node.areaName || 'Sin área'}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{node.employees.length ? `${node.employees.length} ${node.employees.length === 1 ? 'persona' : 'personas'}` : 'Sin asignación'}</span>
          </button>
        </div>
        {expanded && node.children.length > 0 && <ul>{node.children.map(child => renderListNode(child, depth + 1))}</ul>}
      </li>
    );
  };

  const ready = !isLoading && !hasError && data.roots.length > 0;
  const areaAvailable = areas.some(area => area.id === areaId);
  useEffect(() => {
    if (areaId !== 'all' && !areaAvailable) setAreaId('all');
  }, [areaAvailable, areaId]);

  return (
    <div ref={shell} className={cn('relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background shadow-sm',
      full && 'fixed inset-0 z-[70] h-[100dvh] w-full rounded-none border-0')}>
      <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5 bg-neutral-500 p-2 sm:grid-cols-[minmax(10rem,1fr)_minmax(9rem,13rem)_auto_auto] sm:gap-2">
        <div className="relative col-span-3 min-w-0 sm:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input ref={searchField} value={search} onChange={event => updateSearch(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && resultIds.length && filtered) moveResult(event.shiftKey ? -1 : 1);
              if (event.key === 'Escape' && search) { event.stopPropagation(); updateSearch(''); }
            }}
            placeholder="Buscar cargo o persona…" aria-label="Buscar cargo o persona" className="h-9 rounded-lg bg-background pl-9 pr-9" />
          {search ? (
            <Button type="button" variant="ghost" size="icon" aria-label="Limpiar búsqueda" className="absolute right-0.5 top-0.5 size-8" onClick={() => { updateSearch(''); searchField.current?.focus(); }}>
              <X className="size-4" />
            </Button>
          ) : <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 text-[11px] text-muted-foreground sm:block">/</kbd>}
        </div>
        <Select value={areaId} onValueChange={updateArea}>
          <SelectTrigger aria-label="Filtrar por área" className="h-9 min-w-0 rounded-lg bg-background px-2.5"><SelectValue /></SelectTrigger>
          <SelectContent position="popper" portalContainer={full ? shell.current ?? undefined : undefined}>
            <SelectItem value="all">Todas las áreas</SelectItem>
            {areas.map(area => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div role="group" aria-label="Vista del organigrama" className="inline-flex h-9 items-center gap-0.5 rounded-lg border border-white/20 bg-neutral-600 p-0.5">
          {([{ id: 'map', title: 'Mapa', icon: Network }, { id: 'list', title: 'Lista', icon: ListTree }] as const).map(({ id, title, icon: Icon }) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => changeView(id)}
              className={cn('flex h-full items-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-2.5',
                view === id ? 'bg-white text-neutral-800' : 'text-white hover:bg-white/10')}>
              <Icon className="hidden size-3.5 min-[400px]:block" aria-hidden="true" />{title}
            </button>
          ))}
        </div>
        <Button type="button" variant="outline" size="icon" className="size-9 rounded-lg bg-background" aria-label={full ? 'Salir de pantalla completa' : 'Pantalla completa'}
          title={full ? 'Salir de pantalla completa' : 'Pantalla completa'} onClick={() => void toggleFullscreen()}>
          {full ? <Minimize /> : <Maximize />}
        </Button>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 border-b bg-card px-2.5 py-1">
        <div className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span role="status" className="tabular-nums text-muted-foreground">
            {isLoading ? 'Cargando organigrama…' : !hasError && <><strong className="text-foreground">{data.matches.size}</strong> {data.matches.size === 1 ? 'cargo' : 'cargos'} <span aria-hidden="true">·</span> <strong className="text-foreground">{data.assigned}</strong> {data.assigned === 1 ? 'persona asignada' : 'personas asignadas'}</>}
          </span>
          {filtered && ready && (
            <div className="flex items-center rounded-md border px-0.5">
              <Button type="button" variant="ghost" size="icon" className="size-6" aria-label="Resultado anterior" onClick={() => moveResult(-1)}><ArrowUp className="size-3" /></Button>
              <span className="px-1 text-xs tabular-nums">{Math.min(resultIndex + 1, resultIds.length)}/{resultIds.length}</span>
              <Button type="button" variant="ghost" size="icon" className="size-6" aria-label="Siguiente resultado" onClick={() => moveResult(1)}><ArrowDown className="size-3" /></Button>
            </div>
          )}
        </div>
        {ready && (
          <div className="flex items-center gap-0.5">
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={() => setBranches('all')}><ChevronsDown className="size-3.5" />Expandir</Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={() => setBranches('none')}><ChevronsUp className="size-3.5" />Contraer</Button>
          </div>
        )}
      </div>

      {!ready ? (
        <div className="org-viewport grid min-h-0 flex-1 place-items-center overflow-auto p-4 text-center">
          {isLoading ? <Skeleton className="h-28 w-52 rounded-xl bg-card" /> : (
            <div className="w-full max-w-sm rounded-xl border bg-card p-5 shadow-sm">
              <BriefcaseBusiness className="mx-auto mb-2 size-5 text-muted-foreground" aria-hidden="true" />
              <p className="font-semibold">{hasError ? 'No se pudo cargar el organigrama' : filtered ? 'No encontramos cargos con esos filtros' : 'No hay cargos configurados'}</p>
              {hasError ? <Button className="mt-3" size="sm" onClick={onRetry}>Volver a intentar</Button> : filtered ? (
                <Button className="mt-3" size="sm" variant="outline" onClick={() => { updateSearch(''); updateArea('all'); }}>Limpiar filtros</Button>
              ) : <p className="mt-1 text-sm text-muted-foreground">Configura los cargos y sus responsables en Configuración.</p>}
            </div>
          )}
        </div>
      ) : view === 'map' ? (
        <div className="relative min-h-0 flex-1">
          <div ref={viewport} tabIndex={0} role="region" aria-label="Mapa jerárquico. Desplázate con las flechas o arrastra el fondo."
            className="org-scroll org-viewport absolute inset-0 cursor-grab overflow-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:cursor-grabbing"
            onPointerDown={startDrag} onPointerMove={moveDrag} onLostPointerCapture={() => { drag.current = null; }}
            onKeyDown={event => {
              if (event.target !== event.currentTarget) return;
              if (event.key === '+' || event.key === '=') changeZoom(zoom + 0.1);
              else if (event.key === '-') changeZoom(zoom - 0.1);
              else if (event.key === '0') fitMap();
              else if (event.key === 'ArrowLeft') event.currentTarget.scrollBy({ left: -80 });
              else if (event.key === 'ArrowRight') event.currentTarget.scrollBy({ left: 80 });
              else if (event.key === 'ArrowUp') event.currentTarget.scrollBy({ top: -80 });
              else if (event.key === 'ArrowDown') event.currentTarget.scrollBy({ top: 80 });
              else return;
              event.preventDefault();
            }}>
            <div className="relative select-none overflow-hidden" style={{ width: stageWidth || '100%', height: stageHeight || '100%' }}>
              <div ref={tree} className="absolute w-max origin-top-left" style={{ top: margin, left: treeLeft, transform: `scale(${zoom})` }}>
                <ul className="org-forest" aria-label="Cargos y subordinados">{data.roots.map(node => renderMapNode(node, 0))}</ul>
              </div>
            </div>
          </div>
          <div role="group" aria-label="Controles del mapa" className="absolute bottom-4 left-3 flex items-center gap-0.5 rounded-lg border bg-card p-0.5 shadow-md">
            <Button type="button" size="icon" variant="ghost" className="size-9" aria-label="Alejar" title="Alejar" disabled={zoom <= minZoom} onClick={() => changeZoom(zoom - 0.1)}><Minus /></Button>
            <output aria-label="Nivel de zoom" className="min-w-11 text-center text-xs font-semibold tabular-nums">{Math.round(zoom * 100)}%</output>
            <Button type="button" size="icon" variant="ghost" className="size-9" aria-label="Acercar" title="Acercar" disabled={zoom >= maxZoom} onClick={() => changeZoom(zoom + 0.1)}><Plus /></Button>
            <Button type="button" size="icon" variant="ghost" className="size-9 border-l" aria-label="Ajustar mapa a la vista" title="Ajustar mapa a la vista" onClick={fitMap}><Focus /></Button>
          </div>
        </div>
      ) : (
        <div className="org-scroll min-h-0 flex-1 overflow-auto overscroll-contain p-2 sm:p-3">
          <ul className="divide-y" aria-label="Lista jerárquica de cargos">{data.roots.map(node => renderListNode(node, 0))}</ul>
        </div>
      )}

      {selected && (
        <section aria-label="Detalle del cargo" onKeyDown={event => {
          if (event.key === 'Escape') { event.stopPropagation(); closeDetail(); }
        }} className="absolute inset-x-2 bottom-2 z-20 flex max-h-[65%] flex-col rounded-xl border bg-card shadow-xl sm:inset-x-auto sm:bottom-3 sm:right-3 sm:w-80">
          <div className="flex shrink-0 items-start justify-between gap-2 border-b px-3 py-2.5">
            <div className="min-w-0">
              <h2 ref={detailHeading} tabIndex={-1} className="break-words font-semibold leading-tight outline-none">{selected.name}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{[selected.areaName, selected.code].filter(Boolean).join(' · ') || 'Sin área'}</p>
            </div>
            <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Cerrar detalle del cargo" onClick={closeDetail}><X /></Button>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-3 py-2.5">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Users className="size-3.5" />Personas asignadas ({selected.employees.length})</h3>
            {selected.employees.length ? (
              <ul className="space-y-2 text-sm">{selected.employees.map(person => <li key={person.id}><OrgPerson person={person} /></li>)}</ul>
            ) : <p className="text-sm text-muted-foreground">Sin asignación</p>}
          </div>
        </section>
      )}
    </div>
  );
}
