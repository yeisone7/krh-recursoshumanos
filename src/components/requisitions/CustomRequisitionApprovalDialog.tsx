import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useApproveConfiguredRequisition } from '@/hooks/useRequisitionWorkflow';
import { validateWorkflowAnswers } from '@/lib/requisitionWorkflow';
import type { WorkflowAnswers, WorkflowStep } from '@/types/requisitionWorkflow';

export function CustomRequisitionApprovalDialog({ requisitionId, step, open, onOpenChange }: {
  requisitionId: string; step: WorkflowStep; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const [approved, setApproved] = useState(true);
  const [observations, setObservations] = useState('');
  const [answers, setAnswers] = useState<WorkflowAnswers>({});
  const [error, setError] = useState<string | null>(null);
  const approve = useApproveConfiguredRequisition();
  const update = (id: string, value: WorkflowAnswers[string]) => setAnswers(prev => ({ ...prev, [id]: value }));
  const submit = async () => {
    const validation = validateWorkflowAnswers(step.fields, answers, approved);
    setError(validation);
    if (validation) return;
    try {
      await approve.mutateAsync({ requisitionId, stepId: step.id, approved, observations, answers });
      onOpenChange(false);
    } catch { /* Server error shown by mutation. */ }
  };
  return <Dialog open={open} onOpenChange={v => { if (!approve.isPending) onOpenChange(v); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{step.name}</DialogTitle><DialogDescription>Registra tu decisión. El usuario y la fecha se guardan automáticamente.</DialogDescription></DialogHeader>
      <fieldset disabled={approve.isPending} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="workflow-decision">Decisión</Label><select id="workflow-decision" className="w-full h-10 border rounded-md bg-background px-3" value={approved ? 'approve' : 'reject'} onChange={e => setApproved(e.target.value === 'approve')}><option value="approve">Aprobar</option><option value="reject">Rechazar</option></select></div>
        {step.fields.map(field => <div key={field.id} className="space-y-2">
          <Label htmlFor={`answer-${field.id}`}>{field.label}{approved && field.required ? ' *' : ''}</Label>
          {field.type === 'textarea' ? <Textarea id={`answer-${field.id}`} value={String(answers[field.id] ?? '')} onChange={e => update(field.id, e.target.value)} />
            : field.type === 'boolean' || field.type === 'select' ? <select id={`answer-${field.id}`} className="w-full h-10 border rounded-md bg-background px-3" value={String(answers[field.id] ?? '')} onChange={e => update(field.id, e.target.value === '' ? null : field.type === 'boolean' ? e.target.value === 'true' : e.target.value)}>
              <option value="">Seleccionar…</option>{field.type === 'boolean' ? <><option value="true">Sí</option><option value="false">No</option></> : field.options?.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
              : <Input id={`answer-${field.id}`} type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'} step={field.type === 'number' ? 'any' : undefined} value={String(answers[field.id] ?? '')} onChange={e => update(field.id, field.type === 'number' ? e.target.value === '' ? null : Number(e.target.value) : e.target.value)} />}
        </div>)}
        <div className="space-y-2"><Label htmlFor="workflow-observations">Observaciones</Label><Textarea id="workflow-observations" value={observations} onChange={e => setObservations(e.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" variant={approved ? 'default' : 'destructive'} onClick={submit}>{approve.isPending ? 'Guardando…' : approved ? 'Registrar aprobación' : 'Rechazar requisición'}</Button>
      </fieldset>
    </DialogContent>
  </Dialog>;
}
