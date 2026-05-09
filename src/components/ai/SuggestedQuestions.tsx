/**
 * SuggestedQuestions.tsx
 * Grid de preguntas sugeridas para onboarding rápido del Data Assistant.
 */
import { Sparkles, Users, FileText, TrendingUp, Clock, BookOpen, Star } from 'lucide-react';

const SUGGESTIONS = [
  { icon: Users,      text: 'Listado de empleados activos con su área y cargo actual', category: 'Empleados'      },
  { icon: TrendingUp, text: '¿Cuál es el costo total de salarios base este mes?',       category: 'Nómina'         },
  { icon: FileText,   text: '¿Quiénes tienen contratos que vencen en los próximos 30 días?', category: 'Contratos'      },
  { icon: Star,       text: 'Ranking de los 5 cargos con mejor desempeño promedio',    category: 'Evaluaciones'   },
  { icon: Users,      text: '¿Cuántas vacantes tenemos abiertas y en qué áreas?',       category: 'Selección'      },
  { icon: BookOpen,   text: 'Cursos de capacitación más tomados este año',             category: 'Capacitaciones' },
  { icon: Clock,      text: '¿Qué empleados están actualmente disfrutando de vacaciones?', category: 'Vacaciones'     },
  { icon: FileText,   text: 'Resumen de candidatos en etapa de Entrevista',             category: 'Selección'      },
  { icon: TrendingUp, text: 'Promedio salarial comparando hombres vs mujeres',         category: 'Analítica'      },
  { icon: Clock,      text: 'Incapacidades registradas en los últimos 3 meses',         category: 'Salud'          },
  { icon: Users,      text: '¿Cuántos empleados han ingresado en lo que va del año?',   category: 'Ingresos'       },
  { icon: FileText,   text: 'Listado de dotaciones pendientes por entregar',           category: 'Dotación'       },
];

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-6 px-2">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Asistente de Datos IA</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Haz preguntas en lenguaje natural sobre los datos de tu empresa.
          Solo accedo a información interna autorizada.
        </p>
      </div>

      {/* Grid de sugerencias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
        {SUGGESTIONS.map(({ icon: Icon, text, category }) => (
          <button
            key={text}
            onClick={() => onSelect(text)}
            className="flex items-start gap-3 rounded-xl border bg-card p-3 text-left
                       hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm
                       transition-all duration-150 group"
          >
            <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Icon className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium leading-snug">{text}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{category}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
