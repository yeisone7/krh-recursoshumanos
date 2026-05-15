import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, X } from 'lucide-react';
import { useCreateProfileAnnex, useUpdateProfileAnnex } from '@/hooks/useProfileAnnexes';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { SpecificKnowledge, Skill } from '@/types/positionProfile';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  baseProfile: any;
  existingAnnex?: any;
  existingCenterIds: string[];
}

const SECTIONS = [
  { key: 'purpose', label: 'Objetivo del cargo', type: 'text' },
  { key: 'reports_to', label: 'Reporta a', type: 'input' },
  { key: 'supervises', label: 'Supervisa a', type: 'input' },
  { key: 'num_positions', label: 'Número de cargos', type: 'number' },
  { key: 'education_level', label: 'Nivel de educación', type: 'input' },
  { key: 'education_detail', label: 'Formación específica', type: 'input' },
  { key: 'experience', label: 'Experiencia requerida', type: 'text' },
  { key: 'specific_knowledge', label: 'Conocimientos específicos', type: 'knowledge' },
  { key: 'skills', label: 'Competencias', type: 'skills' },
  { key: 'functions', label: 'Funciones del cargo', type: 'functions' },
  { key: 'responsibilities', label: 'Responsabilidades', type: 'responsibilities' },
  { key: 'working_conditions', label: 'Condiciones de trabajo', type: 'conditions' },
] as const;

export function ProfileAnnexForm({ open, onOpenChange, profileId, baseProfile, existingAnnex, existingCenterIds }: Props) {
  const { currentCompanyId } = useAuth();
  const createAnnex = useCreateProfileAnnex();
  const updateAnnex = useUpdateProfileAnnex();
  const isEditing = !!existingAnnex;

  const [centerId, setCenterId] = useState('');
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState('');

  const { data: centers = [] } = useQuery({
    queryKey: ['operation_centers_for_annexes', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operation_centers')
        .select('id, name')
        .eq('company_id', currentCompanyId!)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId && open,
  });

  const availableCenters = isEditing
    ? centers
    : centers.filter(c => !existingCenterIds.includes(c.id));

  useEffect(() => {
    if (!open) return;
    if (existingAnnex) {
      setCenterId(existingAnnex.operation_center_id);
      setNotes(existingAnnex.notes || '');
      const enabled: Record<string, boolean> = {};
      const vals: Record<string, any> = {};
      SECTIONS.forEach(s => {
        const val = existingAnnex[s.key];
        const hasValue = val !== null && val !== undefined && 
          (Array.isArray(val) ? val.length > 0 : typeof val === 'object' ? Object.keys(val).length > 0 : String(val).trim() !== '');
        enabled[s.key] = hasValue;
        vals[s.key] = hasValue ? val : (baseProfile?.[s.key] ?? '');
      });
      setEnabledFields(enabled);
      setValues(vals);
    } else {
      setCenterId('');
      setNotes('');
      setEnabledFields({});
      const vals: Record<string, any> = {};
      SECTIONS.forEach(s => { vals[s.key] = baseProfile?.[s.key] ?? ''; });
      setValues(vals);
    }
  }, [open, existingAnnex, baseProfile]);

  const toggleField = (key: string) => {
    setEnabledFields(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next[key]) {
        setValues(prev => ({ ...prev, [key]: baseProfile?.[key] ?? '' }));
      }
      return next;
    });
  };

  const setValue = (key: string, val: any) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    if (!isEditing && !centerId) {
      toast.error('Selecciona un centro de operación');
      return;
    }

    const payload: any = { operation_center_id: centerId, notes: notes || null };
    SECTIONS.forEach(s => {
      payload[s.key] = enabledFields[s.key] ? values[s.key] : null;
    });

    try {
      if (isEditing) {
        const { operation_center_id, ...rest } = payload;
        await updateAnnex.mutateAsync({ annexId: existingAnnex.id, data: rest });
        toast.success('Anexo actualizado');
      } else {
        await createAnnex.mutateAsync({ profileId, data: payload });
        toast.success('Anexo creado');
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    }
  };

  const isSaving = createAnnex.isPending || updateAnnex.isPending;

  const renderField = (section: typeof SECTIONS[number]) => {
    const isEnabled = !!enabledFields[section.key];
    const baseValue = baseProfile?.[section.key];
    const currentValue = values[section.key];

    return (
      <Card key={section.key} className={`transition-colors ${isEnabled ? 'border-primary/30 ' : ''}`}>
        <CardContent className="py-3 px-4 space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isEnabled}
              onCheckedChange={() => toggleField(section.key)}
              id={`toggle-${section.key}`}
            />
            <Label htmlFor={`toggle-${section.key}`} className="text-sm font-medium cursor-pointer">
              {section.label}
            </Label>
            {!isEnabled && baseValue && (
              <Badge variant="outline" className="text-[10px] ml-auto">Hereda del base</Badge>
            )}
          </div>

          {isEnabled && (
            <div className="pl-6">
              {baseValue && section.type !== 'knowledge' && section.type !== 'skills' && section.type !== 'functions' && section.type !== 'responsibilities' && section.type !== 'conditions' && (
                <p className="text-xs text-muted-foreground line-through mb-1">
                  Base: {typeof baseValue === 'object' ? JSON.stringify(baseValue) : String(baseValue)}
                </p>
              )}
              {renderInput(section, currentValue, (val: any) => setValue(section.key, val))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{isEditing ? 'Editar Anexo' : 'Nuevo Anexo por Centro de Operación'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] px-6 pb-6">
          <div className="space-y-4 pt-2">
            {!isEditing && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Centro de Operación</Label>
                <Select value={centerId} onValueChange={setCenterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar centro..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCenters.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableCenters.length === 0 && (
                  <p className="text-xs text-muted-foreground">Todos los centros ya tienen anexo asignado.</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nota justificativa (opcional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Describe por qué este centro necesita personalizaciones..."
                className="min-h-[60px]"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                Activa solo los campos que necesitas personalizar. Los demás se heredan del perfil base.
              </p>
              {SECTIONS.map(s => renderField(s))}
            </div>

            <div className="flex justify-end gap-2 pt-2 pb-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {isEditing ? 'Actualizar Anexo' : 'Crear Anexo'}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function renderInput(section: typeof SECTIONS[number], value: any, onChange: (val: any) => void) {
  switch (section.type) {
    case 'input':
      return <Input value={value || ''} onChange={e => onChange(e.target.value)} />;
    case 'number':
      return <Input type="number" value={value || ''} onChange={e => onChange(Number(e.target.value))} />;
    case 'text':
      return <Textarea value={value || ''} onChange={e => onChange(e.target.value)} className="min-h-[60px]" />;
    case 'knowledge':
      return <KnowledgeEditor value={value || []} onChange={onChange} />;
    case 'skills':
      return <SkillsEditor value={value || []} onChange={onChange} />;
    case 'functions':
      return <FunctionsEditor value={value || []} onChange={onChange} />;
    case 'responsibilities':
      return <ResponsibilitiesEditor value={value || {}} onChange={onChange} />;
    case 'conditions':
      return <ConditionsEditor value={value || {}} onChange={onChange} />;
    default:
      return null;
  }
}

function KnowledgeEditor({ value, onChange }: { value: SpecificKnowledge[]; onChange: (v: SpecificKnowledge[]) => void }) {
  const add = () => onChange([...value, { topic: '', level: 'básico' }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const update = (i: number, field: string, val: string) => {
    const copy = [...value];
    (copy[i] as any)[field] = val;
    onChange(copy);
  };

  return (
    <div className="space-y-2">
      {value.map((k, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input className="flex-1" placeholder="Tema" value={k.topic} onChange={e => update(i, 'topic', e.target.value)} />
          <Select value={k.level} onValueChange={v => update(i, 'level', v)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="básico">Básico</SelectItem>
              <SelectItem value="intermedio">Intermedio</SelectItem>
              <SelectItem value="avanzado">Avanzado</SelectItem>
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(i)}><X className="w-3 h-3" /></Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add}><Plus className="w-3 h-3 mr-1" />Agregar</Button>
    </div>
  );
}

function SkillsEditor({ value, onChange }: { value: Skill[]; onChange: (v: Skill[]) => void }) {
  const add = () => onChange([...value, { name: '', level: 'medio' }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const update = (i: number, field: string, val: string) => {
    const copy = [...value];
    (copy[i] as any)[field] = val;
    onChange(copy);
  };

  return (
    <div className="space-y-2">
      {value.map((s, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input className="flex-1" placeholder="Competencia" value={s.name} onChange={e => update(i, 'name', e.target.value)} />
          <Select value={s.level} onValueChange={v => update(i, 'level', v)}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bajo">Bajo</SelectItem>
              <SelectItem value="medio">Medio</SelectItem>
              <SelectItem value="alto">Alto</SelectItem>
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(i)}><X className="w-3 h-3" /></Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add}><Plus className="w-3 h-3 mr-1" />Agregar</Button>
    </div>
  );
}

function FunctionsEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const add = () => onChange([...value, '']);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const update = (i: number, val: string) => {
    const copy = [...value];
    copy[i] = val;
    onChange(copy);
  };

  return (
    <div className="space-y-2">
      {value.map((f, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input className="flex-1" placeholder={`Función ${i + 1}`} value={f} onChange={e => update(i, e.target.value)} />
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(i)}><X className="w-3 h-3" /></Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add}><Plus className="w-3 h-3 mr-1" />Agregar</Button>
    </div>
  );
}

const RESP_FIELDS = [
  { key: 'equipment', label: 'Equipos' },
  { key: 'materials', label: 'Materiales' },
  { key: 'money', label: 'Dinero' },
  { key: 'information', label: 'Información' },
  { key: 'internal_relationships', label: 'Relaciones internas' },
  { key: 'external_relationships', label: 'Relaciones externas' },
];

function ResponsibilitiesEditor({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const update = (key: string, val: string) => onChange({ ...value, [key]: val });

  return (
    <div className="space-y-2">
      {RESP_FIELDS.map(f => (
        <div key={f.key}>
          <Label className="text-xs">{f.label}</Label>
          <Input value={value[f.key] || ''} onChange={e => update(f.key, e.target.value)} />
        </div>
      ))}
    </div>
  );
}

const COND_FIELDS = [
  { key: 'physical_effort', label: 'Esfuerzo físico' },
  { key: 'mental_effort', label: 'Esfuerzo mental' },
  { key: 'work_environment', label: 'Ambiente de trabajo' },
  { key: 'risks', label: 'Riesgos' },
];

function ConditionsEditor({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const update = (key: string, val: string) => onChange({ ...value, [key]: val });

  return (
    <div className="space-y-2">
      {COND_FIELDS.map(f => (
        <div key={f.key}>
          <Label className="text-xs">{f.label}</Label>
          <Input value={value[f.key] || ''} onChange={e => update(f.key, e.target.value)} />
        </div>
      ))}
    </div>
  );
}
