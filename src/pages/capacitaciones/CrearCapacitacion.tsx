import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Upload, FileText, X, Target, Scale, Tag, LayoutGrid, Users, BarChart3, Clock, Monitor, ShieldAlert, CalendarCheck, BookOpen, Globe, CircleDot, AlignLeft } from 'lucide-react';
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
            <CardHeader><CardTitle>Revisión del Contenido</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div><Label>Introducción</Label><Textarea value={content.introduccion || ''} onChange={e => setContent({ ...content, introduccion: e.target.value })} rows={3} /></div>
              <div>
                <Label>Objetivos</Label>
                {content.objetivos?.map((obj, i) => (
                  <div key={i} className="flex gap-2 mt-1">
                    <Input value={obj} onChange={e => { const newObj = [...(content.objetivos || [])]; newObj[i] = e.target.value; setContent({ ...content, objetivos: newObj }); }} />
                    <Button variant="ghost" size="icon" onClick={() => setContent({ ...content, objetivos: content.objetivos?.filter((_, idx) => idx !== i) })}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setContent({ ...content, objetivos: [...(content.objetivos || []), ''] })}>+ Agregar Objetivo</Button>
              </div>
              <div><Label>Contenido Principal (Markdown)</Label><Textarea value={content.contenido || ''} onChange={e => setContent({ ...content, contenido: e.target.value })} rows={12} className="font-mono text-sm" /></div>
              {content.contenido && (
                <div><Label>Vista previa</Label><div className="border rounded-lg p-4 mt-1"><MarkdownContent content={content.contenido} /></div></div>
              )}
              <div>
                <Label>Puntos Clave</Label>
                {content.puntosClave?.map((punto, i) => (
                  <div key={i} className="flex gap-2 mt-1">
                    <Input value={punto} onChange={e => { const np = [...(content.puntosClave || [])]; np[i] = e.target.value; setContent({ ...content, puntosClave: np }); }} />
                    <Button variant="ghost" size="icon" onClick={() => setContent({ ...content, puntosClave: content.puntosClave?.filter((_, idx) => idx !== i) })}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setContent({ ...content, puntosClave: [...(content.puntosClave || []), ''] })}>+ Agregar Punto</Button>
              </div>
              <div>
                <Label>Evaluación</Label>
                {content.evaluacion?.map((q, qi) => (
                  <Card key={qi} className="mt-3 p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">P{qi + 1}.</span>
                        <Input value={q.pregunta} onChange={e => { const ne = [...(content.evaluacion || [])]; ne[qi] = { ...ne[qi], pregunta: e.target.value }; setContent({ ...content, evaluacion: ne }); }} />
                        <Button variant="ghost" size="icon" onClick={() => setContent({ ...content, evaluacion: content.evaluacion?.filter((_, idx) => idx !== qi) })}><X className="h-4 w-4" /></Button>
                      </div>
                      {q.opciones.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2 ml-6">
                          <span className={`text-xs font-bold w-5 ${oi === 0 ? 'text-green-600' : ''}`}>{String.fromCharCode(65 + oi)})</span>
                          <Input value={opt} onChange={e => {
                            const ne = [...(content.evaluacion || [])];
                            const newOpts = [...ne[qi].opciones];
                            newOpts[oi] = e.target.value;
                            ne[qi] = { ...ne[qi], opciones: newOpts };
                            if (oi === 0) ne[qi].respuestaCorrecta = e.target.value;
                            setContent({ ...content, evaluacion: ne });
                          }} className={oi === 0 ? 'border-green-300' : ''} />
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setContent({
                  ...content,
                  evaluacion: [...(content.evaluacion || []), { pregunta: '', respuestaCorrecta: '', opciones: ['', '', '', ''] }],
                })}>+ Agregar Pregunta</Button>
              </div>
            </CardContent>
          </Card>

          {/* Multimedia (only when editing) */}
          {editId && (
            <Card>
              <CardHeader><CardTitle>Multimedia</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <ImageUploader courseId={editId} onUploaded={handleMediaUploaded} />
                <TrainingMediaGallery media={media as any} onDelete={handleDeleteMedia} />
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-2" /> Anterior</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSave('borrador')} disabled={createCourse.isPending || updateCourse.isPending}>Guardar Borrador</Button>
              <Button onClick={() => handleSave('publicado')} disabled={createCourse.isPending || updateCourse.isPending}>Publicar</Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
