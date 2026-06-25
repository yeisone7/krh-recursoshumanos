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
import { StoryboardViewer } from '@/components/training/StoryboardViewer';
import { ImageLightbox } from '@/components/training/ImageLightbox';
import {
  GraduationCap, Clock, BookOpen, CheckCircle2, AlertTriangle,
  Loader2, MapPin, Calendar, User, FileText, ShieldCheck, Maximize,
  ExternalLink
} from 'lucide-react';
import type { TrainingCourse, TrainingCourseContent, TrainingQuizQuestion } from '@/types/training';
import petrocasinosIcon from '@/assets/petrocasinos-orange-icon.png';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Step = 'loading' | 'error' | 'identify' | 'content' | 'quiz' | 'signature' | 'done';

interface MediaItem {
  id: string;
  type: string;
  title: string;
  description: string | null;
  file_url: string;
  metadata?: Record<string, unknown> | null;
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
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState('');
  const [companyBranding, setCompanyBranding] = useState<{ name: string; horizontal_logo_url: string | null } | null>(null);

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
      const { data: validation, error } = await (supabase as any).rpc('validate_training_access_token', {
        p_token: token,
      });
      const data = validation?.token;

      if (error || !validation?.valid || !data) {
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

      // Fetch company branding
      if (data.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('name, horizontal_logo_url')
          .eq('id', data.company_id)
          .single();
        if (companyData) setCompanyBranding(companyData);
      }

      // Fetch media for this course
      const { data: mediaData } = await supabase
        .from('training_media')
        .select('id, type, title, description, file_url, metadata')
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
        const { data: alreadyCompleted, error: completionCheckError } = await (supabase as any).rpc('has_training_completion', {
          p_token: tokenParam,
          p_employee_id: emp.employee_id,
          p_operator_cedula: cedula.trim(),
        });

        if (completionCheckError) throw completionCheckError;

        if (alreadyCompleted) {
          setCedulaError('Esta persona ya completó esta capacitación. No es necesario registrarla nuevamente.');
          setCedulaVerified(false);
          setEmployeeId(null);
          setOperatorName('');
          return;
        }

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
      const { error: completionError } = await (supabase as any).rpc('complete_training_access', {
        p_token: tokenParam,
        p_employee_id: employeeId,
        p_operator_name: operatorName,
        p_operator_cedula: operatorCedula || null,
        p_signature_data: dataUrl,
        p_quiz_score: quizScore,
        p_user_agent: navigator.userAgent,
      });

      if (completionError) throw completionError;

      setStep('done');
    } catch (err) {
      console.error('Completion error:', err);
      const message = String((err as any)?.message || '').toLowerCase();
      if (message.includes('ya completo') || message.includes('ya completó')) {
        setErrorMsg('Esta persona ya completó esta capacitación. No se creó una nueva evidencia.');
      } else {
        setErrorMsg('Error al registrar la evidencia. Intente de nuevo.');
      }
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  };

  const content = course?.content as TrainingCourseContent | null;
  const externalLinks = media.filter(m => (m.metadata as any)?.is_external_link === true || m.type === 'documento');
  const playableMedia = media.filter(m => !externalLinks.some(link => link.id === m.id));
  const images = playableMedia.filter(m => m.type === 'imagen' || m.type === 'infografia');
  const audios = playableMedia.filter(m => m.type === 'audio');
  
  // Videos filtering
  const avatarVideos = playableMedia.filter(m => m.type === 'video' && m.title === 'Avatar Presentador');
  // Storyboard videos are usually those with a specific title format or just not the ones we want to show as standalone
  // For now, let's assume any video that is NOT the avatar and NOT a storyboard scene is "complementary"
  // Actually, let's show ALL videos that are not the avatar in a dedicated section if they are not being used in the storyboard
  const complementaryVideos = playableMedia.filter(m => m.type === 'video' && m.title !== 'Avatar Presentador');
  
  const todayStr = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

  // ─── Loading ──────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="notranslate min-h-screen bg-background flex items-center justify-center">
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
      <div className="notranslate min-h-screen bg-background flex items-center justify-center p-4">
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
      <div className="notranslate min-h-screen bg-[#f8fafc] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/70 backdrop-blur-xl">
            <CardContent className="pt-12 text-center space-y-6">
              <div className="flex justify-center mb-2">
                {companyBranding?.horizontal_logo_url ? (
                  <img src={companyBranding.horizontal_logo_url} alt="Logo" className="h-12 object-contain" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight text-foreground">¡Capacitación Completada!</h2>
                <p className="text-muted-foreground font-medium">
                  Tu evidencia ha sido registrada exitosamente.
                </p>
              </div>

              <div className="bg-background/50 rounded-3xl p-6 text-left space-y-3 text-sm border border-border/50">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Capacitación</span>
                  <span className="font-bold text-foreground truncate max-w-[200px]">{course?.name}</span>
                </div>
                <Separator className="bg-border/30" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Colaborador</span>
                  <span className="font-bold text-foreground">{operatorName}</span>
                </div>
                <Separator className="bg-border/30" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Identificación</span>
                  <span className="font-bold text-foreground">{operatorCedula}</span>
                </div>
                <Separator className="bg-border/30" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha</span>
                  <span className="font-bold text-foreground">{todayStr}</span>
                </div>
                {quizScore !== null && (
                  <>
                    <Separator className="bg-border/30" />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Evaluación</span>
                      <Badge className="bg-success/10 text-success border-success/20 font-black px-2 py-0.5">{quizScore}%</Badge>
                    </div>
                  </>
                )}
              </div>

              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pt-4 opacity-40">
                Puedes cerrar esta ventana de forma segura.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Main Flow ────────────────────────────────
  return (
    <div className="notranslate min-h-screen bg-[#f8fafc] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">

      {/* Course title bar */}
      {step !== 'identify' && (
        <div className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 px-4 py-4 shadow-sm">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div>
              <h2 className="font-bold text-foreground text-lg leading-tight">{course?.name}</h2>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {course?.category && (
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest gap-1 py-0.5">
                    <BookOpen className="h-3 w-3" />{course.category}
                  </Badge>
                )}
                {course?.duration_hours && (
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest gap-1 py-0.5">
                    <Clock className="h-3 w-3" />{course.duration_hours}h
                  </Badge>
                )}
              </div>
            </div>
            {companyBranding?.horizontal_logo_url && (
              <img src={companyBranding.horizontal_logo_url} alt="Logo" className="h-8 object-contain hidden sm:block" />
            )}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto p-6 space-y-8">
        {/* ─── IDENTIFY ────────────────────────── */}
        {step === 'identify' && (
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/70 backdrop-blur-xl">
              <CardHeader className="text-center pb-2 pt-10">
                <div className="flex justify-center mb-8 px-8">
                  {companyBranding?.horizontal_logo_url ? (
                    <img src={companyBranding.horizontal_logo_url} alt="Logo" className="h-16 w-full object-contain" />
                  ) : (
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="h-8 w-8 text-primary" />
                    </div>
                  )}
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
                  <p className="text-sm text-success flex items-center gap-1">
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
        </div>
      )}

        {/* ─── CONTENT ─────────────────────────── */}
        {step === 'content' && (
          <>
            {/* Evaluation required alert */}
            {tokenData?.requires_evaluation && content?.evaluacion?.length ? (
              <div className="flex items-center gap-3 bg-warning-light border border-warning/30 rounded-lg p-3 text-sm">
                <ShieldCheck className="h-5 w-5 text-warning shrink-0" />
                <span className="text-warning-foreground">
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
            <ImageLightbox src={lightboxSrc} alt={lightboxAlt} onClose={() => setLightboxSrc(null)} />

            {images.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Material Visual</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {images.map((img) => (
                      <div key={img.id} className="space-y-1 group relative cursor-pointer" onClick={() => { setLightboxSrc(img.file_url); setLightboxAlt(img.title); }}>
                        <img
                          src={img.file_url}
                          alt={img.title}
                          className="rounded-lg border w-full object-contain max-h-64"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Maximize className="h-6 w-6 text-white drop-shadow-lg" />
                        </div>
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

            {/* Storyboard (Solo para escenas generadas por IA que se comportan como secuencias) */}
            {(() => {
              // Consideramos escenas de storyboard solo aquellas que NO son los videos complementarios que mostramos abajo
              // O aquellas que tienen un formato de título específico si existiera.
              // Por ahora, si un video tiene una descripción larga o título de 'Escena', lo tratamos como storyboard.
              // Pero para ser seguros y evitar duplicidad/errores, si hay videos complementarios, el storyboard 
              // solo debería activarse si hay una intención clara.
              const storyboardScenes = playableMedia.filter(m => m.type === 'video' && m.title !== 'Avatar Presentador' && (m.title?.toLowerCase().includes('escena') || m.description));
              
              if (storyboardScenes.length === 0) return null;
              
              const scenes = storyboardScenes.map(m => ({
                title: (m.title || '').replace(/^[^:]*:\s*/, '').replace(/^\(regen\):\s*/, ''),
                narration: m.description || '',
                visual_description: '',
              }));
              const imageUrls = storyboardScenes.map(m => m.file_url);
              const audioUrl = audios.length > 0 ? audios[audios.length - 1].file_url : null;
              
              return (
                <Card>
                  <CardHeader><CardTitle className="text-lg">Storyboard de la Capacitación</CardTitle></CardHeader>
                  <CardContent>
                    <StoryboardViewer scenes={scenes} imageUrls={imageUrls} audioUrl={audioUrl} />
                  </CardContent>
                </Card>
              );
            })()}

            {/* Videos Complementarios (Cargas manuales y otros) */}
            {complementaryVideos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Maximize className="h-5 w-5 text-primary" /> Material Audiovisual
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-8">
                  {complementaryVideos.map((vid) => (
                    <div key={vid.id} className="space-y-2">
                      <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{vid.title}</p>
                      <div className="rounded-2xl overflow-hidden border border-border/50 bg-black shadow-xl aspect-video max-h-[500px]">
                        <video 
                          controls 
                          className="w-full h-full object-contain" 
                          src={vid.file_url} 
                          preload="metadata"
                          poster={petrocasinosIcon} // Fallback poster
                        />
                      </div>
                      {vid.description && <p className="text-sm text-muted-foreground italic">{vid.description}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Avatar Video */}
            {avatarVideos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" /> Presentación con Avatar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {avatarVideos.map((item) => (
                    <div key={item.id} className="rounded-2xl overflow-hidden border border-border/50 bg-black shadow-xl">
                      <video controls className="w-full max-h-[500px]" src={item.file_url} preload="metadata" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {externalLinks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-primary" /> Materiales externos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {externalLinks.map((item) => (
                    <a
                      key={item.id}
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-background p-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{item.title}</p>
                        {item.description && <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>}
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
                    </a>
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
              <div className="bg-background rounded-lg p-4 space-y-2 text-sm">
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
