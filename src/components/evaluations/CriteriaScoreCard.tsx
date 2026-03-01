import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EvaluationCriteria } from '@/types/evaluation';
import { ChevronDown, ChevronRight } from 'lucide-react';

const LEVEL_OPTIONS = [
  { value: 1, label: 'No Desarrollada', key: 'level_1_description' as const, color: 'border-red-400 bg-red-50 dark:bg-red-950' },
  { value: 2, label: 'En Desarrollo', key: 'level_2_description' as const, color: 'border-amber-400 bg-amber-50 dark:bg-amber-950' },
  { value: 3, label: 'Bueno', key: 'level_3_description' as const, color: 'border-blue-400 bg-blue-50 dark:bg-blue-950' },
  { value: 4, label: 'Ampliamente Desarrollada', key: 'level_4_description' as const, color: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950' },
];

interface CriteriaScoreCardProps {
  criteria: EvaluationCriteria;
  selectedLevel: number | null;
  comment: string;
  onLevelChange: (level: number) => void;
  onCommentChange: (comment: string) => void;
}

export function CriteriaScoreCard({
  criteria,
  selectedLevel,
  comment,
  onLevelChange,
  onCommentChange,
}: CriteriaScoreCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border bg-card">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-foreground">{criteria.name}</span>
              {criteria.category && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {criteria.category}
                </Badge>
              )}
              {criteria.weight && (
                <span className="text-xs text-muted-foreground">Peso: {criteria.weight}</span>
              )}
            </div>
            {criteria.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{criteria.description}</p>
            )}
          </div>
          {selectedLevel !== null && (
            <Badge className="bg-primary text-primary-foreground text-xs">
              {selectedLevel}/{criteria.max_score || 4}
            </Badge>
          )}
        </div>

        {/* Level selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {LEVEL_OPTIONS.map((option) => {
            const desc = criteria[option.key] || '';
            const isSelected = selectedLevel === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onLevelChange(option.value)}
                className={cn(
                  'relative rounded-lg border-2 p-2.5 text-left transition-all text-xs',
                  isSelected
                    ? `${option.color} ring-2 ring-primary/30`
                    : 'border-border hover:border-muted-foreground/40 bg-muted/20'
                )}
              >
                <div className="font-semibold mb-0.5">
                  ({option.value}) {option.label}
                </div>
                {desc && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{desc}</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Expand rubric details */}
        {LEVEL_OPTIONS.some(o => criteria[o.key]) && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Ver descripciones completas
          </button>
        )}
        {expanded && (
          <div className="space-y-1.5 pl-2 border-l-2 border-muted">
            {LEVEL_OPTIONS.map((option) => {
              const desc = criteria[option.key];
              if (!desc) return null;
              return (
                <div key={option.value} className="text-xs">
                  <span className="font-medium">Nivel {option.value}:</span>{' '}
                  <span className="text-muted-foreground">{desc}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Comment */}
        <Textarea
          placeholder="Comentarios sobre este criterio (opcional)"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          className="min-h-[50px] text-xs"
        />
      </CardContent>
    </Card>
  );
}
