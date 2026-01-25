import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import type { TrainingComplianceData, EvaluationData } from '@/hooks/useHRAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ComplianceChartProps {
  trainingData: TrainingComplianceData[];
  evaluationData: EvaluationData[];
}

const getComplianceColor = (rate: number) => {
  if (rate >= 80) return 'hsl(160, 70%, 40%)';
  if (rate >= 60) return 'hsl(38, 95%, 50%)';
  return 'hsl(0, 75%, 55%)';
};

export function ComplianceChart({ trainingData, evaluationData }: ComplianceChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="card-elevated p-6"
    >
      <Tabs defaultValue="training" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg text-foreground">
            Cumplimiento por Área
          </h3>
          <TabsList className="grid w-auto grid-cols-2">
            <TabsTrigger value="training">Capacitación</TabsTrigger>
            <TabsTrigger value="evaluations">Evaluaciones</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="training" className="mt-0">
          <p className="text-sm text-muted-foreground mb-4">
            Porcentaje de empleados con capacitaciones obligatorias completadas
          </p>
          <div className="h-64">
            {trainingData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={trainingData} 
                  layout="vertical"
                  margin={{ left: 20, right: 60 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(215, 25%, 90%)" 
                    horizontal={false} 
                  />
                  <XAxis 
                    type="number"
                    domain={[0, 100]}
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis 
                    type="category"
                    dataKey="areaName" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 11 }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value}% (${props.payload.trainedEmployees}/${props.payload.totalEmployees})`,
                      'Cumplimiento'
                    ]}
                  />
                  <Bar 
                    dataKey="complianceRate" 
                    radius={[0, 4, 4, 0]}
                  >
                    {trainingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getComplianceColor(entry.complianceRate)} />
                    ))}
                    <LabelList 
                      dataKey="complianceRate" 
                      position="right" 
                      formatter={(value: number) => `${value}%`}
                      style={{ fill: 'hsl(215, 15%, 50%)', fontSize: 11 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No hay datos de capacitación disponibles
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="evaluations" className="mt-0">
          <p className="text-sm text-muted-foreground mb-4">
            Porcentaje de evaluaciones de desempeño completadas
          </p>
          <div className="h-64">
            {evaluationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={evaluationData} 
                  layout="vertical"
                  margin={{ left: 20, right: 60 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(215, 25%, 90%)" 
                    horizontal={false} 
                  />
                  <XAxis 
                    type="number"
                    domain={[0, 100]}
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis 
                    type="category"
                    dataKey="areaName" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 11 }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value}% (${props.payload.evaluatedEmployees}/${props.payload.totalEmployees}) - Promedio: ${props.payload.averageScore}`,
                      'Cumplimiento'
                    ]}
                  />
                  <Bar 
                    dataKey="complianceRate" 
                    radius={[0, 4, 4, 0]}
                  >
                    {evaluationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getComplianceColor(entry.complianceRate)} />
                    ))}
                    <LabelList 
                      dataKey="complianceRate" 
                      position="right" 
                      formatter={(value: number) => `${value}%`}
                      style={{ fill: 'hsl(215, 15%, 50%)', fontSize: 11 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No hay datos de evaluaciones disponibles
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
