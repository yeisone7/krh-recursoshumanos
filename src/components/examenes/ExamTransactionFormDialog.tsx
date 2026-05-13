import { useState, useEffect, useMemo } from 'react';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Stethoscope, User, FileText, Plus, Trash2, Sparkles, History, Loader2, CheckCircle } from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';

import { useEmployees } from '@/hooks/useEmployees';
import { getEmployeeFullName } from '@/types/employee';
import { useExamCatalog } from '@/hooks/useExamCatalog';
import { useExamProfesiogramaByEmployee } from '@/hooks/useExamProfesiograma';
import { useCreateExamTransaction, useCreateExamDeliveryItem } from '@/hooks/useExamTransactions';

import { examTypeLabels } from '@/types/medicalExam';
import type { ExamType } from '@/types/medicalExam';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ExamItem {
  selected: boolean;
  exam_catalog_id: string | null;
  exam_name: string;
  result: string;
  fromProfesiograma: boolean;
  expiration_date: string;
}

export function ExamTransactionFormDialog({ open, onOpenChange, onSuccess }: Props) {
  const { data: employees = [] } = useEmployees();
  const { data: catalog = [] } = useExamCatalog();
  const createTransaction = useCreateExamTransaction();
  const createItem = useCreateExamDeliveryItem();

  const [employeeId, setEmployeeId] = useState('');
  const [examDate, setExamDate] = useState<Date>(new Date());
  const [examType, setExamType] = useState<ExamType>('periodico');
  const [provider, setProvider] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ExamItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedEmployee = employees.find(e => e.id === employeeId);
  const { data: profesiograma, isLoading: loadingProf } = useExamProfesiogramaByEmployee(employeeId || undefined);

  useEffect(() => {
    if (!employeeId) {
      setItems([]);
      return;
    }
    if (profesiograma && profesiograma.items.length > 0) {
      setItems(profesiograma.items.map((pi: any) => ({
        selected: true,
        exam_catalog_id: pi.exam_catalog_id,
        exam_name: pi.exam_catalog?.name || 'Examen',
        result: 'pendiente',
        fromProfesiograma: true,
        expiration_date: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
      })));
    } else if (!loadingProf) {
      setItems([]);
    }
  }, [profesiograma, employeeId, loadingProf]);

  const handleReset = () => {
    setEmployeeId('');
    setExamDate(new Date());
    setExamType('periodico');
    setProvider('');
    setDoctorName('');
    setNotes('');
    setItems([]);
  };

  const addManualItem = () => {
    const activeExams = catalog.filter(c => c.is_active);
    const available = activeExams.filter(e => !items.some(i => i.exam_catalog_id === e.id));
    if (available.length > 0) {
      setItems([...items, {
        selected: true,
        exam_catalog_id: available[0].id,
        exam_name: available[0].name,
        result: 'pendiente',
        fromProfesiograma: false,
        expiration_date: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
      }]);
    } else {
      setItems([...items, {
        selected: true,
        exam_catalog_id: null,
        exam_name: '',
        result: 'pendiente',
        fromProfesiograma: false,
        expiration_date: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
      }]);
    }
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof ExamItem, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const selectedItems = items.filter(i => i.selected);

  const handleSubmit = async () => {
    if (!employeeId) { toast.error('Selecciona un empleado'); return; }
    if (selectedItems.length === 0) { toast.error('Selecciona al menos un examen'); return; }
    const invalidItems = selectedItems.filter(i => !i.exam_name.trim());
    if (invalidItems.length > 0) { toast.error('Todos los exámenes deben tener nombre'); return; }

    setIsSubmitting(true);
    try {
      const transaction = await createTransaction.mutateAsync({
        employee_id: employeeId,
        exam_date: format(examDate, 'yyyy-MM-dd'),
        exam_type: examType,
        provider: provider || null,
        doctor_name: doctorName || null,
        observations: notes || null,
      });

      for (const item of selectedItems) {
        await createItem.mutateAsync({
          transaction_id: transaction.id,
          exam_catalog_id: item.exam_catalog_id,
          exam_name: item.exam_name,
          result: item.result,
          expiration_date: item.expiration_date || format(addMonths(examDate, 12), 'yyyy-MM-dd'),
        });
      }

      const employeeName = selectedEmployee ? getEmployeeFullName(selectedEmployee) : 'el empleado';
      toast.success('Aplicación registrada', {
        description: `Se registraron ${selectedItems.length} examen(es) para ${employeeName}.`,
      });

      onOpenChange(false);
      handleReset();
      onSuccess?.();
    } catch (error: any) {
      toast.error('Error al registrar', { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeExams = catalog.filter(c => c.is_active);
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="max-h-[95vh] w-[calc(100vw-2rem)] max-w-3xl overflow-hidden p-0 sm:w-full rounded-[2.5rem] border-0 shadow-2xl bg-background/95 backdrop-blur-xl flex flex-col">
        <DialogHeader className="px-10 py-10 bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b border-primary/10 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
          <div className="relative flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Stethoscope className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-3xl font-black tracking-tighter text-foreground">
                Nueva Aplicación de Exámenes
              </DialogTitle>
              <DialogDescription className="text-[11px] font-bold text-muted-foreground mt-1.5 flex items-center gap-2">
                Registra exámenes médicos aplicados a un empleado
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="employee" className="flex-1 overflow-hidden flex flex-col">
          <div className="px-10 pt-8 shrink-0">
            <TabsList className="h-14 bg-muted/40 backdrop-blur-md p-1.5 rounded-[1.25rem] w-full grid grid-cols-3 border border-border/50 shadow-sm">
              <TabsTrigger value="employee" className="rounded-[1rem] gap-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 transition-all">
                <User className="w-4 h-4" /> Empleado
              </TabsTrigger>
              <TabsTrigger value="exams" className="rounded-[1rem] gap-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 transition-all">
                <Stethoscope className="w-4 h-4" /> Exámenes
                {selectedItems.length > 0 && (
                  <Badge className="ml-1 h-5 px-2 text-[9px] font-black bg-primary-foreground text-primary rounded-full">{selectedItems.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="details" className="rounded-[1rem] gap-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 transition-all">
                <FileText className="w-4 h-4" /> Detalles
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            <TabsContent value="employee" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seleccionar Empleado *</Label>
                <SearchableSelect
                  options={employees.filter(e => e.is_active).map(emp => ({
                    value: emp.id,
                    label: `${getEmployeeFullName(emp)} - ${emp.document_number}`
                  }))}
                  value={employeeId}
                  onValueChange={setEmployeeId}
                  placeholder="Seleccionar empleado"
                  searchPlaceholder="Buscar por nombre o documento..."
                  triggerClassName="h-11 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-all"
                />
              </div>

              {selectedEmployee ? (
                <div className="relative overflow-hidden bg-primary/[0.03] rounded-3xl p-8 border border-primary/10 group transition-all hover:bg-primary/[0.05]">
                  <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none group-hover:bg-primary/20 transition-all duration-500" />
                  <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Documento de Identidad</p>
                      <p className="text-lg font-black tracking-tighter text-foreground">{selectedEmployee.document_number}</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Centro de Operación</p>
                      <p className="text-sm font-bold text-foreground bg-background/50 px-3 py-1 rounded-lg border border-border/50 w-fit">{selectedEmployee.operation_centers?.name || 'No asignado'}</p>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Cargo Ocupacional</p>
                      <p className="text-base font-black tracking-tight text-foreground">{selectedEmployee.work_info?.position_name || 'Sin cargo definido'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 border-2 border-dashed border-primary/10 rounded-[2rem] bg-primary/[0.01]">
                  <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-6">
                    <User className="w-10 h-10 text-primary/20" />
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Esperando Selección de Empleado</p>
                </div>
              )}

              {employeeId && loadingProf && (
                <div className="flex items-center gap-3 text-primary animate-pulse py-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Profesiograma...</span>
                </div>
              )}

              {employeeId && !loadingProf && profesiograma && profesiograma.items.length > 0 && (
                <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex items-start gap-5 animate-in zoom-in-95 duration-500">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-black tracking-tighter text-primary">Sugerencias de Profesiograma</p>
                    <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                      Se han precargado <span className="font-black text-primary underline decoration-primary/30 underline-offset-4">{profesiograma.items.length} exámenes</span> basados en el perfil ocupacional del empleado.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="exams" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black tracking-tight">Listado de Exámenes</h4>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Selecciona los procedimientos realizados</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addManualItem} className="h-9 px-4 rounded-xl gap-2 font-black uppercase tracking-widest text-[9px] bg-background/50 border-border/50 hover:bg-background transition-all">
                  <Plus className="w-3 h-3" /> Agregar Examen
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-border/50 rounded-2xl bg-muted/20">
                  <Stethoscope className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {employeeId ? 'No hay exámenes sugeridos' : 'Selecciona un empleado para continuar'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'group relative overflow-hidden border rounded-[2rem] p-6 transition-all duration-500 cursor-pointer',
                        item.selected 
                          ? 'border-primary/40 bg-gradient-to-br from-primary/[0.08] via-background to-primary/[0.02] shadow-xl shadow-primary/10 ring-1 ring-primary/20' 
                          : 'border-border/50 bg-muted/20 opacity-70 hover:opacity-100 hover:border-primary/20 transition-opacity'
                      )}
                      onClick={() => updateItem(idx, 'selected', !item.selected)}
                    >
                      {/* Selection Glow */}
                      {item.selected && (
                        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 rounded-full bg-primary/20 blur-3xl pointer-events-none animate-pulse" />
                      )}

                      <div className="relative flex items-start gap-6">
                        <div className="flex flex-col items-center gap-3 shrink-0 mt-1">
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={(v) => updateItem(idx, 'selected', !!v)}
                            className="h-6 w-6 rounded-lg border-primary data-[state=checked]:bg-primary transition-all duration-300"
                            onClick={(e) => e.stopPropagation()}
                          />
                          {item.fromProfesiograma && (
                            <div className="h-10 w-[2px] bg-gradient-to-b from-primary/50 to-transparent rounded-full" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {item.fromProfesiograma ? (
                              <Badge className="h-6 px-3 rounded-xl text-[8px] font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-sm">
                                <Sparkles className="w-3 h-3 mr-1.5 animate-pulse" /> Sugerido
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="h-6 px-3 rounded-xl text-[8px] font-black uppercase tracking-widest bg-background/50 border-border/50 text-muted-foreground">
                                Adicional
                              </Badge>
                            )}
                            <Badge variant="outline" className="h-6 px-3 rounded-xl text-[8px] font-black uppercase tracking-widest border-primary/20 text-primary bg-primary/5">
                              {item.result === 'pendiente' ? 'Pendiente' : item.result}
                            </Badge>
                          </div>

                          <div className="flex-1">
                            {item.fromProfesiograma ? (
                              <h5 className="font-black tracking-tighter text-lg text-foreground group-hover:text-primary transition-colors">
                                {item.exam_name}
                              </h5>
                            ) : (
                              <div className="w-full" onClick={(e) => e.stopPropagation()}>
                                <SearchableSelect
                                  options={activeExams.map(e => ({ value: e.id, label: e.name }))}
                                  value={item.exam_catalog_id || ''}
                                  onValueChange={(v) => {
                                    const catalogItem = activeExams.find(e => e.id === v);
                                    updateItem(idx, 'exam_catalog_id', v);
                                    if (catalogItem) updateItem(idx, 'exam_name', catalogItem.name);
                                  }}
                                  placeholder="Seleccionar examen..."
                                  triggerClassName="h-10 border-0 bg-transparent p-0 font-black tracking-tight text-lg focus:ring-0 shadow-none text-foreground"
                                />
                              </div>
                            )}
                          </div>

                          {item.selected && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="mt-6 pt-6 border-t border-primary/10 flex flex-col sm:flex-row sm:items-center gap-4"
                            >
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <History className="w-4 h-4 text-primary" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vencimiento:</span>
                              </div>
                              <Input
                                type="date"
                                value={item.expiration_date}
                                onChange={(e) => updateItem(idx, 'expiration_date', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-10 text-xs font-black rounded-xl border-border/50 bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/10 transition-all sm:max-w-[200px]"
                              />
                            </motion.div>
                          )}
                        </div>

                        {!item.fromProfesiograma && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all rounded-xl shrink-0" 
                            onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="details" className="space-y-8 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Tipo de Aplicación *</Label>
                  <Select value={examType} onValueChange={(v) => setExamType(v as ExamType)}>
                    <SelectTrigger className="h-14 rounded-2xl border-border/50 bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/10 transition-all font-black text-xs uppercase tracking-widest">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/50">
                      {(Object.keys(examTypeLabels) as ExamType[]).map((type) => (
                        <SelectItem key={type} value={type} className="text-[10px] font-black uppercase tracking-widest">
                          {examTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Fecha del Examen *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('h-14 w-full justify-start text-left font-black text-xs uppercase tracking-widest rounded-2xl border-border/50 bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/10 transition-all')}>
                        <CalendarIcon className="mr-3 h-5 w-5 text-primary/40" />
                        {format(examDate, 'PPP', { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-[2rem] border-0 shadow-2xl bg-background/95 backdrop-blur-xl" align="start">
                      <Calendar
                        mode="single"
                        selected={examDate}
                        onSelect={(d) => d && setExamDate(d)}
                        locale={es}
                        className="p-4"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-3 sm:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Proveedor / IPS</Label>
                  <Input 
                    value={provider} 
                    onChange={(e) => setProvider(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Observaciones Generales</Label>
                <Textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Detalles adicionales sobre la aplicación..." 
                  className="rounded-2xl border-border/50 bg-background/50 focus:bg-background transition-all resize-none p-4" 
                  rows={4}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="p-10 border-t border-border/50 bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-col">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Resumen de Aplicación</p>
              <p className="text-[11px] font-medium text-muted-foreground leading-tight">
                {selectedItems.length} procedimientos seleccionados para registro histórico.
              </p>
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
              <Button 
                variant="ghost" 
                onClick={() => { handleReset(); onOpenChange(false); }} 
                className="h-12 flex-1 sm:px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-background transition-all"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting} 
                className="h-12 flex-[2] sm:px-10 rounded-2xl gap-3 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {isSubmitting ? 'Registrando...' : 'Confirmar Aplicación'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
