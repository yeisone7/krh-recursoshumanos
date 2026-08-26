import { useMemo, useState } from 'react';
import {
  Building2,
  ContactRound,
  Download,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useEmployees } from '@/hooks/useEmployees';
import {
  filterEmployeeContacts,
  getEmployeeCenterNames,
  toEmployeeContactExportRows,
} from '@/lib/employeeContacts';
import { logExport } from '@/lib/auditService';
import { todayDateOnlyString } from '@/lib/dateOnly';
import { getEmployeeFullName } from '@/types/employee';

const valueOrDash = (value?: string | null) => value?.trim() || '—';

export default function ContactosEmpleados() {
  const [search, setSearch] = useState('');
  const [centerId, setCenterId] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const { currentCompanyId } = useAuth();
  const { data: employees = [], isLoading, isError, refetch } = useEmployees();
  const { data: centers = [], isLoading: centersLoading } = useOperationCenters();

  const filteredEmployees = useMemo(
    () => filterEmployeeContacts(employees, search, centerId),
    [employees, search, centerId],
  );

  const withContact = useMemo(
    () => filteredEmployees.filter((employee) => Boolean(
      employee.contact?.email
      || employee.contact?.personal_email
      || employee.contact?.mobile
      || employee.contact?.phone,
    )).length,
    [filteredEmployees],
  );

  const handleExport = async () => {
    if (!currentCompanyId || filteredEmployees.length === 0) {
      toast.error('No hay información de contacto para exportar');
      return;
    }

    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(toEmployeeContactExportRows(filteredEmployees));
      worksheet['!cols'] = [
        { wch: 30 }, { wch: 18 }, { wch: 24 }, { wch: 28 }, { wch: 30 }, { wch: 30 },
        { wch: 17 }, { wch: 17 }, { wch: 36 }, { wch: 20 }, { wch: 20 }, { wch: 28 },
        { wch: 22 }, { wch: 18 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contactos');
      XLSX.writeFile(workbook, `Contactos_empleados_${todayDateOnlyString()}.xlsx`);
      logExport(currentCompanyId, 'empleados', 'excel', `Exportación de ${filteredEmployees.length} contactos de empleados`);
      toast.success(`${filteredEmployees.length} contactos exportados`);
    } catch (error) {
      console.error('Error exporting employee contacts:', error);
      toast.error('No fue posible exportar los contactos');
    } finally {
      setIsExporting(false);
    }
  };

  if (!currentCompanyId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <Building2 className="mb-4 size-14 text-muted-foreground/50" />
        <h2 className="text-xl font-semibold">Sin empresa seleccionada</h2>
        <p className="mt-1 text-sm text-muted-foreground">Selecciona una empresa para consultar sus empleados.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 px-2 pb-10 sm:px-4 lg:px-6">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:size-14">
            <ContactRound className="size-6 sm:size-7" />
          </div>
          <div>
            <Badge variant="outline" className="mb-2 bg-primary/5 text-primary">Personal</Badge>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Contactos de empleados</h1>
            <p className="mt-1 text-sm text-muted-foreground">Consulta y exporta los datos de contacto del personal.</p>
          </div>
        </div>
        <Button onClick={handleExport} disabled={isExporting || isLoading || filteredEmployees.length === 0}>
          <Download className="mr-2 size-4" />
          {isExporting ? 'Exportando…' : 'Exportar Excel'}
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resultados</p>
          <div className="mt-2 flex items-center gap-2"><Users className="size-5 text-primary" /><span className="text-2xl font-bold">{filteredEmployees.length}</span></div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Con teléfono o correo</p>
          <div className="mt-2 flex items-center gap-2"><Phone className="size-5 text-emerald-600" /><span className="text-2xl font-bold">{withContact}</span></div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Centro seleccionado</p>
          <div className="mt-2 flex items-center gap-2"><Building2 className="size-5 text-sky-600" /><span className="truncate text-base font-bold">{centerId === 'all' ? 'Todos' : centers.find((center) => center.id === centerId)?.name || '—'}</span></div>
        </div>
      </section>

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="grid gap-3 border-b p-4 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, documento, correo, teléfono o ciudad"
              className="pl-9"
              aria-label="Buscar contactos de empleados"
            />
          </div>
          <Select value={centerId} onValueChange={setCenterId} disabled={centersLoading}>
            <SelectTrigger aria-label="Filtrar por centro de operación">
              <SelectValue placeholder="Centro de operación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los centros</SelectItem>
              {centers.map((center) => <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">{[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-16 w-full" />)}</div>
        ) : isError ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ShieldAlert className="mb-3 size-10 text-destructive/70" />
            <p className="font-semibold">No fue posible cargar los contactos</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>Reintentar</Button>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ContactRound className="mb-3 size-10 text-muted-foreground/40" />
            <p className="font-semibold">No se encontraron empleados</p>
            <p className="mt-1 text-sm text-muted-foreground">Ajusta la búsqueda o el centro de operación.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Centro / cargo</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Emergencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => {
                    const contact = employee.contact;
                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="min-w-56">
                          <p className="font-semibold">{getEmployeeFullName(employee)}</p>
                          <p className="text-xs text-muted-foreground">{employee.document_type} {employee.document_number}</p>
                        </TableCell>
                        <TableCell className="min-w-52">
                          <p>{getEmployeeCenterNames(employee).join(', ') || 'Sin centro'}</p>
                          <p className="text-xs text-muted-foreground">{valueOrDash(employee.work_info?.position_name)}</p>
                        </TableCell>
                        <TableCell className="min-w-56">
                          <p>{valueOrDash(contact?.email)}</p>
                          <p className="text-xs text-muted-foreground">{valueOrDash(contact?.personal_email)}</p>
                        </TableCell>
                        <TableCell className="min-w-36">
                          <p>{valueOrDash(contact?.mobile)}</p>
                          <p className="text-xs text-muted-foreground">{valueOrDash(contact?.phone)}</p>
                        </TableCell>
                        <TableCell className="min-w-56">
                          <p>{valueOrDash(contact?.residence_address)}</p>
                          <p className="text-xs text-muted-foreground">{[contact?.residence_city, contact?.residence_department].filter(Boolean).join(', ') || '—'}</p>
                        </TableCell>
                        <TableCell className="min-w-48">
                          <p>{valueOrDash(contact?.emergency_contact_name)}</p>
                          <p className="text-xs text-muted-foreground">{valueOrDash(contact?.emergency_contact_phone)}</p>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="divide-y md:hidden">
              {filteredEmployees.map((employee) => {
                const contact = employee.contact;
                return (
                  <article key={employee.id} className="space-y-3 p-4">
                    <div>
                      <p className="font-bold">{getEmployeeFullName(employee)}</p>
                      <p className="text-xs text-muted-foreground">{employee.document_type} {employee.document_number} · {getEmployeeCenterNames(employee).join(', ') || 'Sin centro'}</p>
                    </div>
                    <div className="grid gap-2 text-sm">
                      <p className="flex items-start gap-2"><Mail className="mt-0.5 size-4 shrink-0 text-primary" /><span>{valueOrDash(contact?.email || contact?.personal_email)}</span></p>
                      <p className="flex items-start gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-primary" /><span>{valueOrDash(contact?.mobile || contact?.phone)}</span></p>
                      <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" /><span>{[contact?.residence_address, contact?.residence_city].filter(Boolean).join(', ') || '—'}</span></p>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
