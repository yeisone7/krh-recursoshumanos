import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  FileDown,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  disciplinaryStatusLabels,
  faultTypeLabels,
  getStatusColor,
  getFaultColor,
  DisciplinaryProcessWithEmployee,
} from '@/types/disciplinary';
import { cn } from '@/lib/utils';

interface DisciplinaryTreeViewProps {
  processes: DisciplinaryProcessWithEmployee[];
  onOpenDetail: (id: string) => void;
  onExportPdf: (e: React.MouseEvent, process: DisciplinaryProcessWithEmployee) => void;
  onDelete: (process: DisciplinaryProcessWithEmployee) => void;
  exportingId: string | null;
}

export function DisciplinaryTreeView({
  processes,
  onOpenDetail,
  onExportPdf,
  onDelete,
  exportingId,
}: DisciplinaryTreeViewProps) {
  // Group by operation center
  const grouped = useMemo(() => {
    const map = new Map<string, DisciplinaryProcessWithEmployee[]>();
    for (const p of processes) {
      const key = p.operation_center_name || 'Sin Centro Asignado';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    // Sort by center name
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [processes]);

  // All expanded by default
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const [key] of grouped) {
      init[key] = true;
    }
    return init;
  });

  // Keep new centers expanded
  useMemo(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      for (const [key] of grouped) {
        if (!(key in next)) next[key] = true;
      }
      return next;
    });
  }, [grouped]);

  const toggle = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-3">
      {grouped.map(([centerName, centerProcesses]) => (
        <div
          key={centerName}
          className="overflow-hidden rounded-xl border bg-card"
        >
          {/* Center header */}
          <button
            onClick={() => toggle(centerName)}
            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 sm:px-4"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate text-sm font-semibold uppercase tracking-wide">
                {centerName}
              </span>
              <Badge
                variant="secondary"
                className="rounded-full text-xs px-2 py-0 h-5 min-w-[20px] justify-center"
              >
                {centerProcesses.length}
              </Badge>
            </div>
            {expanded[centerName] ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {/* Process rows */}
          {expanded[centerName] && (
            <div className="border-t">
              {centerProcesses.map((process) => (
                <div
                  key={process.id}
                  className="flex cursor-pointer flex-col gap-3 border-b px-3 py-3 transition-colors last:border-b-0 hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  onClick={() => onOpenDetail(process.id)}
                >
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-4">
                    <span className="text-sm font-medium whitespace-nowrap">
                      {process.case_number}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground sm:flex-none">
                      {process.employee
                        ? `${process.employee.first_name} ${process.employee.last_name}`
                        : '-'}
                    </span>
                    <Badge className={cn('shrink-0', getFaultColor(process.fault_type))}>
                      {faultTypeLabels[process.fault_type]}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap hidden md:inline">
                      {format(new Date(process.fault_date), 'dd/MM/yyyy', { locale: es })}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                    <Badge className={getStatusColor(process.status)}>
                      {disciplinaryStatusLabels[process.status]}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => onExportPdf(e, process)}
                          disabled={exportingId === process.id}
                        >
                          <FileDown className="h-4 w-4 mr-2" />
                          {exportingId === process.id ? 'Generando...' : 'Exportar PDF'}
                        </DropdownMenuItem>
                        {process.status !== 'cerrado' && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(process);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
