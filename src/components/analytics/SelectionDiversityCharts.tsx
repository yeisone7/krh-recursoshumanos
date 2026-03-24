import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSelectionDiversityReport } from '@/hooks/useReports';

const COLORS = [
  'hsl(220, 70%, 45%)',
  'hsl(160, 70%, 40%)',
  'hsl(38, 95%, 50%)',
  'hsl(200, 90%, 50%)',
  'hsl(280, 60%, 50%)',
  'hsl(340, 70%, 50%)',
  'hsl(100, 60%, 40%)',
];

export function SelectionDiversityCharts() {
  const { data: rows = [], isLoading } = useSelectionDiversityReport();

  const genderData = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach(r => {
      const key = r.sexo_biologico || 'No registrado';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const ethnicData = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach(r => {
      const key = r.grupo_etnico || 'No registrado';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [rows]);

  const disabilityData = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach(r => {
      const key = r.discapacidad || 'Ninguna';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const specialData = useMemo(() => {
    let firstJob = 0, headHousehold = 0, conflictVictim = 0, demobilized = 0;
    rows.forEach(r => {
      if (r.primer_empleo === 'Sí') firstJob++;
      if (r.cabeza_familia === 'Sí') headHousehold++;
      if (r.victima_conflicto === 'Sí') conflictVictim++;
      if (r.desmovilizado === 'Sí') demobilized++;
    });
    return [
      { name: 'Primer Empleo', value: firstJob },
      { name: 'Cabeza Familia', value: headHousehold },
      { name: 'Víctima Conflicto', value: conflictVictim },
      { name: 'Desmovilizado', value: demobilized },
    ].filter(d => d.value > 0);
  }, [rows]);

  if (isLoading || rows.length === 0) return null;

  const totalGender = genderData.reduce((a, b) => a + b.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="card-elevated p-6"
    >
      <h3 className="font-display font-semibold text-lg text-foreground mb-2">
        Diversidad e Inclusión en Selección
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        Distribución demográfica de {rows.length} candidatos en procesos de selección
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Gender */}
        <div>
          <p className="text-sm text-muted-foreground mb-3 text-center font-medium">
            Sexo Biológico
          </p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                  {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} (${((value / totalGender) * 100).toFixed(1)}%)`, '']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {genderData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ethnic Group */}
        <div>
          <p className="text-sm text-muted-foreground mb-3 text-center font-medium">
            Grupo Étnico
          </p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ethnicData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                  {ethnicData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {ethnicData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground truncate max-w-[80px]">{item.name}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Disability */}
        <div>
          <p className="text-sm text-muted-foreground mb-3 text-center font-medium">
            Discapacidad
          </p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={disabilityData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                  {disabilityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {disabilityData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground truncate max-w-[80px]">{item.name}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Special conditions */}
        <div>
          <p className="text-sm text-muted-foreground mb-3 text-center font-medium">
            Condiciones Especiales
          </p>
          {specialData.length > 0 ? (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={specialData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" name="Candidatos" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              Sin datos
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
