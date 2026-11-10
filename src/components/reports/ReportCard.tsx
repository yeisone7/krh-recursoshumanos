import { Card } from '@/components/ui/card';
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
  const exportDisabled = isLoading || recordCount === 0;

  return (
    <section className={cn('min-w-0', className)}>
      <Card className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border-border bg-card shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 px-5 py-5 sm:px-6">
          <div className="flex min-w-0 flex-1 basis-full items-start gap-3 sm:basis-64">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:h-5 [&_svg]:w-5">
              {icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold leading-snug tracking-tight text-foreground sm:text-lg">{title}</h3>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </div>
          {(headerExtra || recordCount !== undefined) && (
            <div className="flex flex-wrap items-center gap-3 pl-[3.25rem] sm:pl-0">
              {headerExtra}
              {recordCount !== undefined && (
                <div className="border-l border-border pl-3 text-sm text-muted-foreground">
                  <span className="font-semibold tabular-nums text-foreground">{recordCount.toLocaleString('es-CO')}</span> registros
                </div>
              )}
            </div>
          )}
        </header>

        {children && <div className="min-w-0 flex-1 p-4 sm:p-6">{children}</div>}

        <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-6">
          <span className="text-xs text-muted-foreground">{recordCount === 0 ? 'Consulta los datos para exportar' : 'Descargar informe'}</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-2 bg-card text-xs font-semibold" onClick={onExportExcel} disabled={exportDisabled}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}
              Excel
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2 bg-card text-xs font-semibold" onClick={onExportPDF} disabled={exportDisabled}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
              PDF
            </Button>
          </div>
        </footer>
      </Card>
    </section>
  );
}
