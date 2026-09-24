import { useState, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceApp, WorkspaceOutlet, WorkspaceSession, WorkspaceTabBar } from './WorkspaceApp';
import { useWorkspaceActive } from './WorkspacePaneContext';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { confirmWorkspaceExit } from '@/lib/workspaceExit';
import { restoreWorkspace, workspaceStorageKey, type WorkspaceRoute } from './workspaceModel';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'admin' }, currentCompanyId: null, permissionsLoaded: true, isAdmin: true, isSuperAdmin: true, hasPermission: () => true }) }));
vi.mock('@/hooks/useRequisitionWorkflow', () => ({ useRequisitionWorkflowAccess: () => ({}) }));
vi.mock('@/components/auth/PermissionRoute', () => ({ PermissionRoute: ({ children }: { children: ReactNode }) => children }));
vi.mock('@/components/payroll/PayrollCutNotice', () => ({ PayrollCutNotice: () => null }));
vi.mock('@/components/layout/AppLayout', () => ({ AppLayout: ({ children }: { children: ReactNode }) => <><Menu /><WorkspaceTabBar />{children}</> }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn() } }));

function Menu() { return <nav><Link to="/empleados">Menú empleados</Link><Link to="/nomina">Menú nómina</Link><Link to="/empleados?registro=otro">Otro registro</Link>{Array.from({ length: 10 }, (_, i) => <Link key={i} to={`/extra-${i}`}>Extra {i}</Link>)}</nav>; }
function Editor() {
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const active = useWorkspaceActive();
  const [search, setSearch] = useSearchParams();
  return <div>
    <input aria-label="Filtro" value={filter} onChange={e => setFilter(e.target.value)} />
    <span data-testid="employee-location">{location.search}</span>
    <button onClick={() => setSearch({ filtro: 'activos' })}>Filtrar URL</button>
    <button onClick={() => navigate('/nomina')}>Navegar desde pantalla</button>
    <span data-testid="employee-active">{String(active)}</span>
    <button onClick={() => setOpen(true)}>Editar empleado</button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>Ficha</DialogTitle><DialogDescription>Editar datos</DialogDescription><EditorForm /></DialogContent></Dialog>
    <span>{search.get('registro')}</span>
  </div>;
}
function EditorForm() {
  const form = useForm({ defaultValues: { name: '' } });
  return <Form {...form}><form onSubmit={form.handleSubmit(data => form.reset(data))}>
    <input aria-label="Nombre" {...form.register('name')} />
    <input aria-label="Archivo" type="file" />
    <button type="submit">Guardar prueba</button>
  </form></Form>;
}
const routes: WorkspaceRoute[] = [
  { path: '/', title: 'Inicio', element: <p>Inicio de prueba</p> },
  { path: '/empleados', title: 'Empleados', element: <Editor /> },
  { path: '/nomina', title: 'Nómina', element: <p>Nómina de prueba</p> },
  ...Array.from({ length: 10 }, (_, i) => ({ path: `/extra-${i}`, title: `Extra ${i}`, element: <p>Extra {i}</p> })),
];
const key = workspaceStorageKey('user-a', 'company-a');
const allowAll = () => true;
function App({ allowed = allowAll, storageKey = key }: { allowed?: (route: WorkspaceRoute) => boolean; storageKey?: string }) {
  return <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><WorkspaceSession key={storageKey} storageKey={storageKey} routes={routes} allowed={allowed}><Menu /><WorkspaceTabBar /><WorkspaceOutlet /></WorkspaceSession></BrowserRouter>;
}
beforeEach(() => {
  sessionStorage.clear(); window.history.replaceState({ idx: 0 }, '', '/empleados');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
  vi.spyOn(window, 'confirm').mockReturnValue(false);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('workspace tabs', () => {
  it('keeps global administration available for users without a company yet', () => {
    render(<BrowserRouter><WorkspaceApp routes={routes}><WorkspaceOutlet /></WorkspaceApp></BrowserRouter>);
    expect(screen.getByRole('tab', { name: 'Empleados' })).toBeInTheDocument();
    expect(sessionStorage.getItem(workspaceStorageKey('admin', 'no-company'))).not.toBeNull();
  });
  it('preserves inputs, scroll and URL filters without duplicating a module', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Filtro'), { target: { value: 'Ana' } });
    const panel = screen.getByRole('tabpanel'); panel.scrollTop = 160;
    fireEvent.click(screen.getByText('Filtrar URL'));
    fireEvent.click(screen.getByText('Menú nómina'));
    expect(screen.getByTestId('employee-location')).toHaveTextContent('?filtro=activos');
    expect(screen.getByTestId('employee-active')).toHaveTextContent('false');
    fireEvent.click(screen.getByText('Menú empleados'));
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByLabelText('Filtro')).toHaveValue('Ana');
    expect(panel.scrollTop).toBe(160);
    expect(window.location.search).toBe('?filtro=activos');
  });
  it('suspends an open modal without remounting the form or losing file inputs', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Editar empleado'));
    const input = screen.getByLabelText('Nombre');
    const file = screen.getByLabelText('Archivo');
    fireEvent.change(input, { target: { value: 'Ana Pérez' } });
    fireEvent.change(file, { target: { files: [new File(['test'], 'documento.txt')] } });
    fireEvent.click(screen.getByText('Volver a pestañas'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.pointerEvents).not.toBe('none');
    fireEvent.click(screen.getByText('Menú nómina'));
    fireEvent.click(screen.getByText('Menú empleados'));
    await waitFor(() => expect(screen.getByLabelText('Nombre')).toBe(input));
    expect(input).toHaveValue('Ana Pérez');
    expect(screen.getByLabelText('Archivo')).toBe(file);
    expect((file as HTMLInputElement).files?.[0].name).toBe('documento.txt');
    fireEvent.click(screen.getByText('Guardar prueba'));
    await waitFor(() => expect(screen.queryByLabelText('Cambios sin guardar')).toBeNull());
  });
  it('protects dirty tabs on close, record replacement, logout and reload', async () => {
    render(<App />); fireEvent.click(screen.getByText('Editar empleado'));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Borrador' } });
    fireEvent.click(screen.getByText('Volver a pestañas'));
    fireEvent.click(screen.getByLabelText('Cerrar Empleados'));
    expect(screen.getByRole('tab', { name: /Empleados/ })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Otro registro'));
    expect(window.location.search).toBe('');
    expect(confirmWorkspaceExit('company')).toBe(false);
    expect(confirmWorkspaceExit('logout')).toBe(false);
    const before = new Event('beforeunload', { cancelable: true });
    expect(window.dispatchEvent(before)).toBe(false);
    vi.mocked(window.confirm).mockReturnValue(true);
    fireEvent.click(screen.getByLabelText('Cerrar Empleados'));
    expect(screen.getByText('Inicio de prueba')).toBeInTheDocument();
    await waitFor(() => expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(true));
  });
  it('restores only metadata, honors explicit URLs and isolates companies', () => {
    const first = render(<App />); fireEvent.click(screen.getByText('Menú nómina'));
    first.unmount(); window.history.replaceState({ idx: 0 }, '', '/');
    const second = render(<App />);
    expect(screen.getByRole('tab', { name: 'Nómina' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    second.unmount(); window.history.replaceState({ idx: 0 }, '', '/empleados?registro=directo');
    const third = render(<App />);
    expect(screen.getByTestId('employee-location')).toHaveTextContent('registro=directo');
    third.rerender(<App storageKey={workspaceStorageKey('user-a', 'company-b')} />);
    expect(screen.getAllByRole('tab')).toHaveLength(1);
  });
  it('limits tabs without evicting live work, supports keyboard and closes to the previous tab', () => {
    render(<App />);
    for (let i = 0; i < 10; i++) fireEvent.click(screen.getByRole('link', { name: `Extra ${i}` }));
    expect(screen.getAllByRole('tab')).toHaveLength(10);
    expect(window.location.pathname).toBe('/extra-8');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Extra 8' }), { key: 'Home' });
    expect(screen.getByRole('tab', { name: 'Empleados' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Extra 8' }));
    fireEvent.click(screen.getByLabelText('Cerrar Extra 8'));
    expect(screen.getByRole('tab', { name: 'Extra 7' })).toHaveAttribute('aria-selected', 'true');
  });
  it('restores exact locations with browser back and forward', async () => {
    render(<App />); fireEvent.click(screen.getByText('Filtrar URL')); fireEvent.click(screen.getByText('Menú nómina'));
    await act(async () => { window.history.back(); });
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Empleados' })).toHaveAttribute('aria-selected', 'true'));
    expect(window.location.search).toBe('?filtro=activos');
    await act(async () => { window.history.forward(); });
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Nómina' })).toHaveAttribute('aria-selected', 'true'));
  });
  it('cancels a back navigation that would replace a dirty record and keeps history usable', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Otro registro'));
    fireEvent.click(screen.getByText('Editar empleado'));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Pendiente' } });
    fireEvent.click(screen.getByText('Volver a pestañas'));
    await act(async () => { window.history.back(); });
    await waitFor(() => expect(window.confirm).toHaveBeenCalled());
    await waitFor(() => expect(window.location.search).toBe('?registro=otro'));
    fireEvent.click(screen.getByText('Continuar formulario'));
    expect(screen.getByLabelText('Nombre')).toHaveValue('Pendiente');
    fireEvent.click(screen.getByText('Volver a pestañas'));
    vi.mocked(window.confirm).mockReturnValue(true);
    await act(async () => { window.history.back(); });
    await waitFor(() => expect(window.location.search).toBe(''));
  });
  it('preserves state when resizing and offers no tab bar on mobile', () => {
    const listeners: Array<() => void> = [];
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: (_type, callback) => { listeners.push(callback as () => void); }, removeEventListener: vi.fn(), dispatchEvent: vi.fn() }));
    render(<App />);
    fireEvent.change(screen.getByLabelText('Filtro'), { target: { value: 'Persistente' } });
    act(() => { Object.defineProperty(window, 'innerWidth', { value: 390 }); listeners.forEach(listener => listener()); });
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByLabelText('Filtro')).toHaveValue('Persistente');
    act(() => { Object.defineProperty(window, 'innerWidth', { value: 1200 }); listeners.forEach(listener => listener()); });
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtro')).toHaveValue('Persistente');
  });
  it('does not unmount unsaved work when rejecting browser Back to a public route', async () => {
    window.history.replaceState({ idx: 0 }, '', '/auth');
    window.history.pushState({ idx: 1 }, '', '/empleados');
    render(<BrowserRouter><Routes><Route path="/auth" element={<p>Ingreso público</p>} /><Route path="/*" element={<WorkspaceSession storageKey={key} routes={routes} allowed={allowAll}><Menu /><WorkspaceTabBar /><WorkspaceOutlet /></WorkspaceSession>} /></Routes></BrowserRouter>);
    fireEvent.click(screen.getByText('Editar empleado'));
    const input = screen.getByLabelText('Nombre');
    fireEvent.change(input, { target: { value: 'Conservar' } });
    fireEvent.click(screen.getByText('Volver a pestañas'));
    await act(async () => { window.history.back(); });
    await waitFor(() => expect(window.confirm).toHaveBeenCalled());
    await waitFor(() => expect(window.location.pathname).toBe('/empleados'));
    expect(screen.queryByText('Ingreso público')).toBeNull();
    fireEvent.click(screen.getByText('Continuar formulario'));
    expect(screen.getByLabelText('Nombre')).toBe(input);
    expect(input).toHaveValue('Conservar');
  });
  it('removes revoked tabs and prevents a hidden page from navigating', () => {
    const view = render(<App />); fireEvent.click(screen.getByText('Menú nómina'));
    fireEvent.click(screen.getByText('Navegar desde pantalla'));
    expect(window.location.pathname).toBe('/nomina');
    view.rerender(<App allowed={route => route.path !== '/nomina'} />);
    expect(screen.queryByRole('tab', { name: 'Nómina' })).toBeNull();
    expect(window.location.pathname).toBe('/empleados');
  });
  it('keeps single-screen navigation on mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 390 });
    render(<App />); expect(screen.queryByRole('tablist')).toBeNull();
    fireEvent.click(screen.getByText('Menú nómina'));
    expect(screen.queryByLabelText('Filtro')).toBeNull();
    expect(screen.getByText('Nómina de prueba')).toBeInTheDocument();
  });
  it('ignores corrupt storage, external paths, unknown paths and denied routes', () => {
    sessionStorage.setItem(key, JSON.stringify({ version: 1, paths: ['//evil.com/empleados', '/auth', '/missing', '/nomina', '/empleados', '/empleados?x=1'], activeId: '/nomina' }));
    expect(restoreWorkspace(key, routes, route => route.path !== '/nomina').tabs.map(tab => tab.id)).toEqual(['/empleados']);
    sessionStorage.setItem(key, '{broken');
    expect(restoreWorkspace(key, routes, allowAll).tabs).toEqual([]);
  });
});
