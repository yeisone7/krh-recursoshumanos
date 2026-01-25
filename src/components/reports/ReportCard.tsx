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
}: ReportCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {recordCount !== undefined && (
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">{recordCount}</span>
              <p className="text-xs text-muted-foreground">registros</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onExportExcel}
            disabled={isLoading || recordCount === 0}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 mr-2" />
            )}
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onExportPDF}
            disabled={isLoading || recordCount === 0}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Exportar PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
