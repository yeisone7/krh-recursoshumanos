import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { CriteriaScoreCard } from './CriteriaScoreCard';
import type {
  PerformanceEvaluation,
  EvaluationTemplate,
  EvaluationCriteria,
  RatingScaleItem,
  EvaluationScore,
} from '@/types/evaluation';
import { DEFAULT_RATING_SCALE, DEFAULT_QUALITATIVE_QUESTIONS } from '@/types/evaluation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Save, SendHorizonal, User, Calendar, PenLine } from 'lucide-react';
import { SignatureCanvas } from '@/components/training/SignatureCanvas';

interface ApplyEvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluation: PerformanceEvaluation;
  template: EvaluationTemplate | null;
  onSave: (data: {
    id: string;
    status: string;
    overall_score?: number;
    overall_rating?: string;
    strengths?: string;
    areas_to_improve?: string;
    development_plan?: string;
    employee_comments?: string;
    scores?: { criteria_id: string; score: number; comments?: string }[];
  }) => void;
}

interface ScoreState {
  [criteriaId: string]: { level: number | null; comments: string };
}

export function ApplyEvaluationDialog({
  open,
  onOpenChange,
  evaluation,
  template,
  onSave,
}: ApplyEvaluationDialogProps) {
  const criteria = template?.criteria || [];
  const ratingScale: RatingScaleItem[] = template?.rating_scale || DEFAULT_RATING_SCALE;
  const qualitativeQuestions: string[] = template?.qualitative_questions || DEFAULT_QUALITATIVE_QUESTIONS;

  // Fetch existing scores
  const { data: existingScores } = useQuery({
    queryKey: ['evaluation-scores', evaluation.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_scores')
        .select('*')
        .eq('evaluation_id', evaluation.id);
      if (error) throw error;
      return data as EvaluationScore[];
    },
    enabled: open,
  });

  const [scores, setScores] = useState<ScoreState>({});
  const [strengths, setStrengths] = useState(evaluation.strengths || '');
  const [areasToImprove, setAreasToImprove] = useState(evaluation.areas_to_improve || '');
  const [developmentPlan, setDevelopmentPlan] = useState(evaluation.development_plan || '');
  const [qualitativeAnswers, setQualitativeAnswers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [evaluatorSignature, setEvaluatorSignature] = useState<string | null>(null);
  const [employeeSignature, setEmployeeSignature] = useState<string | null>(null);
  const [showEvaluatorCanvas, setShowEvaluatorCanvas] = useState(false);
  const [showEmployeeCanvas, setShowEmployeeCanvas] = useState(false);

  // Initialize from existing data
  useEffect(() => {
    if (!open) return;
    const initial: ScoreState = {};
    criteria.forEach((c) => {
      const existing = existingScores?.find((s) => s.criteria_id === c.id);
      initial[c.id] = {
        level: existing ? existing.score : null,
        comments: existing?.comments || '',
      };
    });
    setScores(initial);
    setStrengths(evaluation.strengths || '');
    setAreasToImprove(evaluation.areas_to_improve || '');
    setDevelopmentPlan(evaluation.development_plan || '');

    // Parse employee_comments as qualitative answers
    try {
      const parsed = evaluation.employee_comments ? JSON.parse(evaluation.employee_comments) : [];
      setQualitativeAnswers(Array.isArray(parsed) ? parsed : new Array(qualitativeQuestions.length).fill(''));
    } catch {
      setQualitativeAnswers(new Array(qualitativeQuestions.length).fill(''));
    }
    setEvaluatorSignature(null);
    setEmployeeSignature(null);
    setShowEvaluatorCanvas(false);
    setShowEmployeeCanvas(false);
  }, [open, existingScores, criteria.length]);

  // Group criteria by category
  const groupedCriteria = useMemo(() => {
    const groups: Record<string, EvaluationCriteria[]> = {};
    const sorted = [...criteria].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    sorted.forEach((c) => {
      const cat = c.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(c);
    });
    return groups;
  }, [criteria]);

  // Calculate total score
  const { totalScore, totalRating } = useMemo(() => {
    let weightedSum = 0;
    let totalWeight = 0;
    let allScored = true;

    criteria.forEach((c) => {
      const s = scores[c.id];
      const weight = c.weight || 1;
      const maxScore = c.max_score || 4;
      if (s?.level !== null && s?.level !== undefined) {
        weightedSum += (s.level / maxScore) * weight;
        totalWeight += weight;
      } else {
        allScored = false;
      }
    });

    const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
    const rating = ratingScale.find((r) => score >= r.min && score <= r.max)?.label || '-';
    return { totalScore: score, totalRating: rating, allScored };
  }, [scores, criteria, ratingScale]);

  const handleSave = async (finalize: boolean) => {
    if (finalize) {
      const missing = criteria.filter((c) => !scores[c.id]?.level);
      if (missing.length > 0) {
        toast.error(`Faltan ${missing.length} criterio(s) por calificar`);
        return;
      }
      // Validate qualitative answers
      const emptyQualitative = qualitativeQuestions.filter((_, idx) => !qualitativeAnswers[idx]?.trim());
      if (emptyQualitative.length > 0) {
        toast.error(`Faltan ${emptyQualitative.length} pregunta(s) cualitativa(s) por responder`);
        return;
      }
      // Validate signatures
      if (!evaluatorSignature) {
        toast.error('Falta la firma del evaluador');
        return;
      }
      if (!employeeSignature) {
        toast.error('Falta la firma del evaluado');
        return;
      }
    }

    setSaving(true);
    try {
      const scoreArray = criteria
        .filter((c) => scores[c.id]?.level !== null)
        .map((c) => ({
          criteria_id: c.id,
          score: scores[c.id].level!,
          comments: scores[c.id].comments || undefined,
        }));

      onSave({
        id: evaluation.id,
        status: finalize ? 'submitted' : 'in_progress',
        overall_score: totalScore,
        overall_rating: totalRating !== '-' ? totalRating : undefined,
        strengths: strengths || undefined,
        areas_to_improve: areasToImprove || undefined,
        development_plan: developmentPlan || undefined,
        employee_comments: qualitativeAnswers.some((a) => a) ? JSON.stringify(qualitativeAnswers) : undefined,
        scores: scoreArray,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const scoredCount = criteria.filter((c) => scores[c.id]?.level !== null).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="text-lg">Aplicar Evaluación</DialogTitle>
          <DialogDescription className="sr-only">Calificar al empleado criterio por criterio</DialogDescription>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">
                {evaluation.employee?.first_name} {evaluation.employee?.last_name}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{evaluation.cycle?.name || 'Sin ciclo'}</span>
            </div>
            {template && (
              <Badge variant="outline" className="text-xs">
                {template.name}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Separator />

        {criteria.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-muted-foreground text-center">
              La plantilla del ciclo no tiene criterios configurados.<br />
              Agrega criterios a la plantilla primero.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-6">
            <div className="space-y-6 py-4">
              {/* Score summary bar */}
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Progreso: </span>
                  <span className="font-medium">{scoredCount}/{criteria.length} criterios</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-foreground">{totalScore}</span>
                  <span className="text-muted-foreground">/100</span>
                  {totalRating !== '-' && (
                    <Badge className="ml-2 bg-primary text-primary-foreground">{totalRating}</Badge>
                  )}
                </div>
              </div>

              {/* Criteria by category */}
              {Object.entries(groupedCriteria).map(([category, items]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    {category}
                  </h3>
                  {items.map((c) => (
                    <CriteriaScoreCard
                      key={c.id}
                      criteria={c}
                      selectedLevel={scores[c.id]?.level ?? null}
                      comment={scores[c.id]?.comments ?? ''}
                      onLevelChange={(level) =>
                        setScores((prev) => ({
                          ...prev,
                          [c.id]: { ...prev[c.id], level },
                        }))
                      }
                      onCommentChange={(comments) =>
                        setScores((prev) => ({
                          ...prev,
                          [c.id]: { ...prev[c.id], comments },
                        }))
                      }
                    />
                  ))}
                </div>
              ))}

              {/* Qualitative questions */}
              {qualitativeQuestions.length > 0 && (
                <div className="space-y-3">
                  <Separator />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Preguntas Cualitativas
                  </h3>
                  {qualitativeQuestions.map((q, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <Label className="text-xs font-normal">{q}</Label>
                      <Textarea
                        placeholder="Respuesta..."
                        className="min-h-[60px] text-sm"
                        value={qualitativeAnswers[idx] || ''}
                        onChange={(e) => {
                          const next = [...qualitativeAnswers];
                          next[idx] = e.target.value;
                          setQualitativeAnswers(next);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Summary fields */}
              <div className="space-y-3">
                <Separator />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Resumen
                </h3>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fortalezas</Label>
                  <Textarea
                    placeholder="Principales fortalezas del evaluado..."
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                    className="min-h-[60px] text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Áreas de Mejora</Label>
                  <Textarea
                    placeholder="Aspectos a mejorar..."
                    value={areasToImprove}
                    onChange={(e) => setAreasToImprove(e.target.value)}
                    className="min-h-[60px] text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Plan de Desarrollo</Label>
                  <Textarea
                    placeholder="Compromisos y acciones de mejora..."
                    value={developmentPlan}
                    onChange={(e) => setDevelopmentPlan(e.target.value)}
                    className="min-h-[60px] text-sm"
                  />
                </div>
              </div>

              {/* Signatures */}
              <div className="space-y-4">
                <Separator />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Firmas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 border rounded-lg p-3">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <PenLine className="h-3.5 w-3.5" /> Firma del Evaluador
                    </Label>
                    {evaluatorSignature ? (
                      <div className="space-y-2">
                        <div className="border rounded bg-white p-2">
                          <img src={evaluatorSignature} alt="Firma evaluador" className="max-h-[80px] mx-auto" />
                        </div>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => { setEvaluatorSignature(null); setShowEvaluatorCanvas(true); }}>
                          Cambiar firma
                        </Button>
                      </div>
                    ) : showEvaluatorCanvas ? (
                      <SignatureCanvas
                        width={400}
                        height={150}
                        onSave={(dataUrl) => { setEvaluatorSignature(dataUrl); setShowEvaluatorCanvas(false); }}
                        onCancel={() => setShowEvaluatorCanvas(false)}
                      />
                    ) : (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setShowEvaluatorCanvas(true)}>
                        <PenLine className="h-4 w-4 mr-1.5" /> Firmar
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 border rounded-lg p-3">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <PenLine className="h-3.5 w-3.5" /> Firma del Evaluado
                    </Label>
                    {employeeSignature ? (
                      <div className="space-y-2">
                        <div className="border rounded bg-white p-2">
                          <img src={employeeSignature} alt="Firma evaluado" className="max-h-[80px] mx-auto" />
                        </div>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => { setEmployeeSignature(null); setShowEmployeeCanvas(true); }}>
                          Cambiar firma
                        </Button>
                      </div>
                    ) : showEmployeeCanvas ? (
                      <SignatureCanvas
                        width={400}
                        height={150}
                        onSave={(dataUrl) => { setEmployeeSignature(dataUrl); setShowEmployeeCanvas(false); }}
                        onCancel={() => setShowEmployeeCanvas(false)}
                      />
                    ) : (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setShowEmployeeCanvas(true)}>
                        <PenLine className="h-4 w-4 mr-1.5" /> Firmar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <Separator />
        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSave(false)}
            disabled={saving || criteria.length === 0}
          >
            <Save className="h-4 w-4 mr-1.5" />
            Guardar Progreso
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving || criteria.length === 0}
          >
            <SendHorizonal className="h-4 w-4 mr-1.5" />
            Finalizar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
