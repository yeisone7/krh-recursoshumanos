import React, { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BookOpen, Clock, Users, Shield, Globe, Target, Scale, Send,
  GraduationCap, Sparkles, ChevronRight, CircleHelp, Image as ImageIcon,
  Lightbulb, FileText, CheckCircle2, Calendar, Network, LayoutPanelTop,
  Mic, Video, ExternalLink, Trash2, AlertCircle, Loader2,
} from 'lucide-react';
import { MarkdownContent } from './MarkdownContent';
import { MediaTypeCard } from './MediaTypeCard';
import { StoryboardViewer } from './StoryboardViewer';
import { useTrainingMedia, useCreateTrainingMedia, useDeleteTrainingMedia, usePublishCourse } from '@/hooks/useTraining';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { supabase } from '@/integrations/supabase/client';
import { applyWatermark } from '@/lib/watermark';
import type { WatermarkConfig } from '@/lib/watermark';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TrainingCourse, TrainingCourseContent, TrainingMedia } from '@/types/training';

interface TrainingPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: TrainingCourse | null;
  onPublish?: (courseId: string) => void;
  initialTab?: string;
}

const statusColors: Record<string, string> = {
  borrador: 'bg-amber-500 text-white',
  publicado: 'bg-green-600 text-white',
  completado: 'bg-blue-600 text-white',
};

const categoryLabels: Record<string, string> = {
  seguridad: 'Seguridad',
  operativa: 'Operativa',
  calidad: 'Calidad',
  ambiental: 'Ambiental',
  liderazgo: 'Liderazgo',
  tecnica: 'Técnica',
  induccion: 'Inducción',
  cumplimiento: 'Cumplimiento',
  otra: 'Otra',
};

const riskIcons: Record<string, React.ReactNode> = {
  bajo: <Shield className="h-5 w-5 text-green-600" />,
  medio: <Shield className="h-5 w-5 text-amber-500" />,
  alto: <Shield className="h-5 w-5 text-red-500" />,
  critico: <Shield className="h-5 w-5 text-red-700" />,
};

/* Read-only media card for preview */
function MediaReadOnlyCard({ icon, title, description, items }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: TrainingMedia[];
}) {
  return (
    <Card className="border">
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{title}</span>
              {items.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {items.length} generado{items.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        {items.length > 0 && (
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(item.created_at), 'dd/M/yyyy')}
                  </span>
                  <button
                    onClick={() => {
                      if (item.file_url.startsWith('data:')) {
                        const w = window.open();
                        if (w) {
                          w.document.write(`<img src="${item.file_url}" style="max-width:100%;height:auto;" />`);
                          w.document.title = 'Vista previa';
                        }
                      } else {
                        window.open(item.file_url, '_blank');
                      }
                    }}
                    className="text-primary hover:text-primary/80 p-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground italic text-center py-2">Sin contenido generado</p>
        )}
      </CardContent>
    </Card>
  );
}

export function TrainingPreviewDialog({ open, onOpenChange, course, onPublish, initialTab = 'general' }: TrainingPreviewDialogProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [generatingMedia, setGeneratingMedia] = useState<Record<string, boolean>>({});
  const [uploadingMedia, setUploadingMedia] = useState<Record<string, boolean>>({});
  const [audioDuration, setAudioDuration] = useState('medium');
  const { currentCompanyId } = useAuth();
  const { data: systemConfig } = useSystemConfig();
  const publishCourse = usePublishCourse();
  const { data: media = [], isLoading: isMediaLoading, isError: isMediaError } = useTrainingMedia(course?.id);
  const createMedia = useCreateTrainingMedia();
  const deleteMedia = useDeleteTrainingMedia();

  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);

  if (!course) return null;

  const content = course.content as TrainingCourseContent | null;

  const handleGenerateMedia = async (type: string) => {
    if (!course.id || !content) return;
    setGeneratingMedia(prev => ({ ...prev, [type]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('generate-training-media', {
        body: {
          type,
          title: course.name,
          content: content.contenido?.substring(0, 2000),
          puntosClave: content.puntosClave,
          companyId: currentCompanyId,
          courseId: course.id,
          skipUpload: true,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      if (data?.imageUrl) {
        const wmConfig = systemConfig?.watermark_config as WatermarkConfig | undefined;
        const watermarkedBlob = await applyWatermark(data.imageUrl, wmConfig);
        const fileName = `${course.id}/${type}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('training-media')
          .upload(fileName, watermarkedBlob, { contentType: 'image/png', upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('training-media').getPublicUrl(fileName);
        const finalUrl = urlData.publicUrl;

        await createMedia.mutateAsync({
          courseId: course.id,
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
    if (!course.id || !content) return;
    setGeneratingMedia(prev => ({ ...prev, audio: true }));
    try {
      const { data, error } = await supabase.functions.invoke('generate-training-audio', {
        body: {
          title: course.name,
          content: content.contenido?.substring(0, 2000),
          puntosClave: content.puntosClave,
          duration: audioDuration,
          companyId: currentCompanyId,
          courseId: course.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.audioUrl) {
        await createMedia.mutateAsync({
          courseId: course.id,
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

  const handleDeleteMedia = async (id: string) => {
    await deleteMedia.mutateAsync({ id, courseId: course.id });
  };

  const handleUploadMedia = async (kind: 'imagen' | 'mapa_mental' | 'infografia' | 'audio' | 'video', file: File) => {
    const rules = {
      imagen: { type: 'imagen', title: 'Imagen Explicativa', accept: 'image/', max: 10 * 1024 * 1024, label: 'imagen' },
      mapa_mental: { type: 'imagen', title: 'Mapa Mental', accept: 'image/', max: 10 * 1024 * 1024, label: 'mapa mental' },
      infografia: { type: 'infografia', title: 'Infografía', accept: 'image/', max: 10 * 1024 * 1024, label: 'infografía' },
      audio: { type: 'audio', title: 'Audio Narrado', accept: 'audio/', max: 50 * 1024 * 1024, label: 'audio' },
      video: { type: 'video', title: 'Storyboard', accept: 'video/', max: 200 * 1024 * 1024, label: 'video' },
    }[kind];

    if (!file.type.startsWith(rules.accept)) {
      toast.error(`El archivo seleccionado no corresponde a ${rules.label}.`);
      return;
    }
    if (file.size > rules.max) {
      toast.error(`El archivo supera el tamaño máximo permitido para ${rules.label}.`);
      return;
    }

    setUploadingMedia(prev => ({ ...prev, [kind]: true }));
    try {
      const extension = file.name.split('.').pop() || 'bin';
      const fileName = `${course.id}/${kind}_${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('training-media')
        .upload(fileName, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('training-media').getPublicUrl(fileName);
      await createMedia.mutateAsync({
        courseId: course.id,
        type: rules.type,
        title: rules.title,
        description: file.name,
        fileUrl: urlData.publicUrl,
        fileSize: file.size,
      });
      toast.success(`${rules.label.charAt(0).toUpperCase() + rules.label.slice(1)} subido exitosamente`);
    } catch (err: any) {
      toast.error(err?.message || `Error al subir ${rules.label}`);
    } finally {
      setUploadingMedia(prev => ({ ...prev, [kind]: false }));
    }
  };

  const durationLabel = course.duration_hours < 1
    ? `${Math.round(course.duration_hours * 60)} minutos`
    : `${course.duration_hours} hora${course.duration_hours > 1 ? 's' : ''}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl flex-col gap-0 overflow-hidden bg-background border-border/50 shadow-2xl rounded-[2rem] p-0 sm:h-auto sm:max-h-[95vh]">
        {/* Premium Gradient Header */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border-b border-border/50">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5">
                    {categoryLabels[course.category] || course.category} {durationLabel}
                  </Badge>
                  <Badge className={`font-black uppercase tracking-widest text-[9px] px-2 py-0.5 ${statusColors[course.status] || 'bg-muted text-muted-foreground'}`}>
                    {course.status === 'borrador' ? 'Borrador' : course.status === 'publicado' ? 'Publicado' : 'Completado'}
                  </Badge>
                  {content && !content.isManual && (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5">
                      <Sparkles className="h-3 w-3" /> IA
                    </Badge>
                  )}
                  {content?.isManual && (
                    <Badge variant="outline" className="font-bold uppercase tracking-widest text-[9px] px-2 py-0.5">Manual</Badge>
                  )}
                </div>
                <DialogHeader>
                  <h2 className="text-2xl font-black tracking-tight text-foreground line-clamp-2">{course.name}</h2>
                </DialogHeader>
                <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-muted-foreground flex-wrap mt-2">
                  {course.audience && (
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {course.audience}</span>
                  )}
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {durationLabel}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> v{course.version}</span>
                </div>
              </div>
            </div>

            {course.status === 'borrador' && onPublish && (
              <Button
                onClick={() => onPublish(course.id)}
                className="gap-2 w-full sm:w-auto h-10 px-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md"
                size="sm"
              >
                <Send className="h-4 w-4" /> Publicar Capacitación
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="scrollbar-header-auto max-w-full shrink-0 touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain border-b border-border/50 px-8 py-3 bg-muted/10">
            <TabsList className="h-auto w-fit justify-start gap-2 rounded-[1.5rem] bg-muted/30 p-1.5 flex flex-nowrap">
              {[
                { value: 'general', icon: BookOpen, label: 'General' },
                { value: 'contenido', icon: FileText, label: 'Contenido' },
                { value: 'claves', icon: Lightbulb, label: 'Claves' },
                { value: 'evaluacion', icon: CircleHelp, label: 'Evaluación' },
                { value: 'media', icon: ImageIcon, label: 'Media' },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-2xl px-5 py-2 font-bold uppercase tracking-widest text-[10px] whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                >
                  <tab.icon className="h-3.5 w-3.5 mr-2" />
                  {tab.label}
                  {tab.value === 'media' && media.length > 0 && (
                    <Badge className="ml-2 h-5 min-w-[20px] px-1.5 text-[9px] bg-primary text-primary-foreground font-black">
                      {media.length}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="min-h-0 flex-1 overflow-y-auto sm:max-h-[60vh]">
            <div className="p-8">
              {/* General Tab */}
              <TabsContent value="general" className="mt-0 space-y-6">
                {content?.introduccion && (
                  <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
                    <CardContent className="p-8 bg-muted/10">
                      <h3 className="font-black text-lg text-foreground tracking-tight mb-3 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" /> Introducción
                      </h3>
                      <p className="text-sm font-medium leading-relaxed opacity-80">{content.introduccion}</p>
                    </CardContent>
                  </Card>
                )}

                {course.objective && !content?.introduccion && (
                  <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
                    <CardContent className="p-8 bg-muted/10">
                      <h3 className="font-black text-lg text-foreground tracking-tight mb-3 flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" /> Objetivo
                      </h3>
                      <p className="text-sm font-medium leading-relaxed opacity-80">{course.objective}</p>
                    </CardContent>
                  </Card>
                )}

                {content?.objetivos && content.objetivos.length > 0 && (
                  <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
                    <CardContent className="p-8">
                      <h3 className="font-black text-lg text-foreground tracking-tight mb-4 flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" /> Objetivos
                      </h3>
                      <ul className="space-y-3">
                        {content.objetivos.map((obj, i) => (
                          <li key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-muted/20 border border-border/50">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <ChevronRight className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-sm font-medium leading-relaxed text-foreground/80">{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card className="rounded-[2rem] border-border/50 shadow-sm">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nivel</span>
                      <span className="font-bold text-sm capitalize">{course.level}</span>
                    </CardContent>
                  </Card>
                  <Card className="rounded-[2rem] border-border/50 shadow-sm">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-background/50 flex items-center justify-center">
                        {riskIcons[course.risk_level] || <Shield className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Riesgo</span>
                      <span className="font-bold text-sm capitalize">{course.risk_level}</span>
                    </CardContent>
                  </Card>
                  <Card className="rounded-[2rem] border-border/50 shadow-sm">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Scale className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Marco Legal</span>
                      <span className="font-bold text-sm capitalize line-clamp-2">{course.legal_framework || 'Interno'}</span>
                    </CardContent>
                  </Card>
                  <Card className="rounded-[2rem] border-border/50 shadow-sm">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Globe className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Modalidad</span>
                      <span className="font-bold text-sm capitalize">{course.modality === 'mixto' ? 'híbrida' : course.modality}</span>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Contenido Tab */}
              <TabsContent value="contenido" className="mt-0">
                {content?.contenido ? (
                  <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
                    <CardContent className="p-8">
                      <h3 className="font-black text-lg text-foreground tracking-tight mb-6 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" /> Desarrollo del Contenido
                      </h3>
                      <MarkdownContent content={content.contenido} />
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-[2rem]">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-xs opacity-60">No hay contenido generado aún</p>
                  </div>
                )}
              </TabsContent>

              {/* Claves Tab */}
              <TabsContent value="claves" className="mt-0">
                {content?.puntosClave && content.puntosClave.length > 0 ? (
                  <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
                    <CardContent className="p-8">
                      <h3 className="font-black text-lg text-foreground tracking-tight mb-6 flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-amber-500" /> Puntos Clave
                      </h3>
                      <div className="space-y-4">
                        {content.puntosClave.map((punto, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-4 rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50/30 dark:from-amber-900/10 dark:to-orange-900/5 p-5 shadow-sm"
                          >
                            <span className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-xl w-10 h-10 flex items-center justify-center flex-shrink-0 text-sm font-black shadow-inner">
                              {i + 1}
                            </span>
                            <span className="text-sm font-medium leading-relaxed text-foreground/80 mt-1">{punto}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-[2rem]">
                    <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-xs opacity-60">No hay puntos clave definidos</p>
                  </div>
                )}
              </TabsContent>

              {/* Evaluación Tab */}
              <TabsContent value="evaluacion" className="mt-0">
                {content?.evaluacion && content.evaluacion.length > 0 ? (
                  <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
                    <CardContent className="p-8">
                      <div className="mb-6 flex flex-wrap items-center gap-3">
                        <h3 className="font-black text-lg text-foreground tracking-tight flex items-center gap-2">
                          <CircleHelp className="h-5 w-5 text-primary" /> Preguntas de Evaluación
                        </h3>
                        <Badge className="bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5">
                          {content.evaluacion.length} PREGUNTAS
                        </Badge>
                      </div>
                      <div className="space-y-4">
                        {content.evaluacion.map((q, i) => (
                          <div key={i} className="space-y-4 rounded-2xl border border-border/50 bg-muted/10 p-6">
                            <div className="flex items-start gap-4">
                              <span className="w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center font-black text-xs text-muted-foreground flex-shrink-0 shadow-sm">
                                P{i + 1}
                              </span>
                              <p className="text-sm font-bold leading-relaxed text-foreground mt-1.5">{q.pregunta}</p>
                            </div>
                            <div className="flex items-start gap-3 pl-12">
                              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Respuesta Correcta:</span>
                                <span className="text-sm font-medium text-muted-foreground">
                                  {q.opciones.findIndex(o => o === q.respuestaCorrecta) >= 0
                                    ? `${String.fromCharCode(65 + q.opciones.findIndex(o => o === q.respuestaCorrecta))}) ${q.respuestaCorrecta}`
                                    : q.respuestaCorrecta
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-[2rem]">
                    <CircleHelp className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-xs opacity-60">No hay evaluación definida</p>
                  </div>
                )}
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="mt-0 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Generación Multimedia</p>
                    <p className="text-sm text-muted-foreground">Genera materiales visuales adicionales con IA (opcional)</p>
                  </div>
                </div>
                <Separator />

                {isMediaLoading ? (
                  <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span>Cargando contenido multimedia...</span>
                  </div>
                ) : isMediaError ? (
                  <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center text-sm text-destructive">
                    <AlertCircle className="h-6 w-6" />
                    <span>No se pudo cargar el contenido multimedia.</span>
                  </div>
                ) : content ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <MediaTypeCard
                        icon={<ImageIcon className="h-5 w-5 text-muted-foreground" />}
                        title="Imagen Explicativa"
                        description="Genera una imagen visual que represente el tema de la capacitación"
                        items={media.filter(m => m.title === 'Imagen Explicativa')}
                        isGenerating={!!generatingMedia.imagen}
                        onGenerate={() => handleGenerateMedia('imagen')}
                        onDelete={handleDeleteMedia}
                        uploadAccept="image/*"
                        isUploading={!!uploadingMedia.imagen}
                        onUpload={(file) => handleUploadMedia('imagen', file)}
                      />
                      <MediaTypeCard
                        icon={<Network className="h-5 w-5 text-muted-foreground" />}
                        title="Mapa Mental"
                        description="Crea un mapa mental con los conceptos clave organizados visualmente"
                        items={media.filter(m => m.title === 'Mapa Mental')}
                        isGenerating={!!generatingMedia.mapa_mental}
                        onGenerate={() => handleGenerateMedia('mapa_mental')}
                        onDelete={handleDeleteMedia}
                        uploadAccept="image/*"
                        isUploading={!!uploadingMedia.mapa_mental}
                        onUpload={(file) => handleUploadMedia('mapa_mental', file)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <MediaTypeCard
                        icon={<LayoutPanelTop className="h-5 w-5 text-muted-foreground" />}
                        title="Infografía"
                        description="Diseña una infografía profesional con los puntos principales"
                        items={media.filter(m => m.title === 'Infografía')}
                        isGenerating={!!generatingMedia.infografia}
                        onGenerate={() => handleGenerateMedia('infografia')}
                        onDelete={handleDeleteMedia}
                        uploadAccept="image/*"
                        isUploading={!!uploadingMedia.infografia}
                        onUpload={(file) => handleUploadMedia('infografia', file)}
                      />
                      <MediaTypeCard
                        icon={<Mic className="h-5 w-5 text-muted-foreground" />}
                        title="Audio Narrado"
                        description="Genera una narración tipo podcast del contenido (requiere API key de OpenAI)"
                        items={media.filter(m => m.title === 'Audio Narrado')}
                        isGenerating={!!generatingMedia.audio}
                        onGenerate={handleGenerateAudio}
                        onDelete={handleDeleteMedia}
                        uploadAccept="audio/*"
                        isUploading={!!uploadingMedia.audio}
                        onUpload={(file) => handleUploadMedia('audio', file)}
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
                    <MediaTypeCard
                      icon={<Video className="h-5 w-5 text-muted-foreground" />}
                      title="Storyboard"
                      description="Genera un guion narrado + secuencia de imágenes estilizadas con IA"
                      items={media.filter(m => m.type === 'video')}
                      isGenerating={false}
                      onGenerate={() => {}}
                      onDelete={handleDeleteMedia}
                      uploadAccept="video/*"
                      isUploading={!!uploadingMedia.video}
                      onUpload={(file) => handleUploadMedia('video', file)}
                    />
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <MediaReadOnlyCard
                        icon={<ImageIcon className="h-5 w-5 text-muted-foreground" />}
                        title="Imagen Explicativa"
                        description="Genera una imagen visual que represente el tema de la capacitación"
                        items={media.filter(m => m.title === 'Imagen Explicativa')}
                      />
                      <MediaReadOnlyCard
                        icon={<Network className="h-5 w-5 text-muted-foreground" />}
                        title="Mapa Mental"
                        description="Crea un mapa mental con los conceptos clave organizados visualmente"
                        items={media.filter(m => m.title === 'Mapa Mental')}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <MediaReadOnlyCard
                        icon={<LayoutPanelTop className="h-5 w-5 text-muted-foreground" />}
                        title="Infografía"
                        description="Diseña una infografía profesional con los puntos principales"
                        items={media.filter(m => m.title === 'Infografía')}
                      />
                      <MediaReadOnlyCard
                        icon={<Mic className="h-5 w-5 text-muted-foreground" />}
                        title="Audio Narrado"
                        description="Genera una narración tipo podcast del contenido"
                        items={media.filter(m => m.title === 'Audio Narrado')}
                      />
                    </div>
                    <MediaReadOnlyCard
                      icon={<Video className="h-5 w-5 text-primary" />}
                      title="Storyboard"
                      description="Genera un guion narrado + secuencia de imágenes estilizadas con IA"
                      items={media.filter(m => m.type === 'video')}
                    />

                    {/* Avatar Videos */}
                    {(() => {
                      const avatarMedia = media.filter(m => (m.metadata as any)?.is_avatar === true);
                      if (avatarMedia.length === 0) return null;
                      return (
                        <Card className="border mt-4">
                          <CardContent className="pt-5 pb-4 space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-muted"><Video className="h-5 w-5 text-primary" /></div>
                              <div>
                                <span className="font-semibold text-sm">Avatar Presentador</span>
                                <p className="text-xs text-muted-foreground mt-0.5">Video generado con avatar IA de HeyGen</p>
                              </div>
                            </div>
                            {avatarMedia.map((item) => (
                              <div key={item.id} className="overflow-hidden rounded-lg border bg-muted">
                                <video controls className="aspect-video max-h-72 w-full object-contain" src={item.file_url} preload="metadata" />
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </>
                )}

                {/* Storyboard viewer from video media */}
                {(() => {
                  const videoMedia = media.filter(m => m.type === 'video');
                  if (videoMedia.length === 0) return null;
                  const scenes = videoMedia.map(m => ({
                    title: (m.title || '').replace(/^[^:]*:\s*/, '').replace(/^\(regen\):\s*/, ''),
                    narration: m.description || '',
                    visual_description: (m.metadata as any)?.visual_description || '',
                  }));
                  const imageUrls = videoMedia.map(m => m.file_url);
                  const audioItems = media.filter(m => m.type === 'audio');
                  const audioUrl = audioItems.length > 0 ? audioItems[audioItems.length - 1].file_url : null;
                  return (
                    <div className="mt-4 min-w-0 overflow-hidden">
                      <StoryboardViewer
                        scenes={scenes}
                        imageUrls={imageUrls}
                        audioUrl={audioUrl}
                      />
                    </div>
                  );
                })()}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <div className="shrink-0 border-t border-border/50 bg-muted/10 px-8 py-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
            {media.length > 0 && (
              <span className="flex items-center gap-2 bg-background border border-border/50 rounded-xl px-3 py-1.5 shadow-sm">
                <ImageIcon className="h-4 w-4" />
                <strong className="text-foreground font-black">{media.length}</strong> 
                <span className="font-bold uppercase tracking-widest text-[9px]">Media</span>
              </span>
            )}
            <span className="flex items-center gap-2 bg-background border border-border/50 rounded-xl px-3 py-1.5 shadow-sm">
              <Calendar className="h-4 w-4" />
              <span className="font-bold">{format(parseISO(course.created_at), "dd MMM yyyy", { locale: es })}</span>
              <span className="font-bold uppercase tracking-widest text-[9px] border-l pl-2 ml-1">Creación</span>
            </span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {course.status === 'borrador' && (
              <Button 
                onClick={() => {
                  publishCourse.mutate(course.id);
                  onOpenChange(false);
                }} 
                className="flex-1 sm:flex-none h-12 px-6 rounded-2xl gap-2 font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Send className="h-4 w-4" />
                Publicar
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none h-12 px-6 rounded-2xl font-bold tracking-widest text-xs uppercase bg-background">
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
