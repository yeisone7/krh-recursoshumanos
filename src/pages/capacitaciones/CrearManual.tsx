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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/capacitaciones')}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><PenLine className="h-6 w-6" /> {editId ? 'Editar' : 'Crear'} Capacitación Manual</h1>
          <p className="text-muted-foreground">Crea contenido y evaluaciones manualmente{existingCourse?.version ? ` · Versión ${existingCourse.version}` : ''}</p>
        </div>
      </div>

      <TrainingStepIndicator steps={STEPS} currentStep={step} />

      {step === 0 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <PenLine className="h-6 w-6 text-primary" />
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
                <Textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Proporciona información adicional que ayude a definir el contenido de la capacitación..." rows={4} />
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                {editId && <Button variant="outline" onClick={handleSaveChanges} disabled={!title || isSaving}>{isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Guardar cambios</Button>}
                <Button onClick={() => setStep(1)} disabled={!title}>Siguiente <ArrowRight className="h-4 w-4 ml-2" /></Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Card>
            <CardHeader><CardTitle>Contenido</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Introducción</Label><Textarea value={content.introduccion || ''} onChange={e => setContent({ ...content, introduccion: e.target.value })} rows={3} /></div>
              <div>
                <Label>Objetivos</Label>
                {content.objetivos?.map((obj, i) => (
                  <div key={i} className="flex gap-2 mt-1"><Input value={obj} onChange={e => { const n = [...(content.objetivos || [])]; n[i] = e.target.value; setContent({ ...content, objetivos: n }); }} /><Button variant="ghost" size="icon" onClick={() => setContent({ ...content, objetivos: content.objetivos?.filter((_, idx) => idx !== i) })}><X className="h-4 w-4" /></Button></div>
                ))}
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setContent({ ...content, objetivos: [...(content.objetivos || []), ''] })}>+ Agregar</Button>
              </div>
              <div>
                <Label>Secciones</Label>
                <Textarea value={content.contenido || ''} onChange={e => setContent({ ...content, contenido: e.target.value })} rows={12} className="font-mono text-sm" />
                <p className="text-xs text-muted-foreground mt-1">Usa títulos Markdown como ## Sección para organizar el contenido.</p>
              </div>
              {content.contenido && <div><Label>Vista previa</Label><div className="border rounded-lg p-4 mt-1"><MarkdownContent content={content.contenido} /></div></div>}
              <div>
                <Label>Puntos Clave</Label>
                {content.puntosClave?.map((p, i) => (
                  <div key={i} className="flex gap-2 mt-1"><Input value={p} onChange={e => { const n = [...(content.puntosClave || [])]; n[i] = e.target.value; setContent({ ...content, puntosClave: n }); }} /><Button variant="ghost" size="icon" onClick={() => setContent({ ...content, puntosClave: content.puntosClave?.filter((_, idx) => idx !== i) })}><X className="h-4 w-4" /></Button></div>
                ))}
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setContent({ ...content, puntosClave: [...(content.puntosClave || []), ''] })}>+ Agregar</Button>
              </div>
              {editId && (
                <div className="pt-4 border-t">
                  <Label>Multimedia</Label>
                  <div className="mt-2"><ImageUploader courseId={editId} onUploaded={async (url, fn, fs) => { await createMedia.mutateAsync({ courseId: editId, type: 'imagen', title: fn, fileUrl: url, fileSize: fs }); }} /></div>
                  <div className="mt-3"><TrainingMediaGallery media={media as any} onDelete={async (id) => { await deleteMedia.mutateAsync({ id, courseId: editId }); }} /></div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4 mr-2" /> Anterior</Button>
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  {editId && <Button variant="outline" onClick={handleSaveChanges} disabled={!title || isSaving}>{isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Guardar cambios</Button>}
                  <Button onClick={() => setStep(2)}>Siguiente <ArrowRight className="h-4 w-4 ml-2" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Card>
            <CardHeader><CardTitle>Evaluación</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {content.evaluacion?.map((q, qi) => (
                <Card key={qi} className="p-4">
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
                          const ne = [...(content.evaluacion || [])]; const no = [...ne[qi].opciones]; no[oi] = e.target.value;
                          ne[qi] = { ...ne[qi], opciones: no }; if (oi === 0) ne[qi].respuestaCorrecta = e.target.value;
                          setContent({ ...content, evaluacion: ne });
                        }} className={oi === 0 ? 'border-green-300' : ''} />
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
              <Button variant="outline" onClick={() => setContent({ ...content, evaluacion: [...(content.evaluacion || []), { pregunta: '', respuestaCorrecta: '', opciones: ['', '', '', ''] }] })}>+ Agregar Pregunta</Button>
              <p className="text-xs text-muted-foreground">La opción A siempre es la respuesta correcta.</p>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-2" /> Anterior</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleSave('borrador')} disabled={createCourse.isPending || updateCourse.isPending}>Guardar Borrador</Button>
                  <Button onClick={() => handleSave('publicado')} disabled={createCourse.isPending || updateCourse.isPending}>Publicar</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
