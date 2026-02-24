import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Clock, Users, Shield, Globe, Target, Scale } from 'lucide-react';
import { MarkdownContent } from './MarkdownContent';
import type { TrainingCourse, TrainingCourseContent } from '@/types/training';

interface TrainingPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: TrainingCourse | null;
}

const statusColors: Record<string, string> = {
  borrador: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  publicado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export function TrainingPreviewDialog({ open, onOpenChange, course }: TrainingPreviewDialogProps) {
  if (!course) return null;

  const content = course.content as TrainingCourseContent | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle className="text-xl">{course.name}</DialogTitle>
            <Badge className={statusColors[course.status] || ''}>
              {course.status}
            </Badge>
            {content?.isManual ? (
              <Badge variant="outline">Manual</Badge>
            ) : content ? (
              <Badge variant="secondary">IA</Badge>
            ) : null}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            {/* Metadata grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Categoría:</span>
                <span className="font-medium capitalize">{course.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Duración:</span>
                <span className="font-medium">{course.duration_hours}h</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Nivel:</span>
                <span className="font-medium capitalize">{course.level}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Riesgo:</span>
                <span className="font-medium capitalize">{course.risk_level}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Modalidad:</span>
                <span className="font-medium capitalize">{course.modality}</span>
              </div>
              {course.audience && (
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Público:</span>
                  <span className="font-medium">{course.audience}</span>
                </div>
              )}
            </div>

            {course.objective && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Target className="h-4 w-4" /> Objetivo
                  </h3>
                  <p className="text-sm text-muted-foreground">{course.objective}</p>
                </div>
              </>
            )}

            {course.legal_framework && (
              <div>
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  <Scale className="h-4 w-4" /> Marco Legal
                </h3>
                <p className="text-sm text-muted-foreground">{course.legal_framework}</p>
              </div>
            )}

            {content && (
              <>
                <Separator />
                {content.introduccion && (
                  <div>
                    <h3 className="font-semibold mb-2">Introducción</h3>
                    <p className="text-sm text-muted-foreground">{content.introduccion}</p>
                  </div>
                )}

                {content.objetivos && content.objetivos.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Objetivos</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {content.objetivos.map((obj, i) => (
                        <li key={i} className="text-muted-foreground">{obj}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {content.contenido && (
                  <div>
                    <h3 className="font-semibold mb-2">Contenido</h3>
                    <MarkdownContent content={content.contenido} />
                  </div>
                )}

                {content.puntosClave && content.puntosClave.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Puntos Clave</h3>
                    <ul className="space-y-2">
                      {content.puntosClave.map((punto, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                            {i + 1}
                          </span>
                          <span className="text-muted-foreground">{punto}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {content.evaluacion && content.evaluacion.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Evaluación ({content.evaluacion.length} preguntas)</h3>
                    <div className="space-y-4">
                      {content.evaluacion.map((q, i) => (
                        <div key={i} className="bg-muted/50 rounded-lg p-3">
                          <p className="font-medium text-sm mb-2">{i + 1}. {q.pregunta}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                            {q.opciones.map((opt, oi) => (
                              <span
                                key={oi}
                                className={`text-xs px-2 py-1 rounded ${
                                  opt === q.respuestaCorrecta
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 font-medium'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {String.fromCharCode(65 + oi)}) {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
