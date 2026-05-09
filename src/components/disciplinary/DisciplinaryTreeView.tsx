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
    <div className="space-y-6">
      {grouped.map(([centerName, centerProcesses]) => (
        <div
          key={centerName}
          className="overflow-hidden rounded-[2.5rem] border border-primary/5 bg-background/40 backdrop-blur-xl shadow-xl transition-all duration-500"
        >
          {/* Center header */}
          <button
            onClick={() => toggle(centerName)}
            className="flex w-full items-center justify-between gap-4 px-8 py-6 text-left transition-all hover:bg-primary/5"
          >
            <div className="flex min-w-0 items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent text-primary">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] leading-none mb-1">
                  Centro de Operación
                </span>
                <span className="truncate text-lg font-black tracking-tight text-foreground">
                  {centerName}
                </span>
              </div>
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary font-black rounded-full text-[10px] px-3 py-1 h-6"
              >
                {centerProcesses.length} Procesos
              </Badge>
            </div>
            <div className={cn("transition-transform duration-500", expanded[centerName] ? "rotate-180" : "")}>
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </div>
          </button>

          {/* Process rows */}
          {expanded[centerName] && (
            <div className="border-t border-primary/5 bg-background/20 divide-y divide-primary/5">
              {centerProcesses.map((process) => (
                <div
                  key={process.id}
                  className="group relative flex flex-col xl:flex-row xl:items-center justify-between gap-4 px-10 py-5 transition-all hover:bg-background/80 cursor-pointer"
                  onClick={() => onOpenDetail(process.id)}
                >
                  {/* Hover indicator */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-500" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 flex-1 min-w-0">
                    <div className="flex flex-col min-w-[120px]">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Radicado</span>
                      <span className="text-sm font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {process.case_number}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-[200px]">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Empleado</span>
                      <span className="text-sm font-black text-foreground/80 truncate">
                        {process.employee
                          ? `${process.employee.first_name} ${process.employee.last_name}`
                          : '-'}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-[140px]">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Tipo de Falta</span>
                      <Badge className={cn('w-fit h-6 text-[9px] font-black uppercase tracking-widest px-2 py-0', getFaultColor(process.fault_type))}>
                        {faultTypeLabels[process.fault_type]}
                      </Badge>
                    </div>

                    <div className="flex flex-col min-w-[100px]">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Fecha Falta</span>
                      <span className="text-[11px] font-bold text-muted-foreground">
                        {format(new Date(process.fault_date), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between xl:justify-end gap-4 mt-2 xl:mt-0">
                    <Badge className={cn('h-8 text-[10px] font-black uppercase tracking-widest px-4 rounded-full', getStatusColor(process.status))}>
                      {disciplinaryStatusLabels[process.status]}
                    </Badge>

                    <div className="flex items-center gap-2">
                       <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary transition-all"
                          onClick={(e) => onExportPdf(e, process)}
                          disabled={exportingId === process.id}
                        >
                          <FileDown className="w-5 h-5" />
                       </Button>

                       <DropdownMenu>
                         <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                           <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted transition-all">
                             <MoreHorizontal className="h-5 w-5" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end" className="rounded-2xl border-primary/10 shadow-2xl p-2">
                           <DropdownMenuItem
                             onClick={(e) => onExportPdf(e, process)}
                             disabled={exportingId === process.id}
                             className="rounded-xl font-bold text-xs uppercase p-3"
                           >
                             <FileDown className="h-4 w-4 mr-2" />
                             {exportingId === process.id ? 'Generando...' : 'Exportar Informe PDF'}
                           </DropdownMenuItem>
                           {process.status !== 'cerrado' && (
                             <DropdownMenuItem
                               className="rounded-xl font-bold text-xs uppercase p-3 text-destructive focus:text-destructive focus:bg-destructive/10"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 onDelete(process);
                               }}
                             >
                               <Trash2 className="h-4 w-4 mr-2" />
                               Eliminar Proceso
                             </DropdownMenuItem>
                           )}
                         </DropdownMenuContent>
                       </DropdownMenu>
                    </div>
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
