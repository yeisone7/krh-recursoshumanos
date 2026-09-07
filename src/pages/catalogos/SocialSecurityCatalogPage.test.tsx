import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SocialSecurityCatalogPage } from './SocialSecurityCatalogPage';

const permissionMocks = vi.hoisted(() => ({
  create: false,
  update: false,
  delete: false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    canCreate: () => permissionMocks.create,
    canUpdate: () => permissionMocks.update,
    canDelete: () => permissionMocks.delete,
  }),
}));

vi.mock('@/components/config/SocialSecurityCatalogFormDialog', () => ({
  SocialSecurityCatalogFormDialog: ({
    open,
    onSubmit,
    editItem,
  }: {
    open: boolean;
    onSubmit: (item: { name: string }) => void;
    editItem: { name: string } | null;
  }) =>
    open ? (
      <div role="dialog">
        <span>{editItem?.name ?? 'Nueva entidad'}</span>
        <button onClick={() => onSubmit({ name: 'Entidad actualizada' })}>Guardar entidad</button>
      </div>
    ) : null,
}));

const bank = {
  id: 'bank-1',
  company_id: 'company-1',
  name: 'Banco de prueba',
  code: null,
  nit: null,
  is_active: true,
  created_at: '2026-09-07T00:00:00Z',
  updated_at: '2026-09-07T00:00:00Z',
};

const renderPage = (callbacks = { onCreate: vi.fn(), onUpdate: vi.fn(), onDelete: vi.fn() }) =>
  render(
    <SocialSecurityCatalogPage
      permissionModule="catalogos_bancos"
      title="Bancos"
      description="Catálogo de bancos"
      data={[bank]}
      isLoading={false}
      onCreate={callbacks.onCreate}
      onUpdate={callbacks.onUpdate}
      onDelete={callbacks.onDelete}
    />,
  );

describe('SocialSecurityCatalogPage permissions', () => {
  beforeEach(() => {
    permissionMocks.create = false;
    permissionMocks.update = false;
    permissionMocks.delete = false;
  });

  it('oculta todas las acciones mutables para un perfil de solo consulta', () => {
    renderPage();

    expect(screen.queryByRole('button', { name: /registrar entidad/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editar banco de prueba/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar banco de prueba/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Acciones')).not.toBeInTheDocument();
  });

  it('permite crear cuando el perfil tiene el permiso correspondiente', () => {
    permissionMocks.create = true;
    const callbacks = { onCreate: vi.fn(), onUpdate: vi.fn(), onDelete: vi.fn() };

    renderPage(callbacks);

    fireEvent.click(screen.getByRole('button', { name: /registrar entidad/i }));
    fireEvent.click(screen.getByRole('button', { name: /guardar entidad/i }));

    expect(callbacks.onCreate).toHaveBeenCalledOnce();
    expect(callbacks.onCreate).toHaveBeenCalledWith({ name: 'Entidad actualizada' });
    expect(callbacks.onUpdate).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /editar banco de prueba/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar banco de prueba/i })).not.toBeInTheDocument();
  });

  it('permite editar sin exponer crear ni eliminar cuando solo tiene update', () => {
    permissionMocks.update = true;
    const callbacks = { onCreate: vi.fn(), onUpdate: vi.fn(), onDelete: vi.fn() };

    renderPage(callbacks);
    fireEvent.click(screen.getByRole('button', { name: /editar banco de prueba/i }));

    expect(screen.getByRole('dialog')).toHaveTextContent('Banco de prueba');
    fireEvent.click(screen.getByRole('button', { name: /guardar entidad/i }));

    expect(callbacks.onUpdate).toHaveBeenCalledWith({ name: 'Entidad actualizada', id: 'bank-1' });
    expect(callbacks.onCreate).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /registrar entidad/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar banco de prueba/i })).not.toBeInTheDocument();
  });

  it('confirma la eliminación cuando solo tiene delete', () => {
    permissionMocks.delete = true;
    const callbacks = { onCreate: vi.fn(), onUpdate: vi.fn(), onDelete: vi.fn() };

    renderPage(callbacks);
    fireEvent.click(screen.getAllByRole('button', { name: /eliminar banco de prueba/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /confirmar eliminación/i }));

    expect(callbacks.onDelete).toHaveBeenCalledOnce();
    expect(callbacks.onDelete).toHaveBeenCalledWith('bank-1');
    expect(callbacks.onCreate).not.toHaveBeenCalled();
    expect(callbacks.onUpdate).not.toHaveBeenCalled();
  });

  it('muestra todas las acciones para un perfil con CRUD completo', () => {
    permissionMocks.create = true;
    permissionMocks.update = true;
    permissionMocks.delete = true;

    renderPage();

    expect(screen.getByRole('button', { name: /registrar entidad/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar banco de prueba/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /eliminar banco de prueba/i })).toHaveLength(2);
    expect(screen.getByText('Acciones')).toBeInTheDocument();
  });
});
