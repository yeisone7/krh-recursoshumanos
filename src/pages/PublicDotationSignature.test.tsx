import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicDotationSignature from './PublicDotationSignature';
import { DotationSignatureError } from '@/lib/dotationSignature';
const call = vi.hoisted(() => vi.fn());
vi.mock('@/lib/dotationSignature', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/dotationSignature')>(), callDotationSignature: call }));
vi.mock('@/components/training/SignatureCanvas', () => ({ SignatureCanvas: ({onSave,disabled,saveDisabled}: {onSave:(v:string)=>void;disabled:boolean;saveDisabled:boolean}) =>
  <button disabled={disabled || saveDisabled} onClick={() => onSave('data:image/png;base64,example')}>Confirmar Firma</button> }));
const review = {review_hash:'hash',delivery:{company_name:'Empresa QA',employee_name:'Empleado QA',delivery_date:'2026-10-22',observations:null,items:[{id:'1',item_name:'Camisa',quantity:2,size:'M'}]}};
const identify = () => { fireEvent.change(screen.getByLabelText('Número de cédula'),{target:{value:'12345'}}); fireEvent.click(screen.getByText('Ver mi entrega')); };
describe('employee mobile dotation acceptance', () => {
  beforeEach(() => { call.mockReset(); window.history.replaceState(null,'','/dotacion/firma#token=test'); });
  it('keeps the delivery hidden until identification and requires consent', async () => {
    call.mockResolvedValueOnce(review).mockResolvedValueOnce({signed_at:'2026-10-22T12:00:00Z'});
    render(<PublicDotationSignature />);
    expect(screen.queryByText('Empleado QA')).not.toBeInTheDocument();
    identify();
    expect(await screen.findByText('Camisa')).toBeInTheDocument();
    expect(screen.getByText('Confirmar Firma')).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('Confirmar Firma'));
    expect(await screen.findByText('Firma registrada')).toBeInTheDocument();
    expect(call).toHaveBeenLastCalledWith(expect.objectContaining({action:'submit',document:'12345',accepted:true,review_hash:'hash',token:'test'}),true);
  });
  it('keeps retry available on upload failure and never displays false success', async () => {
    call.mockResolvedValueOnce(review).mockRejectedValueOnce(new Error('No se pudo guardar'));
    render(<PublicDotationSignature />); identify(); await screen.findByText('Camisa');
    fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByText('Confirmar Firma'));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar');
    expect(screen.queryByText('Firma registrada')).not.toBeInTheDocument();
    expect(screen.getByText('Confirmar Firma')).toBeEnabled();
  });
  it('requests a fresh review after concurrent changes', async () => {
    call.mockResolvedValueOnce(review).mockRejectedValueOnce(new DotationSignatureError('La entrega cambió','changed'));
    render(<PublicDotationSignature />); identify(); await screen.findByText('Camisa');
    fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByText('Confirmar Firma'));
    await waitFor(() => expect(screen.getByText('Ver mi entrega')).toBeInTheDocument());
    expect(screen.queryByText('Camisa')).not.toBeInTheDocument();
  });
  it('closes the form for expired or already signed links', async () => {
    call.mockRejectedValueOnce(new DotationSignatureError('Esta entrega ya tiene firma','already_signed'));
    render(<PublicDotationSignature />); identify();
    expect(await screen.findByRole('alert')).toHaveTextContent('ya tiene firma');
    expect(screen.queryByText('Ver mi entrega')).not.toBeInTheDocument();
  });
});
