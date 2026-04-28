import { useState, useEffect, useMemo } from 'react';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Stethoscope, User, FileText, Plus, Trash2, Sparkles, History } from 'lucide-react';

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
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden p-4 sm:w-full sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            Nueva Aplicación de Exámenes
          </DialogTitle>
          <DialogDescription>
            Registra exámenes médicos aplicados a un empleado
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="employee" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <TabsList className="mb-4 flex h-auto w-full justify-start gap-1 overflow-x-auto overscroll-x-contain border border-primary/10 bg-primary/5 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3">
            <TabsTrigger value="employee" className="shrink-0 gap-2 whitespace-nowrap text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:text-sm">
              <User className="w-4 h-4" /> Empleado
            </TabsTrigger>
            <TabsTrigger value="exams" className="shrink-0 gap-2 whitespace-nowrap text-xs data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground sm:text-sm">
              <Stethoscope className="w-4 h-4" /> Exámenes
              {selectedItems.length > 0 && (
                <Badge className="ml-1 h-5 px-1.5 text-xs bg-secondary text-secondary-foreground">{selectedItems.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="details" className="shrink-0 gap-2 whitespace-nowrap text-xs data-[state=active]:bg-tertiary data-[state=active]:text-white sm:text-sm">
              <FileText className="w-4 h-4" /> Detalles
            </TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 sm:pr-2">
            <TabsContent value="employee" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Empleado *</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent className="bg-background max-h-[200px]">
                    {employees.filter(e => e.is_active).map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {getEmployeeFullName(emp)} - {emp.document_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEmployee && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Documento:</span>
                    <span className="font-medium">{selectedEmployee.document_number}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Centro:</span>
                    <span className="font-medium">{selectedEmployee.operation_centers?.name || 'No asignado'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cargo:</span>
                    <span className="font-medium">{selectedEmployee.work_info?.position_name || 'Sin cargo'}</span>
                  </div>
                </div>
              )}

              {employeeId && loadingProf && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Buscando profesiograma de exámenes...
                </div>
              )}

              {employeeId && !loadingProf && profesiograma && profesiograma.items.length > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-primary">Profesiograma encontrado</p>
                    <p className="text-muted-foreground">
                      Se cargaron {profesiograma.items.length} examen(es) sugeridos. Revísalos en la pestaña "Exámenes".
                    </p>
                  </div>
                </div>
              )}

              {employeeId && !loadingProf && (!profesiograma || profesiograma.items.length === 0) && (
                <div className="bg-muted/30 border border-border rounded-lg p-3 text-sm text-muted-foreground">
                  No hay profesiograma de exámenes para este centro + cargo. Puedes agregar exámenes manualmente.
                </div>
              )}
            </TabsContent>

            <TabsContent value="exams" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <Label>Exámenes a aplicar</Label>
                <Button type="button" variant="outline" size="sm" onClick={addManualItem} className="gap-1">
                  <Plus className="w-3 h-3" /> Agregar
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {employeeId ? 'No hay exámenes sugeridos. Agrega manualmente.' : 'Selecciona un empleado primero.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'border rounded-lg p-3 space-y-2 transition-colors',
                        item.selected ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20 opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={(v) => updateItem(idx, 'selected', !!v)}
                        />
                        {item.fromProfesiograma ? (
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="font-medium text-sm truncate">{item.exam_name}</span>
                            <Badge variant="outline" className="text-xs gap-1 bg-warning/10 text-warning-foreground border-warning/20 shrink-0">
                              <Sparkles className="w-3 h-3" /> Sugerido
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex-1 min-w-[180px]">
                            <SearchableSelect
                              options={activeExams.map(e => ({ value: e.id, label: e.name }))}
                              value={item.exam_catalog_id || ''}
                              onValueChange={(v) => {
                                const catalogItem = activeExams.find(e => e.id === v);
                                updateItem(idx, 'exam_catalog_id', v);
                                if (catalogItem) updateItem(idx, 'exam_name', catalogItem.name);
                              }}
                              placeholder="Seleccionar examen"
                              searchPlaceholder="Buscar examen..."
                              emptyMessage="No se encontraron exámenes"
                            />
                          </div>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      {item.selected && (
                        <div className="flex items-center gap-2 ml-8">
                          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Vencimiento:</Label>
                          <Input
                            type="date"
                            value={item.expiration_date}
                            onChange={(e) => updateItem(idx, 'expiration_date', e.target.value)}
                            className="h-7 text-xs flex-1"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Tipo de Examen *</Label>
                <Select value={examType} onValueChange={(v) => setExamType(v as ExamType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(examTypeLabels) as ExamType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {examTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha del Examen *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(examDate, 'PPP', { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={examDate}
                      onSelect={(d) => d && setExamDate(d)}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="space-y-2">
                  <Label>Proveedor / IPS</Label>
                  <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Nombre del proveedor" />
                </div>
                <div className="space-y-2">
                  <Label>Médico</Label>
                  <Input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="Nombre del médico" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones..." className="min-h-[60px]" />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="-mx-4 grid grid-cols-1 gap-2 border-t px-4 pt-3 sm:mx-0 sm:flex sm:justify-end sm:gap-3 sm:px-0 sm:pt-4">
          <Button variant="outline" onClick={() => { handleReset(); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
            <Stethoscope className="w-4 h-4" />
            {isSubmitting ? 'Registrando...' : 'Registrar Aplicación'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
