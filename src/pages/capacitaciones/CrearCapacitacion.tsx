import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Upload, FileText, X, Target, Scale, Tag, LayoutGrid, Users, BarChart3, Clock, Monitor, ShieldAlert, CalendarCheck, BookOpen, Globe, CircleDot, AlignLeft, Trash2, ImageIcon, Network, LayoutPanelTop, Mic, Video, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrainingStepIndicator, MarkdownContent, ImageUploader, TrainingMediaGallery } from '@/components/training';
import { useCreateFullCourse, useUpdateFullCourse, useTrainingCourse, useTrainingMedia, useCreateTrainingMedia, useDeleteTrainingMedia } from '@/hooks/useTraining';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { TrainingCourseContent, TrainingQuizQuestion } from '@/types/training';

const STEPS = [
  { label: 'Parámetros' },
  { label: 'Contexto + IA' },
  { label: 'Revisión' },
];

const TIPOS = ['Charla 5 min', 'Calidad', 'HSEQ', 'Reinducción', 'Refuerzo', 'Emergencias', 'Auditoría', 'Otro'];
const AREAS = ['Producción', 'Calidad', 'Seguridad', 'HSEQ', 'Administrativo', 'Logística', 'Mantenimiento', 'Otro'];
const PUBLICOS = ['Operarios', 'Supervisores', 'Administrativos', 'Nuevos ingresos', 'Todo el personal', 'Otro'];
const NIVELES = ['Básico', 'Intermedio', 'Avanzado'];
const OBJETIVOS = ['Sensibilización', 'Cumplimiento', 'Corrección de hallazgo', 'Formación inicial', 'Actualización', 'Otro'];
const MARCOS_LEGALES = ['ISO 9001', 'ISO 14000', 'ISO 22000', 'ISO 45001', 'BPM', 'HACCP', 'Interno', 'Otro'];

export default function CrearCapacitacion() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const { currentCompanyId } = useAuth();

  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfText, setPdfText] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [generatingMedia, setGeneratingMedia] = useState<Record<string, boolean>>({});
  const [generatedMedia, setGeneratedMedia] = useState<Record<string, string>>({});
  const [audioDuration, setAudioDuration] = useState('medium');
  const [videoDuration, setVideoDuration] = useState('5');

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
      setArea(existingCourse.audience || '');
      setNivel(existingCourse.level || 'Básico');
      setObjetivo(existingCourse.objective || '');
      setMarcoLegal(existingCourse.legal_framework || '');
      setRiesgo(existingCourse.risk_level || 'medio');
      setDuracion(existingCourse.duration_hours);
      setModalidad(existingCourse.modality);
      setIdioma(existingCourse.language || 'es');
      setVigencia(existingCourse.validity_months || undefined);
      setObligatorio(existingCourse.is_mandatory);
      setCertificacion(existingCourse.requires_certification);
      if (existingCourse.content) {
        setContent(existingCourse.content as TrainingCourseContent);
      }
    }
  }, [existingCourse]);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtractingPdf(true);
    setPdfName(file.name);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: formData,
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
        level: nivel.toLowerCase(),
        audience: publico === 'Otro' ? publicoOtro : publico,
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
    } catch {
      toast.error('Error al guardar');
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
        },
      });
      if (error) throw error;
      if (data?.imageUrl) {
        setGeneratedMedia(prev => ({ ...prev, [type]: data.imageUrl }));
        await createMedia.mutateAsync({
          courseId: editId,
          type: type === 'mapa_mental' ? 'imagen' : type === 'infografia' ? 'infografia' : 'imagen',
          title: type === 'imagen' ? 'Imagen Explicativa' : type === 'mapa_mental' ? 'Mapa Mental' : 'Infografía',
          fileUrl: data.imageUrl,
          fileSize: 0,
        });
        toast.success(`${type === 'imagen' ? 'Imagen' : type === 'mapa_mental' ? 'Mapa mental' : 'Infografía'} generada exitosamente`);
      }
    } catch (err: any) {
      toast.error(err?.message || `Error al generar ${type}`);
    } finally {
      setGeneratingMedia(prev => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/capacitaciones')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{editId ? 'Editar' : 'Crear'} Capacitación con IA</h1>
          <p className="text-muted-foreground">Genera contenido estructurado automáticamente</p>
        </div>
      </div>

      <TrainingStepIndicator steps={STEPS} currentStep={step} />

      {/* Step 1: Parameters */}
      {step === 0 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>Parámetros de la Capacitación</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Define las características principales</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Tag className="h-4 w-4" /> Título de la Capacitación *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Manipulación segura de alimentos en cocina industrial" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><LayoutGrid className="h-4 w-4" /> Tipo de Capacitación *</Label>
                  <Select value={tipo} onValueChange={setTipo}><SelectTrigger><SelectValue placeholder="Selecciona el tipo" /></SelectTrigger><SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                  {tipo === 'Otro' && <Input className="mt-2" placeholder="Especifique" value={tipoOtro} onChange={e => setTipoOtro(e.target.value)} />}
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><BarChart3 className="h-4 w-4" /> Área *</Label>
                  <Select value={area} onValueChange={setArea}><SelectTrigger><SelectValue placeholder="Selecciona el área" /></SelectTrigger><SelectContent>{AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
                  {area === 'Otro' && <Input className="mt-2" placeholder="Especifique" value={areaOtra} onChange={e => setAreaOtra(e.target.value)} />}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Público Objetivo *</Label>
                  <Select value={publico} onValueChange={setPublico}><SelectTrigger><SelectValue placeholder="Selecciona el público" /></SelectTrigger><SelectContent>{PUBLICOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                  {publico === 'Otro' && <Input className="mt-2" placeholder="Especifique" value={publicoOtro} onChange={e => setPublicoOtro(e.target.value)} />}
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
                  <Select value={marcoLegal} onValueChange={setMarcoLegal}><SelectTrigger><SelectValue placeholder="Selecciona la norma" /></SelectTrigger><SelectContent>{MARCOS_LEGALES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
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
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><AlignLeft className="h-4 w-4" /> Descripción o Contexto Adicional</Label>
                <Textarea value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} placeholder="Proporciona información adicional que ayude a la IA a generar contenido más preciso..." rows={4} />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(1)} disabled={!title}><ArrowRight className="h-4 w-4 mr-2" /> Siguiente</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 2: Context + AI */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Documentos de Contexto</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Sube PDFs que la IA usará como referencia</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center bg-muted/30">
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
              <div className="space-y-1.5">
                <Label>Contenido adicional para la IA</Label>
                <Textarea value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} placeholder="Puedes pegar aquí texto adicional de procedimientos, normativas, o información que la IA deba considerar..." rows={5} />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4 mr-2" /> Anterior</Button>
                <Button onClick={handleGenerate} disabled={isGenerating} className="bg-primary hover:bg-primary/90">
                  {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generar Capacitación</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 3: Review */}
      {step === 2 && content && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Contenido Generado</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Revisa y edita el contenido antes de publicar</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
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
                                : 'bg-muted text-muted-foreground'
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
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-semibold text-sm">{tipo === 'Otro' ? tipoOtro : tipo || '-'}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Área</p>
                  <p className="font-semibold text-sm">{area === 'Otro' ? areaOtra : area || '-'}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Norma</p>
                  <p className="font-semibold text-sm">{marcoLegal === 'Otro' ? marcoLegalOtro : marcoLegal || '-'}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Duración</p>
                  <p className="font-semibold text-sm">{duracion >= 60 ? `${duracion / 60} hora${duracion > 60 ? 's' : ''}` : `${duracion} minutos`}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Multimedia generation section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Generación Multimedia</p>
                  <p className="text-sm text-muted-foreground">Genera materiales visuales adicionales con IA (opcional)</p>
                </div>
              </div>

              {!editId ? (
                <p className="text-sm text-muted-foreground text-center py-4">Guarda la capacitación como borrador primero para habilitar la generación multimedia.</p>
              ) : (
                <div className="space-y-4">
                  {/* Row 1: Imagen + Mapa Mental */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border">
                      <CardContent className="pt-5 pb-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold text-sm">Imagen Explicativa</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Genera una imagen visual que represente el tema de la capacitación</p>
                        {generatedMedia.imagen && (
                          <img src={generatedMedia.imagen} alt="Imagen generada" className="rounded-md w-full max-h-40 object-cover" />
                        )}
                        <Button
                          className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-primary-foreground"
                          onClick={() => handleGenerateMedia('imagen')}
                          disabled={generatingMedia.imagen}
                        >
                          {generatingMedia.imagen ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</> : <><Plus className="h-4 w-4 mr-2" /> Generar</>}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border">
                      <CardContent className="pt-5 pb-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Network className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold text-sm">Mapa Mental</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Crea un mapa mental con los conceptos clave organizados visualmente</p>
                        {generatedMedia.mapa_mental && (
                          <img src={generatedMedia.mapa_mental} alt="Mapa mental generado" className="rounded-md w-full max-h-40 object-cover" />
                        )}
                        <Button
                          className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-primary-foreground"
                          onClick={() => handleGenerateMedia('mapa_mental')}
                          disabled={generatingMedia.mapa_mental}
                        >
                          {generatingMedia.mapa_mental ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</> : <><Plus className="h-4 w-4 mr-2" /> Generar</>}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Row 2: Infografía + Audio */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border">
                      <CardContent className="pt-5 pb-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <LayoutPanelTop className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold text-sm">Infografía</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Diseña una infografía profesional con los puntos principales</p>
                        {generatedMedia.infografia && (
                          <img src={generatedMedia.infografia} alt="Infografía generada" className="rounded-md w-full max-h-40 object-cover" />
                        )}
                        <Button
                          className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-primary-foreground"
                          onClick={() => handleGenerateMedia('infografia')}
                          disabled={generatingMedia.infografia}
                        >
                          {generatingMedia.infografia ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</> : <><Plus className="h-4 w-4 mr-2" /> Generar</>}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border">
                      <CardContent className="pt-5 pb-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Mic className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold text-sm">Audio Narrado</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Genera una narración tipo podcast del contenido (requiere API key de OpenAI)</p>
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
                        <Button className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-primary-foreground" disabled>
                          <Plus className="h-4 w-4 mr-2" /> Generar
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Row 3: Video */}
                  <Card className="border">
                    <CardContent className="pt-5 pb-4 space-y-2 max-w-[calc(50%-0.5rem)]">
                      <div className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-muted-foreground" />
                        <span className="font-semibold text-sm">Video Educativo</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Próximamente — generación de video en desarrollo</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Duración:</span>
                        <Select value={videoDuration} onValueChange={setVideoDuration}>
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 segundos</SelectItem>
                            <SelectItem value="10">10 segundos</SelectItem>
                            <SelectItem value="15">15 segundos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-primary-foreground opacity-60" disabled>
                        <Plus className="h-4 w-4 mr-2" /> Generar
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Existing media gallery */}
                  {media.length > 0 && (
                    <TrainingMediaGallery media={media as any} onDelete={handleDeleteMedia} />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Editar Parámetros
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSave('borrador')} disabled={createCourse.isPending || updateCourse.isPending}>
                <FileText className="h-4 w-4 mr-2" /> Guardar Borrador
              </Button>
              <Button onClick={() => handleSave('publicado')} disabled={createCourse.isPending || updateCourse.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                Publicar Capacitación
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
