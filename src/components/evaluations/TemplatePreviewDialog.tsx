import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Briefcase,
  Layers,
  ClipboardCheck,
  BarChart3,
  Star,
  ChevronRight,
  Download,
  Copy,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { EvaluationTemplate } from '@/types/evaluation';
import { generateTemplatePdf } from '@/lib/templatePdfGenerator';

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EvaluationTemplate | null;
  onDuplicate?: (template: EvaluationTemplate) => void;
}

const levelLabels = [
  { level: 4, label: 'Ampliamente Desarrollada', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { level: 3, label: 'Bueno dentro del Estándar', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  { level: 2, label: 'Competencia en Desarrollo', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  { level: 1, label: 'Competencia No Desarrollada', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
];

export function TemplatePreviewDialog({ open, onOpenChange, template, onDuplicate }: TemplatePreviewDialogProps) {
  if (!template) return null;

  const criteria = template.criteria || [];
  const questions = (template.qualitative_questions as string[] | null) || [];
  const ratingScale = (template.rating_scale as { label: string; min: number; max: number; description: string }[] | null) || [];
  const totalWeight = criteria.reduce((s, c) => s + (c.weight || 1), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[100dvh] w-screen max-w-3xl flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:rounded-lg sm:border [&>button.absolute]:fixed [&>button.absolute]:right-2.5 [&>button.absolute]:top-[max(0.5rem,env(safe-area-inset-top))] [&>button.absolute]:z-[60] [&>button.absolute]:flex [&>button.absolute]:h-10 [&>button.absolute]:w-10 [&>button.absolute]:items-center [&>button.absolute]:justify-center [&>button.absolute]:rounded-full [&>button.absolute]:border-0 [&>button.absolute]:bg-accent [&>button.absolute]:text-accent-foreground [&>button.absolute]:opacity-100 [&>button.absolute]:shadow-md [&>button.absolute]:ring-0 [&>button.absolute]:ring-offset-0 [&>button.absolute]:backdrop-blur [&>button.absolute]:hover:bg-accent/90 [&>button.absolute]:focus:ring-2 [&>button.absolute]:focus:ring-ring [&>button.absolute]:focus:ring-offset-2 [&>button.absolute_svg]:h-4 [&>button.absolute_svg]:w-4 sm:[&>button.absolute]:right-4 sm:[&>button.absolute]:top-4"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-themed">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-t-lg bg-gradient-to-br from-accent-light via-background to-accent px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pb-5 sm:pt-6">
          <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(hsl(var(--primary)/0.28)_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full border border-primary/25" />
          <div className="pointer-events-none absolute -right-2 top-3 h-24 w-24 rounded-full border border-primary/20" />
          <div className="pointer-events-none absolute left-6 top-5 h-16 w-16 rounded-full border border-primary/15 bg-primary/5" />
          <DialogHeader className="relative z-10">
            <div className="flex items-start gap-3 pr-12 sm:pr-0">
              <div className="shrink-0 rounded-xl border border-primary/15 bg-primary/10 p-2.5 backdrop-blur-sm">
                <FileText className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-bold leading-tight text-foreground sm:text-xl">
                  {template.name}
                </DialogTitle>
                {template.description && (
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground sm:line-clamp-none">{template.description}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 self-start pt-0.5">
                <Badge
                  className={
                    template.is_active
                      ? 'hidden border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 xs:inline-flex sm:inline-flex'
                      : 'hidden border-destructive/20 bg-destructive/10 text-destructive xs:inline-flex sm:inline-flex'
                  }
                >
                  {template.is_active ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {/* Positions badges */}
          {template.positions && template.positions.length > 0 && (
            <div className="relative z-10 flex max-h-16 items-center gap-2 mt-3 flex-wrap overflow-y-auto pr-1 sm:mt-4 sm:max-h-none sm:overflow-visible">
              <Briefcase className="h-4 w-4 text-warning" />
              {template.positions.map(p => (
                <Badge key={p.id} variant="outline" className="border-warning/35 bg-warning-light text-xs text-warning-foreground backdrop-blur-sm">
                  {p.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Quick stats */}
          <div className="relative z-10 flex flex-wrap gap-3 mt-3 sm:mt-4 sm:gap-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <Layers className="h-4 w-4" />
              <span className="font-medium text-foreground">{criteria.length}</span> criterios
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <ClipboardCheck className="h-4 w-4" />
              <span className="font-medium text-foreground">{questions.length}</span> preguntas
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="font-medium text-foreground">{ratingScale.length}</span> niveles
            </div>
          </div>

          {/* Action buttons */}
          <div className="relative z-10 grid grid-cols-1 gap-2 mt-3 sm:mt-4 sm:flex">
            <Button
              size="sm"
              variant="secondary"
              className="w-full border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover sm:w-auto"
              onClick={() => generateTemplatePdf(template)}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Exportar PDF
            </Button>
            {onDuplicate && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover sm:w-auto"
                onClick={() => {
                  onDuplicate(template);
                  onOpenChange(false);
                }}
              >
                <Copy className="h-4 w-4 mr-1.5" />
                Clonar Plantilla
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6 px-4 py-5 sm:px-6">
          {/* Criteria section */}
          <section>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              Competencias / Criterios
            </h3>
            <div className="space-y-3">
              {criteria.map((c, idx) => {
                const weightPct = totalWeight > 0 ? Math.round(((c.weight || 1) / totalWeight) * 100) : 0;
                const hasRubric = c.level_4_description || c.level_3_description || c.level_2_description || c.level_1_description;
                return (
                  <motion.div
                    key={c.id || idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="border rounded-lg overflow-hidden bg-card"
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">{c.name}</p>
                        {c.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          Peso: {weightPct}%
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Máx: {c.max_score || 4}
                        </Badge>
                      </div>
                    </div>

                    {hasRubric && (
                      <div className="border-t bg-muted/30 px-4 py-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {levelLabels.map(({ level, label, color }) => {
                          const desc = c[`level_${level}_description` as keyof typeof c] as string | null;
                          if (!desc) return null;
                          return (
                            <div key={level} className="flex items-start gap-2">
                              <Badge className={`text-[10px] shrink-0 mt-0.5 ${color}`}>
                                {level}
                              </Badge>
                              <div>
                                <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                                <p className="text-xs text-foreground leading-snug">{desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </section>

          <Separator />

          {/* Qualitative questions */}
          {questions.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <ClipboardCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                Preguntas Cualitativas
              </h3>
              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-start gap-2.5 px-4 py-2.5 rounded-lg bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/30"
                  >
                    <ChevronRight className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground">{q}</p>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {questions.length > 0 && ratingScale.length > 0 && <Separator />}

          {/* Rating scale */}
          {ratingScale.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-amber-500" />
                Tabla de Calificación
              </h3>
              <div className="w-full overflow-x-auto rounded-lg border">
                <table className="min-w-[640px] w-full table-fixed text-sm sm:table-auto">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Nivel</th>
                      <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Rango %</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Acción Requerida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratingScale.map((item, idx) => {
                      const rowColors = [
                        'bg-emerald-50/50 dark:bg-emerald-900/10',
                        'bg-blue-50/50 dark:bg-blue-900/10',
                        'bg-amber-50/50 dark:bg-amber-900/10',
                        'bg-red-50/50 dark:bg-red-900/10',
                      ];
                      const dotColors = [
                        'bg-emerald-500',
                        'bg-blue-500',
                        'bg-amber-500',
                        'bg-red-500',
                      ];
                      return (
                        <tr key={idx} className={`border-t ${rowColors[idx] || ''}`}>
                          <td className="px-4 py-2.5 w-[190px]">
                            <div className="flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${dotColors[idx] || 'bg-muted'}`} />
                              <span className="font-medium text-foreground truncate">{item.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="text-muted-foreground">{item.min}% – {item.max}%</span>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{item.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
