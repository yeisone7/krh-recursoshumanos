import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useEmployees } from '@/hooks/useEmployees';

type ImportType = 'deposits' | 'interests';

interface ImportCesantiasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ImportType;
}

interface ParsedRow {
  rowIndex: number;
  data: Record<string, any>;
  errors: string[];
  matched_employee_id?: string;
}

const DEPOSIT_COLUMNS = [
  'documento_empleado',
  'año',
  'fecha_inicio_calculo',
  'fecha_fin_calculo',
  'salario_base',
  'dias_trabajados',
  'valor_cesantias',
  'fondo',
  'cuenta_fondo',
  'fecha_limite',
  'fecha_deposito',
  'estado',
  'observaciones',
];

const INTEREST_COLUMNS = [
  'documento_empleado',
  'año',
  'saldo_cesantias',
  'tasa_interes',
  'dias_causados',
  'valor_intereses',
  'fecha_limite',
  'fecha_pago',
  'pagado',
  'observaciones',
];

export function ImportCesantiasDialog({ open, onOpenChange, type }: ImportCesantiasDialogProps) {
  const { user, currentCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const { data: employees = [] } = useEmployees();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [importResult, setImportResult] = useState({ success: 0, errors: 0 });

  const columns = type === 'deposits' ? DEPOSIT_COLUMNS : INTEREST_COLUMNS;
  const title = type === 'deposits' ? 'Importar Depósitos de Cesantías' : 'Importar Intereses de Cesantías';

  const handleClose = () => {
    setParsedRows([]);
    setStep('upload');
    setImportResult({ success: 0, errors: 0 });
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([columns]);
    // Add example row
    const exampleDeposit = ['1234567890', '2025', '2025-01-01', '2025-12-31', '1800000', '360', '1800000', 'Porvenir', '', '2026-02-14', '', 'pendiente', ''];
    const exampleInterest = ['1234567890', '2025', '1800000', '12', '360', '216000', '2026-01-31', '', 'no', ''];
    const example = type === 'deposits' ? exampleDeposit : exampleInterest;
    XLSX.utils.sheet_add_aoa(ws, [example], { origin: 'A2' });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === 'deposits' ? 'Depósitos' : 'Intereses');
    XLSX.writeFile(wb, `plantilla_${type === 'deposits' ? 'depositos' : 'intereses'}_cesantias.xlsx`);
  };

  const matchEmployee = (docNumber: string): string | undefined => {
    const cleaned = String(docNumber).trim();
    const emp = employees.find(e => e.document_number === cleaned);
    return emp?.id;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { raw: false });

        if (jsonData.length === 0) {
          toast.error('El archivo está vacío');
          return;
        }

        const rows: ParsedRow[] = jsonData.map((row, idx) => {
          const errors: string[] = [];
          const doc = String(row['documento_empleado'] || '').trim();

          if (!doc) errors.push('Documento requerido');

          const empId = matchEmployee(doc);
          if (doc && !empId) errors.push('Empleado no encontrado');

          if (type === 'deposits') {
            if (!row['salario_base']) errors.push('Salario base requerido');
            if (!row['valor_cesantias']) errors.push('Valor cesantías requerido');
            if (!row['fondo']) errors.push('Fondo requerido');
          } else {
            if (!row['saldo_cesantias']) errors.push('Saldo cesantías requerido');
            if (!row['valor_intereses']) errors.push('Valor intereses requerido');
          }

          return {
            rowIndex: idx + 2,
            data: row,
            errors,
            matched_employee_id: empId,
          };
        });

        setParsedRows(rows);
        setStep('preview');
      } catch {
        toast.error('Error al leer el archivo');
      }
    };
    reader.readAsBinaryString(file);
    // Reset the input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.errors.length === 0 && r.matched_employee_id);
    if (validRows.length === 0) {
      toast.error('No hay filas válidas para importar');
      return;
    }

    setImporting(true);
    let success = 0;
    let errors = 0;

    for (const row of validRows) {
      try {
        if (type === 'deposits') {
          const year = parseInt(row.data['año']) || new Date().getFullYear();
          const { error } = await supabase.from('cesantias_deposits').insert({
            company_id: currentCompanyId!,
            employee_id: row.matched_employee_id!,
            year,
            calculation_start_date: row.data['fecha_inicio_calculo'] || `${year}-01-01`,
            calculation_end_date: row.data['fecha_fin_calculo'] || `${year}-12-31`,
            base_salary: parseFloat(row.data['salario_base']) || 0,
            days_worked: parseInt(row.data['dias_trabajados']) || 360,
            cesantias_amount: parseFloat(row.data['valor_cesantias']) || 0,
            fund_name: row.data['fondo'] || '',
            fund_account: row.data['cuenta_fondo'] || null,
            due_date: row.data['fecha_limite'] || `${year + 1}-02-14`,
            deposit_date: row.data['fecha_deposito'] || null,
            status: (['pendiente', 'calculado', 'depositado', 'extemporaneo'].includes(row.data['estado']?.toLowerCase()))
              ? row.data['estado'].toLowerCase()
              : 'pendiente',
            observations: row.data['observaciones'] || null,
            created_by: user?.id,
          } as any);

          if (error) throw error;
          success++;
        } else {
          const year = parseInt(row.data['año']) || new Date().getFullYear();
          const isPaid = ['si', 'sí', 'yes', 'true', '1'].includes(String(row.data['pagado'] || '').toLowerCase());
          const { error } = await supabase.from('cesantias_interest_payments').insert({
            company_id: currentCompanyId!,
            employee_id: row.matched_employee_id!,
            year,
            cesantias_balance: parseFloat(row.data['saldo_cesantias']) || 0,
            interest_rate: parseFloat(row.data['tasa_interes']) || 12,
            days_accrued: parseInt(row.data['dias_causados']) || 360,
            interest_amount: parseFloat(row.data['valor_intereses']) || 0,
            due_date: row.data['fecha_limite'] || `${year + 1}-01-31`,
            payment_date: row.data['fecha_pago'] || null,
            is_paid: isPaid,
            observations: row.data['observaciones'] || null,
            created_by: user?.id,
          } as any);

          if (error) throw error;
          success++;
        }
      } catch {
        errors++;
      }
    }

    setImporting(false);
    setImportResult({ success, errors });
    setStep('done');

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['cesantias_deposits'] });
    queryClient.invalidateQueries({ queryKey: ['cesantias_interest'] });
    queryClient.invalidateQueries({ queryKey: ['cesantias_compliance'] });
  };

  const validCount = parsedRows.filter(r => r.errors.length === 0).length;
  const errorCount = parsedRows.filter(r => r.errors.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Importa registros masivamente desde un archivo Excel (.xlsx)
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center space-y-4">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Sube un archivo Excel con las columnas requeridas
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Seleccionar Archivo
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                ¿No tienes la plantilla?
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Descargar Plantilla
              </Button>
            </div>

            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <strong>Columnas requeridas:</strong>{' '}
                {columns.join(', ')}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="w-3 h-3" /> {validCount} válidas
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errorCount} con errores
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                Total: {parsedRows.length} filas
              </span>
            </div>

            <div className="max-h-[400px] overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Documento</TableHead>
                    {type === 'deposits' ? (
                      <>
                        <TableHead>Año</TableHead>
                        <TableHead>Salario Base</TableHead>
                        <TableHead>Valor Cesantías</TableHead>
                        <TableHead>Fondo</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead>Año</TableHead>
                        <TableHead>Saldo</TableHead>
                        <TableHead>Valor Intereses</TableHead>
                      </>
                    )}
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, i) => (
                    <TableRow key={i} className={row.errors.length > 0 ? 'bg-destructive/5' : ''}>
                      <TableCell className="text-xs text-muted-foreground">{row.rowIndex}</TableCell>
                      <TableCell className="font-mono text-sm">{row.data['documento_empleado']}</TableCell>
                      {type === 'deposits' ? (
                        <>
                          <TableCell>{row.data['año']}</TableCell>
                          <TableCell>{row.data['salario_base']}</TableCell>
                          <TableCell>{row.data['valor_cesantias']}</TableCell>
                          <TableCell>{row.data['fondo']}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{row.data['año']}</TableCell>
                          <TableCell>{row.data['saldo_cesantias']}</TableCell>
                          <TableCell>{row.data['valor_intereses']}</TableCell>
                        </>
                      )}
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <span className="text-xs text-destructive">{row.errors.join(', ')}</span>
                        ) : (
                          <Badge className="bg-success/20 text-success text-xs">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setParsedRows([]); setStep('upload'); }}>
                Volver
              </Button>
              <Button onClick={handleImport} disabled={importing || validCount === 0}>
                {importing ? 'Importando...' : `Importar ${validCount} registros`}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center py-6">
            <CheckCircle className="w-16 h-16 mx-auto text-success" />
            <h3 className="text-lg font-semibold">Importación Completada</h3>
            <div className="flex justify-center gap-4">
              <Badge className="bg-success/20 text-success">{importResult.success} importados</Badge>
              {importResult.errors > 0 && (
                <Badge variant="destructive">{importResult.errors} con errores</Badge>
              )}
            </div>
            <Button onClick={handleClose}>Cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
