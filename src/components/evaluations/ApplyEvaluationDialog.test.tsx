import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApplyEvaluationDialog } from './ApplyEvaluationDialog';
import type { EvaluationTemplate, PerformanceEvaluation } from '@/types/evaluation';
const queryState = vi.hoisted(() => ({ data: [] as unknown[], isLoading: false, isError: false }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => queryState }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/components/training/SignatureCanvas', () => ({ SignatureCanvas: () => <div>Canvas</div> }));
const template = { id:'t', name:'Operativos', qualitative_questions:[], criteria:[{id:'c',name:'Colabora con otros',category:'Trabajo en equipo',dimension:'Colaboración',weight:1,max_score:4}] } as EvaluationTemplate;
const evaluation = { id:'e',status:'in_progress',strengths:'Buen trabajo',evaluator_name:'Jefe',manager_name:'Jefe',position_name:'Operario',field_name:'Campo A',evaluation_date:'2026-10-17', employee:{first_name:'Ana',last_name:'Prueba'} } as PerformanceEvaluation;
afterEach(() => { cleanup(); queryState.data=[]; queryState.isLoading=false; queryState.isError=false; });
describe('aplicar evaluación', () => {
  it('no cuenta criterios sin respuesta ni muestra un porcentaje provisional', () => {
    render(<ApplyEvaluationDialog open onOpenChange={vi.fn()} evaluation={evaluation} template={template} onSave={vi.fn()} />);
    expect(screen.getByText('0/1 criterios')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/\(3\) Apropiado/}));
    expect(screen.getByText('75.00')).toBeInTheDocument();
    expect(screen.getByText('1/1 criterios')).toBeInTheDocument();
  });
  it('espera la persistencia antes de cerrar y conserva los campos al fallar', async () => {
    const close=vi.fn(); let reject!: (reason: Error) => void;
    const save=vi.fn((_data: unknown) => new Promise((_,r) => { reject=r; }));
    render(<ApplyEvaluationDialog open onOpenChange={close} evaluation={evaluation} template={template} onSave={save} />);
    fireEvent.click(screen.getByRole('button',{name:/Guardar Progreso/}));
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole('button',{name:/Guardar Progreso/})).toBeDisabled();
    reject(new Error('network'));
    await waitFor(() => expect(screen.getByRole('button',{name:/Guardar Progreso/})).toBeEnabled());
    expect(close).not.toHaveBeenCalled(); expect(screen.getByDisplayValue('Buen trabajo')).toBeInTheDocument();
    expect(save.mock.calls[0][0]).toMatchObject({overall_score:null,scores:[],position_name:'Operario'});
  });
  it('carga firmas guardadas y bloquea evaluaciones finalizadas', () => {
    queryState.data=[{criteria_id:'c',score:4,comments:'Observación'}];
    render(<ApplyEvaluationDialog open onOpenChange={vi.fn()} evaluation={{...evaluation,status:'submitted',employee_signature:'data:image/png;base64,eA==',evaluator_signature:'data:image/png;base64,eA=='}} template={template} onSave={vi.fn()} />);
    expect(screen.getByAltText('Firma evaluador')).toBeInTheDocument();
    expect(screen.getByAltText('Firma evaluado')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:/\(4\) Alto/})).toBeDisabled();
    expect(screen.getByRole('button',{name:/Finalizar/})).toBeDisabled();
  });
  it('bloquea guardado si falla la carga de respuestas', () => {
    queryState.isError=true;
    render(<ApplyEvaluationDialog open onOpenChange={vi.fn()} evaluation={evaluation} template={template} onSave={vi.fn()} />);
    expect(screen.getByRole('button',{name:/Guardar Progreso/})).toBeDisabled();
  });
});
