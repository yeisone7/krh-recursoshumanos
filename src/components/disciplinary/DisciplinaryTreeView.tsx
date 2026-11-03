import { useState, useMemo } from 'react';
import { formatDateOnly } from '@/lib/dateOnly';
import {
  Building2,
  ChevronDown,
  FileDown,
  MoreHorizontal,
  Trash2,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  onDelete?: (process: DisciplinaryProcessWithEmployee) => void;
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


  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      {grouped.map(([centerName, centerProcesses]) => {
        const isExpanded = !collapsed[centerName];

        return (
          <section key={centerName} className="overflow-hidden rounded-lg border border-border bg-card">
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() => setCollapsed((previous) => ({ ...previous, [centerName]: isExpanded }))}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/60"
            >
              <Building2 className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate font-semibold">{centerName}</span>
              <Badge variant="secondary">{centerProcesses.length}</Badge>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
            </button>

            {isExpanded && (
              <Table className="min-w-[42rem]" aria-label={`Procesos disciplinarios de ${centerName}`}>
                <TableHeader className="bg-[#102a36] [&_th]:h-11 [&_th]:text-white">
                  <TableRow className="bg-transparent hover:bg-transparent">
                    <TableHead>Empleado</TableHead>
                    <TableHead>Radicado</TableHead>
                    <TableHead>Fecha de la falta</TableHead>
                    <TableHead>Tipo de falta</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {centerProcesses.map((process) => (
                    <TableRow
                      key={process.id}
                      className="cursor-pointer even:bg-muted/45 hover:bg-primary/10 even:hover:bg-primary/10 [&>td]:py-3"
                      onClick={() => onOpenDetail(process.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Users className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-medium">
                              {process.employee ? `${process.employee.first_name} ${process.employee.last_name}` : '—'}
                            </p>
                            {process.employee?.document_number && (
                              <p className="text-xs text-muted-foreground">{process.employee.document_number}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="whitespace-nowrap font-medium text-primary hover:underline"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenDetail(process.id);
                          }}
                        >
                          {process.case_number}
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDateOnly(process.fault_date, 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('rounded-md', getFaultColor(process.fault_type))}>
                          {faultTypeLabels[process.fault_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('rounded-md', getStatusColor(process.status))}>
                          {disciplinaryStatusLabels[process.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
                            aria-label={`Exportar PDF de ${process.case_number}`}
                            onClick={(event) => onExportPdf(event, process)}
                            disabled={exportingId === process.id}
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={`Acciones de ${process.case_number}`}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(event) => onExportPdf(event, process)}
                                disabled={exportingId === process.id}
                              >
                                <FileDown className="mr-2 h-4 w-4" />
                                {exportingId === process.id ? 'Generando...' : 'Exportar Informe PDF'}
                              </DropdownMenuItem>
                              {onDelete && process.status !== 'cerrado' && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onDelete(process);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar Proceso
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        );
      })}
    </div>
  );
}
