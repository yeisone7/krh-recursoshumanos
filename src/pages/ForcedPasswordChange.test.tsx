import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForcedPasswordChange from './ForcedPasswordChange';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  signOut: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signOut: mocks.signOut }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

const renderPage = () => render(
  <MemoryRouter initialEntries={['/change-password-required']}>
    <Routes>
      <Route path="/change-password-required" element={<ForcedPasswordChange />} />
      <Route path="/auth" element={<div>Ingreso</div>} />
    </Routes>
  </MemoryRouter>,
);

describe('ForcedPasswordChange', () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
    mocks.signOut.mockReset();
    mocks.toast.mockReset();
    mocks.signOut.mockResolvedValue(undefined);
  });

  it('exige al menos ocho caracteres', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'corta12' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'corta12' } });
    fireEvent.blur(screen.getByLabelText('Nueva contraseña'));

    expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar contraseña definitiva' })).toBeDisabled();
  });

  it('completa el cambio, cierra la sesión y vuelve al ingreso', async () => {
    mocks.invoke.mockResolvedValue({ data: { success: true }, error: null });
    renderPage();

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'NuevaClave123!' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'NuevaClave123!' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar contraseña definitiva' }));

    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('complete-forced-password-change', {
      body: { password: 'NuevaClave123!' },
    }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Ingreso')).toBeInTheDocument();
  });
});
