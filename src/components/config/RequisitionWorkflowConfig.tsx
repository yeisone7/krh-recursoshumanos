import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, GitBranch } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomRoles } from '@/hooks/useRolesPermissions';
import { useCompanyRequisitionWorkflow, usePublishRequisitionWorkflow } from '@/hooks/useRequisitionWorkflow';
import { standardStepNames, workflowFieldTypeNames, type WorkflowStep, type WorkflowField, type RequisitionWorkflowVersion } from '@/types/requisitionWorkflow';
import { validateWorkflowSteps } from '@/lib/requisitionWorkflow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { CustomRole } from '@/hooks/useRolesPermissions';

function createStep(kind: WorkflowStep['kind']): WorkflowStep {
  return { id: crypto.randomUUID(), kind, name: kind === 'custom' ? '' : standardStepNames[kind], role_ids: [], fields: [] };
}

export function RequisitionWorkflowConfig() {
  const { currentCompanyId, hasPermission } = useAuth();
  const workflow = useCompanyRequisitionWorkflow();
  const roles = useCustomRoles();
  if (!hasPermission('req_workflow_config', 'update')) return <p>No tienes permiso para configurar este ciclo.</p>;
  if (workflow.isLoading || roles.isLoading) return <p role="status">Cargando ciclo de aprobación…</p>;
  if (workflow.isError || roles.isError) return <div role="alert">No se pudo cargar la configuración.
    <Button variant="outline" onClick={() => { void workflow.refetch(); void roles.refetch(); }}>Reintentar</Button></div>;
  return <WorkflowEditor key={currentCompanyId} initialVersion={workflow.data ?? null} roles={roles.data ?? []} />;
}

export function WorkflowEditor({ initialVersion, roles }: { initialVersion: RequisitionWorkflowVersion | null; roles: CustomRole[] }) {
  const publish = usePublishRequisitionWorkflow();
  const [baseVersion, setBaseVersion] = useState(initialVersion);
  const [steps, setSteps] = useState<WorkflowStep[]>(() => initialVersion?.steps ?? Object.keys(standardStepNames).map(k => createStep(k as WorkflowStep['kind'])));
  const [kind, setKind] = useState<WorkflowStep['kind']>('custom');
  const [error, setError] = useState<string | null>(null);
  const activeRoles = roles.filter(r => r.is_active);
  const updateStep = (id: string, patch: Partial<WorkflowStep>) => setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  const updateField = (step: WorkflowStep, id: string, patch: Partial<WorkflowField>) => updateStep(step.id, { fields: step.fields.map(f => f.id === id ? { ...f, ...patch } : f) });
  const move = (index: number, direction: number) => setSteps(prev => {
    const next = [...prev];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    return next;
  });
  const add = () => {
    const step = createStep(kind);
    setSteps(prev => {
      const selection = prev.findIndex(s => s.kind === 'seleccion');
      const next = [...prev];
      next.splice(selection < 0 ? next.length : selection, 0, step);
      return next;
    });
    setKind('custom');
  };
  const save = async () => {
    const cleaned = steps.map(s => ({ ...s, name: s.name.trim(), fields: s.fields.map(f => ({ ...f, label: f.label.trim(), options: f.options?.map(o => o.trim()) })) }));
    const validation = validateWorkflowSteps(cleaned);
    if (validation) { setError(validation); return; }
    if (cleaned.some(s => s.role_ids.some(id => !activeRoles.some(r => r.id === id)))) { setError('Hay roles inactivos o no disponibles. Actualice los aprobadores.'); return; }
    setError(null);
    try {
      const version = await publish.mutateAsync({ steps: cleaned, expectedVersionId: baseVersion?.id ?? null });
      setBaseVersion(version);
      setSteps(version.steps);
    } catch { /* The mutation displays the server's actionable message. */ }
  };
  return <div className="space-y-6">
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5" />Ciclo de aprobación de Requisiciones</CardTitle>
        <CardDescription>Define las etapas de esta empresa. Al publicar, el nuevo ciclo se aplicará a las próximas requisiciones enviadas. Las que están en curso conservarán su recorrido.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge variant="outline">{baseVersion ? `Versión publicada: ${baseVersion.version}` : 'Sin ciclo personalizado: se utiliza el flujo actual'}</Badge>
        <p className="text-sm text-muted-foreground">El ciclo publicado reemplaza la opción «Autoriza». Selección es opcional y siempre queda al final. Si la quitas, las vacantes se habilitan después de la aprobación final.</p>
        <fieldset disabled={publish.isPending} className="space-y-4">
          {steps.map((step, index) => <Card key={step.id}>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">{index + 1}.</span>
                <Label htmlFor={`step-${step.id}`} className="sr-only">Nombre de etapa {index + 1}</Label>
                <Input id={`step-${step.id}`} value={step.name} onChange={e => updateStep(step.id, { name: e.target.value })} placeholder="Nombre de la etapa" className="flex-1 min-w-40" />
                <Button type="button" variant="outline" size="icon" aria-label={`Subir ${step.name}`} disabled={index === 0 || step.kind === 'seleccion'} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" variant="outline" size="icon" aria-label={`Bajar ${step.name}`} disabled={index === steps.length - 1 || steps[index + 1]?.kind === 'seleccion'} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Quitar ${step.name || 'etapa'}`} onClick={() => setSteps(prev => prev.filter(s => s.id !== step.id))}><Trash2 className="h-4 w-4" /></Button>
              </div>
              {step.kind === 'custom' ? <>
                <fieldset className="space-y-2"><legend className="text-sm font-medium">Roles aprobadores</legend>
                  <p className="text-xs text-muted-foreground">Basta con la aprobación de una persona de cualquiera de estos roles.</p>
                  <div className="flex flex-wrap gap-4">{activeRoles.map(role => <label key={role.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={step.role_ids.includes(role.id)} onCheckedChange={checked => updateStep(step.id, { role_ids: checked ? [...step.role_ids, role.id] : step.role_ids.filter(id => id !== role.id) })} />{role.name}
                  </label>)}</div>
                  {!activeRoles.length && <p className="text-sm text-destructive">Crea un rol activo en Seguridad antes de publicar esta etapa.</p>}
                </fieldset>
                <div className="space-y-3">
                  {step.fields.map((field, fi) => <div key={field.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Label htmlFor={`field-${field.id}`} className="sr-only">Nombre del campo {fi + 1}</Label>
                      <Input id={`field-${field.id}`} value={field.label} placeholder="Nombre del campo" className="flex-1 min-w-36" onChange={e => updateField(step, field.id, { label: e.target.value })} />
                      <select aria-label={`Tipo del campo ${fi + 1}`} className="h-10 rounded-md border bg-background px-3 text-sm" value={field.type} onChange={e => updateField(step, field.id, { type: e.target.value as WorkflowField['type'], options: e.target.value === 'select' ? [''] : undefined })}>
                        {Object.entries(workflowFieldTypeNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <label className="flex items-center gap-2 text-sm"><Checkbox checked={field.required} onCheckedChange={v => updateField(step, field.id, { required: v === true })} />Obligatorio</label>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Quitar campo ${fi + 1}`} onClick={() => updateStep(step.id, { fields: step.fields.filter(f => f.id !== field.id) })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    {field.type === 'select' && <><Label htmlFor={`options-${field.id}`}>Opciones, una por línea</Label><textarea id={`options-${field.id}`} className="w-full min-h-20 rounded-md border bg-background p-2 text-sm" value={field.options?.join('\n') ?? ''} onChange={e => updateField(step, field.id, { options: e.target.value.split('\n') })} /></>}
                  </div>)}
                  <Button type="button" variant="outline" onClick={() => updateStep(step.id, { fields: [...step.fields, { id: crypto.randomUUID(), label: '', type: 'text', required: false }] })}><Plus className="h-4 w-4 mr-2" />Agregar campo</Button>
                </div>
              </> : <p className="text-sm text-muted-foreground">Etapa de {standardStepNames[step.kind]}. Conserva su formulario y permisos actuales.</p>}
            </CardContent>
          </Card>)}
          <div className="flex flex-wrap gap-2">
            <select aria-label="Tipo de etapa a agregar" value={kind} onChange={e => setKind(e.target.value as WorkflowStep['kind'])} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="custom">Nueva etapa personalizada</option>
              {Object.entries(standardStepNames).filter(([k]) => !steps.some(s => s.kind === k)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <Button type="button" variant="outline" onClick={add}><Plus className="h-4 w-4 mr-2" />Agregar etapa</Button>
          </div>
        </fieldset>
      </CardContent>
    </Card>
    <Card><CardHeader><CardTitle className="text-base">Vista previa del recorrido</CardTitle></CardHeader><CardContent>
      <ol className="border-l ml-2 space-y-3 pl-5">{steps.map((s, i) => <li key={s.id} className="text-sm">{i + 1}. {s.name || 'Etapa sin nombre'}</li>)}</ol>
    </CardContent></Card>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-3 justify-end">
      <Button variant="outline" disabled={publish.isPending} onClick={() => { setBaseVersion(initialVersion); setSteps(initialVersion?.steps ?? Object.keys(standardStepNames).map(k => createStep(k as WorkflowStep['kind']))); setError(null); }}>Descartar cambios y recargar</Button>
      <Button disabled={publish.isPending} onClick={save}>{publish.isPending ? 'Publicando…' : 'Publicar ciclo'}</Button>
    </div>
  </div>;
}
