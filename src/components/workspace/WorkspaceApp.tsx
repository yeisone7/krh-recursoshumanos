import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Route, Routes, UNSAFE_NavigationContext, createPath, useLocation, type Location, type Navigator, type To } from 'react-router-dom';
import { X, PanelsTopLeft, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useRequisitionWorkflowAccess } from '@/hooks/useRequisitionWorkflow';
import { AppLayout } from '@/components/layout/AppLayout';
import { PermissionRoute } from '@/components/auth/PermissionRoute';
import { PayrollCutNotice } from '@/components/payroll/PayrollCutNotice';
import NotFound from '@/pages/NotFound';
import { WorkspacePaneContext } from './WorkspacePaneContext';
import { findWorkspaceRoute, locationHref, MAX_WORKSPACE_TABS, parseWorkspaceLocation, persistWorkspace, restoreWorkspace, workspaceStorageKey, type WorkspaceRoute, type WorkspaceTab } from './workspaceModel';

interface WorkspaceValue {
  tabs: WorkspaceTab[];
  activeId: string;
  routes: WorkspaceRoute[];
  desktop: boolean;
  dirty: Set<string>;
  suspended: Set<string>;
  allowed: (route: WorkspaceRoute) => boolean | undefined;
  activate: (id: string) => void;
  close: (id: string) => void;
  registerDirty: (tab: string, source: string, dirty: boolean) => void;
  registerResume: (tab: string, source: string, resume: (() => void) | null) => void;
  resume: (id: string) => void;
}
const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceApp({ routes, children }: { routes: WorkspaceRoute[]; children: ReactNode }) {
  const { user, currentCompanyId, isAdmin, isSuperAdmin, permissionsLoaded, hasPermission } = useAuth();
  const workflow = useRequisitionWorkflowAccess(!isAdmin && !hasPermission('requisiciones'));
  const allowed = useCallback((route: WorkspaceRoute): boolean | undefined => {
    if (route.path === '/super-admin') return isSuperAdmin;
    if (isAdmin || !route.permissions?.length) return true;
    if (!permissionsLoaded) return undefined;
    if (route.permissions.some(code => hasPermission(code, route.action || 'view'))) return true;
    if (route.path === '/requisiciones') return workflow.isLoading ? undefined : workflow.data === true;
    return false;
  }, [isAdmin, isSuperAdmin, permissionsLoaded, hasPermission, workflow.isLoading, workflow.data]);
  if (!user || !permissionsLoaded) return null;
  // Global administration/profile remain available before a company is created.
  const companyScope = currentCompanyId || 'no-company';
  return <WorkspaceSession key={`${user.id}:${companyScope}`} storageKey={workspaceStorageKey(user.id, companyScope)} routes={routes} allowed={allowed}><AppLayout>{children}</AppLayout></WorkspaceSession>;
}

export function WorkspaceSession({ routes, storageKey, allowed, children }: {
  routes: WorkspaceRoute[]; storageKey: string; allowed: WorkspaceValue['allowed']; children: ReactNode;
}) {
  const browserLocation = useLocation();
  const navigation = useContext(UNSAFE_NavigationContext);
  const [desktop, setDesktop] = useState(() => window.innerWidth >= 768);
  // Once enabled, keep the same panes mounted when resizing to mobile.
  const [enabled, setEnabled] = useState(desktop);
  const [initial] = useState(() => {
    const saved = desktop ? restoreWorkspace(storageKey, routes, allowed) : { tabs: [], activeId: '/' };
    const incoming = parseWorkspaceLocation(locationHref(browserLocation))!;
    const route = findWorkspaceRoute(routes, incoming.pathname);
    const restore = incoming.pathname === '/' && !incoming.search && !incoming.hash && saved.tabs.find(tab => tab.id === saved.activeId);
    const location = restore ? restore.location : { ...incoming, state: browserLocation.state, key: browserLocation.key };
    if (!saved.tabs.some(tab => tab.id === location.pathname) && route && allowed(route) !== false) {
      if (saved.tabs.length === MAX_WORKSPACE_TABS) saved.tabs.pop(); // Only restored metadata, never live work.
      saved.tabs.push({ id: location.pathname, location, revision: 0 });
    } else if (!restore) {
      saved.tabs = saved.tabs.map(tab => tab.id === location.pathname ? { ...tab, location } : tab);
    }
    return { tabs: saved.tabs, activeId: location.pathname, location };
  });
  const [tabs, setTabs] = useState(initial.tabs);
  const [activeId, setActiveId] = useState(initial.activeId);
  const dirtySources = useRef(new Map<string, Set<string>>());
  const resumeSources = useRef(new Map<string, Map<string, () => void>>());
  const [dirty, setDirty] = useState(new Set<string>());
  const [suspended, setSuspended] = useState(new Set<string>());
  const current = useRef({ tabs, activeId, enabled, desktop, allowed, browserLocation });
  current.current = { tabs, activeId, enabled, desktop, allowed, browserLocation };
  const restoringPop = useRef(false);
  const observedLocation = useRef(false);
  const historyIndex = useRef<number>(window.history.state?.idx ?? 0);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const resize = () => { const wide = window.innerWidth >= 768; setDesktop(wide); if (wide) setEnabled(true); };
    query.addEventListener('change', resize);
    return () => query.removeEventListener('change', resize);
  }, []);
  const hasDirty = useCallback((id?: string) => id ? !!dirtySources.current.get(id)?.size : [...dirtySources.current.values()].some(sources => sources.size > 0), []);
  const confirmLoss = useCallback((id?: string) => !hasDirty(id) || window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos y continuar?'), [hasDirty]);
  const registerDirty = useCallback((id: string, source: string, value: boolean) => {
    const sources = dirtySources.current.get(id) || new Set<string>();
    const before = sources.size > 0;
    if (value) sources.add(source); else sources.delete(source);
    if (sources.size) dirtySources.current.set(id, sources); else dirtySources.current.delete(id);
    if (before !== (sources.size > 0)) setDirty(new Set(dirtySources.current.keys()));
  }, []);
  const registerResume = useCallback((id: string, source: string, callback: (() => void) | null) => {
    const entries = resumeSources.current.get(id) || new Map<string, () => void>();
    if (callback) entries.set(source, callback); else entries.delete(source);
    if (entries.size) resumeSources.current.set(id, entries); else resumeSources.current.delete(id);
    setSuspended(new Set(resumeSources.current.keys()));
  }, []);
  const resume = useCallback((id: string) => resumeSources.current.get(id)?.forEach(callback => callback()), []);

  const prepare = useCallback((to: To, state: unknown, pop = false): Location | null => {
    const snapshot = current.current;
    const requested = parseWorkspaceLocation(typeof to === 'string' ? to : createPath(to));
    if (!requested) return null;
    requested.state = state;
    const route = findWorkspaceRoute(routes, requested.pathname);
    if (!route) {
      if (!confirmLoss()) return null;
      setActiveId(requested.pathname);
      return requested;
    }
    if (snapshot.allowed(route) === false) { toast.error('No tienes acceso a este módulo.'); return null; }
    const existing = snapshot.tabs.find(tab => tab.id === requested.pathname);
    // Menu links activate a tab's saved filters. Browser history restores its exact URL.
    const target = existing && !pop && !requested.search && !requested.hash ? existing.location : requested;
    const changed = existing && locationHref(existing.location) !== locationHref(target);
    const preservesDraft = !!(state && typeof state === 'object' && 'workspacePreserveDraft' in state && state.workspacePreserveDraft === true && requested.pathname === snapshot.activeId);
    if (changed && !preservesDraft && !confirmLoss(existing.id)) return null;
    if (!existing && snapshot.desktop && snapshot.tabs.length >= MAX_WORKSPACE_TABS) {
      toast.info('Puedes tener hasta 10 pestañas abiertas. Cierra una para abrir otro módulo.');
      return null;
    }
    if (!snapshot.desktop && !existing && requested.pathname !== snapshot.activeId && !confirmLoss(snapshot.activeId)) return null;
    const revision = existing ? existing.revision + (changed && !preservesDraft && hasDirty(existing.id) ? 1 : 0) : 0;
    const next = { id: requested.pathname, location: target, revision };
    const nextTabs = !snapshot.enabled ? [next] : existing ? snapshot.tabs.map(tab => tab.id === next.id ? next : tab) : !snapshot.desktop ? snapshot.tabs.map(tab => tab.id === snapshot.activeId ? next : tab) : [...snapshot.tabs, next];
    current.current = { ...snapshot, tabs: nextTabs, activeId: next.id };
    setTabs(nextTabs); setActiveId(next.id);
    return target;
  }, [routes, confirmLoss, hasDirty]);

  const navigator = useMemo<Navigator>(() => ({
    ...navigation.navigator,
    push(to, state, options) { const target = prepare(to, state); if (target) navigation.navigator.push(target, state, options); },
    replace(to, state, options) { const target = prepare(to, state); if (target) navigation.navigator.replace(target, state, options); },
  }), [navigation.navigator, prepare]);

  useLayoutEffect(() => {
    if (locationHref(initial.location) !== locationHref(browserLocation)) navigation.navigator.replace(initial.location, initial.location.state);
    // Initial restoration runs once per user/company, never on subsequent navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      const nextIndex = window.history.state?.idx ?? historyIndex.current;
      if (restoringPop.current) { restoringPop.current = false; historyIndex.current = nextIndex; return; }
      const target = prepare(window.location.pathname + window.location.search + window.location.hash, window.history.state?.usr, true);
      if (!target) {
        // Prevent BrowserRouter from unmounting this workspace (and its drafts)
        // while the browser rolls back a rejected navigation to a public route.
        event.stopImmediatePropagation();
        const delta = historyIndex.current - nextIndex;
        if (delta) { restoringPop.current = true; window.history.go(delta); }
        else navigation.navigator.replace(current.current.tabs.find(tab => tab.id === current.current.activeId)?.location || '/');
      } else historyIndex.current = nextIndex;
    };
    window.addEventListener('popstate', onPop, true);
    return () => window.removeEventListener('popstate', onPop, true);
  }, [prepare, navigation.navigator]);
  useLayoutEffect(() => {
    if (!observedLocation.current) { observedLocation.current = true; return; }
    if (restoringPop.current) return;
    historyIndex.current = window.history.state?.idx ?? historyIndex.current;
    const currentTab = current.current.tabs.find(tab => tab.id === current.current.activeId);
    const incoming = parseWorkspaceLocation(locationHref(browserLocation));
    // Handles redirects from guards/mobile restoration outside our navigator.
    if (incoming && currentTab && locationHref(currentTab.location) !== locationHref(incoming)) {
      const target = prepare(incoming, browserLocation.state, true);
      if (!target) navigation.navigator.replace(currentTab.location, currentTab.location.state);
    }
  }, [browserLocation, navigation.navigator, prepare]);
  useEffect(() => { if (enabled) persistWorkspace(storageKey, tabs, activeId); }, [storageKey, tabs, activeId, enabled]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (hasDirty()) { event.preventDefault(); event.returnValue = ''; } };
    const exit = (event: Event) => { if (!confirmLoss()) event.preventDefault(); };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('empatiq:workspace-exit', exit);
    return () => { window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('empatiq:workspace-exit', exit); };
  }, [hasDirty, confirmLoss]);
  useEffect(() => {
    const valid = tabs.filter(tab => { const route = findWorkspaceRoute(routes, tab.id); return route && allowed(route) !== false; });
    if (valid.length === tabs.length) return;
    setTabs(valid);
    if (!valid.some(tab => tab.id === activeId)) {
      const next = valid[valid.length - 1]?.location || parseWorkspaceLocation('/')!;
      if (!valid.length) setTabs([{ id: '/', location: next, revision: 0 }]);
      setActiveId(next.pathname); navigation.navigator.replace(next);
    }
  }, [allowed, routes, tabs, activeId, navigation.navigator]);
  const activate = (id: string) => {
    const tab = tabs.find(item => item.id === id);
    if (!tab) return;
    if (id !== activeId) { setActiveId(id); navigation.navigator.push(tab.location, tab.location.state); }
    resume(id);
  };
  const close = (id: string) => {
    if (!confirmLoss(id)) return;
    const index = tabs.findIndex(tab => tab.id === id);
    let remaining = tabs.filter(tab => tab.id !== id);
    if (!remaining.length) remaining = [{ id: '/', location: parseWorkspaceLocation('/')!, revision: (tabs[index]?.revision ?? 0) + 1 }];
    setTabs(remaining);
    if (id === activeId) {
      const next = remaining[Math.max(0, index - 1)] || remaining[0];
      setActiveId(next.id); navigation.navigator.push(next.location, next.location.state); resume(next.id);
    }
  };
  return <WorkspaceContext.Provider value={{ tabs, activeId, routes, desktop, dirty, suspended, allowed, activate, close, registerDirty, registerResume, resume }}>
    <UNSAFE_NavigationContext.Provider value={{ ...navigation, navigator }}>
      {children}
    </UNSAFE_NavigationContext.Provider>
  </WorkspaceContext.Provider>;
}

export function WorkspaceTabBar() {
  const workspace = useContext(WorkspaceContext);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => { list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }, [workspace?.activeId]);
  if (!workspace?.desktop) return null;
  return <div className="flex shrink-0 items-center border-b border-border bg-card px-2" data-workspace-tabs>
    <PanelsTopLeft aria-hidden="true" className="mx-2 h-4 w-4 shrink-0 text-muted-foreground" />
    <div ref={list} role="tablist" aria-label="Módulos abiertos" className="flex min-w-0 flex-1 gap-1 overflow-x-auto py-1.5" onKeyDown={event => {
      const buttons = Array.from(list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') || []);
      const index = buttons.indexOf(event.target as HTMLButtonElement);
      if (index < 0) return;
      const next = event.key === 'ArrowRight' ? (index + 1) % buttons.length : event.key === 'ArrowLeft' ? (index - 1 + buttons.length) % buttons.length : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
      if (next >= 0) { event.preventDefault(); buttons[next].focus(); buttons[next].click(); }
      if (event.key === 'Delete') { event.preventDefault(); workspace.close(workspace.tabs[index].id); }
    }}>
      {workspace.tabs.map(tab => {
        const title = findWorkspaceRoute(workspace.routes, tab.id)?.title || 'Módulo';
        const label = tab.id.startsWith('/empleados/') && tab.id.endsWith('/360') ? `${title} · ${tab.id.split('/')[2].slice(0, 8)}` : title;
        const active = tab.id === workspace.activeId;
        return <div key={tab.id} className={`flex shrink-0 items-center rounded-md border ${active ? 'border-primary/25 bg-primary/10 text-primary' : 'border-transparent text-muted-foreground hover:bg-muted'}`}>
          <button id={`workspace-tab-${tab.id}`} role="tab" aria-selected={active} aria-controls={`workspace-panel-${tab.id}`} tabIndex={active ? 0 : -1} className="flex h-8 max-w-56 items-center gap-2 rounded-l-md px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" title={label} onClick={() => workspace.activate(tab.id)}>
            <span className="truncate">{label}</span>{workspace.dirty.has(tab.id) && <span aria-label="Cambios sin guardar" className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />}
          </button>
          <button aria-label={`Cerrar ${label}`} className="mr-1 rounded p-1 hover:bg-foreground/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => workspace.close(tab.id)}><X className="h-3.5 w-3.5" /></button>
        </div>;
      })}
    </div>
    {workspace.suspended.has(workspace.activeId) && <button className="ml-2 flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10" onClick={() => workspace.resume(workspace.activeId)}><Play className="h-3 w-3" />Continuar formulario</button>}
  </div>;
}

export function WorkspaceOutlet() {
  const workspace = useContext(WorkspaceContext)!;
  return <>{workspace.tabs.map(tab => <WorkspacePane key={`${tab.id}:${tab.revision}`} tab={tab} workspace={workspace} />)}{!workspace.tabs.some(tab => tab.id === workspace.activeId) && <NotFound />}</>;
}
function WorkspacePane({ tab, workspace }: { tab: WorkspaceTab; workspace: WorkspaceValue }) {
  const navigation = useContext(UNSAFE_NavigationContext);
  const active = tab.id === workspace.activeId;
  const activeRef = useRef(active); activeRef.current = active;
  useLayoutEffect(() => {
    activeRef.current = active;
    return () => { activeRef.current = false; };
  }, [active]);
  const navigator = useMemo<Navigator>(() => ({ ...navigation.navigator,
    push: (...args) => { if (activeRef.current) navigation.navigator.push(...args); },
    replace: (...args) => { if (activeRef.current) navigation.navigator.replace(...args); },
    go: delta => { if (activeRef.current) navigation.navigator.go(delta); },
  }), [navigation.navigator]);
  const { registerDirty: trackDirty, registerResume: trackResume } = workspace;
  const registerDirty = useCallback((source: string, dirty: boolean) => trackDirty(tab.id, source, dirty), [trackDirty, tab.id]);
  const registerResume = useCallback((source: string, resume: (() => void) | null) => trackResume(tab.id, source, resume), [trackResume, tab.id]);
  const route = findWorkspaceRoute(workspace.routes, tab.id);
  if (!route || workspace.allowed(route) !== true) return null;
  return <WorkspacePaneContext.Provider value={{ id: tab.id, active, desktop: workspace.desktop, registerDirty, registerResume }}>
    <UNSAFE_NavigationContext.Provider value={{ ...navigation, navigator }}>
      <section id={`workspace-panel-${tab.id}`} role="tabpanel" aria-labelledby={`workspace-tab-${tab.id}`} hidden={!active} className="workspace-pane h-full min-h-0 overflow-y-auto p-2.5 sm:p-3 md:p-4 max-md:pb-24" style={{ display: active ? 'block' : 'none' }}>
        <Routes location={tab.location}><Route path={route.path} element={<>
          {['/jornadas', '/novedades', '/reloj-checador', '/prestamos', '/descuentos'].includes(tab.id) && <PayrollCutNotice />}
          {route.permissions?.length ? <PermissionRoute moduleCode={route.permissions[0]} anyModuleCodes={route.permissions} action={route.action}>{route.element}</PermissionRoute> : route.element}
        </>} /></Routes>
      </section>
    </UNSAFE_NavigationContext.Provider>
  </WorkspacePaneContext.Provider>;
}
