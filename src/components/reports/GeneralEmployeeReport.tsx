import { useMemo, useState } from 'react';
import { CheckSquare, Filter, Search, Settings2, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useGeneralEmployeeReport } from '@/hooks/useGeneralEmployeeReport';
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
import { ReportCard } from './ReportCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PREVIEW_LIMIT = 50;
const CURRENCY_KEYS = ['salario', 'auxilio_transporte', 'otros_auxilios'];
const INTEGER_KEYS = ['edad', 'ciclo_laboral', 'periodo_prueba_dias', 'numero_hijos', 'numero_parientes', 'numero_documentos', 'numero_certificaciones', 'numero_vacunas'];
const TEXT_KEYS = ['documento', 'numero_cuenta', 'telefono', 'celular', 'telefono_emergencia'];

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  allLabel: string;
  optionLabels?: Record<string, string>;
}

function FilterSelect({ label, value, options, onChange, allLabel, optionLabels }: FilterSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 rounded-xl text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => <SelectItem key={option} value={option}>{optionLabels?.[option] || option}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function GeneralEmployeeReport() {
  const { data: rows = [], isLoading, isError, error } = useGeneralEmployeeReport();
  const { companies, currentCompanyId } = useAuth();
  const [filters, setFilters] = useState<GeneralEmployeeFilters>(EMPTY_GENERAL_EMPLOYEE_FILTERS);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(GENERAL_EMPLOYEE_DEFAULT_COLUMN_KEYS);
  const companyName = companies.find((company) => company.id === currentCompanyId)?.name;

  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const columns = useMemo(() => selectedGeneralEmployeeColumns(selectedKeySet), [selectedKeySet]);
  const filteredRows = useMemo(() => filterGeneralEmployeeRows(rows, filters), [filters, rows]);
  const activeFilterCount = Object.entries(filters)
    .filter(([key, value]) => key === 'search' ? Boolean(value.trim()) : value !== 'all').length;

  const options = useMemo(() => ({
    statuses: getGeneralEmployeeFilterOptions(rows, 'estado'),
    centers: getGeneralEmployeeFilterOptions(rows, 'centro'),
    areas: getGeneralEmployeeFilterOptions(rows, 'area'),
    genders: getGeneralEmployeeFilterOptions(rows, 'sexo_biologico'),
    contracts: getGeneralEmployeeFilterOptions(rows, 'tipo_contrato'),
  }), [rows]);

  const updateFilter = (key: keyof GeneralEmployeeFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const toggleColumn = (key: string, checked: boolean) => {
    setSelectedKeys((current) => checked
      ? [...current, key]
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
      { label: 'Filtros activos', value: activeFilterCount, format: 'number' },
    ].slice(0, Math.min(3, columns.length)) as ReportData['summary'],
  });

  const validateExport = () => {
    if (!columns.length) {
      toast.error('Selecciona al menos un campo para generar el informe');
      return false;
    }
    if (!filteredRows.length) {
      toast.error('No hay empleados que coincidan con los filtros');
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
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
      headerExtra={
        <Badge variant="outline" className="mb-2 gap-1 border-primary/20 bg-primary/5 text-[9px] font-black uppercase tracking-wider text-primary">
          <CheckSquare className="h-3 w-3" /> {columns.length} de {GENERAL_EMPLOYEE_COLUMNS.length} campos
        </Badge>
      }
    >
      {isError ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm font-medium text-destructive">
          {error instanceof Error ? error.message : 'No fue posible cargar la información de empleados.'}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="relative flex-1">
              <Label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-muted-foreground">Búsqueda</Label>
              <Search className="absolute bottom-2.5 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                placeholder="Documento, nombre, cargo, centro, área o correo..."
                className="h-9 rounded-xl pl-9 text-xs"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 rounded-xl text-xs font-bold">
                  <Settings2 className="mr-2 h-4 w-4" /> Seleccionar campos
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[min(92vw,520px)] rounded-2xl p-0">
                <div className="flex items-center justify-between border-b p-4">
                  <div>
                    <p className="text-sm font-black">Campos del informe</p>
                    <p className="text-xs text-muted-foreground">Marca la información que deseas exportar.</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedKeys(GENERAL_EMPLOYEE_DEFAULT_COLUMN_KEYS)}>Todos</Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedKeys([])}>Ninguno</Button>
                  </div>
                </div>
                <ScrollArea className="h-[55vh] max-h-[540px]">
                  <div className="space-y-5 p-4">
                    {(Object.keys(GENERAL_EMPLOYEE_CATEGORY_LABELS) as GeneralEmployeeColumnCategory[]).map((category) => {
                      const categoryColumns = GENERAL_EMPLOYEE_COLUMNS.filter((item) => item.category === category);
                      const selectedCount = categoryColumns.filter((item) => selectedKeySet.has(item.key)).length;
                      const allSelected = selectedCount === categoryColumns.length;
                      return (
                        <div key={category} className="space-y-2">
                          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                            <Checkbox
                              checked={allSelected ? true : selectedCount > 0 ? 'indeterminate' : false}
                              onCheckedChange={(checked) => toggleCategory(category, checked === true)}
                            />
                            <span className="flex-1 text-xs font-black uppercase tracking-wider">{GENERAL_EMPLOYEE_CATEGORY_LABELS[category]}</span>
                            <span className="text-[10px] font-bold text-muted-foreground">{selectedCount}/{categoryColumns.length}</span>
                          </label>
                          <div className="grid gap-2 pl-2 sm:grid-cols-2">
                            {categoryColumns.map((item) => (
                              <label key={item.key} className="flex cursor-pointer items-start gap-2 text-xs">
                                <Checkbox
                                  checked={selectedKeySet.has(item.key)}
                                  onCheckedChange={(checked) => toggleColumn(item.key, checked === true)}
                                />
                                <span>{item.header}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect label="Estado" value={filters.status} options={options.statuses} onChange={(value) => updateFilter('status', value)} allLabel="Todos los estados" />
            <FilterSelect label="Centro" value={filters.center} options={options.centers} onChange={(value) => updateFilter('center', value)} allLabel="Todos los centros" />
            <FilterSelect label="Área" value={filters.area} options={options.areas} onChange={(value) => updateFilter('area', value)} allLabel="Todas las áreas" />
            <FilterSelect label="Sexo biológico" value={filters.gender} options={options.genders} onChange={(value) => updateFilter('gender', value)} allLabel="Todos" />
            <FilterSelect label="Tipo de contrato" value={filters.contractType} options={options.contracts} onChange={(value) => updateFilter('contractType', value)} allLabel="Todos los contratos" />
            <FilterSelect
              label="Discapacidad"
              value={filters.disability}
              options={['yes', 'no']}
              optionLabels={{ yes: 'Con discapacidad', no: 'Sin discapacidad' }}
              onChange={(value) => updateFilter('disability', value)}
              allLabel="Todas las personas"
            />

            <div className="flex items-end sm:col-span-2">
              <Button
                variant="ghost"
                className="h-9 w-full rounded-xl text-xs font-bold text-muted-foreground"
                onClick={() => setFilters(EMPTY_GENERAL_EMPLOYEE_FILTERS)}
                disabled={activeFilterCount === 0}
              >
                <Filter className="mr-2 h-4 w-4" /> Limpiar {activeFilterCount ? `${activeFilterCount} filtros` : 'filtros'}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border">
            <ScrollArea className="w-full whitespace-nowrap">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    {columns.map((item) => (
                      <TableHead key={item.key} className="min-w-[150px] text-[10px] font-black uppercase tracking-wider">{item.header}</TableHead>
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
            {!columns.length && <p className="p-6 text-center text-sm text-muted-foreground">Selecciona campos para visualizar el informe.</p>}
            {columns.length > 0 && filteredRows.length === 0 && !isLoading && <p className="p-6 text-center text-sm text-muted-foreground">No hay empleados que coincidan con los filtros.</p>}
            {filteredRows.length > PREVIEW_LIMIT && (
              <p className="border-t bg-muted/20 px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Vista previa de {PREVIEW_LIMIT} registros. La exportación incluirá los {filteredRows.length} registros.
              </p>
            )}
          </div>
        </div>
      )}
    </ReportCard>
  );
}
