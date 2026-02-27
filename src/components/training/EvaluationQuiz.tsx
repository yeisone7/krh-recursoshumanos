import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { TrainingQuizQuestion } from '@/types/training';

interface EvaluationQuizProps {
  questions: TrainingQuizQuestion[];
  onComplete: (passed: boolean, score: number) => void;
  onGoBack?: () => void;
}

export function EvaluationQuiz({ questions, onComplete, onGoBack }: EvaluationQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const current = questions[currentIndex];
  const selectedAnswer = answers[currentIndex] || '';
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const passed = score >= 80;

  const handleSelect = useCallback((value: string) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: value }));
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Calculate score
      let correct = 0;
      questions.forEach((q, i) => {
        if (answers[i] === q.respuestaCorrecta) correct++;
      });
      const finalScore = Math.round((correct / questions.length) * 100);
      setCorrectCount(correct);
      setScore(finalScore);
      setFinished(true);

      if (finalScore >= 80) {
        onComplete(true, finalScore);
      }
    }
  }, [currentIndex, questions, answers, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  }, [currentIndex]);

  const handleRetry = useCallback(() => {
    setAnswers({});
    setCurrentIndex(0);
    setFinished(false);
    setScore(0);
    setCorrectCount(0);
  }, []);

  // Failure screen with review
  if (finished && !passed) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-3 py-4">
          <XCircle className="h-14 w-14 text-destructive mx-auto" />
          <h3 className="text-xl font-bold">Evaluación No Aprobada</h3>
          <p className="text-muted-foreground">
            Resultado: {correctCount}/{questions.length} ({score}%)
          </p>
          <p className="text-sm text-destructive font-medium">
            Se requiere un mínimo de 80% para aprobar la evaluación.
          </p>
        </div>

        {/* Review answers */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Revisión de respuestas</h4>
          {questions.map((q, i) => {
            const userAnswer = answers[i];
            const isCorrect = userAnswer === q.respuestaCorrecta;
            return (
              <div key={i} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-300 bg-green-50 dark:bg-green-950/20' : 'border-destructive/30 bg-red-50 dark:bg-red-950/20'}`}>
                <div className="flex items-start gap-2 mb-2">
                  {isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  )}
                  <p className="font-medium text-sm">{q.pregunta}</p>
                </div>
                {!isCorrect && (
                  <div className="ml-7 space-y-1 text-sm">
                    <p className="text-destructive">Tu respuesta: {userAnswer || 'Sin respuesta'}</p>
                    <p className="text-green-700 dark:text-green-400">Respuesta correcta: {q.respuestaCorrecta}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 justify-center pt-2">
          {onGoBack && (
            <Button variant="outline" onClick={onGoBack}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver al Contenido
            </Button>
          )}
          <Button onClick={handleRetry}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reintentar Evaluación
          </Button>
        </div>
      </div>
    );
  }

  // Success screen (brief, since parent handles transition)
  if (finished && passed) {
    return (
      <div className="text-center space-y-4 py-8">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        <h3 className="text-xl font-bold">¡Evaluación Aprobada!</h3>
        <p className="text-muted-foreground">
          Resultado: {correctCount}/{questions.length} ({score}%)
        </p>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Pregunta {currentIndex + 1} de {questions.length}
        </span>
      </div>

      <Progress value={progress} className="h-2" />

      <h4 className="text-lg font-semibold">{current.pregunta}</h4>

      {/* Radio options */}
      <RadioGroup value={selectedAnswer} onValueChange={handleSelect} className="space-y-3">
        {current.opciones.map((option, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-primary/40 hover:bg-primary-light ${
              selectedAnswer === option ? 'border-primary bg-primary-light' : 'border-border'
            }`}
            onClick={() => handleSelect(option)}
          >
            <RadioGroupItem value={option} id={`q${currentIndex}-opt${idx}`} />
            <Label htmlFor={`q${currentIndex}-opt${idx}`} className="flex-1 cursor-pointer text-sm">
              {option}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <div>
          {currentIndex > 0 ? (
            <Button variant="outline" onClick={handlePrev}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
          ) : onGoBack ? (
            <Button variant="outline" onClick={onGoBack}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver al Contenido
            </Button>
          ) : <div />}
        </div>
        <Button onClick={handleNext} disabled={!selectedAnswer}>
          {currentIndex < questions.length - 1 ? (
            <>Siguiente <ArrowRight className="h-4 w-4 ml-1" /></>
          ) : (
            'Finalizar'
          )}
        </Button>
      </div>
    </div>
  );
}
