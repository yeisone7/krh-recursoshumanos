import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Upload, FileText, X, Target, Scale, Tag, LayoutGrid, Users, BarChart3, Clock, Monitor, ShieldAlert, CalendarCheck, BookOpen, Globe, CircleDot, AlignLeft, Trash2, ImageIcon, Network, LayoutPanelTop, Mic, Video, Plus, ExternalLink, UserCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrainingStepIndicator, MarkdownContent, ImageUploader, VideoUploader, TrainingMediaGallery, MediaTypeCard, StoryboardViewer } from '@/components/training';
import { AvatarVideoPlayer } from '@/components/training/AvatarVideoPlayer';
import { useCreateFullCourse, useUpdateFullCourse, useTrainingCourse, useTrainingMedia, useCreateTrainingMedia, useDeleteTrainingMedia } from '@/hooks/useTraining';
import { supabase } from '@/integrations/supabase/client';
import { applyWatermark } from '@/lib/watermark';
import type { WatermarkConfig } from '@/lib/watermark';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { toast } from 'sonner';
import type { TrainingCourseContent, TrainingQuizQuestion } from '@/types/training';

const STEPS = [
  { label: 'Parámetros' },
  { label: 'Contexto + IA' },
  { label: 'Revisión' },
];

const NIVELES = ['Básico', 'Intermedio', 'Avanzado'];
const OBJETIVOS = ['Sensibilización', 'Cumplimiento', 'Corrección de hallazgo', 'Formación inicial', 'Actualización', 'Otro'];

const TRAINING_TIPOS = ['Charla 5 min', 'Calidad', 'HSEQ', 'Reinducci\u00f3n', 'Refuerzo', 'Emergencias', 'Auditor\u00eda', 'Inducci\u00f3n', 'Capacitaci\u00f3n', 'Entrenamiento Grupal', 'Otro'];
const TRAINING_AREAS = ['Talento Humano', 'Bienestar y Desarrollo', 'Jur\u00eddica y Relacionamiento Laboral', 'SGI', 'SST', 'Ambiental', 'Seguridad Alimentaria', 'Contabilidad', 'PESV', 'Otro'];
const TRAINING_PUBLICOS = ['Centros de Operaci\u00f3n', 'Supervisores', 'T\u00e9cnicos', 'Administrativos', 'Fincas', 'Transversal (Todo el personal)'];
const TRAINING_MARCOS_LEGALES = ['ISO 9001', 'ISO 14001', 'ISO 22000', 'ISO 45001', 'BPM', 'HACCP', 'Interno', 'Otro'];

const fileToBase64 = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
};

export default function CrearCapacitacion() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const { currentCompanyId } = useAuth();
  const { data: systemConfig } = useSystemConfig();

  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfText, setPdfText] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [generatingMedia, setGeneratingMedia] = useState<Record<string, boolean>>({});
  const [generatedMedia, setGeneratedMedia] = useState<Record<string, string>>({});
  const [audioDuration, setAudioDuration] = useState('medium');
  const [videoDuration, setVideoDuration] = useState('medium');
  const [videoStyle, setVideoStyle] = useState('clasico');
  const [videoScript, setVideoScript] = useState<any>(null);
  const [videoImages, setVideoImages] = useState<string[]>([]);
  const [storyboardAudioUrl, setStoryboardAudioUrl] = useState<string | null>(null);

  // Avatar state
  const [avatars, setAvatars] = useState<any[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [avatarVideoId, setAvatarVideoId] = useState<string | null>(null);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null);
  const [loadingAvatars, setLoadingAvatars] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [tipo, setTipo] = useState('');
  const [tipoOtro, setTipoOtro] = useState('');
  const [area, setArea] = useState('');
  const [areaOtra, setAreaOtra] = useState('');
  const [publico, setPublico] = useState('');
  const [publicoOtro, setPublicoOtro] = useState('');
  const [nivel, setNivel] = useState('Básico');
  const [objetivo, setObjetivo] = useState('');
  const [objetivoOtro, setObjetivoOtro] = useState('');
  const [marcoLegal, setMarcoLegal] = useState('');
  const [marcoLegalOtro, setMarcoLegalOtro] = useState('');
  const [riesgo, setRiesgo] = useState('medio');
  const [duracion, setDuracion] = useState(30);
  const [modalidad, setModalidad] = useState('presencial');
  const [idioma, setIdioma] = useState('es');
  const [vigencia, setVigencia] = useState<number | undefined>();
  const [obligatorio, setObligatorio] = useState(false);
  const [certificacion, setCertificacion] = useState(false);
  const [additionalContext, setAdditionalContext] = useState('');

  // Content state
  const [content, setContent] = useState<TrainingCourseContent | null>(null);

  const createCourse = useCreateFullCourse();
  const updateCourse = useUpdateFullCourse();
  const { data: existingCourse } = useTrainingCourse(editId || undefined);
  const { data: media = [] } = useTrainingMedia(editId || undefined);
  const createMedia = useCreateTrainingMedia();
  const deleteMedia = useDeleteTrainingMedia();

  // Load existing course for editing
  useEffect(() => {
    if (existingCourse) {
      setTitle(existingCourse.name);
      setTipo(existingCourse.category);
      // area is stored in target_audience
      const savedArea = existingCourse.target_audience || '';
      if (TRAINING_AREAS.includes(savedArea)) {
        setArea(savedArea);
      } else if (savedArea) {
        setArea('Otro');
        setAreaOtra(savedArea);
      }
      // público is stored in audience
      const savedPublico = existingCourse.audience || '';
      if (TRAINING_PUBLICOS.includes(savedPublico)) {
        setPublico(savedPublico);
      }
      // nivel is stored lowercase, capitalize first letter
      const savedNivel = existingCourse.level || 'basico';
      const nivelMap: Record<string, string> = { basico: 'Básico', intermedio: 'Intermedio', avanzado: 'Avanzado' };
      setNivel(nivelMap[savedNivel] || savedNivel.charAt(0).toUpperCase() + savedNivel.slice(1));
      // objetivo
      const savedObjetivo = existingCourse.objective || '';
      if (OBJETIVOS.includes(savedObjetivo)) {
        setObjetivo(savedObjetivo);
      } else if (savedObjetivo) {
        setObjetivo('Otro');
        setObjetivoOtro(savedObjetivo);
      }
      // marco legal
      const savedMarco = existingCourse.legal_framework === 'ISO 14000' ? 'ISO 14001' : existingCourse.legal_framework || '';
      if (TRAINING_MARCOS_LEGALES.includes(savedMarco)) {
        setMarcoLegal(savedMarco);
      } else if (savedMarco) {
        setMarcoLegal('Otro');
        setMarcoLegalOtro(savedMarco);
      }
      setRiesgo(existingCourse.risk_level || 'medio');
      setDuracion(existingCourse.duration_hours);
      setModalidad(existingCourse.modality);
      setIdioma(existingCourse.language || 'es');
      setVigencia(existingCourse.validity_months ?? undefined);
      setObligatorio(existingCourse.is_mandatory);
      setCertificacion(existingCourse.requires_certification);
      if (existingCourse.content) {
        setContent(existingCourse.content as TrainingCourseContent);
      }
    }
  }, [existingCourse]);

  // Load existing avatar video from media
  useEffect(() => {
    if (media.length > 0) {
      const avatarItem = (media as any[]).find((m: any) => m.title === 'Avatar Presentador' || (m.metadata as any)?.is_avatar);
      if (avatarItem) {
        setAvatarVideoUrl(avatarItem.file_url);
      }
    }
  }, [media]);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtractingPdf(true);
    setPdfName(file.name);
    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('El PDF no puede superar 10MB');
      }
      const fileBase64 = await fileToBase64(file);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Sesion requerida para procesar PDF');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileBase64,
          fileSize: file.size,
        }),
      });
      if (!response.ok) throw new Error('Error extracting PDF');
      const result = await response.json();
      setPdfText(result.text || '');
      toast.success('PDF procesado exitosamente');
    } catch {
      toast.error('Error al procesar el PDF');
      setPdfName('');
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-training', {
        body: {
          title,
          type: tipo === 'Otro' ? tipoOtro : tipo,
          area: area === 'Otro' ? areaOtra : area,
          audience: publico === 'Otro' ? publicoOtro : publico,
          level: nivel,
          objective: objetivo === 'Otro' ? objetivoOtro : objetivo,
          legalFramework: marcoLegal === 'Otro' ? marcoLegalOtro : marcoLegal,
          riskLevel: riesgo,
          duration: duracion,
          language: idioma,
          pdfText,
          additionalContext,
          companyId: currentCompanyId,
        },
      });
      if (error) throw error;
      setContent(data as TrainingCourseContent);
      setStep(2);
      toast.success('Contenido generado exitosamente');
    } catch (err: any) {
      toast.error(err?.message || 'Error al generar contenido');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (status: string) => {
    try {
      const courseData = {
        name: title,
        category: tipo === 'Otro' ? tipoOtro : tipo,
        modality: modalidad,
        durationHours: duracion,
        isMandatory: obligatorio,
        requiresCertification: certificacion,
        validityMonths: vigencia,
        level: nivel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        audience: publico === 'Otro' ? publicoOtro : publico,
        targetAudience: area === 'Otro' ? areaOtra : area,
        objective: objetivo === 'Otro' ? objetivoOtro : objetivo,
        legalFramework: marcoLegal === 'Otro' ? marcoLegalOtro : marcoLegal,
        riskLevel: riesgo,
        language: idioma,
        content: content || undefined,
        status,
      };

      if (editId) {
        await updateCourse.mutateAsync({ id: editId, ...courseData });
        toast.success(status === 'publicado' ? 'Capacitación publicada' : 'Borrador guardado');
      } else {
        const result = await createCourse.mutateAsync(courseData);
        toast.success(status === 'publicado' ? 'Capacitación publicada' : 'Borrador guardado');
        navigate(`/capacitaciones/crear?id=${result.id}`, { replace: true });
      }
    } catch (err: any) {
      console.error("Error al guardar capacitación:", err);
      toast.error(`Error al guardar: ${err?.message || err}`);
    }
  };

  const handleMediaUploaded = async (url: string, fileName: string, fileSize: number) => {
    if (!editId) return;
    await createMedia.mutateAsync({ courseId: editId, type: 'imagen', title: fileName, fileUrl: url, fileSize });
  };

  const handleDeleteMedia = async (id: string) => {
    if (!editId) return;
    await deleteMedia.mutateAsync({ id, courseId: editId });
  };

  const handleGenerateMedia = async (type: string) => {
    if (!editId || !content) return;
    setGeneratingMedia(prev => ({ ...prev, [type]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('generate-training-media', {
        body: {
          type,
          title,
          content: content.contenido?.substring(0, 2000),
          puntosClave: content.puntosClave,
          companyId: currentCompanyId,
          courseId: editId,
          skipUpload: true,
        },
      });
      if (error) throw error;
      if (data?.imageUrl) {
        // Apply watermark client-side using system config
        const wmConfig = systemConfig?.watermark_config as WatermarkConfig | undefined;
        const watermarkedBlob = await applyWatermark(data.imageUrl, wmConfig);
        const fileName = `${editId}/${type}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('training-media')
          .upload(fileName, watermarkedBlob, { contentType: 'image/png', upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('training-media').getPublicUrl(fileName);
        const finalUrl = urlData.publicUrl;

        setGeneratedMedia(prev => ({ ...prev, [type]: finalUrl }));
        await createMedia.mutateAsync({
          courseId: editId,
          type: type === 'mapa_mental' ? 'imagen' : type === 'infografia' ? 'infografia' : 'imagen',
          title: type === 'imagen' ? 'Imagen Explicativa' : type === 'mapa_mental' ? 'Mapa Mental' : 'Infografía',
          fileUrl: finalUrl,
          fileSize: watermarkedBlob.size,
        });
        toast.success(`${type === 'imagen' ? 'Imagen' : type === 'mapa_mental' ? 'Mapa mental' : 'Infografía'} generada exitosamente`);
      }
    } catch (err: any) {
      toast.error(err?.message || `Error al generar ${type}`);
    } finally {
      setGeneratingMedia(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleGenerateAudio = async () => {
    if (!editId || !content) return;
    setGeneratingMedia(prev => ({ ...prev, audio: true }));
    try {
      const { data, error } = await supabase.functions.invoke('generate-training-audio', {
        body: {
          title,
          content: content.contenido?.substring(0, 2000),
          puntosClave: content.puntosClave,
          duration: audioDuration,
          companyId: currentCompanyId,
          courseId: editId,
        },
      });
      if (error) throw error;
      if (data?.audioUrl) {
        await createMedia.mutateAsync({
          courseId: editId,
          type: 'audio',
          title: 'Audio Narrado',
          fileUrl: data.audioUrl,
          fileSize: 0,
          description: data.script?.substring(0, 500),
        });
        toast.success('Audio narrado generado exitosamente');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al generar audio');
    } finally {
      setGeneratingMedia(prev => ({ ...prev, audio: false }));
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border border-border/50 rounded-[2rem] shadow-sm mb-8">
        
        <div className="relative z-10 flex items-center gap-5">
          <Button variant="ghost" size="icon" onClick={() => navigate('/capacitaciones')} className="h-12 w-12 rounded-full bg-background border border-border/50 hover:bg-background shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <Badge variant="outline" className="text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 mb-1">
              {editId ? 'EDICIÓN CON IA' : 'CREACIÓN CON IA'}
            </Badge>
            <h1 className="text-3xl font-black tracking-tight text-foreground">{editId ? 'Editar' : 'Crear'} Capacitación con IA</h1>
            <p className="text-muted-foreground font-medium mt-1">Genera contenido estructurado y multimedia automáticamente</p>
          </div>
        </div>
      </div>

      <div className="px-2 mb-8">
        <TrainingStepIndicator steps={STEPS} currentStep={step} />
      </div>

      {/* Step 1: Parameters */}
      {step === 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-primary/40 to-primary/10 w-full" />
            <CardHeader className="px-8 pt-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Parámetros de la Capacitación</CardTitle>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Define las características principales</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Tag className="h-4 w-4" /> Título de la Capacitación *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Manipulación segura de alimentos en cocina industrial" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><LayoutGrid className="h-4 w-4" /> Tipo de Capacitación *</Label>
                  <Select value={tipo} onValueChange={setTipo}><SelectTrigger><SelectValue placeholder="Selecciona el tipo" /></SelectTrigger><SelectContent>{TRAINING_TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                  {tipo === 'Otro' && <Input className="mt-2" placeholder="Especifique" value={tipoOtro} onChange={e => setTipoOtro(e.target.value)} />}
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><BarChart3 className="h-4 w-4" /> Área *</Label>
                  <Select value={area} onValueChange={setArea}><SelectTrigger><SelectValue placeholder="Selecciona el área" /></SelectTrigger><SelectContent>{TRAINING_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
                  {area === 'Otro' && <Input className="mt-2" placeholder="Especifique" value={areaOtra} onChange={e => setAreaOtra(e.target.value)} />}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Público Objetivo *</Label>
                  <Select value={publico} onValueChange={setPublico}><SelectTrigger><SelectValue placeholder="Selecciona el público" /></SelectTrigger><SelectContent>{TRAINING_PUBLICOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><CircleDot className="h-4 w-4" /> Nivel *</Label>
                  <Select value={nivel} onValueChange={setNivel}><SelectTrigger><SelectValue placeholder="Selecciona el nivel" /></SelectTrigger><SelectContent>{NIVELES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Target className="h-4 w-4" /> Objetivo *</Label>
                  <Select value={objetivo} onValueChange={setObjetivo}><SelectTrigger><SelectValue placeholder="Selecciona el objetivo" /></SelectTrigger><SelectContent>{OBJETIVOS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                  {objetivo === 'Otro' && <Input className="mt-2" placeholder="Especifique el objetivo" value={objetivoOtro} onChange={e => setObjetivoOtro(e.target.value)} />}
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Scale className="h-4 w-4" /> Norma / Marco Legal *</Label>
                  <Select value={marcoLegal} onValueChange={setMarcoLegal}><SelectTrigger><SelectValue placeholder="Selecciona la norma" /></SelectTrigger><SelectContent>{TRAINING_MARCOS_LEGALES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
                  {marcoLegal === 'Otro' && <Input className="mt-2" placeholder="Especifique la norma" value={marcoLegalOtro} onChange={e => setMarcoLegalOtro(e.target.value)} />}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" /> Riesgo Asociado</Label>
                  <Select value={riesgo} onValueChange={setRiesgo}><SelectTrigger><SelectValue placeholder="Selecciona el nivel de riesgo" /></SelectTrigger><SelectContent><SelectItem value="bajo">Bajo</SelectItem><SelectItem value="medio">Medio</SelectItem><SelectItem value="alto">Alto</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Duración Estimada *</Label>
                  <Select value={String(duracion)} onValueChange={v => setDuracion(Number(v))}><SelectTrigger><SelectValue placeholder="Selecciona la duración" /></SelectTrigger><SelectContent>
                    <SelectItem value="5">5 minutos</SelectItem><SelectItem value="10">10 minutos</SelectItem><SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem><SelectItem value="45">45 minutos</SelectItem><SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1.5 horas</SelectItem><SelectItem value="120">2 horas</SelectItem><SelectItem value="180">3 horas</SelectItem>
                    <SelectItem value="240">4 horas</SelectItem><SelectItem value="480">8 horas</SelectItem>
                  </SelectContent></Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Monitor className="h-4 w-4" /> Modalidad *</Label>
                  <Select value={modalidad} onValueChange={setModalidad}><SelectTrigger><SelectValue placeholder="Selecciona la modalidad" /></SelectTrigger><SelectContent><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="virtual">Virtual</SelectItem><SelectItem value="mixto">Mixto</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Globe className="h-4 w-4" /> Idioma *</Label>
                  <Select value={idioma} onValueChange={setIdioma}><SelectTrigger><SelectValue placeholder="Selecciona el idioma" /></SelectTrigger><SelectContent><SelectItem value="es">Español</SelectItem><SelectItem value="en">Inglés</SelectItem></SelectContent></Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><CalendarCheck className="h-4 w-4" /> Vigencia</Label>
                  <Select value={vigencia ? String(vigencia) : ''} onValueChange={v => setVigencia(v ? Number(v) : undefined)}><SelectTrigger><SelectValue placeholder="Selecciona la vigencia" /></SelectTrigger><SelectContent>
                    <SelectItem value="3">3 meses</SelectItem><SelectItem value="6">6 meses</SelectItem><SelectItem value="12">12 meses</SelectItem>
                    <SelectItem value="18">18 meses</SelectItem><SelectItem value="24">24 meses</SelectItem><SelectItem value="36">36 meses</SelectItem><SelectItem value="0">Sin Vigencia</SelectItem>
                  </SelectContent></Select>
                </div>
              </div>
              <div className="space-y-1.5 pt-4">
                <Label className="flex items-center gap-1.5"><AlignLeft className="h-4 w-4" /> Descripción o Contexto Adicional</Label>
                <Textarea className="resize-none rounded-xl bg-background" value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} placeholder="Proporciona información adicional que ayude a la IA a generar contenido más preciso..." rows={4} />
              </div>
              <div className="flex justify-end pt-6 border-t border-border/50">
                <Button onClick={() => setStep(1)} disabled={!title} className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
                  Siguiente <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 2: Context + AI */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500/40 to-blue-500/10 w-full" />
            <CardHeader className="px-8 pt-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 shadow-inner">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Documentos de Contexto</CardTitle>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Sube PDFs que la IA usará como referencia</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center bg-background">
                {pdfName ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium">{pdfName}</span>
                    <Button variant="ghost" size="icon" onClick={() => { setPdfName(''); setPdfText(''); }}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium mb-1">Arrastra archivos aquí o haz clic para seleccionar</p>
                    <p className="text-xs text-muted-foreground mb-4">Formatos aceptados: PDF (Máx. 10MB por archivo)</p>
                    <label>
                      <Input type="file" accept=".pdf" onChange={handlePdfUpload} disabled={isExtractingPdf} className="hidden" />
                      <Button variant="outline" size="sm" asChild className="cursor-pointer"><span><Upload className="h-4 w-4 mr-2" /> Seleccionar archivos</span></Button>
                    </label>
                    {isExtractingPdf && <div className="flex items-center justify-center gap-2 mt-3"><Loader2 className="h-4 w-4 animate-spin" /> Extrayendo texto...</div>}
                  </>
                )}
              </div>
              <div className="space-y-1.5 pt-2">
                <Label>Contenido adicional para la IA</Label>
                <Textarea className="resize-none rounded-xl bg-background" value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} placeholder="Puedes pegar aquí texto adicional de procedimientos, normativas, o información que la IA deba considerar..." rows={5} />
              </div>
              <div className="flex justify-between pt-6 border-t border-border/50">
                <Button variant="outline" onClick={() => setStep(0)} className="h-12 px-6 rounded-2xl font-bold uppercase tracking-widest text-xs">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
                </Button>
                <Button onClick={handleGenerate} disabled={isGenerating} className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
                  {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generar Capacitación</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 3: Review */}
      {step === 2 && content && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
          <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-amber-500/40 to-amber-500/10 w-full" />
            <CardHeader className="px-8 pt-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 shadow-inner">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Contenido Generado</CardTitle>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Revisa y edita el contenido antes de publicar</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-8">
              {/* Título */}
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} />
              </div>

              {/* 1. Introducción */}
              <div className="space-y-1.5">
                <h3 className="font-semibold text-base">1. Introducción</h3>
                <Textarea value={content.introduccion || ''} onChange={e => setContent({ ...content, introduccion: e.target.value })} rows={5} />
              </div>

              {/* 2. Objetivos de Aprendizaje */}
              <div className="space-y-1.5">
                <h3 className="font-semibold text-base">2. Objetivos de Aprendizaje</h3>
                <p className="text-xs text-muted-foreground">Un objetivo por línea</p>
                <Textarea
                  value={(content.objetivos || []).join('\n')}
                  onChange={e => setContent({ ...content, objetivos: e.target.value.split('\n') })}
                  rows={4}
                />
              </div>

              {/* 3. Contenido Principal */}
              <div className="space-y-1.5">
                <h3 className="font-semibold text-base">3. Contenido Principal</h3>
                <Textarea value={content.contenido || ''} onChange={e => setContent({ ...content, contenido: e.target.value })} rows={12} />
              </div>

              {/* 4. Puntos Clave */}
              <div className="space-y-1.5">
                <h3 className="font-semibold text-base">4. Puntos Clave</h3>
                <p className="text-xs text-muted-foreground">Un punto por línea</p>
                <Textarea
                  value={(content.puntosClave || []).join('\n')}
                  onChange={e => setContent({ ...content, puntosClave: e.target.value.split('\n') })}
                  rows={5}
                />
              </div>

              {/* 5. Evaluación */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-base">5. Evaluación</h3>
                    <p className="text-xs text-muted-foreground">Edita las preguntas y respuestas de la evaluación</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setContent({
                    ...content,
                    evaluacion: [...(content.evaluacion || []), { pregunta: '', respuestaCorrecta: '', opciones: ['', '', '', ''] }],
                  })}>+ Añadir Pregunta</Button>
                </div>

                {content.evaluacion?.map((q, qi) => (
                  <Card key={qi} className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Pregunta {qi + 1}</span>
                      <div className="flex-1" />
                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setContent({ ...content, evaluacion: content.evaluacion?.filter((_, idx) => idx !== qi) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input value={q.pregunta} onChange={e => {
                      const ne = [...(content.evaluacion || [])];
                      ne[qi] = { ...ne[qi], pregunta: e.target.value };
                      setContent({ ...content, evaluacion: ne });
                    }} />
                    <div>
                      <p className="text-xs font-medium mb-1">Opciones de Respuesta</p>
                      <p className="text-xs text-muted-foreground mb-2">La primera opción (verde) es la respuesta correcta</p>
                      <div className="grid grid-cols-2 gap-2">
                        {q.opciones.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <span className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              oi === 0
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                : 'bg-background text-muted-foreground'
                            }`}>
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <Input
                              value={opt}
                              onChange={e => {
                                const ne = [...(content.evaluacion || [])];
                                const newOpts = [...ne[qi].opciones];
                                newOpts[oi] = e.target.value;
                                ne[qi] = { ...ne[qi], opciones: newOpts };
                                if (oi === 0) ne[qi].respuestaCorrecta = e.target.value;
                                setContent({ ...content, evaluacion: ne });
                              }}
                              className={oi === 0 ? 'border-green-300 dark:border-green-700' : ''}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Summary bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-background rounded-3xl border border-border/50">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipo</p>
                  <p className="font-semibold text-sm">{tipo === 'Otro' ? tipoOtro : tipo || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Área</p>
                  <p className="font-semibold text-sm">{area === 'Otro' ? areaOtra : area || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Norma</p>
                  <p className="font-semibold text-sm">{marcoLegal === 'Otro' ? marcoLegalOtro : marcoLegal || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Duración</p>
                  <p className="font-semibold text-sm">{duracion >= 60 ? `${duracion / 60} hora${duracion > 60 ? 's' : ''}` : `${duracion} minutos`}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Multimedia generation section */}
          <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-violet-500/40 to-violet-500/10 w-full" />
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0 shadow-inner">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Generación Multimedia</h3>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Genera materiales visuales adicionales con IA (opcional)</p>
                </div>
              </div>

              {!editId ? (
                <p className="text-sm text-muted-foreground text-center py-4">Guarda la capacitación como borrador primero para habilitar la generación multimedia.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MediaTypeCard
                      icon={<ImageIcon className="h-5 w-5 text-muted-foreground" />}
                      title="Imagen Explicativa"
                      description="Genera una imagen visual que represente el tema de la capacitación"
                      items={(media as any[]).filter((m: any) => m.title === 'Imagen Explicativa')}
                      isGenerating={!!generatingMedia.imagen}
                      onGenerate={() => handleGenerateMedia('imagen')}
                      onDelete={handleDeleteMedia}
                    />

                    <MediaTypeCard
                      icon={<Network className="h-5 w-5 text-muted-foreground" />}
                      title="Mapa Mental"
                      description="Crea un mapa mental con los conceptos clave organizados visualmente"
                      items={(media as any[]).filter((m: any) => m.title === 'Mapa Mental')}
                      isGenerating={!!generatingMedia.mapa_mental}
                      onGenerate={() => handleGenerateMedia('mapa_mental')}
                      onDelete={handleDeleteMedia}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MediaTypeCard
                      icon={<LayoutPanelTop className="h-5 w-5 text-muted-foreground" />}
                      title="Infografía"
                      description="Diseña una infografía profesional con los puntos principales"
                      items={(media as any[]).filter((m: any) => m.title === 'Infografía')}
                      isGenerating={!!generatingMedia.infografia}
                      onGenerate={() => handleGenerateMedia('infografia')}
                      onDelete={handleDeleteMedia}
                    />

                    <MediaTypeCard
                      icon={<Mic className="h-5 w-5 text-muted-foreground" />}
                      title="Audio Narrado"
                      description="Genera una narración tipo podcast del contenido"
                      items={(media as any[]).filter((m: any) => m.title === 'Audio Narrado')}
                      isGenerating={!!generatingMedia.audio}
                      onGenerate={handleGenerateAudio}
                      onDelete={handleDeleteMedia}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Duración:</span>
                        <Select value={audioDuration} onValueChange={setAudioDuration}>
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short">Corto (~1 min)</SelectItem>
                            <SelectItem value="medium">Medio (~3 min)</SelectItem>
                            <SelectItem value="long">Largo (~5 min)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </MediaTypeCard>
                  </div>

                  <Card className="border">
                    <CardContent className="pt-5 pb-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-background ">
                          <Video className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">Storyboard</span>
                            {(media as any[]).filter((m: any) => m.type === 'video').length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {(media as any[]).filter((m: any) => m.type === 'video').length} generado(s)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Genera un guion narrado + secuencia de imágenes estilizadas con IA</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Estilo visual:</span>
                          <Select value={videoStyle} onValueChange={setVideoStyle}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="clasico">🎨 Clásico</SelectItem>
                              <SelectItem value="pizarra">📝 Pizarra</SelectItem>
                              <SelectItem value="kawaii">🌸 Kawaii</SelectItem>
                              <SelectItem value="anime">⚡ Anime</SelectItem>
                              <SelectItem value="acuarela">💧 Acuarela</SelectItem>
                              <SelectItem value="retro">📻 Dibujo Retro</SelectItem>
                              <SelectItem value="legado">📜 Legado</SelectItem>
                              <SelectItem value="papiroflexia">🦢 Papiroflexia</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Escenas:</span>
                          <Select value={videoDuration} onValueChange={setVideoDuration}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="short">Corto (3 escenas)</SelectItem>
                              <SelectItem value="medium">Medio (4 escenas)</SelectItem>
                              <SelectItem value="long">Largo (6 escenas)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {(media as any[]).filter((m: any) => m.type === 'video').length > 0 && (
                        <div className="space-y-1.5">
                          {(media as any[]).filter((m: any) => m.type === 'video').map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {format(parseISO(item.created_at), 'dd/M/yyyy')}
                                </span>
                                <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                              <button onClick={() => handleDeleteMedia(item.id)} className="text-destructive hover:text-destructive/80 p-1">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={!editId || generatingMedia['video']}
                        onClick={async () => {
                          if (!editId || !content) return;
                          setGeneratingMedia(prev => ({ ...prev, video: true }));
                          try {
                            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                            const session = (await supabase.auth.getSession()).data.session;
                            const response = await fetch(`${supabaseUrl}/functions/v1/generate-training-video`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session?.access_token}`,
                                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                              },
                              body: JSON.stringify({
                                courseId: editId,
                                style: videoStyle,
                                duration: videoDuration,
                                title,
                                content: content.contenido?.substring(0, 2000),
                                puntosClave: content.puntosClave,
                                companyId: currentCompanyId,
                              }),
                              signal: AbortSignal.timeout(300000), // 5 min timeout
                            });
                            if (!response.ok) {
                              const errData = await response.json().catch(() => ({}));
                              throw new Error(errData.error || `Error ${response.status}`);
                            }
                            const data = await response.json();
                            
            setVideoScript(data?.script);
                            setVideoImages(data?.imageUrls || []);
                            toast.success(`Storyboard generado: ${data?.sceneCount} escenas con estilo ${data?.style}`);
                          } catch (err: any) {
                            toast.error(err?.message || 'Error al generar video');
                          } finally {
                            setGeneratingMedia(prev => ({ ...prev, video: false }));
                          }
                        }}
                      >
                        {generatingMedia['video'] ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando escenas...</>
                        ) : (
                          <><Plus className="h-4 w-4 mr-2" /> {(media as any[]).filter((m: any) => m.type === 'video').length > 0 ? 'Generar otro' : 'Generar Storyboard'}</>
                        )}
                      </Button>
                      {!editId && <p className="text-xs text-destructive">Guarde como borrador primero para habilitar la generación</p>}
                      {videoScript && (
                        <div className="mt-3 border-t pt-3">
                          <StoryboardViewer
                            scenes={videoScript.scenes || []}
                            imageUrls={videoImages}
                            audioUrl={(() => {
                              const audioItems = (media as any[]).filter((m: any) => m.type === 'audio');
                              return storyboardAudioUrl || (audioItems.length > 0 ? audioItems[audioItems.length - 1].file_url : null);
                            })()}
                            allowRegenerate
                            courseId={editId || undefined}
                            courseTitle={title}
                            companyId={currentCompanyId}
                            style={videoStyle}
                            contentText={content?.contenido}
                            puntosClave={content?.puntosClave}
                            onSceneRegenerated={(idx, newUrl, newScene) => {
                              setVideoImages(prev => {
                                const copy = [...prev];
                                copy[idx] = newUrl;
                                return copy;
                              });
                              setVideoScript((prev: any) => {
                                if (!prev?.scenes) return prev;
                                const scenes = [...prev.scenes];
                                scenes[idx] = newScene;
                                return { ...prev, scenes };
                              });
                            }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subir Videos Manuales */}
          {editId && (
            <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden mt-6">
              <div className="h-2 bg-gradient-to-r from-blue-500/40 to-blue-500/10 w-full" />
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 shadow-inner">
                    <Video className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Subir Videos</h3>
                    <p className="text-sm text-muted-foreground font-medium mt-1">Sube videos complementarios para esta capacitación</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-dashed border-border/50 bg-background">
                    <VideoUploader 
                      courseId={editId} 
                      onUploaded={async (url, fn, fs) => { 
                        await createMedia.mutateAsync({ courseId: editId, type: 'video', title: fn, fileUrl: url, fileSize: fs }); 
                      }} 
                    />
                  </div>
                  <div className="flex items-center justify-center">
                    <p className="text-xs text-muted-foreground text-center px-4">
                      Los videos subidos aparecerán en la galería multimedia de la capacitación y estarán disponibles para los usuarios.
                    </p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <TrainingMediaGallery 
                    media={(media as any[]).filter(m => m.type === 'video')} 
                    onDelete={handleDeleteMedia} 
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Avatar Presentador */}
          {editId && (
            <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-fuchsia-500/40 to-fuchsia-500/10 w-full" />
              <CardContent className="p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/10 text-fuchsia-500 flex items-center justify-center shrink-0 shadow-inner">
                    <UserCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold">Avatar Presentador</h3>
                      {avatarVideoUrl && <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5">Video Generado</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium mt-1">Genera un video con un avatar IA que presenta la capacitación (requiere API key de HeyGen)</p>
                  </div>
                </div>

                {avatarVideoUrl || avatarVideoId ? (
                  <AvatarVideoPlayer
                    videoUrl={avatarVideoUrl}
                    videoId={avatarVideoId}
                    courseId={editId}
                    companyId={currentCompanyId || ''}
                    onVideoReady={(url) => setAvatarVideoUrl(url)}
                  />
                ) : null}

                {!avatarVideoUrl && !avatarVideoId && (
                  <>
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground">Avatar:</span>
                      <div className="flex gap-2">
                        <Select value={selectedAvatar} onValueChange={setSelectedAvatar}>
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue placeholder={loadingAvatars ? 'Cargando...' : 'Selecciona un avatar'} />
                          </SelectTrigger>
                          <SelectContent>
                            {avatars.map((a) => (
                              <SelectItem key={a.avatar_id} value={a.avatar_id}>
                                {a.avatar_name}
                              </SelectItem>
                            ))}
                            {avatars.length === 0 && (
                              <SelectItem value="default" disabled>
                                {loadingAvatars ? 'Cargando avatares...' : 'Carga avatares primero'}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingAvatars}
                          onClick={async () => {
                            setLoadingAvatars(true);
                            try {
                              const { data, error } = await supabase.functions.invoke('generate-training-avatar', {
                                body: { action: 'list_avatars', companyId: currentCompanyId },
                              });
                              if (error) throw error;
                              setAvatars(data?.avatars || []);
                              if (data?.avatars?.length > 0) {
                                setSelectedAvatar(data.avatars[0].avatar_id);
                              }
                              toast.success(`${data?.avatars?.length || 0} avatares disponibles`);
                            } catch (err: any) {
                              toast.error(err?.message || 'Error al cargar avatares');
                            } finally {
                              setLoadingAvatars(false);
                            }
                          }}
                        >
                          {loadingAvatars ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cargar'}
                        </Button>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={generatingAvatar || !content}
                      onClick={async () => {
                        if (!content) return;
                        setGeneratingAvatar(true);
                        try {
                          // Build script from content
                          const script = [
                            content.introduccion,
                            ...(content.puntosClave || []),
                          ].filter(Boolean).join('. ');

                          const { data, error } = await supabase.functions.invoke('generate-training-avatar', {
                            body: {
                              action: 'generate',
                              companyId: currentCompanyId,
                              courseId: editId,
                              script: script.substring(0, 3000),
                              avatarId: selectedAvatar || undefined,
                            },
                          });
                          if (error) throw error;
                          if (data?.videoId) {
                            setAvatarVideoId(data.videoId);
                            toast.success('Video de avatar en generación. Esto puede tomar de 2 a 10 minutos.');
                          }
                        } catch (err: any) {
                          toast.error(err?.message || 'Error al generar video con avatar');
                        } finally {
                          setGeneratingAvatar(false);
                        }
                      }}
                    >
                      {generatingAvatar ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Iniciando generación...</>
                      ) : (
                        <><Video className="h-4 w-4 mr-2" /> Generar Video con Avatar</>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4">
            <Button variant="outline" onClick={() => setStep(0)} className="h-12 px-6 rounded-2xl font-bold uppercase tracking-widest text-xs w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" /> Editar Parámetros
            </Button>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={() => handleSave('borrador')} disabled={createCourse.isPending || updateCourse.isPending} className="h-12 px-6 rounded-2xl font-bold uppercase tracking-widest text-xs w-full sm:w-auto">
                <FileText className="h-4 w-4 mr-2" /> Guardar Borrador
              </Button>
              <Button onClick={() => handleSave('publicado')} disabled={createCourse.isPending || updateCourse.isPending} className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-green-500/20 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto transition-all">
                Publicar Capacitación
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
