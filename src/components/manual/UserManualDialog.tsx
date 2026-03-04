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
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Download,
  ChevronRight,
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserManualDialog({ open, onOpenChange }: Props) {
  const { isAdmin, canView } = useAuth();
  const [activeSection, setActiveSection] = useState('introduccion');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter module docs by permissions
  const visibleModuleDocs = useMemo(
    () => MODULE_DOCS.filter((m) => isAdmin || canView(m.moduleCode)),
    [isAdmin, canView],
  );

  // Build all sections including the dynamic modules section
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

  // Search filter
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

  // Get current section
  const currentSection = useMemo(() => {
    // Check if it's a module subsection
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <DialogHeader className="space-y-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5 text-primary" />
              Manual de Usuario
            </DialogTitle>
            <DialogDescription className="text-xs">
              Guía completa del sistema — adaptada a sus permisos
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" size="sm" onClick={handleExportPdf} className="shrink-0">
            <Download className="w-4 h-4 mr-1" />
            Exportar PDF
          </Button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar / Index */}
          <div className="w-64 border-r flex flex-col shrink-0 max-md:hidden">
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
                    {/* Subsections */}
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
                <div className="flex items-center gap-2 mb-4">
                  {(() => {
                    const Icon = getIcon(currentSection.icon);
                    return <Icon className="w-5 h-5 text-primary" />;
                  })()}
                  <h2 className="text-xl font-semibold text-foreground">{currentSection.title}</h2>
                </div>
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
