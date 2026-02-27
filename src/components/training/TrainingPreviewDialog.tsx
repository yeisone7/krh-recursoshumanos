import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  BookOpen, Clock, Users, Shield, Globe, Target, Scale, Send,
  GraduationCap, Sparkles, ChevronRight, CircleHelp, Image as ImageIcon,
  Lightbulb, FileText, CheckCircle2, Calendar, Network, LayoutPanelTop,
  Mic, Video, ExternalLink, Trash2,
} from 'lucide-react';
import { MarkdownContent } from './MarkdownContent';
import { TrainingMediaGallery } from './TrainingMediaGallery';
import { useTrainingMedia } from '@/hooks/useTraining';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TrainingCourse, TrainingCourseContent, TrainingMedia } from '@/types/training';

interface TrainingPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: TrainingCourse | null;
  onPublish?: (courseId: string) => void;
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

export function TrainingPreviewDialog({ open, onOpenChange, course, onPublish }: TrainingPreviewDialogProps) {
  const [activeTab, setActiveTab] = useState('general');
  const { data: media = [] } = useTrainingMedia(course?.id);

  if (!course) return null;

  const content = course.content as TrainingCourseContent | null;
  const durationLabel = course.duration_hours < 1
    ? `${Math.round(course.duration_hours * 60)} minutos`
    : `${course.duration_hours} hora${course.duration_hours > 1 ? 's' : ''}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 space-y-3">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
              <GraduationCap className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-medium">
                  {categoryLabels[course.category] || course.category} {durationLabel}
                </Badge>
                <Badge className={statusColors[course.status] || 'bg-muted text-muted-foreground'}>
                  {course.status === 'borrador' ? 'Borrador' : course.status === 'publicado' ? 'Publicado' : 'Completado'}
                </Badge>
                {content && !content.isManual && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
                    <Sparkles className="h-3 w-3" /> Generado por IA
                  </Badge>
                )}
                {content?.isManual && (
                  <Badge variant="outline">Manual</Badge>
                )}
              </div>
              <h2 className="text-xl font-bold leading-tight">{course.name}</h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
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
              className="gap-2"
            >
              <Send className="h-4 w-4" /> Publicar Capacitación
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 border-b">
            <TabsList className="bg-transparent h-auto p-0 gap-0 w-full justify-start rounded-none">
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
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 gap-1.5 text-sm"
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.value === 'media' && media.length > 0 && (
                    <Badge className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px] bg-primary text-primary-foreground">
                      {media.length}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="p-6">
              {/* General Tab */}
              <TabsContent value="general" className="mt-0 space-y-5">
                {content?.introduccion && (
                  <Card>
                    <CardContent className="p-5">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" /> Introducción
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{content.introduccion}</p>
                    </CardContent>
                  </Card>
                )}

                {course.objective && !content?.introduccion && (
                  <Card>
                    <CardContent className="p-5">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" /> Objetivo
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{course.objective}</p>
                    </CardContent>
                  </Card>
                )}

                {content?.objetivos && content.objetivos.length > 0 && (
                  <Card>
                    <CardContent className="p-5">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4" /> Objetivos
                      </h3>
                      <ul className="space-y-2">
                        {content.objetivos.map((obj, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center text-center gap-1.5">
                      <Users className="h-5 w-5 text-primary" />
                      <span className="text-xs text-muted-foreground">Nivel</span>
                      <span className="font-semibold text-sm capitalize">{course.level}</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center text-center gap-1.5">
                      {riskIcons[course.risk_level] || <Shield className="h-5 w-5 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground">Riesgo</span>
                      <span className="font-semibold text-sm capitalize">{course.risk_level}</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center text-center gap-1.5">
                      <Scale className="h-5 w-5 text-primary" />
                      <span className="text-xs text-muted-foreground">Marco Legal</span>
                      <span className="font-semibold text-sm capitalize">{course.legal_framework || 'Interno'}</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center text-center gap-1.5">
                      <Globe className="h-5 w-5 text-primary" />
                      <span className="text-xs text-muted-foreground">Modalidad</span>
                      <span className="font-semibold text-sm capitalize">{course.modality === 'mixto' ? 'híbrida' : course.modality}</span>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Contenido Tab */}
              <TabsContent value="contenido" className="mt-0">
                {content?.contenido ? (
                  <Card>
                    <CardContent className="p-5">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Desarrollo del Contenido
                      </h3>
                      <MarkdownContent content={content.contenido} />
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No hay contenido generado aún</p>
                  </div>
                )}
              </TabsContent>

              {/* Claves Tab */}
              <TabsContent value="claves" className="mt-0">
                {content?.puntosClave && content.puntosClave.length > 0 ? (
                  <Card>
                    <CardContent className="p-5">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" /> Puntos Clave
                      </h3>
                      <div className="space-y-3">
                        {content.puntosClave.map((punto, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 rounded-lg border-l-4 border-amber-400 bg-amber-50/50 dark:bg-amber-900/10 p-4"
                          >
                            <span className="bg-amber-500 text-white rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                              {i + 1}
                            </span>
                            <span className="text-sm leading-relaxed">{punto}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Lightbulb className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No hay puntos clave definidos</p>
                  </div>
                )}
              </TabsContent>

              {/* Evaluación Tab */}
              <TabsContent value="evaluacion" className="mt-0">
                {content?.evaluacion && content.evaluacion.length > 0 ? (
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <CircleHelp className="h-4 w-4" /> Preguntas de Evaluación
                        </h3>
                        <Badge className="bg-primary text-primary-foreground text-xs">
                          {content.evaluacion.length} pregunta{content.evaluacion.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {content.evaluacion.map((q, i) => (
                          <div key={i} className="rounded-lg border p-4 space-y-2">
                            <div className="flex items-start gap-3">
                              <span className="font-bold text-sm text-muted-foreground flex-shrink-0">P{i + 1}</span>
                              <p className="font-medium text-sm">{q.pregunta}</p>
                            </div>
                            <div className="pl-8 flex items-center gap-1.5 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                              <span className="text-green-700 dark:text-green-400 font-medium">Respuesta:</span>
                              <span className="text-muted-foreground">
                                {q.opciones.findIndex(o => o === q.respuestaCorrecta) >= 0
                                  ? `${String.fromCharCode(65 + q.opciones.findIndex(o => o === q.respuestaCorrecta))}) ${q.respuestaCorrecta}`
                                  : q.respuestaCorrecta
                                }
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CircleHelp className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No hay evaluación definida</p>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Imagen Explicativa */}
                  <MediaReadOnlyCard
                    icon={<ImageIcon className="h-5 w-5 text-muted-foreground" />}
                    title="Imagen Explicativa"
                    description="Genera una imagen visual que represente el tema de la capacitación"
                    items={media.filter(m => m.title === 'Imagen Explicativa')}
                  />
                  {/* Mapa Mental */}
                  <MediaReadOnlyCard
                    icon={<Network className="h-5 w-5 text-muted-foreground" />}
                    title="Mapa Mental"
                    description="Crea un mapa mental con los conceptos clave organizados visualmente"
                    items={media.filter(m => m.title === 'Mapa Mental')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Infografía */}
                  <MediaReadOnlyCard
                    icon={<LayoutPanelTop className="h-5 w-5 text-muted-foreground" />}
                    title="Infografía"
                    description="Diseña una infografía profesional con los puntos principales"
                    items={media.filter(m => m.title === 'Infografía')}
                  />
                  {/* Audio Narrado */}
                  <MediaReadOnlyCard
                    icon={<Mic className="h-5 w-5 text-muted-foreground" />}
                    title="Audio Narrado"
                    description="Genera una narración tipo podcast del contenido"
                    items={media.filter(m => m.title === 'Audio Narrado')}
                  />
                </div>

                {/* Video Educativo */}
                <MediaReadOnlyCard
                  icon={<Video className="h-5 w-5 text-primary" />}
                  title="Video Educativo"
                  description="Genera un guion narrado + secuencia de imágenes estilizadas con IA"
                  items={media.filter(m => m.type === 'video')}
                />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <div className="border-t px-6 py-3 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-5">
            {media.length > 0 && (
              <span className="flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4" />
                <strong className="text-foreground">{media.length}</strong> Media
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {format(parseISO(course.created_at), "dd MMM yyyy", { locale: es })}
              <span className="text-xs">Creación</span>
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
