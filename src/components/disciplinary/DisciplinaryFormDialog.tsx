import { useState, useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Plus, Scale, Trash2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DatePickerWithDropdowns } from '@/components/ui/date-picker-with-dropdowns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateDisciplinaryProcess } from '@/hooks/useDisciplinaryProcesses';
import {
  disciplinaryFormSchema,
  DisciplinaryFormData,
  faultTypeLabels,
  FaultType,
} from '@/types/disciplinary';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface DisciplinaryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
}

export function DisciplinaryFormDialog({
  open,
  onOpenChange,
  employeeId,
}: DisciplinaryFormDialogProps) {
  const { data: employees } = useEmployees();
  const createProcess = useCreateDisciplinaryProcess();
  const { currentCompanyId } = useAuth();
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  const form = useForm<DisciplinaryFormData>({
    resolver: zodResolver(disciplinaryFormSchema),
    defaultValues: {
      employee_id: employeeId || '',
      fault_type: 'leve',
      fault_date: new Date(),
      facts: [{ title: '', description: '', occurred_at: '', location: '' }],
      article_violated: '',
      legal_basis: [],
      proof_transfer: '',
      witnesses: '',
      investigator_name: '',
      observations: '',
    },
  });

  const { fields: factFields, append: appendFact, remove: removeFact } = useFieldArray({
    control: form.control,
    name: 'facts',
  });

  useEffect(() => {
    if (employeeId) {
      form.setValue('employee_id', employeeId);
    }
  }, [employeeId, form]);

  const onSubmit = async (data: DisciplinaryFormData) => {
    const process = await createProcess.mutateAsync(data);

    for (const file of evidenceFiles) {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const storagePath = `disciplinary/${currentCompanyId}/${process.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('disciplinary-evidence').upload(storagePath, file);
      if (uploadError) throw uploadError;
      const { error: evidenceError } = await supabase.from('disciplinary_evidence').insert({
        company_id: currentCompanyId!,
        process_id: process.id,
        evidence_type: 'foto',
        description: `Registro fotográfico aportado con el reporte: ${file.name}`,
        file_url: null,
        file_name: file.name,
        storage_path: storagePath,
        collected_date: format(new Date(), 'yyyy-MM-dd'),
      });
      if (evidenceError) throw evidenceError;
    }

    form.reset();
    setEvidenceFiles([]);
    onOpenChange(false);
  };

  const handleEvidenceFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    const invalid = incoming.find((file) => !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024);
    if (invalid) {
      toast({ title: 'Archivo no válido', description: 'Adjunte imágenes de máximo 10 MB cada una.', variant: 'destructive' });
      return;
    }
    setEvidenceFiles((current) => [...current, ...incoming]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden p-0 sm:h-auto sm:max-h-[95vh] rounded-[2rem] border-border/50 shadow-2xl">
        <DialogHeader className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-primary/10 blur-[40px] pointer-events-none" />
          <DialogTitle className="text-2xl font-black tracking-tight text-foreground relative z-10 flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary" />
            Nuevo Proceso Disciplinario
          </DialogTitle>
          <p className="text-muted-foreground font-medium mt-1 relative z-10">
            Registro formal de descargos y diligencias legales
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col bg-card/30">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="employee_id"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Empleado Involucrado *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium">
                            <SelectValue placeholder="Seleccione empleado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-border/50 shadow-xl max-h-[300px]">
                          {employees?.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id} className="rounded-lg py-3">
                              {emp.first_name} {emp.last_name} - {emp.document_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fault_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Calificación de la Falta *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium">
                            <SelectValue placeholder="Seleccione tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-border/50 shadow-xl">
                          {(Object.keys(faultTypeLabels) as FaultType[]).map((type) => (
                            <SelectItem key={type} value={type} className="rounded-lg py-3">
                              {faultTypeLabels[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fault_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha de los Hechos *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium text-left px-4 justify-start',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                              {field.value ? (
                                format(field.value, 'PPP', { locale: es })
                              ) : (
                                <span>Seleccione fecha</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          side="bottom"
                          sideOffset={8}
                          className="z-[120] w-auto rounded-2xl border-border/50 bg-background p-0 shadow-2xl"
                        >
                          <DatePickerWithDropdowns
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            fromYear={1990}
                            toYear={new Date().getFullYear()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 rounded-2xl border border-border/50 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Hechos reportados *</Label>
                    <p className="mt-1 text-xs text-muted-foreground">Agregue cada antecedente por separado; la citación conservará este orden.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendFact({ title: '', description: '', occurred_at: '', location: '' })}>
                    <Plus className="mr-1 h-4 w-4" /> Hecho
                  </Button>
                </div>
                {factFields.map((fact, index) => (
                  <div key={fact.id} className="space-y-3 rounded-xl border border-border/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">Hecho {index + 1}</span>
                      {factFields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeFact(index)} aria-label={`Eliminar hecho ${index + 1}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input placeholder="Título breve" {...form.register(`facts.${index}.title`)} />
                      <Input placeholder="Lugar (opcional)" {...form.register(`facts.${index}.location`)} />
                    </div>
                    <Input type="datetime-local" {...form.register(`facts.${index}.occurred_at`)} />
                    <Textarea className="min-h-[110px]" placeholder="Describa quién, qué, cuándo y cómo ocurrió..." {...form.register(`facts.${index}.description`)} />
                    {(form.formState.errors.facts?.[index]?.title || form.formState.errors.facts?.[index]?.description) && (
                      <p className="text-xs font-medium text-destructive">
                        {form.formState.errors.facts[index]?.title?.message || form.formState.errors.facts[index]?.description?.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Registros fotográficos</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 p-6 text-center hover:border-primary/40">
                  <Upload className="mb-2 h-6 w-6 text-primary" />
                  <span className="text-sm font-bold">Adjuntar una o varias fotografías</span>
                  <span className="text-xs text-muted-foreground">JPG, PNG o WEBP · máximo 10 MB por archivo</span>
                  <input className="hidden" type="file" accept="image/*" multiple onChange={(event) => handleEvidenceFiles(event.target.files)} />
                </label>
                {evidenceFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-xl border px-3 py-2 text-xs">
                    <span className="truncate">{file.name}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setEvidenceFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <FormField
                control={form.control}
                name="article_violated"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Normativa / RIT Violado</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Art. 15, Art. 23 del Reglamento Interno"
                        className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="legal_basis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Fundamentos normativos</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={'Registre un artículo o norma por línea\nEj: Artículo 60, numeral 2 del CST'}
                        className="min-h-[110px]"
                        value={(field.value || []).join('\n')}
                        onChange={(event) => field.onChange(event.target.value.split('\n').map((line) => line.trim()).filter(Boolean))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="proof_transfer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Traslado de pruebas</FormLabel>
                    <FormControl><Textarea className="min-h-[90px]" placeholder="Enumere los informes, fotografías y demás pruebas trasladadas al trabajador..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="witnesses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Testigos / Terceros</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nombres de testigos"
                          className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="investigator_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Responsable del Proceso</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nombre del investigador"
                          className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Notas Internas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observaciones adicionales no incluidas en el acta..."
                        className="min-h-[100px] rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium py-3"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border/50 bg-background p-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-12 px-6 rounded-xl font-bold text-muted-foreground hover:bg-background transition-all"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createProcess.isPending} 
                className="h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                {createProcess.isPending ? 'Procesando...' : 'Iniciar Proceso'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
