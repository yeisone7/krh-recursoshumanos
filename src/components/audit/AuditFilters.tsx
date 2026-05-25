/**
 * AuditFilters.tsx
 * ---------------------------------------------------------------
 * Panel de filtros avanzados para el módulo de auditoría.
 * ---------------------------------------------------------------
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, FilterX, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  actionLabels,
  type AuditFilters as AuditFiltersType,
} from '@/hooks/useAuditLog';

// Módulos canónicos para el filtro (solo las claves principales en español)
const MODULES_TO_SHOW: Array<{ value: string; label: string }> = [
  { value: 'empleados',    label: 'Empleados' },
  { value: 'contratos',   label: 'Contratos' },
  { value: 'seleccion',   label: 'Selección' },
  { value: 'capacitaciones', label: 'Capacitaciones' },
  { value: 'evaluaciones', label: 'Evaluaciones' },
  { value: 'vacaciones',  label: 'Vacaciones' },
  { value: 'permisos',    label: 'Permisos' },
  { value: 'incapacidades', label: 'Incapacidades' },
  { value: 'disciplinarios', label: 'Disciplinarios' },
  { value: 'nomina',      label: 'Nómina' },
  { value: 'dotacion',    label: 'Dotación' },
  { value: 'examenes',    label: 'Exámenes' },
  { value: 'jornadas',    label: 'Jornadas' },
  { value: 'novedades',   label: 'Novedades' },
  { value: 'prestamos',   label: 'Préstamos' },
  { value: 'descuentos',  label: 'Descuentos' },
  { value: 'cesantias',   label: 'Cesantías' },
  { value: 'centros',     label: 'Centros' },
  { value: 'configuracion', label: 'Configuración' },
  { value: 'seguridad',   label: 'Seguridad' },
  { value: 'reportes',    label: 'Reportes' },
  { value: 'asistente_ia', label: 'Asistente IA' },
  { value: 'sistema',     label: 'Sistema' },
];

interface AuditFiltersProps {
  filters: AuditFiltersType;
  onFiltersChange: (filters: AuditFiltersType) => void;
  onReset: () => void;
}

const ACTIONS_TO_SHOW = [
  'create', 'update', 'delete',
  'login', 'logout', 'failed_login',
  'assign_role', 'remove_role', 'change_permissions',
  'export_pdf', 'export_excel',
  'ai_chat', 'ai_generate_content',
  'terminate_contract', 'invite_user',
];

export function AuditFilters({ filters, onFiltersChange, onReset }: AuditFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeCount = Object.values(filters).filter(v =>
    v !== undefined && v !== '' && v !== null
  ).length;

  const update = (key: keyof AuditFiltersType, value: unknown) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' || value === '' ? undefined : value,
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative h-12 w-full gap-2 rounded-2xl border-slate-200 font-black uppercase tracking-widest md:w-auto">
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {activeCount > 0 && (
            <Badge
              variant="default"
              className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 px-6 pt-6">
            <SlidersHorizontal className="w-4 h-4" />
            Filtros Avanzados
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex-1 space-y-5 overflow-y-auto px-6 pb-6">

          {/* Búsqueda libre */}
          <div className="space-y-1.5">
            <Label className="text-xs">Búsqueda</Label>
            <Input
              placeholder="Usuario, entidad, descripción…"
              value={filters.search ?? ''}
              onChange={e => update('search', e.target.value)}
            />
          </div>

          {/* Acción */}
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de Acción</Label>
            <Select
              value={filters.action ?? 'all'}
              onValueChange={v => update('action', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las acciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {ACTIONS_TO_SHOW.map(action => (
                  <SelectItem key={action} value={action}>
                    {actionLabels[action] ?? action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Módulo */}
          <div className="space-y-1.5">
            <Label className="text-xs">Módulo</Label>
            <Select
              value={filters.module ?? 'all'}
              onValueChange={v => update('module', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los módulos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los módulos</SelectItem>
                {MODULES_TO_SHOW.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severidad */}
          <div className="space-y-1.5">
            <Label className="text-xs">Severidad</Label>
            <Select
              value={filters.severity ?? 'all'}
              onValueChange={v => update('severity', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Cualquier severidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquier severidad</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Alerta</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rango de fechas */}
          <div className="space-y-1.5">
            <Label className="text-xs">Desde</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 text-sm font-normal">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  {filters.startDate
                    ? format(filters.startDate, "dd 'de' MMMM, yyyy", { locale: es })
                    : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] max-w-[22rem] p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.startDate}
                  onSelect={d => update('startDate', d)}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Hasta</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 text-sm font-normal">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  {filters.endDate
                    ? format(filters.endDate, "dd 'de' MMMM, yyyy", { locale: es })
                    : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] max-w-[22rem] p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.endDate}
                  onSelect={d => update('endDate', d)}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Reset */}
          {activeCount > 0 && (
            <Button
              variant="ghost"
              className="w-full gap-2 text-muted-foreground"
              onClick={() => { onReset(); setOpen(false); }}
            >
              <FilterX className="w-4 h-4" />
              Limpiar filtros ({activeCount})
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
