import { motion } from 'framer-motion';
import { 
  Briefcase, 
  Building2, 
  MapPin, 
  CreditCard,
  Shield,
  Landmark,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmployeeV2WithRelations, 
  linkTypeLabels, 
  riskLevelLabels,
  accountTypeLabels,
  payrollTypeLabels
} from '@/types/employee';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Tab360LaborProps {
  employee: EmployeeV2WithRelations;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="py-2 border-b border-border last:border-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">
        {value || <span className="text-muted-foreground italic">No registrado</span>}
      </p>
    </div>
  );
}

export function Tab360Labor({ employee }: Tab360LaborProps) {
  const hireDate = employee.work_info?.hire_date 
    ? format(new Date(employee.work_info.hire_date), "d 'de' MMMM, yyyy", { locale: es })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {/* Work Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            Información Laboral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow label="Cargo" value={employee.work_info?.position_name} />
          <InfoRow label="Área" value={employee.areas?.name} />
          <InfoRow 
            label="Tipo de Vinculación" 
            value={employee.work_info?.link_type 
              ? linkTypeLabels[employee.work_info.link_type] 
              : null
            } 
          />
          <InfoRow label="Fecha de Ingreso" value={hireDate} />
          <InfoRow label="Centro de Costos" value={employee.work_info?.cost_center} />
        </CardContent>
      </Card>

      {/* Operation Center */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Centro de Operación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow label="Nombre" value={employee.operation_centers?.name} />
          <InfoRow label="Ciudad" value={employee.operation_centers?.city} />
          <InfoRow label="Ciudad de Trabajo" value={employee.work_info?.work_city} />
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Jornada y Nómina
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow 
            label="Tipo de Nómina" 
            value={employee.schedule?.payroll_type 
              ? payrollTypeLabels[employee.schedule.payroll_type] 
              : null
            } 
          />
          <InfoRow 
            label="Horario de Oficina" 
            value={employee.schedule?.is_office_schedule ? 'Sí' : 'No'} 
          />
          <InfoRow label="Día de Descanso" value={employee.schedule?.rest_day} />
        </CardContent>
      </Card>

      {/* Social Security */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Seguridad Social
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow 
            label="Nivel de Riesgo" 
            value={employee.social_security?.risk_level 
              ? riskLevelLabels[employee.social_security.risk_level] 
              : null
            } 
          />
          <InfoRow label="ARL" value={employee.social_security?.arl} />
          <InfoRow label="EPS" value={employee.social_security?.eps} />
          <InfoRow label="AFP" value={employee.social_security?.afp} />
          <InfoRow label="Caja de Compensación" value={employee.social_security?.ccf} />
          <InfoRow label="AFC" value={employee.social_security?.afc} />
          <InfoRow label="IPS" value={employee.social_security?.ips} />
        </CardContent>
      </Card>

      {/* Bank Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" />
            Información Bancaria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow label="Banco" value={employee.bank_info?.bank_name} />
          <InfoRow 
            label="Tipo de Cuenta" 
            value={employee.bank_info?.account_type 
              ? accountTypeLabels[employee.bank_info.account_type] 
              : null
            } 
          />
          <InfoRow label="Número de Cuenta" value={employee.bank_info?.account_number} />
          <div className="flex items-center gap-2 pt-2">
            <span className="text-sm text-muted-foreground">Cuenta Registrada:</span>
            <Badge variant={employee.bank_info?.account_registered ? 'default' : 'secondary'}>
              {employee.bank_info?.account_registered ? 'Sí' : 'No'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Observations */}
      {employee.work_info?.observations && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              Observaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {employee.work_info.observations}
            </p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
