import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResetPassword from './ResetPassword';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  toast: vi.fn(),
  mustChangePassword: true,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { updateUser: mocks.updateUser },
    functions: { invoke: mocks.invoke },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    mustChangePassword: mocks.mustChangePassword,
    signOut: mocks.signOut,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

const renderPage = () => render(
  <MemoryRouter initialEntries={['/reset-password']}>
    <Routes>
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth" element={<div>Ingreso</div>} />
    </Routes>
  </MemoryRouter>,
);

describe('ResetPassword', () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
    mocks.updateUser.mockReset();
    mocks.signOut.mockReset();
    mocks.toast.mockReset();
    mocks.signOut.mockResolvedValue(undefined);
    mocks.mustChangePassword = true;
  });

  it('completa el cambio forzado cuando la recuperación pertenece a un usuario marcado', async () => {
    mocks.invoke.mockResolvedValue({ data: { success: true }, error: null });
    renderPage();

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'Recuperada123!' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Recuperada123!' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Actualizar contraseña' }));

    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('complete-forced-password-change', {
      body: { password: 'Recuperada123!' },
    }));
    expect(mocks.updateUser).not.toHaveBeenCalled();
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Ingreso')).toBeInTheDocument();
  });

  it('conserva el flujo normal de recuperación para usuarios no marcados', async () => {
    mocks.mustChangePassword = false;
    mocks.updateUser.mockResolvedValue({ error: null });
    renderPage();

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'Recuperada123!' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Recuperada123!' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Actualizar contraseña' }));

    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'Recuperada123!' }));
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
