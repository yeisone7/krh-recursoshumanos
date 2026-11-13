import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EmployeeTermination } from '@/types/termination';
import { requiredDocumentsByType } from '@/types/termination';
import { TerminationProcessDialog } from './TerminationProcessDialog';

const mocks = vi.hoisted(() => ({
  termination: null as EmployeeTermination | null,
  setOmitted: vi.fn(),
  complete: vi.fn(),
  download: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ currentCompanyId: 'company' }) }));
vi.mock('@/hooks/useEmployees', () => ({ useEmployee: () => ({}) }));
vi.mock('@/hooks/useSystemConfig', () => ({ useSystemConfig: () => ({}) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/components/employees/IssueCertificateDialog', () => ({ IssueCertificateDialog: () => null }));
vi.mock('@/components/employees/TransferEmployeeDialog', () => ({ TransferEmployeeDialog: () => null }));
vi.mock('@/lib/terminationPdfGenerator', () => ({ downloadTerminationDocument: mocks.download }));
vi.mock('@/hooks/useTerminations', () => ({
  useContractTerminationProcess: () => ({}),
  useEmployeeTerminationProcess: () => ({ data: mocks.termination }),
  useInitiateTermination: () => ({}),
  useMarkDocumentGenerated: () => ({}),
  useSetTerminationDocumentOmitted: () => ({ mutate: mocks.setOmitted }),
  useCompleteTermination: () => ({ mutateAsync: mocks.complete }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('checklist de retiro', () => {
  it('permite finalizar con formatos generados y omitidos, y vuelve a bloquear al deshacer', () => {
    const date = new Date(2026, 10, 13);
    const termination: EmployeeTermination = {
      id: 'termination', employeeId: 'employee', companyId: 'company', contractId: null,
      terminationType: 'mutuo_acuerdo', terminationDate: date, effectiveDate: date,
      createdAt: date, updatedAt: date, isCompleted: false,
      documents: requiredDocumentsByType.mutuo_acuerdo.map(documentType => ({
        id: documentType, documentType, terminationId: 'termination',
        isGenerated: documentType === 'acta_terminacion',
        isRequired: documentType === 'acta_terminacion' || documentType === 'certificado_laboral',
        isSigned: false, createdAt: date, updatedAt: date,
      })),
    };
    mocks.termination = termination;
    const dialog = () => <TerminationProcessDialog open onOpenChange={vi.fn()} employee={{ id: 'employee', first_name: 'Prueba' }} />;
    const view = render(dialog());
    const finalize = screen.getByRole('button', { name: 'Finalizar Proceso' });
    expect(finalize).toBeDisabled();
    expect(screen.getByText('5/6 formatos resueltos')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Omitir Certificado Laboral' }));
    expect(mocks.setOmitted).toHaveBeenLastCalledWith(expect.objectContaining({
      documentId: 'certificado_laboral', terminationId: 'termination', omitted: true,
    }));
    expect(finalize).toBeDisabled();

    const withSavedOmission = {
      ...termination,
      documents: termination.documents.map(doc => doc.id === 'certificado_laboral' ? { ...doc, isRequired: false } : doc),
    };
    mocks.termination = withSavedOmission;
    view.rerender(dialog());
    expect(finalize).toBeEnabled();
    expect(screen.getByText('6/6 formatos resueltos')).toBeInTheDocument();
    expect(screen.getAllByText('Omitido')).toHaveLength(5);
    expect(mocks.download).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Deshacer omisión de Certificado Laboral' }));
    expect(mocks.setOmitted).toHaveBeenLastCalledWith(expect.objectContaining({
      documentId: 'certificado_laboral', omitted: false,
    }));
    mocks.termination = termination;
    view.rerender(dialog());
    expect(finalize).toBeDisabled();

    mocks.termination = withSavedOmission;
    view.rerender(dialog());
    fireEvent.click(finalize);
    expect(mocks.complete).toHaveBeenCalledWith(expect.objectContaining({
      terminationId: 'termination', employeeId: 'employee', effectiveDate: date,
    }));
  });
});
