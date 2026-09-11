import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowEditor } from './RequisitionWorkflowConfig';
import type { RequisitionWorkflowVersion } from '@/types/requisitionWorkflow';
import type { CustomRole } from '@/hooks/useRolesPermissions';

const { publish } = vi.hoisted(() => ({ publish: vi.fn() }));
vi.mock('@/hooks/useRequisitionWorkflow', () => ({ usePublishRequisitionWorkflow: () => ({ mutateAsync: publish, isPending: false }) }));
const roles = [{ id: 'role-finance', name: 'Finanzas', is_active: true }] as CustomRole[];
const version: RequisitionWorkflowVersion = { id: 'v1', version: 1, company_id: 'A', created_at: '', created_by: '', steps: [
  { id: 'co', kind: 'coordinadores', name: 'Coordinadores', role_ids: [], fields: [] },
  { id: 'sel', kind: 'seleccion', name: 'Selección', role_ids: [], fields: [] },
] };
beforeEach(() => { publish.mockReset(); });
describe('workflow editor', () => {
  it('adds a custom stage before selection, assigns roles and publishes explicit version', async () => {
    publish.mockImplementation(async ({ steps }) => ({ ...version, id: 'v2', version: 2, steps }));
    render(<WorkflowEditor initialVersion={version} roles={roles} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar etapa' }));
    fireEvent.change(screen.getByLabelText('Nombre de etapa 2'), { target: { value: 'Finanzas' } });
    fireEvent.click(screen.getByLabelText('Finanzas'));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar campo' }));
    fireEvent.change(screen.getByLabelText('Nombre del campo 1'), { target: { value: 'Presupuesto' } });
    fireEvent.change(screen.getByLabelText('Tipo del campo 1'), { target: { value: 'number' } });
    fireEvent.click(screen.getByLabelText('Obligatorio'));
    fireEvent.click(screen.getByRole('button', { name: 'Publicar ciclo' }));
    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    const payload = publish.mock.calls[0][0];
    expect(payload.expectedVersionId).toBe('v1');
    expect(payload.steps.map((s: { kind: string }) => s.kind)).toEqual(['coordinadores', 'custom', 'seleccion']);
    expect(payload.steps[1]).toMatchObject({ name: 'Finanzas', role_ids: ['role-finance'], fields: [{ label: 'Presupuesto', type: 'number', required: true }] });
    await screen.findByText('Versión publicada: 2');
  });
  it('rejects empty cycles and roles, and prevents moving selection', () => {
    render(<WorkflowEditor initialVersion={version} roles={roles} />);
    expect(screen.getByRole('button', { name: 'Subir Selección' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bajar Coordinadores' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Coordinadores' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Selección' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publicar ciclo' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Agregue al menos una etapa');
    expect(publish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar etapa' }));
    fireEvent.change(screen.getByLabelText('Nombre de etapa 1'), { target: { value: 'Dirección' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar ciclo' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Asigne un rol');
  });
  it('removes and restores existing stages without mutating the published version', () => {
    render(<WorkflowEditor initialVersion={version} roles={roles} />);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Coordinadores' }));
    expect(within(screen.getByRole('list')).queryByText(/Coordinadores/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios y recargar' }));
    expect(within(screen.getByRole('list')).getByText(/Coordinadores/)).toBeInTheDocument();
    expect(version.steps).toHaveLength(2);
  });
});
