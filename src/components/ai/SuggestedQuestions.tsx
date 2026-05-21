/**
 * SuggestedQuestions.tsx
 * Preguntas sugeridas para arrancar análisis de datos de RRHH.
 */
import { Sparkles, Users, FileText, TrendingUp, Clock, BookOpen, Star, Package, Stethoscope, UserX } from 'lucide-react';

const SUGGESTIONS = [
  { icon: Users, text: 'Listado de empleados activos con centro, area y cargo actual', category: 'Empleados' },
  { icon: UserX, text: 'Procesos de retiro completados por tipo de terminacion este año', category: 'Retiros' },
  { icon: FileText, text: 'Contratos vigentes que vencen en los proximos 30 dias', category: 'Contratos' },
  { icon: TrendingUp, text: 'Costo total de salarios base por centro de operacion', category: 'Nomina' },
  { icon: Star, text: 'Ranking de los 5 cargos con mejor desempeño promedio', category: 'Evaluaciones' },
  { icon: Users, text: 'Vacantes abiertas y cantidad de candidatos por etapa', category: 'Seleccion' },
  { icon: BookOpen, text: 'Cursos de capacitacion mas tomados este año', category: 'Capacitaciones' },
  { icon: Clock, text: 'Empleados que estan actualmente en vacaciones o permiso', category: 'Ausentismo' },
  { icon: TrendingUp, text: 'Promedio salarial comparando hombres vs mujeres', category: 'Analitica' },
  { icon: Stethoscope, text: 'Examenes medicos proximos a vencer por centro', category: 'Salud' },
  { icon: Package, text: 'Dotaciones pendientes por entregar segun profesiograma', category: 'Dotacion' },
  { icon: FileText, text: 'Requisiciones pendientes de aprobacion por centro', category: 'Requisiciones' },
];

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-col items-center gap-6 px-2 py-6">
      <div className="text-center">
        <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Asistente de Datos IA</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Haz preguntas en lenguaje natural sobre los datos internos autorizados de tu empresa.
        </p>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map(({ icon: Icon, text, category }) => (
          <button
            key={text}
            onClick={() => onSelect(text)}
            className="group flex items-start gap-3 rounded-xl border bg-card p-3 text-left transition-all duration-150 hover:border-primary/30 hover:shadow-sm"
          >
            <div className="mt-0.5 shrink-0 rounded-lg bg-primary/10 p-1.5 transition-colors group-hover:bg-primary/20">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium leading-snug">{text}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{category}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
