import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { subMonths, format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const COLORS = {
  masculino: 'hsl(220, 70%, 45%)',
  femenino: 'hsl(340, 70%, 50%)',
  total: 'hsl(var(--primary))',
  discapacidad: 'hsl(38, 95%, 50%)',
  etnico: 'hsl(160, 70%, 40%)',
  inclusion: 'hsl(280, 60%, 50%)',
};

interface MonthlyDiversityData {
  month: string;
  total: number;
  masculino: number;
  femenino: number;
  conDiscapacidad: number;
  grupoEtnico: number;
  primerEmpleo: number;
  cabezaFamilia: number;
}

export function DiversityTrendsChart() {
  const { currentCompanyId } = useAuth();

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['diversity-trends-candidates', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidates')
        .select(`
          id, application_date, gender, ethnic_group, disability_type,
          is_first_job, is_head_of_household, is_conflict_victim, is_demobilized,
          vacancies!inner(company_id)
        `)
        .eq('vacancies.company_id', currentCompanyId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompanyId,
    staleTime: 5 * 60 * 1000,
  });

  const monthlyData = useMemo(() => {
    const months: MonthlyDiversityData[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthLabel = format(date, 'MMM yy', { locale: es });

      const monthCandidates = candidates.filter(c => {
        const d = parseISO(c.application_date);
        return d >= start && d <= end;
      });

      months.push({
        month: monthLabel,
        total: monthCandidates.length,
        masculino: monthCandidates.filter(c => c.gender === 'M').length,
        femenino: monthCandidates.filter(c => c.gender === 'F').length,
        conDiscapacidad: monthCandidates.filter(c => c.disability_type && c.disability_type !== 'Ninguna').length,
        grupoEtnico: monthCandidates.filter(c => c.ethnic_group && c.ethnic_group !== 'No registrado' && c.ethnic_group !== 'Ninguno').length,
        primerEmpleo: monthCandidates.filter(c => c.is_first_job).length,
        cabezaFamilia: monthCandidates.filter(c => c.is_head_of_household).length,
      });
    }
    return months;
  }, [candidates]);

  const inclusionTrend = useMemo(() => {
    return monthlyData.map(m => ({
      month: m.month,
      'Primer Empleo': m.primerEmpleo,
      'Cabeza Familia': m.cabezaFamilia,
      'Discapacidad': m.conDiscapacidad,
      'Grupo Étnico': m.grupoEtnico,
    }));
  }, [monthlyData]);

  if (isLoading || candidates.length === 0) return null;

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className="card-elevated p-6"
    >
      <h3 className="font-display font-semibold text-lg text-foreground mb-2">
        Tendencias de Diversidad (12 meses)
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        Evolución mensual de indicadores de inclusión en procesos de selección
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender trend */}
        <div>
          <p className="text-sm text-muted-foreground mb-3 font-medium">Candidatos por Sexo Biológico</p>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Area type="monotone" dataKey="masculino" name="Masculino" stroke={COLORS.masculino} fill={COLORS.masculino} fillOpacity={0.15} stackId="gender" />
              <Area type="monotone" dataKey="femenino" name="Femenino" stroke={COLORS.femenino} fill={COLORS.femenino} fillOpacity={0.15} stackId="gender" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Inclusion indicators trend */}
        <div>
          <p className="text-sm text-muted-foreground mb-3 font-medium">Indicadores de Inclusión</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={inclusionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="Primer Empleo" fill={COLORS.total} radius={[2, 2, 0, 0]} />
              <Bar dataKey="Cabeza Familia" fill={COLORS.etnico} radius={[2, 2, 0, 0]} />
              <Bar dataKey="Discapacidad" fill={COLORS.discapacidad} radius={[2, 2, 0, 0]} />
              <Bar dataKey="Grupo Étnico" fill={COLORS.inclusion} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
