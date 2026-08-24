import { useMemo, useState } from 'react';
import { Cake, CalendarDays, Download, Loader2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEmployees } from '@/hooks/useEmployees';
import { useOperationCenters } from '@/hooks/useCompanies';
import { exportToExcel, exportToPDF, type ReportData } from '@/lib/reportExporter';
import { getEmployeeFullName } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import birthdayBanner from '@/assets/birthday-banner.png';

const MONTHS = Array.from({ length: 12 }, (_, month) => ({
  value: String(month + 1),
  label: format(new Date(2024, month, 1), 'MMMM', { locale: es }),
}));

function parseBirthDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function Cumpleanos() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(today.getMonth() + 1));
  const [selectedCenter, setSelectedCenter] = useState('all');
  const { data: employees, isLoading } = useEmployees();
  const { data: operationCenters } = useOperationCenters();

  const birthdays = useMemo(() => (employees || [])
    .filter((employee) => employee.is_active && employee.status !== 'retired' && employee.birth_date)
    .filter((employee) => Number(employee.birth_date!.slice(5, 7)) === Number(selectedMonth))
    .filter((employee) => selectedCenter === 'all'
      || employee.work_info?.operation_center_id === selectedCenter
      || employee.operation_center_assignments?.some((assignment) => assignment.operation_center_id === selectedCenter))
    .map((employee) => {
      const birthDate = parseBirthDate(employee.birth_date!);
      return {
        employee,
        day: birthDate.getDate(),
        formattedDate: format(birthDate, "d 'de' MMMM", { locale: es }),
        name: getEmployeeFullName(employee),
        position: employee.work_info?.position_name || 'Sin cargo registrado',
        center: employee.operation_centers?.name || 'Sin centro asignado',
      };
    })
    .sort((a, b) => a.day - b.day || a.name.localeCompare(b.name, 'es')), [employees, selectedMonth, selectedCenter]);

  const selectedMonthLabel = MONTHS.find((month) => month.value === selectedMonth)?.label || '';
  const selectedCenterLabel = selectedCenter === 'all'
    ? 'Todos los centros'
    : operationCenters?.find((center) => center.id === selectedCenter)?.name || 'Centro seleccionado';
  const title = `Cumpleaños de ${selectedMonthLabel}`;

  const report = (): ReportData => ({
    title: 'Listado de cumpleaños',
    subtitle: `${title} · ${selectedCenterLabel} · ${birthdays.length} colaborador${birthdays.length === 1 ? '' : 'es'}`,
    generatedAt: new Date(),
    columns: [
      { header: 'Día', key: 'dia', width: 10 },
      { header: 'Fecha de cumpleaños', key: 'fecha', width: 24 },
      { header: 'Nombre', key: 'nombre', width: 32 },
      { header: 'Cargo', key: 'cargo', width: 28 },
      { header: 'Centro de trabajo', key: 'centro', width: 28 },
    ],
    data: birthdays.map((birthday) => ({
      dia: birthday.day,
      fecha: birthday.formattedDate,
      nombre: birthday.name,
      cargo: birthday.position,
      centro: birthday.center,
    })),
  });

  const exportReport = (type: 'excel' | 'pdf') => {
    if (birthdays.length === 0) {
      toast.error('No hay cumpleaños para exportar en este mes');
      return;
    }

    try {
      const filename = `cumpleanos_${selectedMonthLabel.toLowerCase()}`;
      type === 'excel' ? exportToExcel(report(), filename) : exportToPDF(report(), filename);
      toast.success(`Listado de cumpleaños exportado a ${type === 'excel' ? 'Excel' : 'PDF'}`);
    } catch {
      toast.error('No fue posible exportar el listado');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-primary/10 bg-white shadow-sm dark:bg-card">
        <img src={birthdayBanner} alt="Ilustración de celebración de cumpleaños" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 -z-10 bg-white/75 dark:bg-background/75" />
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Cake className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">Consulta de colaboradores</p>
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Cumpleaños</h1>
              <p className="mt-1 text-sm text-muted-foreground">Consulta, ordena y exporta los cumpleaños del equipo.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 text-sm shadow-sm backdrop-blur dark:border-border dark:bg-card/85">
            <span className="font-bold text-foreground">{birthdays.length}</span>{' '}
            <span className="text-muted-foreground">cumpleañero{birthdays.length === 1 ? '' : 's'} en {selectedMonthLabel}</span>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <label htmlFor="birthday-month" className="text-sm font-semibold text-foreground">Mes de cumpleaños</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger id="birthday-month" className="w-full sm:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => <SelectItem key={month.value} value={month.value} className="capitalize">{month.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="birthday-center" className="text-sm font-semibold text-foreground">Centro de operaciones</label>
            <Select value={selectedCenter} onValueChange={setSelectedCenter}>
              <SelectTrigger id="birthday-center" className="w-full sm:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los centros</SelectItem>
                {operationCenters?.map((center) => (
                  <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportReport('pdf')} disabled={isLoading || birthdays.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Exportar PDF
            </Button>
            <Button onClick={() => exportReport('excel')} disabled={isLoading || birthdays.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Exportar Excel
            </Button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border">
          <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 bg-muted/50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:grid-cols-[7rem_minmax(0,1fr)_minmax(10rem,0.7fr)_minmax(10rem,0.7fr)] sm:px-6">
            <span>Fecha</span><span>Colaborador</span><span className="hidden sm:block">Cargo</span><span className="hidden sm:block">Centro</span>
          </div>
          {isLoading ? (
            <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div>
          ) : birthdays.length > 0 ? birthdays.map((birthday) => (
            <div key={birthday.employee.id} className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 border-t px-4 py-4 transition-colors hover:bg-primary/[0.03] sm:grid-cols-[7rem_minmax(0,1fr)_minmax(10rem,0.7fr)_minmax(10rem,0.7fr)] sm:px-6">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">{birthday.day}</span>
                <span className="hidden text-xs capitalize text-muted-foreground sm:block">{selectedMonthLabel.slice(0, 3)}</span>
              </div>
              <div className="min-w-0"><p className="truncate font-bold text-foreground">{birthday.name}</p><p className="mt-0.5 text-xs capitalize text-muted-foreground sm:hidden">{birthday.position} · {birthday.center}</p></div>
              <p className="hidden truncate text-sm text-muted-foreground sm:block">{birthday.position}</p>
              <p className="hidden truncate text-sm text-muted-foreground sm:block">{birthday.center}</p>
            </div>
          )) : (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><CalendarDays className="h-7 w-7" /></div>
              <h2 className="font-bold text-foreground">No hay cumpleaños registrados en {selectedMonthLabel}</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Los colaboradores activos con fecha de nacimiento aparecerán aquí ordenados por día.</p>
            </div>
          )}
        </div>
        {!isLoading && birthdays.length > 0 && <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-4 w-4" /> Lista ordenada de forma ascendente por día de cumpleaños.</p>}
      </section>
    </div>
  );
}
