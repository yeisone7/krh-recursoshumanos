import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRightLeft, Building2, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAvailableCompaniesForTransfer, useExecuteTransfer } from '@/hooks/useEmployeeTransfer';
import { getEmployeeFullName, type EmployeeV2WithRelations } from '@/types/employee';

interface TransferEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeV2WithRelations;
}

export function TransferEmployeeDialog({ open, onOpenChange, employee }: TransferEmployeeDialogProps) {
  const [step, setStep] = useState<'select' | 'confirm' | 'done'>('select');
  const [targetCompanyId, setTargetCompanyId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: companies = [], isLoading: loadingCompanies } = useAvailableCompaniesForTransfer(employee.company_id);
  const executeTransfer = useExecuteTransfer();

  const targetCompany = companies.find(c => c.id === targetCompanyId);

  const handleExecute = async () => {
    try {
      await executeTransfer.mutateAsync({
        sourceEmployeeId: employee.id,
        sourceCompanyId: employee.company_id,
        targetCompanyId,
        transferDate: new Date().toISOString().split('T')[0],
        notes: notes || undefined,
      });
      setStep('done');
      toast.success('Traslado ejecutado correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al ejecutar el traslado');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('select');
      setTargetCompanyId('');
      setNotes('');
    }, 300);
  };

  const fullName = getEmployeeFullName(employee);

  const dataToCopy = [
    { label: 'Datos personales', desc: 'Nombre, documento, fecha de nacimiento, sexo, estado civil' },
    { label: 'Contacto', desc: 'Dirección, teléfono, email, contacto de emergencia' },
    { label: 'Seguridad social', desc: 'EPS, AFP, ARL, CCF, AFC' },
    { label: 'Información familiar', desc: 'Cónyuge, hijos, familiares registrados' },
    { label: 'Información bancaria', desc: 'Banco, tipo y número de cuenta' },
  ];

  const dataNotCopied = [
    'Contratos',
    'Información laboral (cargo, área, centro)',
    'Turnos y horarios',
    'Procesos disciplinarios',
    'Documentos adjuntos',
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            Traslado Inter-Empresa
          </DialogTitle>
          <DialogDescription>
            Trasladar a <strong>{fullName}</strong> a otra empresa.
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4 py-2">
            <div>
              <Label>Empresa destino</Label>
              {loadingCompanies ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando empresas...
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No hay otras empresas disponibles</p>
                </div>
              ) : (
                <Select value={targetCompanyId} onValueChange={setTargetCompanyId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Seleccionar empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — NIT: {c.nit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label>Observaciones (opcional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Motivo del traslado..."
                className="mt-1.5"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={() => setStep('confirm')} disabled={!targetCompanyId}>
                Continuar
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4 py-2">
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Confirmar traslado</p>
                  <p className="text-muted-foreground mt-1">
                    Se creará un nuevo registro de <strong>{fullName}</strong> en <strong>{targetCompany?.name}</strong> con los datos personales copiados. Deberás completar la información laboral (cargo, área, centro) en la empresa destino.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2 text-foreground">✅ Datos que se copian:</p>
              <div className="space-y-1.5">
                {dataToCopy.map(d => (
                  <div key={d.label} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="shrink-0 text-[10px] bg-success/10 text-success border-success/20">
                      Copia
                    </Badge>
                    <span className="text-muted-foreground"><strong>{d.label}:</strong> {d.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium mb-2 text-foreground">❌ Datos que NO se copian:</p>
              <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                {dataNotCopied.map(d => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>

            {notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Observaciones:</p>
                  <p className="text-sm">{notes}</p>
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('select')}>Atrás</Button>
              <Button
                onClick={handleExecute}
                disabled={executeTransfer.isPending}
                className="bg-primary"
              >
                {executeTransfer.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ejecutando...</>
                ) : (
                  <><ArrowRightLeft className="w-4 h-4 mr-2" /> Ejecutar Traslado</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-8 space-y-4">
            <CheckCircle className="w-16 h-16 text-success mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Traslado completado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>{fullName}</strong> ha sido trasladado a <strong>{targetCompany?.name}</strong>.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Recuerda completar la información laboral (cargo, área, centro de operación) en la empresa destino.
              </p>
            </div>
            <Button onClick={handleClose}>Cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
