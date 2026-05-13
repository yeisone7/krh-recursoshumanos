import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, PenLine, X, Loader2, Target, Scale, Tag, LayoutGrid, BarChart3, Users, Clock, Monitor, ShieldAlert, CalendarCheck, BookOpen, CircleDot, AlignLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrainingStepIndicator, MarkdownContent, ImageUploader, TrainingMediaGallery } from '@/components/training';
import { useCreateFullCourse, useUpdateFullCourse, useTrainingCourse, useTrainingMedia, useCreateTrainingMedia, useDeleteTrainingMedia } from '@/hooks/useTraining';
import { toast } from 'sonner';
import type { TrainingCourseContent } from '@/types/training';

const STEPS = [{ label: 'Parámetros' }, { label: 'Contenido' }, { label: 'Evaluación' }];
const TIPOS = ['Charla 5 min', 'Calidad', 'HSEQ', 'Reinducción', 'Refuerzo', 'Emergencias', 'Auditoría', 'Otro'];
const AREAS = ['Producción', 'Calidad', 'Seguridad', 'HSEQ', 'Administrativo', 'Logística', 'Mantenimiento', 'Otro'];
const PUBLICOS = ['Operarios', 'Supervisores', 'Administrativos', 'Nuevos ingresos', 'Todo el personal', 'Otro'];
const NIVELES = ['Básico', 'Intermedio', 'Avanzado'];
const OBJETIVOS = ['Sensibilización', 'Cumplimiento', 'Corrección de hallazgo', 'Formación inicial', 'Actualización', 'Otro'];
const MARCOS_LEGALES = ['ISO 9001', 'ISO 14000', 'ISO 22000', 'ISO 45001', 'BPM', 'HACCP', 'Interno', 'Otro'];

export default function CrearManual() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const [step, setStep] = useState(0);

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
  const [obligatorio, setObligatorio] = useState(false);
  const [certificacion, setCertificacion] = useState(false);
  const [vigencia, setVigencia] = useState<number | undefined>();

  const [descripcion, setDescripcion] = useState('');
  const [content, setContent] = useState<TrainingCourseContent>({ isManual: true, introduccion: '', objetivos: [''], contenido: '', puntosClave: [''], evaluacion: [] });

  const createCourse = useCreateFullCourse();
  const updateCourse = useUpdateFullCourse();
  const { data: existingCourse } = useTrainingCourse(editId || undefined);
  const { data: media = [] } = useTrainingMedia(editId || undefined);
  const createMedia = useCreateTrainingMedia();
  const deleteMedia = useDeleteTrainingMedia();

  const isSaving = createCourse.isPending || updateCourse.isPending;

  useEffect(() => {
    if (existingCourse) {
      setTitle(existingCourse.name);
      setTipo(existingCourse.category);
      setDescripcion(existingCourse.description || '');
      setNivel(existingCourse.level || 'Básico');
      setObjetivo(existingCourse.objective || '');
      setMarcoLegal(existingCourse.legal_framework || '');
      setRiesgo(existingCourse.risk_level || 'medio');
      setDuracion(existingCourse.duration_hours);
      setModalidad(existingCourse.modality);
      setObligatorio(existingCourse.is_mandatory);
      setCertificacion(existingCourse.requires_certification);
      setVigencia(existingCourse.validity_months || undefined);
      if (existingCourse.content) setContent({ isManual: true, ...(existingCourse.content as TrainingCourseContent) });
    }
  }, [existingCourse]);

  const handleSave = async (status: string) => {
    try {
      const courseData = {
        name: title, category: tipo === 'Otro' ? tipoOtro : tipo, modality: modalidad,
        durationHours: duracion, isMandatory: obligatorio, requiresCertification: certificacion,
        validityMonths: vigencia, level: nivel.toLowerCase(),
        audience: publico === 'Otro' ? publicoOtro : publico,
        objective: objetivo === 'Otro' ? objetivoOtro : objetivo,
        legalFramework: marcoLegal === 'Otro' ? marcoLegalOtro : marcoLegal,
        riskLevel: riesgo, content, status,
      };
      if (editId) {
        await updateCourse.mutateAsync({ id: editId, ...courseData });
        toast.success(status === 'publicado' ? 'Publicada' : 'Cambios guardados');
      } else {
        const result = await createCourse.mutateAsync(courseData);
        toast.success(status === 'publicado' ? 'Publicada' : 'Borrador guardado');
        navigate(`/capacitaciones/crear-manual?id=${result.id}`, { replace: true });
      }
    } catch { toast.error('Error al guardar'); }
  };

  const handleSaveChanges = () => handleSave(existingCourse?.status || 'borrador');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border border-border/50 rounded-[2rem] shadow-sm mb-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex items-center gap-5">
          <Button variant="ghost" size="icon" onClick={() => navigate('/capacitaciones')} className="h-12 w-12 rounded-full bg-background/50 backdrop-blur-sm border border-border/50 hover:bg-background/80 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 mb-1">
              {editId ? 'EDICIÓN MANUAL' : 'CREACIÓN MANUAL'}
            </Badge>
            <h1 className="text-3xl font-black tracking-tight text-foreground">{editId ? 'Editar' : 'Crear'} Capacitación Manual</h1>
            <p className="text-muted-foreground font-medium mt-1">Crea contenido y evaluaciones manualmente{existingCourse?.version ? ` · Versión ${existingCourse.version}` : ''}</p>
          </div>
        </div>
      </div>

      <div className="px-2 mb-8">
        <TrainingStepIndicator steps={STEPS} currentStep={step} />
      </div>

      {step === 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-primary/40 to-primary/10 w-full" />
            <CardHeader className="px-8 pt-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
                  <PenLine className="w-6 h-6" />
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
                <Textarea className="resize-none rounded-xl bg-muted/30" value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Proporciona información adicional que ayude a definir el contenido de la capacitación..." rows={4} />
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6 border-t border-border/50">
                {editId && <Button variant="outline" className="h-12 px-6 rounded-2xl font-bold uppercase tracking-widest text-xs" onClick={handleSaveChanges} disabled={!title || isSaving}>{isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Guardar cambios</Button>}
                <Button onClick={() => setStep(1)} disabled={!title} className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
                  Siguiente <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500/40 to-blue-500/10 w-full" />
            <CardHeader className="px-8 pt-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 shadow-inner">
                  <AlignLeft className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Contenido</CardTitle>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Escribe o copia el contenido de la capacitación</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
              <div className="space-y-1.5">
                <Label>Introducción</Label>
                <Textarea className="resize-none rounded-xl bg-muted/30" value={content.introduccion || ''} onChange={e => setContent({ ...content, introduccion: e.target.value })} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>Objetivos</Label>
                <div className="space-y-2">
                  {content.objetivos?.map((obj, i) => (
                    <div key={i} className="flex gap-2"><Input className="rounded-xl bg-muted/30" value={obj} onChange={e => { const n = [...(content.objetivos || [])]; n[i] = e.target.value; setContent({ ...content, objetivos: n }); }} /><Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:bg-destructive/10" onClick={() => setContent({ ...content, objetivos: content.objetivos?.filter((_, idx) => idx !== i) })}><X className="h-4 w-4" /></Button></div>
                  ))}
                  <Button variant="outline" size="sm" className="rounded-xl border-dashed" onClick={() => setContent({ ...content, objetivos: [...(content.objetivos || []), ''] })}>+ Agregar Objetivo</Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Secciones</Label>
                <Textarea value={content.contenido || ''} onChange={e => setContent({ ...content, contenido: e.target.value })} rows={12} className="font-mono text-sm resize-none rounded-xl bg-muted/30" />
                <p className="text-xs text-muted-foreground font-medium mt-1">Usa títulos Markdown como ## Sección para organizar el contenido.</p>
              </div>
              {content.contenido && <div className="space-y-1.5"><Label>Vista previa</Label><div className="border border-border/50 rounded-xl p-6 mt-1 bg-background shadow-inner"><MarkdownContent content={content.contenido} /></div></div>}
              <div className="space-y-1.5">
                <Label>Puntos Clave</Label>
                <div className="space-y-2">
                  {content.puntosClave?.map((p, i) => (
                    <div key={i} className="flex gap-2"><Input className="rounded-xl bg-muted/30" value={p} onChange={e => { const n = [...(content.puntosClave || [])]; n[i] = e.target.value; setContent({ ...content, puntosClave: n }); }} /><Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:bg-destructive/10" onClick={() => setContent({ ...content, puntosClave: content.puntosClave?.filter((_, idx) => idx !== i) })}><X className="h-4 w-4" /></Button></div>
                  ))}
                  <Button variant="outline" size="sm" className="rounded-xl border-dashed" onClick={() => setContent({ ...content, puntosClave: [...(content.puntosClave || []), ''] })}>+ Agregar Punto Clave</Button>
                </div>
              </div>
              {editId && (
                <div className="pt-6 border-t border-border/50">
                  <Label className="text-base font-semibold">Multimedia</Label>
                  <p className="text-sm text-muted-foreground font-medium mb-4">Sube imágenes para complementar el contenido</p>
                  <div className="p-4 rounded-xl border border-dashed border-border/50 bg-muted/20"><ImageUploader courseId={editId} onUploaded={async (url, fn, fs) => { await createMedia.mutateAsync({ courseId: editId, type: 'imagen', title: fn, fileUrl: url, fileSize: fs }); }} /></div>
                  <div className="mt-4"><TrainingMediaGallery media={media as any} onDelete={async (id) => { await deleteMedia.mutateAsync({ id, courseId: editId }); }} /></div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/50">
                <Button variant="outline" onClick={() => setStep(0)} className="h-12 px-6 rounded-2xl font-bold uppercase tracking-widest text-xs w-full sm:w-auto">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
                </Button>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  {editId && <Button variant="outline" onClick={handleSaveChanges} disabled={!title || isSaving} className="h-12 px-6 rounded-2xl font-bold uppercase tracking-widest text-xs w-full sm:w-auto">{isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Guardar cambios</Button>}
                  <Button onClick={() => setStep(2)} className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all w-full sm:w-auto">
                    Siguiente <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-amber-500/40 to-amber-500/10 w-full" />
            <CardHeader className="px-8 pt-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 shadow-inner">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Evaluación</CardTitle>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Configura las preguntas para validar el conocimiento</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
              <div className="space-y-4">
                {content.evaluacion?.map((q, qi) => (
                  <Card key={qi} className="p-6 rounded-2xl border-border/50 bg-muted/20">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-background border flex items-center justify-center font-bold text-sm shrink-0">
                          {qi + 1}
                        </div>
                        <Input className="rounded-xl bg-background" placeholder="Escribe la pregunta aquí..." value={q.pregunta} onChange={e => { const ne = [...(content.evaluacion || [])]; ne[qi] = { ...ne[qi], pregunta: e.target.value }; setContent({ ...content, evaluacion: ne }); }} />
                        <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:bg-destructive/10" onClick={() => setContent({ ...content, evaluacion: content.evaluacion?.filter((_, idx) => idx !== qi) })}><X className="h-4 w-4" /></Button>
                      </div>
                      <div className="pl-11 space-y-2">
                        {q.opciones.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-3">
                            <span className={`text-xs font-bold w-5 text-center ${oi === 0 ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 p-1 rounded' : 'text-muted-foreground'}`}>{String.fromCharCode(65 + oi)}</span>
                            <Input value={opt} placeholder={`Opción ${String.fromCharCode(65 + oi)}`} onChange={e => {
                              const ne = [...(content.evaluacion || [])]; const no = [...ne[qi].opciones]; no[oi] = e.target.value;
                              ne[qi] = { ...ne[qi], opciones: no }; if (oi === 0) ne[qi].respuestaCorrecta = e.target.value;
                              setContent({ ...content, evaluacion: ne });
                            }} className={`rounded-xl bg-background ${oi === 0 ? 'border-green-300 dark:border-green-800' : ''}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="flex items-center justify-between border border-dashed border-border/50 p-4 rounded-2xl bg-muted/10">
                <p className="text-xs text-muted-foreground font-medium ml-2"><span className="text-green-600 font-bold dark:text-green-400">Nota:</span> La opción A siempre es la respuesta correcta. El sistema la mezclará aleatoriamente para los usuarios.</p>
                <Button variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => setContent({ ...content, evaluacion: [...(content.evaluacion || []), { pregunta: '', respuestaCorrecta: '', opciones: ['', '', '', ''] }] })}>+ Agregar Pregunta</Button>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/50">
                <Button variant="outline" onClick={() => setStep(1)} className="h-12 px-6 rounded-2xl font-bold uppercase tracking-widest text-xs w-full sm:w-auto">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
                </Button>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button variant="outline" onClick={() => handleSave('borrador')} disabled={createCourse.isPending || updateCourse.isPending} className="h-12 px-6 rounded-2xl font-bold uppercase tracking-widest text-xs w-full sm:w-auto">
                    Guardar Borrador
                  </Button>
                  <Button onClick={() => handleSave('publicado')} disabled={createCourse.isPending || updateCourse.isPending} className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-green-500/20 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto transition-all">
                    Publicar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
