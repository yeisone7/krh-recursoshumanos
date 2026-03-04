import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreatePositionProfile, usePositionProfiles } from '@/hooks/usePositionProfiles';
import type { PositionProfileFormData, SpecificKnowledge, Skill } from '@/types/positionProfile';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positionId: string;
  positionName: string;
  existingData?: any;
}

const defaultForm: PositionProfileFormData = {
  purpose: '',
  reports_to: '',
  supervises: '',
  num_positions: 1,
  education_level: '',
  education_detail: '',
  experience: '',
  specific_knowledge: [],
  skills: [],
  functions: [''],
  responsibilities: {},
  working_conditions: {},
  elaborated_by: '',
  reviewed_by: '',
  approved_by: '',
  effective_date: new Date().toISOString().split('T')[0],
};

export function PositionProfileFormDialog({ open, onOpenChange, positionId, positionName, existingData }: Props) {
  const [form, setForm] = useState<PositionProfileFormData>(defaultForm);
  const createProfile = useCreatePositionProfile();
  const { data: allVersions = [] } = usePositionProfiles(positionId);

  useEffect(() => {
    if (existingData) {
      setForm({
        purpose: existingData.purpose || '',
        reports_to: existingData.reports_to || '',
        supervises: existingData.supervises || '',
        num_positions: existingData.num_positions || 1,
        education_level: existingData.education_level || '',
        education_detail: existingData.education_detail || '',
        experience: existingData.experience || '',
        specific_knowledge: existingData.specific_knowledge || [],
        skills: existingData.skills || [],
        functions: existingData.functions?.length ? existingData.functions : [''],
        responsibilities: existingData.responsibilities || {},
        working_conditions: existingData.working_conditions || {},
        elaborated_by: existingData.elaborated_by || '',
        reviewed_by: existingData.reviewed_by || '',
        approved_by: existingData.approved_by || '',
        effective_date: existingData.effective_date || new Date().toISOString().split('T')[0],
      });
    } else {
      setForm(defaultForm);
    }
  }, [existingData, open]);

  const updateField = (field: keyof PositionProfileFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateResponsibility = (key: string, value: string) => {
    setForm(prev => ({ ...prev, responsibilities: { ...prev.responsibilities, [key]: value } }));
  };

  const updateCondition = (key: string, value: string) => {
    setForm(prev => ({ ...prev, working_conditions: { ...prev.working_conditions, [key]: value } }));
  };

  // Functions list
  const addFunction = () => updateField('functions', [...form.functions, '']);
  const removeFunction = (i: number) => updateField('functions', form.functions.filter((_, idx) => idx !== i));
  const updateFunction = (i: number, val: string) => {
    const copy = [...form.functions];
    copy[i] = val;
    updateField('functions', copy);
  };

  // Knowledge list
  const addKnowledge = () => updateField('specific_knowledge', [...form.specific_knowledge, { topic: '', level: 'básico' as const }]);
  const removeKnowledge = (i: number) => updateField('specific_knowledge', form.specific_knowledge.filter((_, idx) => idx !== i));
  const updateKnowledge = (i: number, field: keyof SpecificKnowledge, val: string) => {
    const copy = [...form.specific_knowledge];
    copy[i] = { ...copy[i], [field]: val };
    updateField('specific_knowledge', copy);
  };

  // Skills list
  const addSkill = () => updateField('skills', [...form.skills, { name: '', level: 'medio' as const }]);
  const removeSkill = (i: number) => updateField('skills', form.skills.filter((_, idx) => idx !== i));
  const updateSkill = (i: number, field: keyof Skill, val: string) => {
    const copy = [...form.skills];
    copy[i] = { ...copy[i], [field]: val };
    updateField('skills', copy);
  };

  const handleSubmit = async () => {
    if (!form.purpose) {
      toast.error('El objetivo del cargo es requerido');
      return;
    }
    const nextVersion = allVersions.length > 0 ? Math.max(...allVersions.map((v: any) => v.version)) + 1 : 1;
    try {
      await createProfile.mutateAsync({
        positionId,
        data: { ...form, functions: form.functions.filter(f => f.trim()) },
        nextVersion,
      });
      toast.success(`Perfil v${nextVersion} creado exitosamente`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const SectionHeader = ({ children }: { children: React.ReactNode }) => (
    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/80">
      {children}
      <ChevronDown className="h-4 w-4" />
    </CollapsibleTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{existingData ? 'Nueva versión' : 'Crear'} Perfil — {positionName}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] px-6">
          <div className="space-y-4 pb-4">

            {/* Identificación */}
            <Collapsible defaultOpen>
              <SectionHeader>1. Identificación del Cargo</SectionHeader>
              <CollapsibleContent className="space-y-3 pt-3">
                <div>
                  <Label>Objetivo del Cargo *</Label>
                  <Textarea value={form.purpose} onChange={e => updateField('purpose', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Reporta a</Label><Input value={form.reports_to} onChange={e => updateField('reports_to', e.target.value)} /></div>
                  <div><Label>Supervisa a</Label><Input value={form.supervises} onChange={e => updateField('supervises', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>N° de Cargos</Label><Input type="number" min={1} value={form.num_positions} onChange={e => updateField('num_positions', parseInt(e.target.value) || 1)} /></div>
                  <div><Label>Fecha vigencia</Label><Input type="date" value={form.effective_date} onChange={e => updateField('effective_date', e.target.value)} /></div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Perfil */}
            <Collapsible defaultOpen>
              <SectionHeader>2. Perfil del Cargo</SectionHeader>
              <CollapsibleContent className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Nivel de Educación</Label>
                    <Select value={form.education_level} onValueChange={v => updateField('education_level', v)}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {['Bachiller', 'Técnico', 'Tecnólogo', 'Profesional', 'Especialización', 'Maestría', 'Doctorado'].map(l => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Detalle Formación</Label><Input value={form.education_detail} onChange={e => updateField('education_detail', e.target.value)} /></div>
                </div>
                <div><Label>Experiencia</Label><Input value={form.experience} onChange={e => updateField('experience', e.target.value)} /></div>

                {/* Conocimientos */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Conocimientos Específicos</Label>
                    <Button size="sm" variant="outline" onClick={addKnowledge}><Plus className="w-3 h-3 mr-1" />Agregar</Button>
                  </div>
                  {form.specific_knowledge.map((k, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <Input className="flex-1" placeholder="Tema" value={k.topic} onChange={e => updateKnowledge(i, 'topic', e.target.value)} />
                      <Select value={k.level} onValueChange={v => updateKnowledge(i, 'level', v)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="básico">Básico</SelectItem>
                          <SelectItem value="intermedio">Intermedio</SelectItem>
                          <SelectItem value="avanzado">Avanzado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" onClick={() => removeKnowledge(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  ))}
                </div>

                {/* Competencias */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Competencias / Habilidades</Label>
                    <Button size="sm" variant="outline" onClick={addSkill}><Plus className="w-3 h-3 mr-1" />Agregar</Button>
                  </div>
                  {form.skills.map((s, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <Input className="flex-1" placeholder="Competencia" value={s.name} onChange={e => updateSkill(i, 'name', e.target.value)} />
                      <Select value={s.level} onValueChange={v => updateSkill(i, 'level', v)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bajo">Bajo</SelectItem>
                          <SelectItem value="medio">Medio</SelectItem>
                          <SelectItem value="alto">Alto</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" onClick={() => removeSkill(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Funciones */}
            <Collapsible defaultOpen>
              <SectionHeader>3. Funciones del Cargo</SectionHeader>
              <CollapsibleContent className="space-y-2 pt-3">
                {form.functions.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-xs text-muted-foreground mt-3 w-6">{i + 1}.</span>
                    <Input className="flex-1" value={f} onChange={e => updateFunction(i, e.target.value)} placeholder="Descripción de la función" />
                    {form.functions.length > 1 && <Button size="icon" variant="ghost" onClick={() => removeFunction(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={addFunction}><Plus className="w-3 h-3 mr-1" />Agregar función</Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Responsabilidades */}
            <Collapsible>
              <SectionHeader>4. Responsabilidades</SectionHeader>
              <CollapsibleContent className="space-y-3 pt-3">
                {[
                  ['equipment', 'Equipos'],
                  ['materials', 'Materiales'],
                  ['money', 'Dinero'],
                  ['information', 'Información'],
                  ['internal_relationships', 'Relaciones internas'],
                  ['external_relationships', 'Relaciones externas'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <Input value={(form.responsibilities as any)[key] || ''} onChange={e => updateResponsibility(key, e.target.value)} />
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Condiciones de Trabajo */}
            <Collapsible>
              <SectionHeader>5. Condiciones de Trabajo</SectionHeader>
              <CollapsibleContent className="space-y-3 pt-3">
                {[
                  ['physical_effort', 'Esfuerzo Físico'],
                  ['mental_effort', 'Esfuerzo Mental'],
                  ['work_environment', 'Ambiente de Trabajo'],
                  ['risks', 'Riesgos'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <Input value={(form.working_conditions as any)[key] || ''} onChange={e => updateCondition(key, e.target.value)} />
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Aprobaciones */}
            <Collapsible>
              <SectionHeader>6. Aprobaciones</SectionHeader>
              <CollapsibleContent className="space-y-3 pt-3">
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Elaborado por</Label><Input value={form.elaborated_by} onChange={e => updateField('elaborated_by', e.target.value)} /></div>
                  <div><Label>Revisado por</Label><Input value={form.reviewed_by} onChange={e => updateField('reviewed_by', e.target.value)} /></div>
                  <div><Label>Aprobado por</Label><Input value={form.approved_by} onChange={e => updateField('approved_by', e.target.value)} /></div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>
        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createProfile.isPending}>
            {createProfile.isPending ? 'Guardando...' : 'Guardar Perfil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
