import type { ReactNode } from 'react';
import { matchPath, type Location } from 'react-router-dom';

export const MAX_WORKSPACE_TABS = 10;
export interface WorkspaceRoute {
  path: string;
  title: string;
  permissions?: string[];
  action?: string;
  element: ReactNode;
}
export interface WorkspaceTab {
  id: string;
  location: Location;
  revision: number;
}
export const workspaceStorageKey = (user: string, company: string) => `empatiq_workspace_v1:${user}:${company}`;
export const locationHref = (location: Pick<Location, 'pathname' | 'search' | 'hash'>) => location.pathname + location.search + location.hash;
export function findWorkspaceRoute(routes: WorkspaceRoute[], path: string) {
  return routes.find(route => matchPath({ path: route.path, end: true }, path));
}
export function parseWorkspaceLocation(href: unknown): Location | null {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return null;
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    return { pathname: pathname === '/alertas' ? '/notificaciones' : pathname, search: url.search, hash: url.hash, state: null, key: 'default' };
  } catch { return null; }
}
export function restoreWorkspace(key: string, routes: WorkspaceRoute[], allowed: (route: WorkspaceRoute) => boolean | undefined) {
  const tabs: WorkspaceTab[] = [];
  let activeId = '/';
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (value?.version !== 1 || !Array.isArray(value.paths)) return { tabs, activeId };
    for (const path of value.paths.slice(0, MAX_WORKSPACE_TABS)) {
      const location = parseWorkspaceLocation(path);
      const route = location && findWorkspaceRoute(routes, location.pathname);
      if (!location || !route || allowed(route) === false || tabs.some(tab => tab.id === location.pathname)) continue;
      tabs.push({ id: location.pathname, location, revision: 0 });
    }
    if (tabs.some(tab => tab.id === value.activeId)) activeId = value.activeId;
  } catch { /* Storage can be disabled or contain an older/invalid payload. */ }
  return { tabs, activeId };
}
export function persistWorkspace(key: string, tabs: WorkspaceTab[], activeId: string) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ version: 1, paths: tabs.map(tab => locationHref(tab.location)), activeId }));
  } catch { /* In-memory tabs remain usable without browser storage. */ }
}
