import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UsersRound, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface PreviewEmployee {
  id: string;
  first_name: string;
  last_name: string;
  document_number: string;
  work_info?: {
    position_name?: string;
    operation_centers?: { name?: string } | null;
  } | null;
}

interface BulkGeneratePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleName: string;
  templateName: string;
  newEmployees: PreviewEmployee[];
  alreadyAssigned: number;
  onConfirm: () => Promise<void>;
}

export function BulkGeneratePreviewDialog({
  open,
  onOpenChange,
  cycleName,
  templateName,
  newEmployees,
  alreadyAssigned,
  onConfirm,
}: BulkGeneratePreviewDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" />
            Generar Evaluaciones Masivas
          </DialogTitle>
          <DialogDescription>
            Revisa los empleados que recibirán una evaluación antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Ciclo</p>
            <p className="font-medium text-sm text-foreground">{cycleName}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Plantilla</p>
            <p className="font-medium text-sm text-foreground">{templateName}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-primary">
            <UsersRound className="h-4 w-4" />
            <span className="font-medium">{newEmployees.length}</span>
            <span className="text-muted-foreground">nuevas evaluaciones</span>
          </div>
          {alreadyAssigned > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              <span>{alreadyAssigned} ya asignados</span>
            </div>
          )}
        </div>

        {newEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Todos los empleados ya tienen evaluación en este ciclo.
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1 max-h-[350px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Centro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newEmployees.map((emp, idx) => (
                  <TableRow key={emp.id}>
                    <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                    <TableCell className="font-medium text-sm">
                      {emp.first_name} {emp.last_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {emp.document_number}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {emp.work_info?.position_name || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {emp.work_info?.operation_centers?.name || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || newEmployees.length === 0}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UsersRound className="h-4 w-4 mr-2" />
            )}
            Generar {newEmployees.length} Evaluaciones
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
