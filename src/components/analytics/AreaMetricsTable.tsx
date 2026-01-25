import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { AreaMetrics } from '@/hooks/useHRAnalytics';
import { cn } from '@/lib/utils';

interface AreaMetricsTableProps {
  data: AreaMetrics[];
}

const getStatusBadge = (value: number, thresholds: { good: number; warning: number }, inverted = false) => {
  const isGood = inverted ? value <= thresholds.good : value >= thresholds.good;
  const isWarning = inverted 
    ? value > thresholds.good && value <= thresholds.warning
    : value >= thresholds.warning && value < thresholds.good;
  
  if (isGood) return 'success';
  if (isWarning) return 'warning';
  return 'destructive';
};

export function AreaMetricsTable({ data }: AreaMetricsTableProps) {
  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="card-elevated p-6"
      >
        <h3 className="font-display font-semibold text-lg text-foreground mb-4">
          Métricas por Área
        </h3>
        <div className="text-center text-muted-foreground py-8">
          No hay datos de áreas disponibles
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="card-elevated p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">
            Métricas por Área
          </h3>
          <p className="text-sm text-muted-foreground">
            Indicadores clave comparativos entre áreas
          </p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Área</TableHead>
              <TableHead className="text-center">Empleados</TableHead>
              <TableHead className="text-center">Antigüedad Prom.</TableHead>
              <TableHead className="text-center">Rotación</TableHead>
              <TableHead className="text-center">Ausentismo</TableHead>
              <TableHead className="w-[150px]">Capacitación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((area, index) => (
              <motion.tr
                key={area.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group"
              >
                <TableCell className="font-medium">{area.name}</TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold text-foreground">{area.employees}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-muted-foreground">{area.avgTenure} meses</span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant="outline"
                    className={cn(
                      area.turnoverRate <= 5 
                        ? 'border-success text-success' 
                        : area.turnoverRate <= 10 
                          ? 'border-warning text-warning' 
                          : 'border-destructive text-destructive'
                    )}
                  >
                    {area.turnoverRate}%
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant="outline"
                    className={cn(
                      area.absenteeismRate <= 3 
                        ? 'border-success text-success' 
                        : area.absenteeismRate <= 6 
                          ? 'border-warning text-warning' 
                          : 'border-destructive text-destructive'
                    )}
                  >
                    {area.absenteeismRate}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={area.trainingCompliance} 
                      className="h-2 flex-1"
                    />
                    <span className={cn(
                      "text-xs font-medium w-10 text-right",
                      area.trainingCompliance >= 80 
                        ? 'text-success' 
                        : area.trainingCompliance >= 60 
                          ? 'text-warning' 
                          : 'text-destructive'
                    )}>
                      {area.trainingCompliance}%
                    </span>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}
