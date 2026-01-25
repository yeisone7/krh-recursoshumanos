import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { EmployeeKPIs } from '@/hooks/useEmployeeKPIs';

interface EmployeeDistributionChartProps {
  kpis?: EmployeeKPIs;
  isLoading?: boolean;
}

const COLORS = {
  primary: 'hsl(var(--primary))',
  accent: 'hsl(var(--accent))',
  warning: 'hsl(var(--warning))',
  info: 'hsl(var(--info))',
  success: 'hsl(var(--success))',
  muted: 'hsl(var(--muted-foreground))',
};

const contractTypeColors = [COLORS.primary, COLORS.accent, COLORS.warning, COLORS.muted];
const genderColors = [COLORS.primary, COLORS.accent, COLORS.info];

export function EmployeeDistributionChart({ kpis, isLoading }: EmployeeDistributionChartProps) {
  if (isLoading) {
    return (
      <div className="card-elevated p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const contractTypeData = [
    { name: 'Indefinido', value: kpis?.byContractType.indefinido || 0 },
    { name: 'Fijo', value: kpis?.byContractType.fijo || 0 },
    { name: 'Obra/Labor', value: kpis?.byContractType.obra || 0 },
    { name: 'Otro', value: kpis?.byContractType.other || 0 },
  ].filter(item => item.value > 0);

  const genderData = [
    { name: 'Masculino', value: kpis?.byGender.male || 0 },
    { name: 'Femenino', value: kpis?.byGender.female || 0 },
    { name: 'Otro', value: kpis?.byGender.other || 0 },
  ].filter(item => item.value > 0);

  const totalByContract = contractTypeData.reduce((acc, item) => acc + item.value, 0);
  const totalByGender = genderData.reduce((acc, item) => acc + item.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="card-elevated p-6"
    >
      <h3 className="font-display font-semibold text-lg text-foreground mb-4">
        Distribución de Empleados
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contract Type Distribution */}
        <div>
          <p className="text-sm text-muted-foreground mb-3 text-center">Por Tipo de Contrato</p>
          {contractTypeData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contractTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {contractTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={contractTypeColors[index % contractTypeColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value} (${((value / totalByContract) * 100).toFixed(1)}%)`, '']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Sin datos disponibles
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {contractTypeData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: contractTypeColors[index % contractTypeColors.length] }} 
                />
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gender Distribution */}
        <div>
          <p className="text-sm text-muted-foreground mb-3 text-center">Por Género</p>
          {genderData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {genderData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={genderColors[index % genderColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value} (${((value / totalByGender) * 100).toFixed(1)}%)`, '']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Sin datos disponibles
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {genderData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: genderColors[index % genderColors.length] }} 
                />
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Area breakdown */}
      {kpis?.byArea && kpis.byArea.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">Distribución por Área (Top 5)</p>
          <div className="space-y-2">
            {kpis.byArea.map((area, index) => {
              const percentage = kpis.totalActiveEmployees > 0 
                ? (area.count / kpis.totalActiveEmployees) * 100 
                : 0;
              return (
                <div key={area.name} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-32 truncate">{area.name}</span>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground w-12 text-right">
                    {area.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
