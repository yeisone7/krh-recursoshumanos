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
import {
  GraduationCap, Clock, BookOpen, CheckCircle2, AlertTriangle,
  Loader2, MapPin, Calendar, User, FileText, ShieldCheck
} from 'lucide-react';
import type { TrainingCourse, TrainingCourseContent, TrainingQuizQuestion } from '@/types/training';
import petrocasinosIcon from '@/assets/petrocasinos-icon.png';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Step = 'loading' | 'error' | 'identify' | 'content' | 'quiz' | 'signature' | 'done';

interface MediaItem {
  id: string;
  type: string;
  title: string;
  description: string | null;
  file_url: string;
}

export default function AccesoPublico() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');

  const [step, setStep] = useState<Step>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [course, setCourse] = useState<TrainingCourse | null>(null);
  const [tokenData, setTokenData] = useState<any>(null);
  const [operatorName, setOperatorName] = useState('');
  const [operatorCedula, setOperatorCedula] = useState('');
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [cedulaError, setCedulaError] = useState('');
  const [cedulaVerified, setCedulaVerified] = useState(false);
  const [verifyingCedula, setVerifyingCedula] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [centerName, setCenterName] = useState<string | null>(null);

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

      // Fetch center name if applicable
      if (data.operation_center_id) {
        const { data: centerData } = await supabase
          .from('operation_centers')
          .select('name')
          .eq('id', data.operation_center_id)
          .single();
        if (centerData) setCenterName(centerData.name);
      }

      // Fetch media for this course
      const { data: mediaData } = await supabase
        .from('training_media')
        .select('id, type, title, description, file_url')
        .eq('course_id', data.course_id)
        .order('created_at');
      if (mediaData) setMedia(mediaData);

      setStep('identify');
    } catch {
      setErrorMsg('Error al validar el acceso.');
      setStep('error');
    }
  };

  const verifyCedula = async (cedula: string) => {
    if (!cedula.trim() || !tokenData) return;
    setVerifyingCedula(true);
    setCedulaError('');

    try {
      const { data, error } = await supabase.rpc('verify_employee_cedula', {
        p_cedula: cedula.trim(),
        p_company_id: tokenData.company_id,
      });

      if (error || !data || (data as any[]).length === 0) {
        setCedulaError('No se encontró un empleado activo con esta cédula.');
        setCedulaVerified(false);
        setEmployeeId(null);
        setOperatorName('');
      } else {
        const emp = (data as any[])[0];
        setCedulaVerified(true);
        setEmployeeId(emp.employee_id);
        setOperatorName(emp.employee_name);
        setCedulaError('');
      }
    } catch {
      setCedulaError('Error al verificar la cédula.');
    } finally {
      setVerifyingCedula(false);
    }
  };

  const handleIdentify = () => {
    if (!cedulaVerified || !operatorName.trim()) return;
    setStep('content');
  };

  const handleContentDone = () => {
    const cnt = course?.content as TrainingCourseContent | null;
    if (tokenData?.requires_evaluation && cnt?.evaluacion?.length) {
      setStep('quiz');
    } else {
      setStep('signature');
    }
  };

  const handleQuizComplete = (passed: boolean, score: number) => {
    setQuizScore(score);
    if (passed) {
      setTimeout(() => setStep('signature'), 1500);
    }
  };

  const handleSignature = async (dataUrl: string) => {
    setSignatureData(dataUrl);
    setSubmitting(true);

    try {
      const { error: completionError } = await supabase
        .from('training_completions')
        .insert({
          company_id: tokenData.company_id,
          course_id: course!.id,
          token_id: tokenData.id,
          employee_id: employeeId,
          operator_name: operatorName,
          operator_cedula: operatorCedula || null,
          signature_data: dataUrl,
          quiz_score: quizScore,
          ip_address: null,
          user_agent: navigator.userAgent,
        } as any);

      if (completionError) throw completionError;

      await supabase
        .from('training_access_tokens')
        .update({ uses_count: (tokenData.uses_count || 0) + 1 })
        .eq('id', tokenData.id);

      setStep('done');
    } catch (err) {
      console.error('Completion error:', err);
      setErrorMsg('Error al registrar la evidencia. Intente de nuevo.');
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  };

  const content = course?.content as TrainingCourseContent | null;
  const images = media.filter(m => m.type === 'imagen' || m.type === 'infografia');
  const audios = media.filter(m => m.type === 'audio');
  const todayStr = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

  // ─── Branded Header ──────────────────────────
  const BrandedHeader = () => (
    <div className="bg-[#1a5c2e] text-white py-4 px-4">
      <div className="max-w-3xl mx-auto flex items-center gap-3">
        <img src={petrocasinosIcon} alt="Logo" className="h-10 w-10 rounded-lg bg-white/10 p-1" />
        <div>
          <h1 className="text-lg font-bold tracking-wide">PETROCASINOS</h1>
          <p className="text-xs opacity-80 uppercase tracking-widest">Capacitación</p>
        </div>
      </div>
    </div>
  );

  // ─── Loading ──────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Validando acceso...</p>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
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

  // ─── Done ─────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-muted">
        <BrandedHeader />
        <div className="max-w-lg mx-auto p-4 mt-8">
          <Card>
            <CardContent className="pt-8 text-center space-y-5">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">¡Capacitación Completada!</h2>
              <p className="text-muted-foreground">
                Tu evidencia ha sido registrada exitosamente.
              </p>

              <div className="bg-muted rounded-lg p-4 text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacitación</span>
                  <span className="font-medium">{course?.name}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nombre</span>
                  <span className="font-medium">{operatorName}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cédula</span>
                  <span className="font-medium">{operatorCedula}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha</span>
                  <span className="font-medium">{todayStr}</span>
                </div>
                {quizScore !== null && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Evaluación</span>
                      <span className="font-medium">{quizScore}%</span>
                    </div>
                  </>
                )}
              </div>

              <p className="text-xs text-muted-foreground pt-2">
                Puedes cerrar esta ventana.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Main Flow ────────────────────────────────
  return (
    <div className="min-h-screen bg-muted">
      <BrandedHeader />

      {/* Course title bar */}
      {step !== 'identify' && (
        <div className="bg-card border-b px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-semibold text-foreground">{course?.name}</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              {course?.category && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <BookOpen className="h-3 w-3" />{course.category}
                </Badge>
              )}
              {course?.duration_hours && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="h-3 w-3" />{course.duration_hours}h
                </Badge>
              )}
              {centerName && (
                <Badge variant="outline" className="text-xs gap-1">
                  <MapPin className="h-3 w-3" />{centerName}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {/* ─── IDENTIFY ────────────────────────── */}
        {step === 'identify' && (
          <Card className="mt-4">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-3">
                <img src={petrocasinosIcon} alt="Logo" className="h-16 w-16" />
              </div>
              <CardTitle className="text-xl">{course?.name}</CardTitle>
              <CardDescription className="flex items-center justify-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs gap-1">
                  <BookOpen className="h-3 w-3" />{course?.category}
                </Badge>
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="h-3 w-3" />{course?.duration_hours}h
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="cedula">Número de cédula *</Label>
                <Input
                  id="cedula"
                  value={operatorCedula}
                  onChange={(e) => {
                    setOperatorCedula(e.target.value);
                    setCedulaVerified(false);
                    setCedulaError('');
                    setOperatorName('');
                  }}
                  onBlur={(e) => verifyCedula(e.target.value)}
                  placeholder="Ingrese su número de cédula"
                />
                {verifyingCedula && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Verificando...
                  </div>
                )}
                {cedulaError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {cedulaError}
                  </p>
                )}
                {cedulaVerified && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Empleado verificado: {operatorName}
                  </p>
                )}
              </div>

              <Button
                onClick={handleIdentify}
                disabled={!cedulaVerified}
                className="w-full"
                size="lg"
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                Continuar a la Capacitación
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ─── CONTENT ─────────────────────────── */}
        {step === 'content' && (
          <>
            {/* Evaluation required alert */}
            {tokenData?.requires_evaluation && content?.evaluacion?.length ? (
              <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0" />
                <span className="text-amber-800 dark:text-amber-200">
                  Esta capacitación requiere aprobar una evaluación con mínimo 80% para completar el proceso.
                </span>
              </div>
            ) : null}

            {/* Introduction */}
            {content?.introduccion && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Introducción</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{content.introduccion}</p>
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

            {/* Media Gallery */}
            {images.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Material Visual</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {images.map((img) => (
                      <div key={img.id} className="space-y-1">
                        <img
                          src={img.file_url}
                          alt={img.title}
                          className="rounded-lg border w-full object-contain max-h-64"
                          loading="lazy"
                        />
                        <p className="text-xs text-muted-foreground text-center">{img.title}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Audio */}
            {audios.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Audio</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {audios.map((a) => (
                    <div key={a.id} className="space-y-1">
                      <p className="text-sm font-medium">{a.title}</p>
                      <audio controls className="w-full" src={a.file_url} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Separator />

            <div className="flex justify-end">
              <Button size="lg" onClick={handleContentDone}>
                {tokenData?.requires_evaluation && content?.evaluacion?.length
                  ? 'He leído y entendido — Realizar Evaluación'
                  : 'Continuar a Firma'}
              </Button>
            </div>
          </>
        )}

        {/* ─── QUIZ ────────────────────────────── */}
        {step === 'quiz' && content?.evaluacion && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Evaluación de Conocimientos
              </CardTitle>
              <CardDescription>Responda las siguientes preguntas sobre el contenido de la capacitación.</CardDescription>
            </CardHeader>
            <CardContent>
              <EvaluationQuiz
                questions={content.evaluacion}
                onComplete={handleQuizComplete}
                onGoBack={() => setStep('content')}
              />
            </CardContent>
          </Card>
        )}

        {/* ─── SIGNATURE ───────────────────────── */}
        {step === 'signature' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Firma Digital
              </CardTitle>
              <CardDescription>Confirma tu participación en la capacitación.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Summary */}
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Nombre:</span>
                  <span className="font-medium">{operatorName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Cédula:</span>
                  <span className="font-medium">{operatorCedula}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Fecha:</span>
                  <span className="font-medium">{todayStr}</span>
                </div>
                {quizScore !== null && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Evaluación:</span>
                    <span className="font-medium">{quizScore}%</span>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Firma de Confirmación</h4>
                {submitting ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Registrando evidencia...</span>
                  </div>
                ) : (
                  <SignatureCanvas
                    onSave={handleSignature}
                    onCancel={() => setStep('content')}
                  />
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Al firmar, confirmo que he leído y comprendido el contenido de esta capacitación.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
