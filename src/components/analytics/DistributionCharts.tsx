import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DistributionChartsProps {
  byContractType: { name: string; value: number; color: string }[];
  byGender: { name: string; value: number; color: string }[];
  byCenter: { name: string; count: number }[];
}

export function DistributionCharts({ byContractType, byGender, byCenter }: DistributionChartsProps) {
  const totalByContract = byContractType.reduce((acc, item) => acc + item.value, 0);
  const totalByGender = byGender.reduce((acc, item) => acc + item.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="card-elevated p-6"
    >
      <h3 className="font-display font-semibold text-lg text-foreground mb-6">
        Distribución de la Plantilla
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contract Type */}
        <div>
          <p className="text-sm text-muted-foreground mb-3 text-center font-medium">
            Por Tipo de Contrato
          </p>
          {byContractType.length > 0 ? (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byContractType}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {byContractType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [
                        `${value} (${((value / totalByContract) * 100).toFixed(1)}%)`, 
                        ''
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {byContractType.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              Sin datos
            </div>
          )}
        </div>

        {/* Gender */}
        <div>
          <p className="text-sm text-muted-foreground mb-3 text-center font-medium">
            Por Sexo biológico
          </p>
          {byGender.length > 0 ? (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byGender}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {byGender.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [
                        `${value} (${((value / totalByGender) * 100).toFixed(1)}%)`, 
                        ''
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {byGender.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              Sin datos
            </div>
          )}
        </div>

        {/* By Center */}
        <div>
          <p className="text-sm text-muted-foreground mb-3 text-center font-medium">
            Por Centro de Operación
          </p>
          {byCenter.length > 0 ? (
            <div className="space-y-2 px-2">
              {byCenter.slice(0, 5).map((center, index) => {
                const total = byCenter.reduce((acc, c) => acc + c.count, 0);
                const percentage = total > 0 ? (center.count / total) * 100 : 0;
                return (
                  <div key={center.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate max-w-[120px]">
                        {center.name}
                      </span>
                      <span className="font-medium text-foreground">{center.count}</span>
                    </div>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="h-1.5 bg-background rounded-full overflow-hidden"
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                        className="h-full bg-primary rounded-full"
                      />
                    </motion.div>
                  </div>
                );
              })}
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
