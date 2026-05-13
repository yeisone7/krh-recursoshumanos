import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Plus, Trash2, Briefcase, GraduationCap, ListChecks, Shield, HardHat, Stamp, Pencil, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
    <CollapsibleTrigger className="group flex w-full items-center gap-4 rounded-2xl border-2 border-border/50 bg-background/50 px-5 py-4 text-sm font-black uppercase tracking-widest text-foreground transition-all hover:border-primary/30 hover:bg-muted/30">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 text-primary-foreground group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5" />
      </div>
      <span className="flex-1 text-left">{num}. {label}</span>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="rounded-lg font-black">{count}</Badge>
      )}
      <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );

  const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
      {children} {required && <span className="text-destructive">*</span>}
    </Label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95dvh] w-[calc(100vw-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 border-none bg-transparent shadow-none">
        <div className="flex h-full flex-col overflow-hidden rounded-[2.5rem] border-2 border-primary/10 bg-background/95 backdrop-blur-2xl shadow-2xl">
          
          {/* Premium Header */}
          <DialogHeader className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 border-b border-primary/10 shrink-0">
            <div className="relative z-10 flex items-center gap-5">
              <div className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-all",
                isEditing ? "bg-secondary shadow-secondary/20" : "bg-primary shadow-primary/20"
              )}>
                <TitleIcon className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-foreground leading-tight">
                  {isEditing ? 'Editar' : 'Nuevo'} <span className="text-primary">Perfil</span>
                </DialogTitle>
                <p className="text-sm font-medium text-muted-foreground mt-1 truncate max-w-md">
                  {positionName}
                </p>
              </div>
            </div>
            {/* Decorative blurs */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="min-h-0 flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="space-y-6">

              {/* 1. Identificación */}
              <Collapsible defaultOpen>
                <SectionHeader icon={Briefcase} num={1} label="Identificación del Cargo" />
                <CollapsibleContent className="space-y-5 pt-6 px-2">
                  <div>
                    <FieldLabel required>Objetivo del Cargo</FieldLabel>
                    <Textarea
                      className="mt-2 min-h-[100px] rounded-2xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold resize-none"
                      placeholder="Describa el objetivo principal del cargo..."
                      value={form.purpose}
                      onChange={e => updateField('purpose', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Reporta a</FieldLabel>
                      <Input 
                        className="mt-2 h-12 rounded-xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold" 
                        placeholder="Cargo del jefe inmediato" 
                        value={form.reports_to} 
                        onChange={e => updateField('reports_to', e.target.value)} 
                      />
                    </div>
                    <div>
                      <FieldLabel>Supervisa a</FieldLabel>
                      <Input 
                        className="mt-2 h-12 rounded-xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold" 
                        placeholder="Cargos bajo supervisión" 
                        value={form.supervises} 
                        onChange={e => updateField('supervises', e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <FieldLabel>N° de Cargos</FieldLabel>
                      <Input 
                        className="mt-2 h-12 rounded-xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold" 
                        type="number" 
                        min={1} 
                        value={form.num_positions} 
                        onChange={e => updateField('num_positions', parseInt(e.target.value) || 1)} 
                      />
                    </div>
                    <div>
                      <FieldLabel>Fecha vigencia</FieldLabel>
                      <Input 
                        className="mt-2 h-12 rounded-xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold" 
                        type="date" 
                        value={form.effective_date} 
                        onChange={e => updateField('effective_date', e.target.value)} 
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* 2. Perfil */}
              <Collapsible defaultOpen>
                <SectionHeader icon={GraduationCap} num={2} label="Perfil del Cargo" count={form.specific_knowledge.length + form.skills.length} />
                <CollapsibleContent className="space-y-5 pt-6 px-2">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Nivel de Educación</FieldLabel>
                      <Select value={form.education_level} onValueChange={v => updateField('education_level', v)}>
                        <SelectTrigger className="mt-2 h-12 rounded-xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-primary/10 backdrop-blur-xl bg-background/95">
                          {educationLevels.map(l => (
                            <SelectItem key={l.id} value={l.name} className="font-bold">{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <FieldLabel>Detalle Formación</FieldLabel>
                      <Input 
                        className="mt-2 h-12 rounded-xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold" 
                        placeholder="Ej: Ingeniería Industrial" 
                        value={form.education_detail} 
                        onChange={e => updateField('education_detail', e.target.value)} 
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Experiencia</FieldLabel>
                    <Input 
                      className="mt-2 h-12 rounded-xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold" 
                      placeholder="Ej: 2 años en cargos similares" 
                      value={form.experience} 
                      onChange={e => updateField('experience', e.target.value)} 
                    />
                  </div>

                  {/* Conocimientos */}
                  <div className="rounded-[2rem] border-2 border-border/50 p-6 bg-muted/20">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">Conocimientos Específicos</span>
                      <Button size="sm" variant="outline" className="h-8 rounded-xl font-black uppercase tracking-widest text-[9px] gap-2 border-2" onClick={addKnowledge}>
                        <Plus className="w-3 h-3" /> Agregar
                      </Button>
                    </div>
                    {form.specific_knowledge.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-4">Sin conocimientos agregados</p>
                    )}
                    <div className="space-y-3">
                      {form.specific_knowledge.map((k, i) => (
                        <div key={i} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <Input 
                            className="flex-1 h-11 rounded-xl bg-background/50 border-none shadow-none focus-visible:ring-2 ring-primary/20 font-bold" 
                            placeholder="Tema" 
                            value={k.topic} 
                            onChange={e => updateKnowledge(i, 'topic', e.target.value)} 
                          />
                          <Select value={k.level} onValueChange={v => updateKnowledge(i, 'level', v)}>
                            <SelectTrigger className="w-full sm:w-[140px] h-11 rounded-xl bg-background/50 border-none shadow-none focus-visible:ring-2 ring-primary/20 font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl font-bold">
                              <SelectItem value="básico">Básico</SelectItem>
                              <SelectItem value="intermedio">Intermedio</SelectItem>
                              <SelectItem value="avanzado">Avanzado</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all" onClick={() => removeKnowledge(i)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Competencias */}
                  <div className="rounded-[2rem] border-2 border-border/50 p-6 bg-muted/20">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">Competencias / Habilidades</span>
                      <Button size="sm" variant="outline" className="h-8 rounded-xl font-black uppercase tracking-widest text-[9px] gap-2 border-2" onClick={addSkill}>
                        <Plus className="w-3 h-3" /> Agregar
                      </Button>
                    </div>
                    {form.skills.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-4">Sin competencias agregadas</p>
                    )}
                    <div className="space-y-3">
                      {form.skills.map((s, i) => (
                        <div key={i} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <Input 
                            className="flex-1 h-11 rounded-xl bg-background/50 border-none shadow-none focus-visible:ring-2 ring-primary/20 font-bold" 
                            placeholder="Competencia" 
                            value={s.name} 
                            onChange={e => updateSkill(i, 'name', e.target.value)} 
                          />
                          <Select value={s.level} onValueChange={v => updateSkill(i, 'level', v)}>
                            <SelectTrigger className="w-full sm:w-[140px] h-11 rounded-xl bg-background/50 border-none shadow-none focus-visible:ring-2 ring-primary/20 font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl font-bold">
                              <SelectItem value="bajo">Bajo</SelectItem>
                              <SelectItem value="medio">Medio</SelectItem>
                              <SelectItem value="alto">Alto</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all" onClick={() => removeSkill(i)}>
                            <Trash2 className="w-4 h-4" />
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
                <CollapsibleContent className="space-y-4 pt-6 px-2">
                  <div className="space-y-3">
                    {form.functions.map((f, i) => (
                      <div key={i} className="flex items-center gap-4 group">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-black text-primary transition-all group-hover:scale-110">
                          {i + 1}
                        </div>
                        <Input 
                          className="flex-1 h-12 rounded-xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold" 
                          value={f} 
                          onChange={e => updateFunction(i, e.target.value)} 
                          placeholder="Descripción de la función" 
                        />
                        {form.functions.length > 1 && (
                          <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => removeFunction(i)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-10 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 border-2 ml-12" 
                    onClick={addFunction}
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar función
                  </Button>
                </CollapsibleContent>
              </Collapsible>

              {/* 4. Responsabilidades */}
              <Collapsible>
                <SectionHeader icon={Shield} num={4} label="Responsabilidades" />
                <CollapsibleContent className="space-y-5 pt-6 px-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                        <Input 
                          className="mt-2 h-12 rounded-xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold" 
                          value={(form.responsibilities as any)[key] || ''} 
                          onChange={e => updateResponsibility(key, e.target.value)} 
                        />
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* 5. Condiciones de Trabajo */}
              <Collapsible>
                <SectionHeader icon={HardHat} num={5} label="Condiciones de Trabajo" />
                <CollapsibleContent className="space-y-5 pt-6 px-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[
                      ['physical_effort', 'Esfuerzo Físico'],
                      ['mental_effort', 'Esfuerzo Mental'],
                      ['work_environment', 'Ambiente de Trabajo'],
                      ['risks', 'Riesgos'],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <FieldLabel>{label}</FieldLabel>
                        <Input 
                          className="mt-2 h-12 rounded-xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold" 
                          value={(form.working_conditions as any)[key] || ''} 
                          onChange={e => updateCondition(key, e.target.value)} 
                        />
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* 6. Aprobaciones */}
              <Collapsible>
                <SectionHeader icon={Stamp} num={6} label="Aprobaciones" />
                <CollapsibleContent className="space-y-5 pt-6 px-2">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <div>
                      <FieldLabel>Elaborado por</FieldLabel>
                      <Input 
                        className="mt-2 h-12 rounded-xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold" 
                        value={form.elaborated_by} 
                        onChange={e => updateField('elaborated_by', e.target.value)} 
                      />
                    </div>
                    <div>
                      <FieldLabel>Revisado por</FieldLabel>
                      <Input 
                        className="mt-2 h-12 rounded-xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold" 
                        value={form.reviewed_by} 
                        onChange={e => updateField('reviewed_by', e.target.value)} 
                      />
                    </div>
                    <div>
                      <FieldLabel>Aprobado por</FieldLabel>
                      <Input 
                        className="mt-2 h-12 rounded-xl bg-muted/30 border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold" 
                        value={form.approved_by} 
                        onChange={e => updateField('approved_by', e.target.value)} 
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="shrink-0 flex-col-reverse gap-3 border-t border-primary/10 bg-muted/30 p-8 sm:flex-row sm:gap-4">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)} 
              className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isPending} 
              className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-105 transition-all"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isEditing ? 'Guardar Cambios' : 'Guardar Perfil'
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
