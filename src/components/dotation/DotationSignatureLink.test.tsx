import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DotationSignatureLink } from './DotationSignatureLink';
const mocks = vi.hoisted(() => ({call:vi.fn(),single:vi.fn(),active:true,copy:vi.fn()}));
vi.mock('@/lib/dotationSignature',()=>({callDotationSignature:mocks.call}));
vi.mock('@/components/workspace/WorkspacePaneContext',()=>({useWorkspaceActive:()=>mocks.active}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({select:()=>({eq:()=>({single:mocks.single})})})}}));
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:vi.fn()}}));
describe('temporary signature link in the preview',()=>{
  beforeEach(()=>{vi.useRealTimers();mocks.active=true;mocks.call.mockReset();mocks.single.mockReset();mocks.copy.mockReset();Object.defineProperty(navigator,'clipboard',{value:{writeText:mocks.copy},configurable:true});
    mocks.call.mockResolvedValue({token:'secret-token',expires_at:'2026-10-23T12:00:00Z'});
    mocks.single.mockResolvedValue({data:{signature_url:null,signature_path:null,signed_at:null},error:null});
  });
  const setup=()=>{const client=new QueryClient({defaultOptions:{queries:{retry:false}}});const invalidate=vi.spyOn(client,'invalidateQueries');
    const view=render(<QueryClientProvider client={client}><DotationSignatureLink transactionId="tx" open /></QueryClientProvider>);return {...view,client,invalidate};};
  it('generates only on request, copies the fragment URL and forgets it on close',async()=>{
    const {rerender,client}=setup();expect(mocks.call).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Generar enlace de firma'));
    expect(await screen.findByLabelText('Enlace de firma')).toHaveValue(`${location.origin}/dotacion/firma#token=secret-token`);
    fireEvent.click(screen.getByText('Copiar enlace'));await waitFor(()=>expect(mocks.copy).toHaveBeenCalledWith(`${location.origin}/dotacion/firma#token=secret-token`));
    rerender(<QueryClientProvider client={client}><DotationSignatureLink transactionId="tx" open={false} /></QueryClientProvider>);
    expect(screen.queryByLabelText('Enlace de firma')).not.toBeInTheDocument();
  });
  it('ignores a generation response arriving after the preview closes',async()=>{
    let resolve:(value:unknown)=>void;mocks.call.mockImplementation(()=>new Promise(r=>{resolve=r;}));
    const {rerender,client}=setup();fireEvent.click(screen.getByText('Generar enlace de firma'));
    rerender(<QueryClientProvider client={client}><DotationSignatureLink transactionId="tx" open={false} /></QueryClientProvider>);
    await act(async()=>{resolve!({token:'late',expires_at:'2026-10-23T12:00:00Z'});});
    expect(screen.queryByLabelText('Enlace de firma')).not.toBeInTheDocument();
  });
  it('refreshes the delivery when its signature arrives',async()=>{
    mocks.single.mockResolvedValue({data:{signature_path:'private.png',signed_at:'2026-10-22'},error:null});
    const {invalidate}=setup();fireEvent.click(screen.getByText('Generar enlace de firma'));
    await waitFor(()=>expect(invalidate).toHaveBeenCalledWith({queryKey:['dotation_transactions']}));
    expect(screen.queryByLabelText('Enlace de firma')).not.toBeInTheDocument();
  });
  it('does not query while the workspace preview is suspended',async()=>{
    mocks.active=false;setup();fireEvent.click(screen.getByText('Generar enlace de firma'));await screen.findByLabelText('Enlace de firma');
    expect(mocks.single).not.toHaveBeenCalled();
  });
});
