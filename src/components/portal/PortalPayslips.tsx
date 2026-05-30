import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Download, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import { supabase } from '@/integrations/supabase/client';

interface PayrollReceipt {
  id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  total_earnings: number;
  total_deductions: number;
  net_pay: number;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
}

interface PortalPayslipsProps {
  receipts: PayrollReceipt[];
  isLoading: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

export function PortalPayslips({ receipts, isLoading }: PortalPayslipsProps) {
  const handleDownload = async (fileUrl: string, fileName: string) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(fileUrl, 300);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = fileName;
      a.click();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground mt-4">Cargando recibos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Recibos de Nómina
        </CardTitle>
        <CardDescription>Consulta y descarga tus comprobantes de pago</CardDescription>
      </CardHeader>
      <CardContent>
        {receipts.length > 0 ? (
          <div className="space-y-3">
            {receipts.map((receipt) => (
              <div key={receipt.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{receipt.period_label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateOnly(receipt.period_start, 'dd MMM', { locale: es })} -{' '}
                      {formatDateOnly(receipt.period_end, 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">Devengado</p>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(receipt.total_earnings)}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">Deducciones</p>
                    <p className="text-sm font-medium text-red-500">{formatCurrency(receipt.total_deductions)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Neto</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(receipt.net_pay)}</p>
                  </div>
                  {receipt.file_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(receipt.file_url!, receipt.file_name || 'recibo.pdf')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay recibos de nómina disponibles</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
