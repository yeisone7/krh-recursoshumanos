import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface PortalVacationRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    request_type: 'disfrute' | 'compensacion';
    start_date: string;
    end_date: string;
    business_days: number;
    notes?: string;
  }) => void;
  isSubmitting: boolean;
  availableDays: number;
}

export function PortalVacationRequestForm({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  availableDays,
}: PortalVacationRequestFormProps) {
  const [requestType, setRequestType] = useState<'disfrute' | 'compensacion'>('disfrute');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [businessDays, setBusinessDays] = useState(1);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      request_type: requestType,
      start_date: startDate,
      end_date: endDate,
      business_days: businessDays,
      notes: notes || undefined,
    });
    // Reset
    setRequestType('disfrute');
    setStartDate('');
    setEndDate('');
    setBusinessDays(1);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Vacaciones</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-primary/10 p-3 text-center">
            <p className="text-sm text-muted-foreground">Días disponibles</p>
            <p className="text-2xl font-bold text-primary">{availableDays}</p>
          </div>

          <div className="space-y-2">
            <Label>Tipo de solicitud</Label>
            <Select value={requestType} onValueChange={(v) => setRequestType(v as 'disfrute' | 'compensacion')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disfrute">Disfrute</SelectItem>
                <SelectItem value="compensacion">Compensación en dinero</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Fecha fin</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required min={startDate} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Días hábiles solicitados</Label>
            <Input
              type="number"
              min={1}
              max={availableDays}
              value={businessDays}
              onChange={(e) => setBusinessDays(Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Observaciones (opcional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Motivo o comentarios..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || businessDays > availableDays || !startDate || !endDate}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar Solicitud
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
