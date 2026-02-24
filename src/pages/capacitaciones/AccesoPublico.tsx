import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MarkdownContent } from '@/components/training/MarkdownContent';
import { EvaluationQuiz } from '@/components/training/EvaluationQuiz';
import { SignatureCanvas } from '@/components/training/SignatureCanvas';
import { GraduationCap, Clock, BookOpen, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import type { TrainingCourse, TrainingCourseContent, TrainingQuizQuestion } from '@/types/training';

type Step = 'loading' | 'error' | 'identify' | 'content' | 'quiz' | 'signature' | 'done';

export default function AccesoPublico() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');

  const [step, setStep] = useState<Step>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [course, setCourse] = useState<TrainingCourse | null>(null);
  const [tokenData, setTokenData] = useState<any>(null);
  const [operatorName, setOperatorName] = useState('');
  const [operatorCedula, setOperatorCedula] = useState('');
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tokenParam) {
      setErrorMsg('No se proporcionó un token de acceso válido.');
      setStep('error');
      return;
    }
    validateToken(tokenParam);
  }, [tokenParam]);

  const validateToken = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('training_access_tokens')
        .select('*, course:training_courses(*)')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setErrorMsg('El enlace de acceso no es válido o ha sido desactivado.');
        setStep('error');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setErrorMsg('Este enlace de acceso ha expirado.');
        setStep('error');
        return;
      }

      if (data.usage_type === 'unico' && data.uses_count >= (data.max_uses || 1)) {
        setErrorMsg('Este enlace ya ha sido utilizado el número máximo de veces.');
        setStep('error');
        return;
      }

      setTokenData(data);
      setCourse(data.course as TrainingCourse);

      if (data.access_type === 'link_cedula') {
        setStep('identify');
      } else {
        setStep('content');
      }
    } catch {
      setErrorMsg('Error al validar el acceso.');
      setStep('error');
    }
  };

  const handleIdentify = () => {
    if (!operatorName.trim()) return;
    setStep('content');
  };

  const handleContentDone = () => {
    const content = course?.content as TrainingCourseContent | null;
    if (tokenData?.requires_evaluation && content?.evaluacion?.length) {
      setStep('quiz');
    } else {
      setStep('signature');
    }
  };

  const handleQuizComplete = (passed: boolean, score: number) => {
    setQuizScore(score);
    setStep('signature');
  };

  const handleSignature = async (dataUrl: string) => {
    setSignatureData(dataUrl);
    setSubmitting(true);

    try {
      // Record completion
      const { error: completionError } = await supabase
        .from('training_completions')
        .insert({
          company_id: tokenData.company_id,
          course_id: course!.id,
          token_id: tokenData.id,
          operator_name: operatorName || 'Anónimo',
          operator_cedula: operatorCedula || null,
          signature_data: dataUrl,
          completed_at: new Date().toISOString(),
        });

      if (completionError) throw completionError;

      // Increment uses_count
      await supabase
        .from('training_access_tokens')
        .update({ uses_count: (tokenData.uses_count || 0) + 1 })
        .eq('id', tokenData.id);

      setStep('done');
    } catch {
      setErrorMsg('Error al registrar la evidencia. Intente de nuevo.');
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  };

  const content = course?.content as TrainingCourseContent | null;

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Validando acceso...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Acceso no disponible</h2>
            <p className="text-muted-foreground">{errorMsg}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-semibold">¡Capacitación completada!</h2>
            <p className="text-muted-foreground">
              Su evidencia ha sido registrada exitosamente.
            </p>
            {quizScore !== null && (
              <p className="text-sm">Puntaje obtenido: <strong>{quizScore}%</strong></p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <GraduationCap className="h-8 w-8" />
          <div>
            <h1 className="text-xl font-bold">{course?.name}</h1>
            <p className="text-sm opacity-90">{course?.category}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Step: Identify */}
        {step === 'identify' && (
          <Card>
            <CardHeader>
              <CardTitle>Identificación</CardTitle>
              <CardDescription>Ingrese sus datos para continuar con la capacitación.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo *</Label>
                <Input
                  id="name"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="Ingrese su nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cedula">Número de cédula</Label>
                <Input
                  id="cedula"
                  value={operatorCedula}
                  onChange={(e) => setOperatorCedula(e.target.value)}
                  placeholder="Ingrese su cédula"
                />
              </div>
              <Button onClick={handleIdentify} disabled={!operatorName.trim()} className="w-full">
                Continuar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Content */}
        {step === 'content' && (
          <>
            {/* Metadata */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-3 mb-4">
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {course?.duration_hours}h
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <BookOpen className="h-3 w-3" />
                    {course?.modality}
                  </Badge>
                  {course?.is_mandatory && <Badge variant="destructive">Obligatorio</Badge>}
                </div>
                {course?.description && (
                  <p className="text-muted-foreground">{course.description}</p>
                )}
              </CardContent>
            </Card>

            {/* Introduction */}
            {content?.introduccion && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Introducción</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{content.introduccion}</p>
                </CardContent>
              </Card>
            )}

            {/* Objectives */}
            {content?.objetivos?.length ? (
              <Card>
                <CardHeader><CardTitle className="text-lg">Objetivos</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {content.objetivos.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm">{obj}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {/* Content */}
            {content?.contenido && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Contenido</CardTitle></CardHeader>
                <CardContent>
                  <MarkdownContent content={content.contenido} />
                </CardContent>
              </Card>
            )}

            {/* Key Points */}
            {content?.puntosClave?.length ? (
              <Card>
                <CardHeader><CardTitle className="text-lg">Puntos Clave</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {content.puntosClave.map((p, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm">{p}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            <Separator />

            <div className="flex justify-end">
              <Button size="lg" onClick={handleContentDone}>
                {tokenData?.requires_evaluation && content?.evaluacion?.length
                  ? 'Continuar a Evaluación'
                  : 'Continuar a Firma'}
              </Button>
            </div>
          </>
        )}

        {/* Step: Quiz */}
        {step === 'quiz' && content?.evaluacion && (
          <Card>
            <CardHeader>
              <CardTitle>Evaluación</CardTitle>
              <CardDescription>Responda las siguientes preguntas sobre el contenido.</CardDescription>
            </CardHeader>
            <CardContent>
              <EvaluationQuiz
                questions={content.evaluacion}
                onComplete={handleQuizComplete}
              />
            </CardContent>
          </Card>
        )}

        {/* Step: Signature */}
        {step === 'signature' && (
          <Card>
            <CardHeader>
              <CardTitle>Firma de Evidencia</CardTitle>
              <CardDescription>
                Firme a continuación para confirmar que ha completado la capacitación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {quizScore !== null && (
                <div className="p-3 rounded-lg bg-muted text-sm">
                  Puntaje en evaluación: <strong>{quizScore}%</strong>
                </div>
              )}
              {submitting ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Registrando evidencia...</span>
                </div>
              ) : (
                <SignatureCanvas onSave={handleSignature} />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
