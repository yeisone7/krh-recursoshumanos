import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';

const authState = vi.hoisted(() => ({
  user: { id: 'user-1' } as { id: string } | null,
  isLoading: false,
  mustChangePassword: false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

const renderRoutes = (allowForcedPasswordChange = false) => render(
  <MemoryRouter initialEntries={['/private']}>
    <Routes>
      <Route path="/" element={<div>Inicio</div>} />
      <Route path="/auth" element={<div>Página de ingreso</div>} />
      <Route path="/change-password-required" element={<div>Cambio obligatorio</div>} />
      <Route path="/private" element={(
        <ProtectedRoute allowForcedPasswordChange={allowForcedPasswordChange}>
          <div>Contenido privado</div>
        </ProtectedRoute>
      )} />
    </Routes>
  </MemoryRouter>,
);

describe('ProtectedRoute', () => {
  beforeEach(() => {
    authState.user = { id: 'user-1' };
    authState.isLoading = false;
    authState.mustChangePassword = false;
  });

  it('redirige al ingreso cuando no hay usuario', () => {
    authState.user = null;
    renderRoutes();
    expect(screen.getByText('Página de ingreso')).toBeInTheDocument();
  });

  it('bloquea el contenido cuando existe un cambio de contraseña pendiente', () => {
    authState.mustChangePassword = true;
    renderRoutes();
    expect(screen.getByText('Cambio obligatorio')).toBeInTheDocument();
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument();
  });

  it('permite mostrar exclusivamente la pantalla de cambio obligatorio', () => {
    authState.mustChangePassword = true;
    renderRoutes(true);
    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
  });

  it('rechaza la pantalla exclusiva cuando no existe un cambio pendiente', () => {
    renderRoutes(true);
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument();
  });
});
