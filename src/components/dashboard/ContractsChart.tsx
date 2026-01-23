import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const monthlyData = [
  { month: 'Ene', nuevos: 12, finalizados: 4 },
  { month: 'Feb', nuevos: 8, finalizados: 6 },
  { month: 'Mar', nuevos: 15, finalizados: 3 },
  { month: 'Abr', nuevos: 10, finalizados: 8 },
  { month: 'May', nuevos: 18, finalizados: 5 },
  { month: 'Jun', nuevos: 14, finalizados: 7 },
];

const contractTypes = [
  { name: 'Indefinido', value: 45, color: 'hsl(220, 70%, 45%)' },
  { name: 'Fijo', value: 30, color: 'hsl(200, 70%, 50%)' },
  { name: 'Obra Labor', value: 15, color: 'hsl(160, 70%, 40%)' },
  { name: 'Aprendizaje', value: 10, color: 'hsl(38, 95%, 50%)' },
];

export function ContractsChart() {
  return (
    <div className="card-elevated p-6">
      <h2 className="font-display font-semibold text-lg text-foreground mb-6">Contratos por Mes</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="h-64"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 90%)" vertical={false} />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(0, 0%, 100%)',
                  border: '1px solid hsl(215, 25%, 90%)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.07)',
                }}
                labelStyle={{ color: 'hsl(220, 25%, 10%)', fontWeight: 600 }}
              />
              <Bar 
                dataKey="nuevos" 
                name="Nuevos" 
                fill="hsl(220, 70%, 45%)" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="finalizados" 
                name="Finalizados" 
                fill="hsl(215, 20%, 85%)" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="h-64 flex items-center"
        >
          <div className="w-1/2">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={contractTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {contractTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(0, 0%, 100%)',
                    border: '1px solid hsl(215, 25%, 90%)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 space-y-2">
            {contractTypes.map((type) => (
              <div key={type.name} className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: type.color }}
                />
                <span className="text-sm text-muted-foreground">{type.name}</span>
                <span className="ml-auto text-sm font-medium text-foreground">{type.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}