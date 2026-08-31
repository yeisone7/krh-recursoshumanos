import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SelectionAlertsPanel } from './SelectionAlertsPanel';
import type { SelectionAlert } from '@/lib/selectionAlerts';

afterEach(cleanup);
const alerts: SelectionAlert[] = [
  { id: 'r', source: 'requisition', entityId: 'r1', level: 'critical', days: 2, title: 'Requisición vencida sin cubrir', description: 'RQ-01 · Auxiliar' },
  { id: 'v', source: 'vacancy', entityId: 'v1', level: 'warning', days: 1, title: 'Vacante sin candidatos', description: 'Convocatoria Auxiliar' },
  { id: 'c', source: 'candidate', entityId: 'c1', level: 'warning', days: 16, title: 'Candidato sin avances', description: 'Ana Pérez · Entrevista' },
];
const defaults = { alerts, isLoading: false, hasError: false, onRetry: vi.fn(), onAlertClick: vi.fn() };

describe('SelectionAlertsPanel', () => {
  it('shows source, priority, counts and detail actions for all three entities', () => {
    const onAlertClick = vi.fn();
    render(<SelectionAlertsPanel {...defaults} onAlertClick={onAlertClick} />);
    expect(screen.getByText('3 alertas (1 crítica)')).toBeInTheDocument();
    expect(screen.getByText('Requisiciones')).toBeInTheDocument();
    expect(screen.getByText('Crítico')).toBeInTheDocument();
    alerts.forEach(alert => {
      fireEvent.click(screen.getByRole('button', { name: `Ver detalle: ${alert.description}` }));
      expect(onAlertClick).toHaveBeenLastCalledWith(alert);
    });
  });
  it('distinguishes loading, failure and empty results', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<SelectionAlertsPanel {...defaults} alerts={[]} isLoading onRetry={onRetry} />);
    expect(screen.getByRole('status', { name: 'Cargando alertas' })).toBeInTheDocument();
    expect(screen.queryByText('No hay alertas pendientes')).not.toBeInTheDocument();
    rerender(<SelectionAlertsPanel {...defaults} alerts={[]} hasError onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByText('No hay alertas pendientes')).not.toBeInTheDocument();
    rerender(<SelectionAlertsPanel {...defaults} alerts={[]} />);
    expect(screen.getByText('No hay alertas pendientes')).toBeInTheDocument();
  });
  it('makes overflow alerts accessible and closes the list before opening a detail', () => {
    const onAlertClick = vi.fn();
    render(<SelectionAlertsPanel {...defaults} maxItems={1} onAlertClick={onAlertClick} />);
    expect(screen.queryByText('Candidato sin avances')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver todas (2 más)' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: `Ver detalle: ${alerts[2].description}` }));
    expect(onAlertClick).toHaveBeenCalledWith(alerts[2]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
