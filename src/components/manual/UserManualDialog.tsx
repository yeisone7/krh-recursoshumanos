import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Download,
  BookOpen,
  LogIn,
  Shield,
  Layers,
  Bell,
  Scale,
  Calculator,
  ShieldCheck,
  HelpCircle,
  LayoutDashboard,
  Users,
  FileText,
  Palmtree,
  ClipboardList,
  HeartPulse,
  Package,
  Stethoscope,
  GraduationCap,
  Target,
  Gavel,
  Landmark,
  UserSearch,
  Briefcase,
  Clock,
  Calendar,
  FileBarChart,
  Network,
  BarChart3,
  Settings,
  FolderOpen,
  User,
  CheckCircle2,
  AlertTriangle,
  Lock,
  FileCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { MANUAL_SECTIONS, MODULE_DOCS, MODULES_SECTION_ID } from '@/data/manualContent';
import type { ManualSection, ModuleDoc, ManualContentItem } from '@/data/manualContent';
import { ManualSectionRenderer } from './ManualSection';
import { exportManualToPdf } from './ManualPdfExporter';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, LogIn, Shield, Layers, Bell, Scale, Calculator, ShieldCheck, HelpCircle,
  LayoutDashboard, Users, FileText, Palmtree, ClipboardList, HeartPulse, Package,
  Stethoscope, GraduationCap, Target, Gavel, Landmark, UserSearch, Briefcase,
  Clock, Calendar, FileBarChart, Network, BarChart3, Settings, FolderOpen, User,
};

function getIcon(name: string) {
  return ICON_MAP[name] || BookOpen;
}

// ─── Section illustration configs ───
interface SectionIllustration {
  icons: React.ElementType[];
  gradient: string;
  label: string;
}

const SECTION_ILLUSTRATIONS: Record<string, SectionIllustration> = {
  introduccion: {
    icons: [BookOpen, Users, FileCheck],
    gradient: 'from-primary/15 to-primary/5',
    label: 'Sistema integral de gestión de RRHH',
  },
  acceso: {
    icons: [LogIn, Lock, CheckCircle2],
    gradient: 'from-emerald-500/15 to-emerald-500/5',
    label: 'Registro → Activación → Acceso',
  },
  roles: {
    icons: [Shield, Users, Zap],
    gradient: 'from-violet-500/15 to-violet-500/5',
    label: 'Control granular de acceso por módulo',
  },
  modulos: {
    icons: [Layers, LayoutDashboard, Target],
    gradient: 'from-sky-500/15 to-sky-500/5',
    label: 'Módulos funcionales del sistema',
  },
  'alertas-sistema': {
    icons: [Bell, AlertTriangle, CheckCircle2],
    gradient: 'from-amber-500/15 to-amber-500/5',
    label: 'Tipos de notificaciones y mensajes',
  },
  'reglas-negocio': {
    icons: [Scale, Lock, FileCheck],
    gradient: 'from-rose-500/15 to-rose-500/5',
    label: 'Validaciones y restricciones del sistema',
  },
  formulas: {
    icons: [Calculator, BarChart3, FileText],
    gradient: 'from-teal-500/15 to-teal-500/5',
    label: 'Cálculos de nómina y prestaciones',
  },
  auditoria: {
    icons: [ShieldCheck, FileBarChart, Lock],
    gradient: 'from-indigo-500/15 to-indigo-500/5',
    label: 'Trazabilidad y protección de datos',
  },
  faq: {
    icons: [HelpCircle, CheckCircle2, Zap],
    gradient: 'from-orange-500/15 to-orange-500/5',
    label: 'Respuestas a dudas comunes',
  },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserManualDialog({ open, onOpenChange }: Props) {
  const { isAdmin, canView } = useAuth();
  const [activeSection, setActiveSection] = useState('introduccion');
  const [searchQuery, setSearchQuery] = useState('');

  const visibleModuleDocs = useMemo(
    () => MODULE_DOCS.filter((m) => isAdmin || canView(m.moduleCode)),
    [isAdmin, canView],
  );

  const allSections = useMemo(() => {
    const before = MANUAL_SECTIONS.slice(0, 3);
    const after = MANUAL_SECTIONS.slice(3);

    const modulesSection: ManualSection = {
      id: MODULES_SECTION_ID,
      title: 'Descripción de Módulos',
      icon: 'Layers',
      content: [
        {
          type: 'paragraph',
          data: `Esta sección describe los ${visibleModuleDocs.length} módulos a los que tiene acceso según su rol actual.`,
        },
      ],
      subsections: visibleModuleDocs.map((m) => ({
        id: `mod-${m.moduleCode}`,
        title: m.title,
        icon: m.icon,
        content: buildModuleContent(m),
      })),
    };

    return [...before, modulesSection, ...after];
  }, [visibleModuleDocs]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return allSections;
    const q = searchQuery.toLowerCase();
    return allSections.filter((s) => {
      if (s.title.toLowerCase().includes(q)) return true;
      if (contentMatchesQuery(s.content, q)) return true;
      if (s.subsections?.some((sub) => sub.title.toLowerCase().includes(q) || contentMatchesQuery(sub.content, q)))
        return true;
      return false;
    });
  }, [allSections, searchQuery]);

  const currentSection = useMemo(() => {
    if (activeSection.startsWith('mod-')) {
      for (const s of allSections) {
        const sub = s.subsections?.find((ss) => ss.id === activeSection);
        if (sub) return sub;
      }
    }
    return allSections.find((s) => s.id === activeSection) || allSections[0];
  }, [activeSection, allSections]);

  const handleExportPdf = () => {
    exportManualToPdf(MANUAL_SECTIONS, visibleModuleDocs);
  };

  // Determine illustration for current section
  const illustration = SECTION_ILLUSTRATIONS[currentSection?.id || ''] || null;
  // For module subsections, build an inline illustration
  const isModuleSubsection = activeSection.startsWith('mod-');
  const moduleDoc = isModuleSubsection
    ? visibleModuleDocs.find((m) => `mod-${m.moduleCode}` === activeSection)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] max-sm:h-[95vh] max-sm:max-w-[95vw] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0 gap-2">
          <DialogHeader className="space-y-0 min-w-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
              <span className="truncate">Manual de Usuario</span>
            </DialogTitle>
            <DialogDescription className="text-xs hidden sm:block">
              Guía completa del sistema — adaptada a sus permisos
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" size="sm" onClick={handleExportPdf} className="shrink-0 text-xs sm:text-sm">
            <Download className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Exportar PDF</span>
          </Button>
        </div>

        {/* Body */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          {/* Sidebar / Index */}
          <div className="w-64 border-r flex flex-col shrink-0 hidden md:flex">
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
              {filteredSections.map((section) => {
                const Icon = getIcon(section.icon);
                const isActive = activeSection === section.id;
                const hasChildren = section.subsections && section.subsections.length > 0;
                const childActive = section.subsections?.some((s) => s.id === activeSection);

                return (
                  <div key={section.id}>
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors text-left',
                        isActive || childActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{section.title}</span>
                      {hasChildren && (
                        <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">
                          {section.subsections!.length}
                        </Badge>
                      )}
                    </button>
                    {hasChildren && (isActive || childActive) && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-2">
                        {section.subsections!.map((sub) => {
                          const SubIcon = getIcon(sub.icon);
                          return (
                            <button
                              key={sub.id}
                              onClick={() => setActiveSection(sub.id)}
                              className={cn(
                                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left',
                                activeSection === sub.id
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'text-muted-foreground hover:text-foreground',
                              )}
                            >
                              <SubIcon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{sub.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Mobile section selector */}
          <div className="md:hidden px-4 pt-3">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {allSections.map((s) => (
                <optgroup key={s.id} label={s.title}>
                  <option value={s.id}>{s.title}</option>
                  {s.subsections?.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      &nbsp;&nbsp;{sub.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {currentSection && (
              <div>
                {/* Section illustration / hero card */}
                {illustration && !isModuleSubsection && (
                  <div className={cn('rounded-xl bg-gradient-to-r p-5 mb-6 border', illustration.gradient)}>
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-2">
                        {illustration.icons.map((Ic, i) => (
                          <div
                            key={i}
                            className="w-10 h-10 rounded-full bg-background border-2 border-background flex items-center justify-center shadow-sm"
                          >
                            <Ic className="w-5 h-5 text-foreground/70" />
                          </div>
                        ))}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">{currentSection.title}</h2>
                        <p className="text-xs text-muted-foreground">{illustration.label}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Module subsection hero */}
                {isModuleSubsection && moduleDoc && (
                  <div className="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 p-5 mb-6 border">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {(() => {
                          const ModIcon = getIcon(moduleDoc.icon);
                          return <ModIcon className="w-6 h-6 text-primary" />;
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-foreground">{moduleDoc.title}</h2>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{moduleDoc.description}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {moduleDoc.actions.length > 0 && (
                            <Badge variant="secondary" className="text-[10px]">
                              {moduleDoc.actions.length} acciones
                            </Badge>
                          )}
                          {moduleDoc.alerts.length > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {moduleDoc.alerts.length} alertas
                            </Badge>
                          )}
                          {moduleDoc.dependencies.length > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {moduleDoc.dependencies.length} dependencias
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Non-illustrated section title */}
                {!illustration && !isModuleSubsection && (
                  <div className="flex items-center gap-2 mb-4">
                    {(() => {
                      const Icon = getIcon(currentSection.icon);
                      return <Icon className="w-5 h-5 text-primary" />;
                    })()}
                    <h2 className="text-xl font-semibold text-foreground">{currentSection.title}</h2>
                  </div>
                )}

                <ManualSectionRenderer content={currentSection.content} />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ───

function buildModuleContent(m: ModuleDoc): ManualContentItem[] {
  const items: ManualContentItem[] = [
    { type: 'paragraph', data: m.description },
  ];
  if (m.actions.length) {
    items.push({ type: 'heading', data: 'Acciones disponibles' });
    items.push({ type: 'list', data: m.actions });
  }
  if (m.validations.length) {
    items.push({ type: 'heading', data: 'Validaciones' });
    items.push({ type: 'list', data: m.validations });
  }
  if (m.restrictions.length) {
    items.push({ type: 'heading', data: 'Restricciones' });
    items.push({ type: 'list', data: m.restrictions });
  }
  if (m.alerts.length) {
    items.push({ type: 'heading', data: 'Alertas' });
    items.push({ type: 'list', data: m.alerts });
  }
  if (m.dependencies.length) {
    items.push({ type: 'heading', data: 'Dependencias con otros módulos' });
    items.push({ type: 'list', data: m.dependencies });
  }
  return items;
}

function contentMatchesQuery(content: ManualContentItem[], q: string): boolean {
  return content.some((c) => {
    if (typeof c.data === 'string') return c.data.toLowerCase().includes(q);
    if (Array.isArray(c.data)) return c.data.some((d: any) => String(d).toLowerCase().includes(q));
    return false;
  });
}
