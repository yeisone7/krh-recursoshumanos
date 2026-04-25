import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Auth from './Auth';

const authMocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: authMocks.resetPasswordForEmail,
    },
  },
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
    authMocks.resetPasswordForEmail.mockReset();
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

    act(() => {
      vi.advanceTimersByTime(1800);
    });

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
  });

  it('muestra aria-busy, spinner y texto accesible mientras autentica', async () => {
    authMocks.signIn.mockReturnValue(new Promise(() => undefined));

    renderAuth();

    act(() => {
      vi.advanceTimersByTime(1800);
    });

    fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: 'admin@krh.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: '123456' } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }).closest('form')!);
    });

    const button = screen.getByRole('button', { name: /ingresando/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('svg')).toHaveClass('animate-spin');
    expect(screen.getByRole('status')).toHaveTextContent('Autenticando credenciales, por favor espera.');
    expect(screen.getByLabelText(/correo electrónico/i)).toBeDisabled();
    expect(screen.getByLabelText(/contraseña/i)).toBeDisabled();
  });

  it('envía enlace de recuperación con estado accesible durante la solicitud', async () => {
    authMocks.resetPasswordForEmail.mockReturnValue(new Promise(() => undefined));

    renderAuth();

    act(() => {
      vi.advanceTimersByTime(1800);
    });

    fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: 'persona@empresa.com' } });
    fireEvent.click(screen.getByRole('button', { name: /recuperar contraseña/i }));

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /enviar enlace/i }).closest('form')!);
    });

    const button = screen.getByRole('button', { name: /enviando enlace/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('svg')).toHaveClass('animate-spin');
    expect(screen.getByRole('status')).toHaveTextContent('Enviando enlace de recuperación, por favor espera.');
    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith('persona@empresa.com', {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  });
});