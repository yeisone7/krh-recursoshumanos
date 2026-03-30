import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowRight, Calculator } from 'lucide-react';
import { useUpdateLoan, type EmployeeLoan } from '@/hooks/useLoans';
import { toast } from '@/hooks/use-toast';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

interface Props {
  loan: EmployeeLoan | null;
  open: boolean;
  onClose: () => void;
}

export function LoanRefinanceDialog({ loan, open, onClose }: Props) {
  const updateLoan = useUpdateLoan();

  const [newInstallments, setNewInstallments] = useState('');
  const [newInterestRate, setNewInterestRate] = useState('');
  const [newStartDate, setNewStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  // Reset when loan changes
  useMemo(() => {
    if (loan) {
      setNewInstallments(String(Math.max(1, loan.installments - loan.paid_installments + 3)));
      setNewInterestRate(String(loan.interest_rate));
      setNewStartDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes('');
    }
  }, [loan?.id]);

  if (!loan) return null;

  const remainingBalance = Number(loan.remaining_balance);
  const parsedInstallments = Math.max(1, parseInt(newInstallments) || 1);
  const parsedRate = parseFloat(newInterestRate) || 0;

  // New calculations based on remaining balance
  const newTotalWithInterest = remainingBalance * (1 + parsedRate / 100);
  const newInstallmentAmount = newTotalWithInterest / parsedInstallments;

  const handleRefinance = () => {
    if (!loan) return;

    const refinanceNotes = [
      loan.notes,
      `[REFINANCIAMIENTO ${format(new Date(), 'dd/MM/yyyy')}]`,
      `Saldo refinanciado: ${formatCurrency(remainingBalance)}`,
      `Cuotas anteriores: ${loan.installments} → Nuevas: ${parsedInstallments}`,
      `Tasa anterior: ${loan.interest_rate}% → Nueva: ${parsedRate}%`,
      notes ? `Observación: ${notes}` : null,
    ].filter(Boolean).join('\n');

    updateLoan.mutate({
      id: loan.id,
      total_amount: remainingBalance,
      interest_rate: parsedRate,
      total_with_interest: Math.round(newTotalWithInterest * 100) / 100,
      installments: parsedInstallments,
      installment_amount: Math.round(newInstallmentAmount * 100) / 100,
      remaining_balance: Math.round(newTotalWithInterest * 100) / 100,
      paid_installments: 0,
      paid_amount: 0,
      start_date: newStartDate,
      status: 'activo',
      notes: refinanceNotes,
    }, {
      onSuccess: () => {
        toast({ title: 'Préstamo refinanciado exitosamente' });
        onClose();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Refinanciar Préstamo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current loan info */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <p className="text-sm font-medium">Préstamo Actual</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Empleado:</span>{' '}
                <span className="font-medium">{loan.employees_v2?.first_name} {loan.employees_v2?.last_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Saldo:</span>{' '}
                <span className="font-medium text-destructive">{formatCurrency(remainingBalance)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cuotas pagadas:</span>{' '}
                <span>{loan.paid_installments} de {loan.installments}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tasa actual:</span>{' '}
                <span>{loan.interest_rate}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* New terms */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Nuevas Condiciones</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nuevas Cuotas</Label>
                <Input
                  type="number"
                  min="1"
                  value={newInstallments}
                  onChange={e => setNewInstallments(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Nueva Tasa (%)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={newInterestRate}
                  onChange={e => setNewInterestRate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Fecha de Inicio</Label>
              <Input
                type="date"
                value={newStartDate}
                onChange={e => setNewStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">Observaciones</Label>
              <Textarea
                placeholder="Razón del refinanciamiento..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Preview */}
          <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
            <p className="text-sm font-medium text-primary">Resultado del Refinanciamiento</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Monto base:</span>{' '}
                <span className="font-mono">{formatCurrency(remainingBalance)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">+ Interés ({parsedRate}%):</span>{' '}
                <span className="font-mono">{formatCurrency(newTotalWithInterest - remainingBalance)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total a pagar:</span>{' '}
                <span className="font-mono font-bold">{formatCurrency(newTotalWithInterest)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cuota mensual:</span>{' '}
                <span className="font-mono font-bold text-primary">{formatCurrency(newInstallmentAmount)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-2 rounded bg-warning/10 text-warning text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>El refinanciamiento reiniciará el conteo de cuotas y recalculará los montos sobre el saldo pendiente actual.</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleRefinance} disabled={updateLoan.isPending}>
            Refinanciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
