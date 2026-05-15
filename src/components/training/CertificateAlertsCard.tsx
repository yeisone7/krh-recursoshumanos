import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Award } from 'lucide-react';
import { useExpiringCertificates } from '@/hooks/useTraining';

export function CertificateAlertsCard() {
  const { data: expiringCerts, isLoading } = useExpiringCertificates(30);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Certificaciones por Vencer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!expiringCerts?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-500" />
            Certificaciones al Día
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No hay certificaciones próximas a vencer</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Certificaciones por Vencer ({expiringCerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {expiringCerts.slice(0, 5).map((cert) => {
            const daysUntilExpiry = differenceInDays(parseISO(cert.expiry_date!), new Date());
            const isUrgent = daysUntilExpiry <= 7;
            const isExpired = daysUntilExpiry < 0;

            return (
              <div
                key={cert.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {cert.employee?.first_name} {cert.employee?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {cert.course?.name}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={isExpired ? 'destructive' : isUrgent ? 'destructive' : 'secondary'}
                  >
                    {isExpired
                      ? 'Vencido'
                      : daysUntilExpiry === 0
                        ? 'Vence hoy'
                        : `${daysUntilExpiry} días`}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(parseISO(cert.expiry_date!), 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
