import { useMemo, useState } from 'react';
import {
  Check,
  CheckSquare,
  Columns3,
  FileSearch,
  Filter,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useContractTypes } from '@/hooks/useContractTypes';
import { useGeneralEmployeeReport } from '@/hooks/useGeneralEmployeeReport';
import { useAreas } from '@/hooks/useSystemConfig';
import { exportToExcel, type ReportData } from '@/lib/reportExporter';
import { exportGeneralEmployeeReportToPDF } from '@/lib/generalEmployeeReportPdf';
import {
  EMPTY_GENERAL_EMPLOYEE_FILTERS,
  GENERAL_EMPLOYEE_CATEGORY_LABELS,
  GENERAL_EMPLOYEE_COLUMNS,
  GENERAL_EMPLOYEE_DEFAULT_COLUMN_KEYS,
  filterGeneralEmployeeRows,
  getGeneralEmployeeFilterOptions,
  selectedGeneralEmployeeColumns,
  type GeneralEmployeeColumnCategory,
  type GeneralEmployeeFilters,
} from '@/lib/generalEmployeeReport';
import { cn } from '@/lib/utils';
import { ReportCard } from './ReportCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PREVIEW_LIMIT = 50;
const CURRENCY_KEYS = ['salario', 'auxilio_transporte', 'otros_auxilios'];
const INTEGER_KEYS = ['edad', 'ciclo_laboral', 'periodo_prueba_dias', 'numero_hijos', 'numero_parientes', 'numero_documentos', 'numero_certificaciones', 'numero_vacunas'];
const TEXT_KEYS = ['documento', 'numero_cuenta', 'telefono', 'celular', 'telefono_emergencia'];
const STATUS_OPTIONS = ['Activo', 'Inactivo', 'En retiro', 'Retirado', 'Suspendido'];
const GENDER_OPTIONS = ['Femenino', 'Masculino'];

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  allLabel: string;
  optionLabels?: Record<string, string>;
}

function uniqueOptions(...groups: string[][]) {
  return Array.from(new Set(groups.flat().filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, 'es'));
}

function countActiveFilters(filters: GeneralEmployeeFilters) {
  return Object.entries(filters)
    .filter(([key, value]) => key === 'search' ? Boolean(value.trim()) : value !== 'all').length;
}

function FilterSelect({ label, value, options, onChange, allLabel, optionLabels }: FilterSelectProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-foreground/80">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-xl border-border/70 bg-background px-3 text-sm shadow-sm transition-colors hover:border-primary/40 focus:ring-2 focus:ring-primary/20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{optionLabels?.[option] || option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function GeneralEmployeeReport() {
  const {
    data: rows = [],
    isFetching,
    isError,
    error,
    refetch,
  } = useGeneralEmployeeReport(false);
  const { data: operationCenters = [] } = useOperationCenters();
  const { data: areas = [] } = useAreas();
  const { data: contractTypes = [] } = useContractTypes();
  const { companies, currentCompanyId } = useAuth();
  const [filters, setFilters] = useState<GeneralEmployeeFilters>(EMPTY_GENERAL_EMPLOYEE_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<GeneralEmployeeFilters>(EMPTY_GENERAL_EMPLOYEE_FILTERS);
  const [hasAppliedQuery, setHasAppliedQuery] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(GENERAL_EMPLOYEE_DEFAULT_COLUMN_KEYS);
  const [fieldsDialogOpen, setFieldsDialogOpen] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');
  const companyName = companies.find((company) => company.id === currentCompanyId)?.name;

  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const columns = useMemo(() => selectedGeneralEmployeeColumns(selectedKeySet), [selectedKeySet]);
  const filteredRows = useMemo(
    () => hasAppliedQuery ? filterGeneralEmployeeRows(rows, appliedFilters) : [],
    [appliedFilters, hasAppliedQuery, rows],
  );
  const activeDraftFilterCount = countActiveFilters(filters);
  const appliedFilterCount = countActiveFilters(appliedFilters);
  const hasPendingFilterChanges = hasAppliedQuery
    && JSON.stringify(filters) !== JSON.stringify(appliedFilters);

  const contractLabels = useMemo(
    () => Object.fromEntries(contractTypes.map((item) => [item.contract_type, item.display_name])),
    [contractTypes],
  );
  const options = useMemo(() => ({
    statuses: uniqueOptions(STATUS_OPTIONS, getGeneralEmployeeFilterOptions(rows, 'estado')),
    centers: uniqueOptions(
      operationCenters.map((center) => center.name),
      getGeneralEmployeeFilterOptions(rows, 'centro'),
    ),
    areas: uniqueOptions(
      areas.map((area) => area.name),
      getGeneralEmployeeFilterOptions(rows, 'area'),
    ),
    genders: uniqueOptions(GENDER_OPTIONS, getGeneralEmployeeFilterOptions(rows, 'sexo_biologico')),
    contracts: uniqueOptions(
      contractTypes.map((item) => item.contract_type),
      getGeneralEmployeeFilterOptions(rows, 'tipo_contrato'),
    ),
  }), [areas, contractTypes, operationCenters, rows]);

  const normalizedFieldSearch = fieldSearch.trim().toLocaleLowerCase('es');
  const visibleCategories = useMemo(() => (
    (Object.keys(GENERAL_EMPLOYEE_CATEGORY_LABELS) as GeneralEmployeeColumnCategory[])
      .map((category) => ({
        category,
        columns: GENERAL_EMPLOYEE_COLUMNS.filter((item) => (
          item.category === category
          && (!normalizedFieldSearch
            || item.header.toLocaleLowerCase('es').includes(normalizedFieldSearch)
            || GENERAL_EMPLOYEE_CATEGORY_LABELS[category].toLocaleLowerCase('es').includes(normalizedFieldSearch))
        )),
      }))
      .filter((group) => group.columns.length > 0)
  ), [normalizedFieldSearch]);

  const updateFilter = (key: keyof GeneralEmployeeFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const toggleColumn = (key: string, checked: boolean) => {
    setSelectedKeys((current) => checked
      ? Array.from(new Set([...current, key]))
      : current.filter((selectedKey) => selectedKey !== key));
  };

  const toggleCategory = (category: GeneralEmployeeColumnCategory, checked: boolean) => {
    const categoryKeys = GENERAL_EMPLOYEE_COLUMNS
      .filter((item) => item.category === category)
      .map((item) => item.key);
    setSelectedKeys((current) => checked
      ? Array.from(new Set([...current, ...categoryKeys]))
      : current.filter((key) => !categoryKeys.includes(key)));
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setHasAppliedQuery(true);
    void refetch();
  };

  const handleClearFilters = () => {
    setFilters({ ...EMPTY_GENERAL_EMPLOYEE_FILTERS });
  };

  const generateReport = (): ReportData => ({
    title: 'Informe General de Empleados',
    subtitle: `${filteredRows.length} empleados · ${columns.length} campos seleccionados`,
    generatedAt: new Date(),
    organization: companyName,
    institutional: true,
    sheetName: 'Informe General',
    columns,
    data: filteredRows,
    currencyKeys: CURRENCY_KEYS,
    integerKeys: INTEGER_KEYS,
    textKeys: TEXT_KEYS,
    statusKey: 'estado',
    summary: [
      { label: 'Empleados incluidos', value: filteredRows.length, format: 'number' },
      { label: 'Campos seleccionados', value: columns.length, format: 'number' },
      { label: 'Filtros activos', value: appliedFilterCount, format: 'number' },
    ].slice(0, Math.min(3, columns.length)) as ReportData['summary'],
  });

  const validateExport = () => {
    if (!columns.length) {
      toast.error('Selecciona al menos un campo para generar el informe');
      return false;
    }
    if (!filteredRows.length) {
      toast.error('Aplica una consulta con resultados antes de exportar');
      return false;
    }
    return true;
  };

  const handleExportExcel = () => {
    if (!validateExport()) return;
    try {
      exportToExcel(generateReport(), 'informe_general_empleados');
      toast.success('Informe general exportado a Excel');
    } catch {
      toast.error('No fue posible generar el archivo Excel');
    }
  };

  const handleExportPDF = () => {
    if (!validateExport()) return;
    try {
      exportGeneralEmployeeReportToPDF(generateReport(), 'informe_general_empleados');
      toast.success('Informe general exportado a PDF');
    } catch {
      toast.error('No fue posible generar el archivo PDF');
    }
  };

  return (
    <ReportCard
      className="md:col-span-2"
      title="Informe General de Empleados"
      description="Matriz configurable con información personal, laboral, demográfica, de diversidad, familiar y documental"
      icon={<UsersRound className="h-5 w-5" />}
      recordCount={filteredRows.length}
      isLoading={isFetching}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
      headerExtra={(
        <Badge variant="outline" className="mb-2 gap-1.5 border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-bold text-primary">
          <CheckSquare className="h-3.5 w-3.5" /> {columns.length} de {GENERAL_EMPLOYEE_COLUMNS.length} campos
        </Badge>
      )}
    >
      <div className="space-y-5">
        <section className="overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.055] via-background to-background shadow-[0_14px_35px_-28px_hsl(var(--primary))]">
          <div className="flex flex-col gap-4 border-b border-primary/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-bold tracking-tight">Configura la consulta</h4>
                  {hasPendingFilterChanges && (
                    <Badge className="border-amber-200 bg-amber-50 text-[10px] font-semibold text-amber-700 hover:bg-amber-50">
                      Cambios sin aplicar
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Define los criterios y consulta cuando estés listo. Los resultados no cambian automáticamente.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 rounded-xl border-primary/20 bg-background px-4 font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5"
              onClick={() => setFieldsDialogOpen(true)}
            >
              <Columns3 className="mr-2 h-4 w-4 text-primary" />
              Seleccionar campos
              <Badge variant="secondary" className="ml-2 rounded-md px-1.5 text-[10px] tabular-nums">
                {columns.length}
              </Badge>
            </Button>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div className="space-y-2">
              <Label htmlFor="general-employee-search" className="text-xs font-semibold text-foreground/80">Buscar empleado</Label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="general-employee-search"
                  value={filters.search}
                  onChange={(event) => updateFilter('search', event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleApplyFilters();
                  }}
                  placeholder="Documento, nombre, cargo, centro, área o correo"
                  className="h-12 rounded-xl border-border/70 bg-background pl-10 pr-4 text-sm shadow-sm transition-colors focus-visible:border-primary/50 focus-visible:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <FilterSelect label="Estado del empleado" value={filters.status} options={options.statuses} onChange={(value) => updateFilter('status', value)} allLabel="Todos los estados" />
              <FilterSelect label="Centro de operación" value={filters.center} options={options.centers} onChange={(value) => updateFilter('center', value)} allLabel="Todos los centros" />
              <FilterSelect label="Área" value={filters.area} options={options.areas} onChange={(value) => updateFilter('area', value)} allLabel="Todas las áreas" />
              <FilterSelect label="Sexo biológico" value={filters.gender} options={options.genders} onChange={(value) => updateFilter('gender', value)} allLabel="Todos" />
              <FilterSelect label="Tipo de contrato" value={filters.contractType} options={options.contracts} optionLabels={contractLabels} onChange={(value) => updateFilter('contractType', value)} allLabel="Todos los contratos" />
              <FilterSelect
                label="Condición de discapacidad"
                value={filters.disability}
                options={['yes', 'no']}
                optionLabels={{ yes: 'Con discapacidad', no: 'Sin discapacidad' }}
                onChange={(value) => updateFilter('disability', value)}
                allLabel="Todas las personas"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-primary/10 bg-background/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                <Filter className="h-3.5 w-3.5" />
              </span>
              <span>
                {activeDraftFilterCount
                  ? `${activeDraftFilterCount} ${activeDraftFilterCount === 1 ? 'filtro preparado' : 'filtros preparados'}`
                  : 'La consulta incluirá todos los empleados'}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-10 rounded-xl px-3 text-xs font-semibold text-muted-foreground"
                onClick={handleClearFilters}
                disabled={activeDraftFilterCount === 0}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Limpiar
              </Button>
              <Button
                type="button"
                className="h-10 min-w-[160px] rounded-xl px-5 text-xs font-bold shadow-[0_8px_20px_-10px_hsl(var(--primary))] transition-all hover:-translate-y-0.5 active:translate-y-0"
                onClick={handleApplyFilters}
                disabled={isFetching}
              >
                {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                {isFetching ? 'Consultando...' : hasAppliedQuery ? 'Aplicar consulta' : 'Consultar empleados'}
              </Button>
            </div>
          </div>
        </section>

        <Dialog open={fieldsDialogOpen} onOpenChange={(open) => {
          setFieldsDialogOpen(open);
          if (!open) setFieldSearch('');
        }}>
          <DialogContent className="flex h-[92dvh] max-h-[92dvh] w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-3xl border-border/70 bg-background p-0 shadow-2xl sm:max-w-5xl">
            <DialogHeader className="border-b bg-gradient-to-r from-primary/[0.08] via-primary/[0.03] to-background px-6 py-5 pr-14 text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                  <Columns3 className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight">Seleccionar campos</DialogTitle>
                  <DialogDescription className="mt-1 max-w-2xl text-sm">
                    Personaliza las columnas visibles y exportadas. Puedes seleccionar categorías completas o campos individuales.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-3 border-b bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative min-w-0 flex-1 sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={fieldSearch}
                  onChange={(event) => setFieldSearch(event.target.value)}
                  placeholder="Buscar un campo o categoría"
                  className="h-10 rounded-xl bg-muted/35 pl-10 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setSelectedKeys(GENERAL_EMPLOYEE_COLUMNS.map((item) => item.key))}
                >
                  <Check className="mr-1.5 h-3.5 w-3.5" /> Seleccionar todos
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-muted-foreground"
                  onClick={() => setSelectedKeys([])}
                >
                  Quitar todos
                </Button>
              </div>
            </div>

            <ScrollArea className="h-0 min-h-0 flex-1 bg-muted/15">
              <div className="grid gap-4 p-5 lg:grid-cols-2">
                {visibleCategories.map(({ category, columns: visibleColumns }) => {
                  const categoryColumns = GENERAL_EMPLOYEE_COLUMNS.filter((item) => item.category === category);
                  const selectedCount = categoryColumns.filter((item) => selectedKeySet.has(item.key)).length;
                  const allSelected = selectedCount === categoryColumns.length;
                  const percentage = Math.round((selectedCount / categoryColumns.length) * 100);

                  return (
                    <section key={category} className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-[0_10px_25px_-24px_hsl(var(--foreground))]">
                      <label className="flex cursor-pointer items-center gap-3 border-b bg-muted/30 px-4 py-3.5 transition-colors hover:bg-primary/[0.06]">
                        <Checkbox
                          checked={allSelected ? true : selectedCount > 0 ? 'indeterminate' : false}
                          onCheckedChange={(checked) => toggleCategory(category, checked === true)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold leading-tight">{GENERAL_EMPLOYEE_CATEGORY_LABELS[category]}</span>
                          <span className="mt-1 block text-[11px] text-muted-foreground">
                            {selectedCount} de {categoryColumns.length} seleccionados
                          </span>
                        </span>
                        <span className="rounded-lg bg-background px-2 py-1 text-[11px] font-bold tabular-nums text-primary shadow-sm">
                          {percentage}%
                        </span>
                      </label>
                      <div className="grid gap-2 p-3 sm:grid-cols-2">
                        {visibleColumns.map((item) => {
                          const checked = selectedKeySet.has(item.key);
                          return (
                            <label
                              key={item.key}
                              className={cn(
                                'flex min-h-10 cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs transition-all duration-200',
                                checked
                                  ? 'border-primary/25 bg-primary/[0.055] font-semibold text-foreground shadow-sm'
                                  : 'border-transparent bg-muted/25 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground',
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => toggleColumn(item.key, value === true)}
                                className="mt-0.5"
                              />
                              <span className="leading-snug">{item.header}</span>
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
              {visibleCategories.length === 0 && (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                  <FileSearch className="mb-3 h-9 w-9 text-muted-foreground/50" />
                  <p className="font-semibold">No encontramos ese campo</p>
                  <p className="mt-1 text-sm text-muted-foreground">Prueba con otro nombre o una categoría diferente.</p>
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="flex-row items-center justify-between border-t bg-background px-6 py-4">
              <div className="mr-auto text-left">
                <p className="text-sm font-bold tabular-nums">{columns.length} campos seleccionados</p>
                <p className="text-xs text-muted-foreground">Se usarán en la vista previa y en las exportaciones.</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="hidden rounded-xl text-xs sm:inline-flex"
                onClick={() => setSelectedKeys(GENERAL_EMPLOYEE_DEFAULT_COLUMN_KEYS)}
              >
                Restablecer
              </Button>
              <DialogClose asChild>
                <Button type="button" className="rounded-xl px-6 font-semibold">Guardar selección</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {!hasAppliedQuery ? (
          <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-primary/25 bg-gradient-to-b from-primary/[0.025] to-transparent px-6 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileSearch className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold tracking-tight">El informe está listo para consultar</h4>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Ajusta los filtros y presiona <span className="font-semibold text-foreground">Consultar empleados</span>. No cargaremos información hasta que ejecutes la consulta.
            </p>
          </section>
        ) : isFetching ? (
          <section className="overflow-hidden rounded-2xl border">
            <div className="flex items-center justify-between border-b bg-muted/25 px-4 py-3">
              <div className="h-4 w-36 animate-pulse rounded bg-muted" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="space-y-3 p-4">
              {[0, 1, 2, 3, 4].map((item) => (
                <div key={item} className="grid grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((cell) => <div key={cell} className="h-8 animate-pulse rounded-lg bg-muted/70" />)}
                </div>
              ))}
            </div>
          </section>
        ) : isError ? (
          <section className="flex flex-col items-center rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="font-semibold text-destructive">No fue posible cargar la información de empleados</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Intenta ejecutar la consulta nuevamente.'}
            </p>
            <Button type="button" variant="outline" className="mt-4 rounded-xl" onClick={handleApplyFilters}>Reintentar</Button>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-[0_12px_30px_-28px_hsl(var(--foreground))]">
            <div className="flex flex-col gap-2 border-b bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-bold">Vista previa del informe</h4>
                <p className="text-xs text-muted-foreground">
                  {filteredRows.length} empleados · {columns.length} columnas · {appliedFilterCount} filtros aplicados
                </p>
              </div>
              {hasPendingFilterChanges && (
                <span className="text-xs font-medium text-amber-700">Hay cambios de filtros pendientes por aplicar</span>
              )}
            </div>
            {columns.length > 0 && filteredRows.length > 0 ? (
              <ScrollArea className="w-full whitespace-nowrap">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/35 hover:bg-muted/35">
                      {columns.map((item) => (
                        <TableHead key={item.key} className="min-w-[150px] text-[10px] font-bold uppercase tracking-wider text-foreground/70">{item.header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.slice(0, PREVIEW_LIMIT).map((row) => (
                      <TableRow key={row.employee_id}>
                        {columns.map((item) => (
                          <TableCell key={item.key} className="max-w-[280px] truncate text-xs" title={String(row[item.key] ?? '')}>
                            {String(row[item.key] ?? '-')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
                <FileSearch className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-semibold">
                  {columns.length ? 'La consulta no encontró empleados' : 'Selecciona campos para visualizar el informe'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {columns.length ? 'Ajusta los filtros y vuelve a aplicar la consulta.' : 'Abre Seleccionar campos y elige al menos una columna.'}
                </p>
              </div>
            )}
            {filteredRows.length > PREVIEW_LIMIT && (
              <p className="border-t bg-muted/20 px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Vista previa de {PREVIEW_LIMIT} registros. La exportación incluirá los {filteredRows.length} registros.
              </p>
            )}
          </section>
        )}
      </div>
    </ReportCard>
  );
}
