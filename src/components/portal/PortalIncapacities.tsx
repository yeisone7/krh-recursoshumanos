import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, Calendar, FileWarning, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface PortalIncapacitiesProps {
  incapacities: any[];
}

export function PortalIncapacities({ incapacities }: PortalIncapacitiesProps) {
  const activeIncapacities = incapacities.filter(i => 
    new Date(i.end_date) >= new Date()
  );
  const pastIncapacities = incapacities.filter(i => 
    new Date(i.end_date) < new Date()
  );

  const totalDaysThisYear = incapacities
    .filter(i => new Date(i.start_date).getFullYear() === new Date().getFullYear())
    .reduce((sum, i) => sum + (i.total_days || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Stethoscope className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{incapacities.length}</p>
                <p className="text-sm text-muted-foreground">Total Incapacidades</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-100">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeIncapacities.length}</p>
                <p className="text-sm text-muted-foreground">Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDaysThisYear}</p>
                <p className="text-sm text-muted-foreground">Días este año</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Incapacities */}
      {activeIncapacities.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              Incapacidades Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeIncapacities.map((inc) => (
                <IncapacityCard key={inc.id} incapacity={inc} isActive />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Incapacities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Historial de Incapacidades
          </CardTitle>
          <CardDescription>
            Registro de incapacidades médicas finalizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pastIncapacities.length > 0 ? (
            <div className="space-y-3">
              {pastIncapacities.map((inc) => (
                <IncapacityCard key={inc.id} incapacity={inc} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileWarning className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No hay incapacidades registradas
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IncapacityCard({ incapacity, isActive }: { incapacity: any; isActive?: boolean }) {
  const originLabels: Record<string, string> = {
    comun: 'Enfermedad General',
    laboral: 'Accidente Laboral',
    accidente_transito: 'Accidente de Tránsito',
  };

  const daysRemaining = isActive 
    ? differenceInDays(new Date(incapacity.end_date), new Date()) + 1
    : 0;

  return (
    <div className={`p-4 rounded-lg border ${isActive ? 'bg-white' : 'bg-card'}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{incapacity.diagnosis}</p>
            {incapacity.is_extension && (
              <Badge variant="outline" className="text-xs">
                Prórroga #{incapacity.extension_number}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(incapacity.start_date), 'PPP', { locale: es })} - {' '}
            {format(new Date(incapacity.end_date), 'PPP', { locale: es })}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="secondary">
              {originLabels[incapacity.origin] || incapacity.origin}
            </Badge>
            {incapacity.medical_entity && (
              <span className="text-xs text-muted-foreground">
                {incapacity.medical_entity}
              </span>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-lg font-bold">{incapacity.total_days}</p>
          <p className="text-xs text-muted-foreground">días</p>
          {isActive && daysRemaining > 0 && (
            <Badge className="mt-2 bg-yellow-500">
              {daysRemaining} días restantes
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
