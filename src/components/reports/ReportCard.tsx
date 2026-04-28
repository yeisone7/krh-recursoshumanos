import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  recordCount?: number;
  isLoading?: boolean;
  onExportExcel: () => void;
  onExportPDF: () => void;
  children?: React.ReactNode;
  className?: string;
  headerExtra?: React.ReactNode;
}

export function ReportCard({
  title,
  description,
  icon,
  recordCount,
  isLoading,
  onExportExcel,
  onExportPDF,
  children,
  className,
  headerExtra,
}: ReportCardProps) {
  return (
    <Card className={cn('min-w-0 overflow-hidden', className)}>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
              {icon}
            </div>
            <div className="min-w-0">
              <CardTitle className="break-words text-base sm:text-lg">{title}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
            </div>
          </div>
          <div className="flex shrink-0 flex-row items-center justify-between gap-2 sm:flex-col sm:items-end">
            {headerExtra}
            {recordCount !== undefined && (
              <div className="text-left sm:text-right">
                <span className="text-xl font-bold text-primary sm:text-2xl">{recordCount}</span>
                <p className="text-xs text-muted-foreground">registros</p>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        {children}
        
        <div className="grid gap-2 pt-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="w-full min-w-0"
            onClick={onExportExcel}
            disabled={isLoading || recordCount === 0}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 mr-2" />
            )}
            <span className="truncate">Exportar Excel</span>
          </Button>
          <Button
            variant="outline"
            className="w-full min-w-0"
            onClick={onExportPDF}
            disabled={isLoading || recordCount === 0}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            <span className="truncate">Exportar PDF</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
