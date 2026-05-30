import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Users, FileText, Briefcase, X, Loader2, Stethoscope, Package,
  Gavel, Palmtree, ClipboardList, GraduationCap, Target, BarChart3,
  Calendar, Bell, Building2, Settings, Network, Landmark, Clock, Calculator,
  UserPlus, FilePlus, LogOut, MapPin, Phone, Mail, BadgeCheck, CalendarDays,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'employee' | 'contract' | 'module' | 'action';
  icon: React.ElementType;
  url?: string;
  action?: () => void;
}

// --- Preview data types ---
interface EmployeePreview {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  document_number: string;
  document_type: string;
  birth_date?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  position?: string | null;
  area?: string | null;
  center?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
}

interface ContractPreview {
  id: string;
  contract_number: string | null;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  salary: number;
  is_terminated: boolean | null;
  employee_name: string;
  employee_document: string;
}

const MODULE_SHORTCUTS: SearchResult[] = [
  { id: 'mod-dashboard', title: 'Dashboard', subtitle: 'Panel principal', type: 'module', icon: BarChart3, url: '/' },
  { id: 'mod-empleados', title: 'Empleados', subtitle: 'Gestión de empleados', type: 'module', icon: Users, url: '/empleados' },
  { id: 'mod-contratos', title: 'Contratos', subtitle: 'Gestión de contratos', type: 'module', icon: FileText, url: '/contratos' },
  { id: 'mod-incapacidades', title: 'Incapacidades', subtitle: 'Gestión de incapacidades', type: 'module', icon: Stethoscope, url: '/incapacidades' },
  { id: 'mod-vacaciones', title: 'Vacaciones', subtitle: 'Gestión de vacaciones', type: 'module', icon: Palmtree, url: '/vacaciones' },
  { id: 'mod-permisos', title: 'Permisos y Licencias', subtitle: 'Solicitudes de permisos', type: 'module', icon: ClipboardList, url: '/permisos' },
  { id: 'mod-dotacion', title: 'Dotación', subtitle: 'Gestión de dotación', type: 'module', icon: Package, url: '/dotacion' },
  { id: 'mod-examenes', title: 'Exámenes Médicos', subtitle: 'Gestión de exámenes', type: 'module', icon: Stethoscope, url: '/examenes' },
  { id: 'mod-disciplinarios', title: 'Disciplinarios', subtitle: 'Procesos disciplinarios', type: 'module', icon: Gavel, url: '/disciplinarios' },
  { id: 'mod-capacitaciones', title: 'Capacitaciones', subtitle: 'Formación y entrenamiento', type: 'module', icon: GraduationCap, url: '/capacitaciones' },
  { id: 'mod-evaluaciones', title: 'Evaluaciones', subtitle: 'Evaluaciones de desempeño', type: 'module', icon: Target, url: '/evaluaciones' },
  { id: 'mod-novedades', title: 'Novedades', subtitle: 'Novedades de nómina', type: 'module', icon: ClipboardList, url: '/novedades' },
  { id: 'mod-jornadas', title: 'Jornadas y Turnos', subtitle: 'Gestión de horarios', type: 'module', icon: Clock, url: '/jornadas' },
  { id: 'mod-seleccion', title: 'Selección', subtitle: 'Proceso de selección', type: 'module', icon: Briefcase, url: '/seleccion' },
  { id: 'mod-requisiciones', title: 'Requisiciones', subtitle: 'Requisiciones de personal', type: 'module', icon: Briefcase, url: '/requisiciones' },
  { id: 'mod-organigrama', title: 'Organigrama', subtitle: 'Estructura organizacional', type: 'module', icon: Network, url: '/organigrama' },
  { id: 'mod-cesantias', title: 'Cesantías', subtitle: 'Gestión de cesantías', type: 'module', icon: Landmark, url: '/cesantias' },
  { id: 'mod-preliquidacion', title: 'Pre-Liquidación', subtitle: 'Cálculo de nómina', type: 'module', icon: Calculator, url: '/pre-liquidacion' },
  { id: 'mod-calendario', title: 'Calendario', subtitle: 'Calendario unificado', type: 'module', icon: Calendar, url: '/calendario' },
  { id: 'mod-reportes', title: 'Reportes', subtitle: 'Informes y reportes', type: 'module', icon: BarChart3, url: '/reportes' },
  { id: 'mod-alertas', title: 'Alertas', subtitle: 'Centro de alertas', type: 'module', icon: Bell, url: '/alertas' },
  { id: 'mod-centros', title: 'Centros de Operación', subtitle: 'Gestión de centros', type: 'module', icon: Building2, url: '/centros' },
  { id: 'mod-configuracion', title: 'Configuración', subtitle: 'Ajustes del sistema', type: 'module', icon: Settings, url: '/configuracion' },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// --- Preview Panel ---
function EmployeePreviewCard({ data }: { data: EmployeePreview }) {
  const age = data.birth_date ? differenceInYears(new Date(), new Date(data.birth_date)) : null;
  const initials = `${data.first_name[0]}${data.last_name[0]}`.toUpperCase();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={data.avatar_url || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {data.first_name} {data.middle_name || ''} {data.last_name}
          </p>
          <p className="text-xs text-muted-foreground">{data.document_type} {data.document_number}</p>
        </div>
      </div>

      <Badge variant={data.is_active ? 'default' : 'secondary'} className="text-[10px]">
        {data.is_active ? 'Activo' : 'Inactivo'}
      </Badge>

      <Separator />

      <div className="space-y-2 text-xs">
        {data.position && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <BadgeCheck className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className="truncate">{data.position}</span>
          </div>
        )}
        {data.area && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className="truncate">{data.area}</span>
          </div>
        )}
        {data.center && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className="truncate">{data.center}</span>
          </div>
        )}
        {data.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className="truncate">{data.email}</span>
          </div>
        )}
        {data.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span>{data.phone}</span>
          </div>
        )}
        {age !== null && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span>{age} años</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ContractPreviewCard({ data }: { data: ContractPreview }) {
  const contractTypeLabels: Record<string, string> = {
    termino_fijo: 'Término Fijo',
    termino_indefinido: 'Término Indefinido',
    obra_labor: 'Obra o Labor',
    aprendizaje: 'Aprendizaje',
    prestacion_servicios: 'Prestación de Servicios',
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold text-sm text-foreground">{data.contract_number || 'Sin número'}</p>
        <p className="text-xs text-muted-foreground">{data.employee_name}</p>
        <p className="text-[10px] text-muted-foreground">CC {data.employee_document}</p>
      </div>

      <Badge variant={data.is_terminated ? 'secondary' : 'default'} className="text-[10px]">
        {data.is_terminated ? 'Terminado' : 'Vigente'}
      </Badge>

      <Separator />

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tipo</span>
          <span className="font-medium text-foreground">{contractTypeLabels[data.contract_type] || data.contract_type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Inicio</span>
          <span className="font-medium text-foreground">{formatDateOnly(data.start_date, 'dd MMM yyyy', { locale: es })}</span>
        </div>
        {data.end_date && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fin</span>
            <span className="font-medium text-foreground">{formatDateOnly(data.end_date, 'dd MMM yyyy', { locale: es })}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Salario</span>
          <span className="font-medium text-foreground">${data.salary.toLocaleString('es-CO')}</span>
        </div>
      </div>
    </div>
  );
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { currentCompanyId, signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewData, setPreviewData] = useState<{ type: 'employee'; data: EmployeePreview } | { type: 'contract'; data: ContractPreview } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const listRef = useRef<HTMLDivElement>(null);

  const QUICK_ACTIONS: SearchResult[] = [
    { id: 'act-new-employee', title: 'Nuevo Empleado', subtitle: 'Registrar un empleado', type: 'action', icon: UserPlus, url: '/empleados' },
    { id: 'act-new-contract', title: 'Nuevo Contrato', subtitle: 'Crear un contrato', type: 'action', icon: FilePlus, url: '/contratos' },
    { id: 'act-new-requisition', title: 'Nueva Requisición', subtitle: 'Solicitar personal', type: 'action', icon: Briefcase, url: '/requisiciones' },
    { id: 'act-profile', title: 'Mi Perfil', subtitle: 'Ver mi perfil', type: 'action', icon: Users, url: '/perfil' },
    { id: 'act-logout', title: 'Cerrar Sesión', subtitle: 'Salir del sistema', type: 'action', icon: LogOut, action: () => signOut() },
  ];

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setPreviewData(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onOpenChange]);

  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-result-item]');
    items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Fetch preview data when selected item changes
  const fetchPreview = useCallback(async (result: SearchResult) => {
    if (result.type === 'employee') {
      setPreviewLoading(true);
      try {
        const { data: emp } = await supabase
          .from('employees_v2')
          .select('id, first_name, middle_name, last_name, document_number, document_type, birth_date, avatar_url, is_active')
          .eq('id', result.id)
          .single();

        if (!emp) { setPreviewData(null); return; }

        // Get work info
        let position: string | null = null;
        let area: string | null = null;
        let center: string | null = null;
        try {
          const { data: workInfo } = await supabase
            .from('employee_work_info')
            .select('positions(name), areas(name), operation_centers(name)')
            .eq('employee_id', result.id)
            .eq('is_current', true)
            .maybeSingle();
          if (workInfo) {
            position = (workInfo as any)?.positions?.name || null;
            area = (workInfo as any)?.areas?.name || null;
            center = (workInfo as any)?.operation_centers?.name || null;
          }
        } catch {}

        // Get contact info
        let email: string | null = null;
        let phone: string | null = null;
        let city: string | null = null;
        try {
          const { data: contact } = await supabase
            .from('employee_contact')
            .select('personal_email, mobile, residence_city')
            .eq('employee_id', result.id)
            .eq('is_current', true)
            .maybeSingle();
          if (contact) {
            email = contact.personal_email || null;
            phone = contact.mobile || null;
            city = contact.residence_city || null;
          }
        } catch {}

        setPreviewData({
          type: 'employee',
          data: {
            ...emp,
            position,
            area,
            center,
            email,
            phone,
            city,
          },
        });
      } catch {
        setPreviewData(null);
      } finally {
        setPreviewLoading(false);
      }
    } else if (result.type === 'contract') {
      setPreviewLoading(true);
      try {
        const { data: contract } = await supabase
          .from('contracts')
          .select('id, contract_number, contract_type, start_date, end_date, salary, is_terminated, employees_v2(first_name, last_name, document_number)')
          .eq('id', result.id)
          .single();

        if (!contract) { setPreviewData(null); return; }

        setPreviewData({
          type: 'contract',
          data: {
            id: contract.id,
            contract_number: contract.contract_number,
            contract_type: contract.contract_type,
            start_date: contract.start_date,
            end_date: contract.end_date,
            salary: contract.salary,
            is_terminated: contract.is_terminated,
            employee_name: `${(contract.employees_v2 as any)?.first_name || ''} ${(contract.employees_v2 as any)?.last_name || ''}`.trim(),
            employee_document: (contract.employees_v2 as any)?.document_number || '',
          },
        });
      } catch {
        setPreviewData(null);
      } finally {
        setPreviewLoading(false);
      }
    } else {
      setPreviewData(null);
    }
  }, []);

  // Debounced preview fetch on selection change
  useEffect(() => {
    const displayed = allResultsRef.current;
    if (displayed.length === 0) { setPreviewData(null); return; }
    const selected = displayed[selectedIndex];
    if (!selected || (selected.type !== 'employee' && selected.type !== 'contract')) {
      setPreviewData(null);
      return;
    }

    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(() => fetchPreview(selected), 150);

    return () => { if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current); };
  }, [selectedIndex, results, fetchPreview]);

  const searchDB = useCallback(async (term: string) => {
    if (!term.trim() || !currentCompanyId) return [];
    setIsLoading(true);
    const dbResults: SearchResult[] = [];

    try {
      const searchTerms = term.trim().split(/\s+/).filter(Boolean);

      // Search employees
      let employeesQuery = supabase
        .from('employees_v2')
        .select('id, first_name, last_name, document_number')
        .eq('company_id', currentCompanyId);

      searchTerms.forEach(t => {
        const pattern = `%${t}%`;
        employeesQuery = employeesQuery.or(`first_name.ilike.${pattern},middle_name.ilike.${pattern},last_name.ilike.${pattern},second_last_name.ilike.${pattern},document_number.ilike.${pattern}`);
      });

      const { data: employees } = await employeesQuery.limit(5);

      if (employees) {
        employees.forEach((emp) => {
          dbResults.push({
            id: emp.id,
            title: `${emp.first_name} ${emp.last_name || ''}`.trim(),
            subtitle: `CC ${emp.document_number}`,
            type: 'employee',
            icon: Users,
            url: `/empleados/${emp.id}/360`,
          });
        });
      }

      // Search contracts by employee name or contract number
      let contractsQuery = supabase
        .from('contracts')
        .select('id, contract_number, contract_type, employee_id, employees_v2!inner(first_name, middle_name, last_name, second_last_name)');

      searchTerms.forEach(t => {
        const pattern = `%${t}%`;
        contractsQuery = contractsQuery.or(`contract_number.ilike.${pattern},employees_v2.first_name.ilike.${pattern},employees_v2.middle_name.ilike.${pattern},employees_v2.last_name.ilike.${pattern},employees_v2.second_last_name.ilike.${pattern}`);
      });

      const { data: contracts } = await contractsQuery.limit(5);

      if (contracts) {
        contracts.forEach((c: any) => {
          dbResults.push({
            id: c.id,
            title: c.contract_number || 'Sin número',
            subtitle: `${c.employees_v2?.first_name || ''} ${c.employees_v2?.last_name || ''} · ${c.contract_type}`,
            type: 'contract',
            icon: FileText,
            url: '/contratos',
          });
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
    return dbResults;
  }, [currentCompanyId]);

  const getAllResults = useCallback((): SearchResult[] => {
    if (!query.trim()) {
      return [...QUICK_ACTIONS, ...MODULE_SHORTCUTS.slice(0, 6)];
    }
    return results;
  }, [query, results, QUICK_ACTIONS]);

  const displayedResults = getAllResults();
  const allResultsRef = useRef(displayedResults);
  allResultsRef.current = displayedResults;

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    const lowerVal = value.toLowerCase();
    const moduleResults = MODULE_SHORTCUTS.filter(
      (m) => m.title.toLowerCase().includes(lowerVal) || m.subtitle.toLowerCase().includes(lowerVal)
    );
    const actionResults = QUICK_ACTIONS.filter(
      (a) => a.title.toLowerCase().includes(lowerVal) || a.subtitle.toLowerCase().includes(lowerVal)
    );
    setResults([...actionResults, ...moduleResults]);

    debounceRef.current = setTimeout(async () => {
      const dbResults = await searchDB(value);
      setResults((prev) => {
        const nonDb = prev.filter((r) => r.type === 'module' || r.type === 'action');
        return [...dbResults, ...nonDb];
      });
    }, 300);
  }, [searchDB]);

  const handleSelect = (result: SearchResult) => {
    if (result.action) {
      result.action();
    } else if (result.url) {
      navigate(result.url);
    }
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (displayedResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % displayedResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + displayedResults.length) % displayedResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(displayedResults[selectedIndex]);
    }
  };

  const typeColors: Record<string, string> = {
    employee: 'bg-info/10 text-info',
    contract: 'bg-warning/10 text-warning',
    module: 'bg-background text-muted-foreground',
    action: 'bg-accent/10 text-accent',
  };

  const groupedSections: { type: string; label: string; items: SearchResult[] }[] = [];
  const seen = new Set<string>();
  displayedResults.forEach((r) => {
    if (!seen.has(r.type)) {
      seen.add(r.type);
      groupedSections.push({
        type: r.type,
        label: r.type === 'action' ? 'Acciones Rápidas' : r.type === 'module' ? 'Módulos' : r.type === 'employee' ? 'Empleados' : 'Contratos',
        items: displayedResults.filter((x) => x.type === r.type),
      });
    }
  });

  const hasPreviewableResult = displayedResults.some((r) => r.type === 'employee' || r.type === 'contract');
  let flatIndex = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 gap-0 overflow-hidden [&>button]:hidden transition-all",
        hasPreviewableResult ? "max-w-2xl sm:max-w-3xl" : "max-w-lg sm:max-w-xl"
      )}>
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar empleados, módulos, acciones..."
            className="flex-1 h-12 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          {isLoading && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />}
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); setPreviewData(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Body: list + preview */}
        <div className="flex">
          {/* Results list */}
          <div ref={listRef} className={cn(
            "max-h-[50vh] overflow-y-auto flex-1 min-w-0",
            hasPreviewableResult && "sm:border-r sm:border-border"
          )}>
            {displayedResults.length === 0 && query.trim() && !isLoading ? (
              <div className="p-8 text-center">
                <Search className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">Sin resultados para &ldquo;{query}&rdquo;</p>
              </div>
            ) : (
              groupedSections.map((section) => (
                <div key={section.type}>
                  <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-background">
                    {section.label}
                  </div>
                  {section.items.map((result) => {
                    const currentFlatIndex = flatIndex++;
                    const Icon = result.icon;
                    return (
                      <button
                        key={result.id}
                        data-result-item
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          currentFlatIndex === selectedIndex ? "" : "hover:bg-background /40"
                        )}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(currentFlatIndex)}
                      >
                        <div className={cn("shrink-0 w-8 h-8 rounded-lg flex items-center justify-center", typeColors[result.type] || 'bg-background ')}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        </div>
                        {currentFlatIndex === selectedIndex && (
                          <span className="hidden sm:inline-flex shrink-0 text-[10px] text-muted-foreground">
                            ↵
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Preview panel - desktop only */}
          {hasPreviewableResult && (
            <div className="hidden sm:flex w-56 shrink-0 max-h-[50vh] overflow-y-auto p-4">
              {previewLoading ? (
                <div className="flex items-center justify-center w-full">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                </div>
              ) : previewData ? (
                previewData.type === 'employee' ? (
                  <EmployeePreviewCard data={previewData.data} />
                ) : (
                  <ContractPreviewCard data={previewData.data} />
                )
              ) : (
                <div className="flex items-center justify-center w-full text-center">
                  <p className="text-xs text-muted-foreground">Selecciona un empleado o contrato para ver la vista previa</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-t border-border bg-background text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border border-border bg-background px-1 text-[10px]">↑</kbd>
            <kbd className="inline-flex h-4 items-center rounded border border-border bg-background px-1 text-[10px]">↓</kbd>
            Navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border border-border bg-background px-1 text-[10px]">↵</kbd>
            Seleccionar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border border-border bg-background px-1 text-[10px]">Esc</kbd>
            Cerrar
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
