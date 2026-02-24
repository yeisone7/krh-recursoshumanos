import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrainingQuizQuestion } from '@/types/training';

interface EvaluationQuizProps {
  questions: TrainingQuizQuestion[];
  onComplete: (passed: boolean, score: number) => void;
  requirePerfect?: boolean;
}

export function EvaluationQuiz({ questions, onComplete, requirePerfect = true }: EvaluationQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = questions[currentIndex];
  const isCorrect = selectedAnswer === current?.respuestaCorrecta;

  const handleSelect = useCallback((option: string) => {
    if (showFeedback) return;
    setSelectedAnswer(option);
    setShowFeedback(true);
    if (option === current.respuestaCorrecta) {
      setCorrectCount(prev => prev + 1);
    }
  }, [showFeedback, current]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      const finalCorrect = correctCount;
      const score = Math.round((finalCorrect / questions.length) * 100);
      const passed = requirePerfect ? finalCorrect === questions.length : score >= 70;
      setFinished(true);
      onComplete(passed, score);
    }
  }, [currentIndex, questions.length, correctCount, requirePerfect, onComplete]);

  if (finished) {
    const score = Math.round((correctCount / questions.length) * 100);
    const passed = requirePerfect ? correctCount === questions.length : score >= 70;
    return (
      <div className="text-center space-y-4 py-8">
        {passed ? (
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        ) : (
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
        )}
        <h3 className="text-xl font-bold">
          {passed ? '¡Evaluación Aprobada!' : 'Evaluación No Aprobada'}
        </h3>
        <p className="text-muted-foreground">
          Resultado: {correctCount}/{questions.length} ({score}%)
        </p>
        {!passed && requirePerfect && (
          <p className="text-sm text-destructive">
            Debe responder correctamente todas las preguntas para aprobar.
          </p>
        )}
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Pregunta {currentIndex + 1} de {questions.length}
        </span>
        <span className="text-sm text-muted-foreground">
          {correctCount} correcta{correctCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      <h4 className="text-lg font-semibold">{current.pregunta}</h4>

      <div className="space-y-3">
        {current.opciones.map((option, idx) => {
          const isSelected = selectedAnswer === option;
          const isCorrectOption = option === current.respuestaCorrecta;
          return (
            <button
              key={idx}
              onClick={() => handleSelect(option)}
              disabled={showFeedback}
              className={cn(
                'w-full text-left p-4 rounded-lg border-2 transition-all',
                !showFeedback && 'hover:border-primary hover:bg-accent cursor-pointer',
                !showFeedback && !isSelected && 'border-border',
                showFeedback && isCorrectOption && 'border-green-500 bg-green-50 dark:bg-green-950/20',
                showFeedback && isSelected && !isCorrectOption && 'border-destructive bg-red-50 dark:bg-red-950/20',
                showFeedback && !isSelected && !isCorrectOption && 'border-border opacity-50',
              )}
            >
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{option}</span>
                {showFeedback && isCorrectOption && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
                {showFeedback && isSelected && !isCorrectOption && <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      {showFeedback && (
        <div className="flex justify-end">
          <Button onClick={handleNext}>
            {currentIndex < questions.length - 1 ? (
              <>Siguiente <ArrowRight className="h-4 w-4 ml-1" /></>
            ) : (
              'Ver Resultado'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
