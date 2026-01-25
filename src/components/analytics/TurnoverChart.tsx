import { motion } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Bar,
  Line
} from 'recharts';
import type { TurnoverData } from '@/hooks/useHRAnalytics';

interface TurnoverChartProps {
  data: TurnoverData[];
}

export function TurnoverChart({ data }: TurnoverChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card-elevated p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">
            Rotación de Personal
          </h3>
          <p className="text-sm text-muted-foreground">Contrataciones vs. Retiros (últimos 6 meses)</p>
        </div>
      </div>
      
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} barGap={8}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(215, 25%, 90%)" 
              vertical={false} 
            />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 12 }}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 12 }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.07)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
              formatter={(value: number, name: string) => {
                if (name === 'turnoverRate') return [`${value}%`, 'Tasa Rotación'];
                return [value, name === 'hires' ? 'Contrataciones' : 'Retiros'];
              }}
            />
            <Legend 
              formatter={(value) => {
                const labels: Record<string, string> = {
                  hires: 'Contrataciones',
                  terminations: 'Retiros',
                  turnoverRate: 'Tasa Rotación'
                };
                return labels[value] || value;
              }}
            />
            <Bar 
              yAxisId="left"
              dataKey="hires" 
              name="hires" 
              fill="hsl(160, 70%, 40%)" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              yAxisId="left"
              dataKey="terminations" 
              name="terminations" 
              fill="hsl(0, 75%, 55%)" 
              radius={[4, 4, 0, 0]}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="turnoverRate" 
              name="turnoverRate"
              stroke="hsl(38, 95%, 50%)" 
              strokeWidth={2}
              dot={{ fill: 'hsl(38, 95%, 50%)', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
