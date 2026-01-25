import { motion } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import type { AbsenteeismData } from '@/hooks/useHRAnalytics';

interface AbsenteeismChartProps {
  data: AbsenteeismData[];
}

export function AbsenteeismChart({ data }: AbsenteeismChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="card-elevated p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">
            Ausentismo Laboral
          </h3>
          <p className="text-sm text-muted-foreground">Días perdidos por incapacidades (últimos 6 meses)</p>
        </div>
      </div>
      
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorIncapacity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 75%, 55%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(0, 75%, 55%)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(38, 95%, 50%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(38, 95%, 50%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
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
                if (name === 'rate') return [`${value}%`, 'Tasa Ausentismo'];
                return [`${value} días`, 'Días Incapacidad'];
              }}
            />
            <Legend 
              formatter={(value) => {
                const labels: Record<string, string> = {
                  incapacityDays: 'Días Incapacidad',
                  rate: 'Tasa Ausentismo'
                };
                return labels[value] || value;
              }}
            />
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="incapacityDays" 
              name="incapacityDays"
              stroke="hsl(0, 75%, 55%)" 
              fillOpacity={1} 
              fill="url(#colorIncapacity)"
              strokeWidth={2}
            />
            <Area 
              yAxisId="right"
              type="monotone" 
              dataKey="rate" 
              name="rate"
              stroke="hsl(38, 95%, 50%)" 
              fillOpacity={1} 
              fill="url(#colorRate)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
