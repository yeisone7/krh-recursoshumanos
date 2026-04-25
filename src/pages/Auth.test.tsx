import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Auth from './Auth';

const authMocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    signIn: authMocks.signIn,
    signUp: authMocks.signUp,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock('./Dashboard', () => ({ default: () => null }));
vi.mock('@/components/layout/AppLayout', () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/dashboard/AlertsPanel', () => ({ AlertsPanel: () => null }));
vi.mock('@/components/dashboard/QuickActionsPanel', () => ({ QuickActionsPanel: () => null }));
vi.mock('@/hooks/useEmployeeKPIs', () => ({ useEmployeeKPIs: () => ({ data: null, isLoading: false }) }));
vi.mock('@/hooks/useDashboardAlerts', () => ({ useDashboardAlerts: () => ({ data: [] }) }));

const renderAuth = () => render(<Auth />, { wrapper: MemoryRouter });

describe('Auth login loading states', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    authMocks.signIn.mockReset();
    authMocks.signUp.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('oculta los skeletons por timeout aunque no cargue el logo ni avance requestAnimationFrame', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    const { container } = renderAuth();

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);

    await act(async () => {
      vi.advanceTimersByTime(1800);
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });
  });

  it('muestra aria-busy, spinner y texto accesible mientras autentica', async () => {
    authMocks.signIn.mockReturnValue(new Promise(() => undefined));

    renderAuth();

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: 'admin@krh.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: '123456' } });
    fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }).closest('form')!);

    const button = await screen.findByRole('button', { name: /ingresando/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('svg')).toHaveClass('animate-spin');
    expect(screen.getByRole('status')).toHaveTextContent('Autenticando credenciales, por favor espera.');
    expect(screen.getByLabelText(/correo electrónico/i)).toBeDisabled();
    expect(screen.getByLabelText(/contraseña/i)).toBeDisabled();
  });
});