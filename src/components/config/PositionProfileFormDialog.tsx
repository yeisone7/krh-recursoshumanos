import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Plus, Trash2, Briefcase, GraduationCap, ListChecks, Shield, HardHat, Stamp, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useCreatePositionProfile, useUpdatePositionProfile, usePositionProfiles } from '@/hooks/usePositionProfiles';
import { useEducationLevels } from '@/hooks/useEducationLevels';
import type { PositionProfileFormData, SpecificKnowledge, Skill } from '@/types/positionProfile';

type DialogMode = 'create' | 'new_version' | 'edit';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positionId: string;
  positionName: string;
  existingData?: any;
  mode?: DialogMode;
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

export function PositionProfileFormDialog({ open, onOpenChange, positionId, positionName, existingData, mode = 'create' }: Props) {
  const [form, setForm] = useState<PositionProfileFormData>(defaultForm);
  const createProfile = useCreatePositionProfile();
  const updateProfile = useUpdatePositionProfile();
  const { data: allVersions = [] } = usePositionProfiles(positionId);

  const resolvedMode: DialogMode = mode === 'create' && existingData ? 'new_version' : mode;
  const isEditing = resolvedMode === 'edit';

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

  const addFunction = () => updateField('functions', [...form.functions, '']);
  const removeFunction = (i: number) => updateField('functions', form.functions.filter((_, idx) => idx !== i));
  const updateFunction = (i: number, val: string) => {
    const copy = [...form.functions];
    copy[i] = val;
    updateField('functions', copy);
  };

  const addKnowledge = () => updateField('specific_knowledge', [...form.specific_knowledge, { topic: '', level: 'básico' as const }]);
  const removeKnowledge = (i: number) => updateField('specific_knowledge', form.specific_knowledge.filter((_, idx) => idx !== i));
  const updateKnowledge = (i: number, field: keyof SpecificKnowledge, val: string) => {
    const copy = [...form.specific_knowledge];
    copy[i] = { ...copy[i], [field]: val };
    updateField('specific_knowledge', copy);
  };

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
    const cleanedData = { ...form, functions: form.functions.filter(f => f.trim()) };

    try {
      if (isEditing && existingData?.id) {
        await updateProfile.mutateAsync({
          profileId: existingData.id,
          data: cleanedData,
        });
        toast.success('Perfil actualizado exitosamente');
      } else {
        const nextVersion = allVersions.length > 0 ? Math.max(...allVersions.map((v: any) => v.version)) + 1 : 1;
        await createProfile.mutateAsync({
          positionId,
          data: cleanedData,
          nextVersion,
        });
        toast.success(`Perfil v${nextVersion} creado exitosamente`);
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const isPending = createProfile.isPending || updateProfile.isPending;

  const { data: educationLevels = [] } = useEducationLevels();

  const titleText = isEditing
    ? `Editar Perfil v${existingData?.version || ''}`
    : existingData
      ? 'Nueva versión del Perfil'
      : 'Crear Perfil de Cargo';

  const titleIcon = isEditing ? Pencil : Briefcase;
  const TitleIcon = titleIcon;

  const SectionHeader = ({ icon: Icon, num, label, count }: { icon: any; num: number; label: string; count?: number }) => (
    <CollapsibleTrigger className="group flex w-full items-center gap-3 rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <span className="flex-1 text-left">{num}. {label}</span>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="text-xs font-normal">{count}</Badge>
      )}
      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );

  const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      {children} {required && <span className="text-destructive">*</span>}
    </Label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-xl p-0">
        {/* Header */}
        <DialogHeader className="border-b border-border/50 px-4 pb-4 pt-4 sm:px-6 sm:pt-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isEditing ? 'bg-secondary/10' : 'bg-primary/10'}`}>
              <TitleIcon className={`h-5 w-5 ${isEditing ? 'text-secondary' : 'text-primary'}`} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold">{titleText}</DialogTitle>
              <p className="mt-0.5 break-words text-sm text-muted-foreground">{positionName}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="space-y-5">

            {/* 1. Identificación */}
            <Collapsible defaultOpen>
              <SectionHeader icon={Briefcase} num={1} label="Identificación del Cargo" />
              <CollapsibleContent className="space-y-4 pt-4 pl-1">
                <div>
                  <FieldLabel required>Objetivo del Cargo</FieldLabel>
                  <Textarea
                    className="mt-1.5 min-h-[80px] resize-y"
                    placeholder="Describa el objetivo principal del cargo..."
                    value={form.purpose}
                    onChange={e => updateField('purpose', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Reporta a</FieldLabel>
                    <Input className="mt-1.5" placeholder="Cargo del jefe inmediato" value={form.reports_to} onChange={e => updateField('reports_to', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Supervisa a</FieldLabel>
                    <Input className="mt-1.5" placeholder="Cargos bajo supervisión" value={form.supervises} onChange={e => updateField('supervises', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>N° de Cargos</FieldLabel>
                    <Input className="mt-1.5" type="number" min={1} value={form.num_positions} onChange={e => updateField('num_positions', parseInt(e.target.value) || 1)} />
                  </div>
                  <div>
                    <FieldLabel>Fecha vigencia</FieldLabel>
                    <Input className="mt-1.5" type="date" value={form.effective_date} onChange={e => updateField('effective_date', e.target.value)} />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* 2. Perfil */}
            <Collapsible defaultOpen>
              <SectionHeader icon={GraduationCap} num={2} label="Perfil del Cargo" count={form.specific_knowledge.length + form.skills.length} />
              <CollapsibleContent className="space-y-4 pt-4 pl-1">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Nivel de Educación</FieldLabel>
                    <Select value={form.education_level} onValueChange={v => updateField('education_level', v)}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {educationLevels.map(l => (
                          <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>Detalle Formación</FieldLabel>
                    <Input className="mt-1.5" placeholder="Ej: Ingeniería Industrial" value={form.education_detail} onChange={e => updateField('education_detail', e.target.value)} />
                  </div>
                </div>
                <div>
                  <FieldLabel>Experiencia</FieldLabel>
                  <Input className="mt-1.5" placeholder="Ej: 2 años en cargos similares" value={form.experience} onChange={e => updateField('experience', e.target.value)} />
                </div>

                {/* Conocimientos */}
                <div className="rounded-lg border border-border/50 p-4 bg-muted/20">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium text-foreground">Conocimientos Específicos</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addKnowledge}>
                      <Plus className="w-3 h-3 mr-1" />Agregar
                    </Button>
                  </div>
                  {form.specific_knowledge.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Sin conocimientos agregados</p>
                  )}
                  <div className="space-y-2">
                    {form.specific_knowledge.map((k, i) => (
                      <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input className="flex-1" placeholder="Tema" value={k.topic} onChange={e => updateKnowledge(i, 'topic', e.target.value)} />
                        <Select value={k.level} onValueChange={v => updateKnowledge(i, 'level', v)}>
                          <SelectTrigger className="w-full sm:w-[120px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="básico">Básico</SelectItem>
                            <SelectItem value="intermedio">Intermedio</SelectItem>
                            <SelectItem value="avanzado">Avanzado</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeKnowledge(i)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Competencias */}
                <div className="rounded-lg border border-border/50 p-4 bg-muted/20">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium text-foreground">Competencias / Habilidades</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addSkill}>
                      <Plus className="w-3 h-3 mr-1" />Agregar
                    </Button>
                  </div>
                  {form.skills.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Sin competencias agregadas</p>
                  )}
                  <div className="space-y-2">
                    {form.skills.map((s, i) => (
                      <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input className="flex-1" placeholder="Competencia" value={s.name} onChange={e => updateSkill(i, 'name', e.target.value)} />
                        <Select value={s.level} onValueChange={v => updateSkill(i, 'level', v)}>
                          <SelectTrigger className="w-full sm:w-[120px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bajo">Bajo</SelectItem>
                            <SelectItem value="medio">Medio</SelectItem>
                            <SelectItem value="alto">Alto</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeSkill(i)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* 3. Funciones */}
            <Collapsible defaultOpen>
              <SectionHeader icon={ListChecks} num={3} label="Funciones del Cargo" count={form.functions.filter(f => f.trim()).length} />
              <CollapsibleContent className="space-y-3 pt-4 pl-1">
                {form.functions.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <Input className="flex-1" value={f} onChange={e => updateFunction(i, e.target.value)} placeholder="Descripción de la función" />
                    {form.functions.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeFunction(i)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addFunction}>
                  <Plus className="w-3 h-3 mr-1" />Agregar función
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* 4. Responsabilidades */}
            <Collapsible>
              <SectionHeader icon={Shield} num={4} label="Responsabilidades" />
              <CollapsibleContent className="space-y-3 pt-4 pl-1">
                {[
                  ['equipment', 'Equipos'],
                  ['materials', 'Materiales'],
                  ['money', 'Dinero'],
                  ['information', 'Información'],
                  ['internal_relationships', 'Relaciones internas'],
                  ['external_relationships', 'Relaciones externas'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <FieldLabel>{label}</FieldLabel>
                    <Input className="mt-1.5" value={(form.responsibilities as any)[key] || ''} onChange={e => updateResponsibility(key, e.target.value)} />
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* 5. Condiciones de Trabajo */}
            <Collapsible>
              <SectionHeader icon={HardHat} num={5} label="Condiciones de Trabajo" />
              <CollapsibleContent className="space-y-3 pt-4 pl-1">
                {[
                  ['physical_effort', 'Esfuerzo Físico'],
                  ['mental_effort', 'Esfuerzo Mental'],
                  ['work_environment', 'Ambiente de Trabajo'],
                  ['risks', 'Riesgos'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <FieldLabel>{label}</FieldLabel>
                    <Input className="mt-1.5" value={(form.working_conditions as any)[key] || ''} onChange={e => updateCondition(key, e.target.value)} />
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* 6. Aprobaciones */}
            <Collapsible>
              <SectionHeader icon={Stamp} num={6} label="Aprobaciones" />
              <CollapsibleContent className="space-y-3 pt-4 pl-1">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <FieldLabel>Elaborado por</FieldLabel>
                    <Input className="mt-1.5" value={form.elaborated_by} onChange={e => updateField('elaborated_by', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Revisado por</FieldLabel>
                    <Input className="mt-1.5" value={form.reviewed_by} onChange={e => updateField('reviewed_by', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Aprobado por</FieldLabel>
                    <Input className="mt-1.5" value={form.approved_by} onChange={e => updateField('approved_by', e.target.value)} />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-border/50 bg-muted/30 px-4 py-4 sm:flex-row sm:gap-0 sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="w-full sm:w-auto">
            {isPending ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Guardar Perfil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
