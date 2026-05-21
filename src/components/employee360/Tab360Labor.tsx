import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  Building2, 
  Clock,
  CreditCard,
  Shield,
  Landmark,
  FileText,
  Download,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmployeeV2WithRelations, 
  linkTypeLabels, 
  riskLevelLabels,
  accountTypeLabels,
  payrollTypeLabels
} from '@/types/employee';
import { useCurrentPositionProfile } from '@/hooks/usePositionProfiles';
import { generatePositionProfilePdf } from '@/lib/positionProfilePdfGenerator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDateOnly } from '@/lib/dateOnly';

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
  const [exporting, setExporting] = useState(false);
  const positionId = employee.work_info?.position_id;
  const { data: profile, isLoading: loadingProfile } = useCurrentPositionProfile(positionId || undefined);

  const parsedHireDate = parseDateOnly(employee.work_info?.hire_date);
  const hireDate = parsedHireDate 
    ? format(parsedHireDate, "d 'de' MMMM, yyyy", { locale: es })
    : null;

  const handleExportPdf = async () => {
    if (!profile) return;
    setExporting(true);
    try {
      await generatePositionProfilePdf(profile, employee.work_info?.position_name || 'Cargo', employee.areas?.name);
    } finally {
      setExporting(false);
    }
  };

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

      {/* Position Profile Card */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Perfil del Cargo
          </CardTitle>
          {profile && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">v{profile.version}</Badge>
              <Button size="sm" variant="outline" onClick={handleExportPdf} disabled={exporting}>
                {exporting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                PDF
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loadingProfile ? (
            <p className="text-sm text-muted-foreground">Cargando perfil...</p>
          ) : !profile ? (
            <p className="text-sm text-muted-foreground italic">Este cargo no tiene un perfil configurado.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <InfoRow label="Objetivo" value={profile.purpose} />
                <InfoRow label="Reporta a" value={profile.reports_to} />
                <InfoRow label="Supervisa a" value={profile.supervises} />
              </div>
              <div className="space-y-1">
                <InfoRow label="Educación" value={profile.education_level} />
                <InfoRow label="Formación" value={profile.education_detail} />
                <InfoRow label="Experiencia" value={profile.experience} />
              </div>
              {(profile.functions as string[])?.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground mb-1">Funciones principales:</p>
                  <ol className="list-decimal list-inside text-sm space-y-0.5">
                    {(profile.functions as string[]).slice(0, 5).map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                    {(profile.functions as string[]).length > 5 && (
                      <li className="text-muted-foreground italic">... y {(profile.functions as string[]).length - 5} más</li>
                    )}
                  </ol>
                </div>
              )}
              {(profile.skills as any[])?.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground mb-1">Competencias:</p>
                  <div className="flex flex-wrap gap-1">
                    {(profile.skills as any[]).map((s: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{s.name} ({s.level})</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
