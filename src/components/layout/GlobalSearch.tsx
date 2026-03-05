import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, FileText, Briefcase, X, Loader2, Stethoscope, Package, Gavel, Palmtree, ClipboardList, GraduationCap, Target, BarChart3, Calendar, Bell, Building2, Settings, Network, Landmark, Clock, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'employee' | 'contract' | 'module';
  icon: React.ElementType;
  url: string;
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

export function GlobalSearch() {
  const navigate = useNavigate();
  const { currentCompanyId } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut: Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const searchDB = useCallback(async (term: string) => {
    if (!term.trim() || !currentCompanyId) return [];

    setIsLoading(true);
    const dbResults: SearchResult[] = [];

    try {
      // Search employees
      const { data: employees } = await supabase
        .from('employees_v2')
        .select('id, first_name, last_name, document_number')
        .eq('company_id', currentCompanyId)
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,document_number.ilike.%${term}%`)
        .limit(5);

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
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, contract_number, contract_type, employee_id, employees_v2!inner(first_name, last_name)')
        .or(`contract_number.ilike.%${term}%,employees_v2.first_name.ilike.%${term}%,employees_v2.last_name.ilike.%${term}%`)
        .limit(5);

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

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(0);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    // Filter modules instantly
    const lowerVal = value.toLowerCase();
    const moduleResults = MODULE_SHORTCUTS.filter(
      (m) => m.title.toLowerCase().includes(lowerVal) || m.subtitle.toLowerCase().includes(lowerVal)
    );

    setResults(moduleResults);

    // Debounce DB search
    debounceRef.current = setTimeout(async () => {
      const dbResults = await searchDB(value);
      setResults((prev) => {
        const moduleOnly = prev.filter((r) => r.type === 'module');
        return [...dbResults, ...moduleOnly];
      });
    }, 300);
  }, [searchDB]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const typeLabels: Record<string, string> = {
    employee: 'Empleado',
    contract: 'Contrato',
    module: 'Módulo',
  };

  return (
    <div className="flex-1 max-w-md hidden sm:block relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            handleSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => { if (query.trim()) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar empleados, contratos, módulos... (Ctrl+K)"
          className="w-full h-10 pl-10 pr-10 rounded-lg bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[360px] overflow-y-auto">
          {results.map((result, index) => {
            const Icon = result.icon;
            return (
              <button
                key={result.id}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  index === selectedIndex ? "bg-accent/10" : "hover:bg-muted/50",
                  index !== results.length - 1 && "border-b border-border/50"
                )}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {typeLabels[result.type]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && query.trim() && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 p-6 text-center">
          <Search className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No se encontraron resultados para "{query}"</p>
        </div>
      )}
    </div>
  );
}
