import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Copy, Ban, Link2, CheckCircle, Clock, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRegistrationTokens, useDeactivateRegistrationToken, useDeleteRegistrationToken } from '@/hooks/useRegistrationTokens';

interface Props {
  vacancyId?: string;
}

export function RegistrationTokensList({ vacancyId }: Props) {
  const { data: tokens = [], isLoading } = useRegistrationTokens(vacancyId);
  const deactivate = useDeactivateRegistrationToken();

  const getStatus = (token: typeof tokens[0]) => {
    if (token.is_used) return 'used';
    if (new Date(token.expires_at) < new Date()) return 'expired';
    return 'active';
  };

  const statusConfig = {
    active: { label: 'Activo', icon: Clock, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    used: { label: 'Utilizado', icon: CheckCircle, className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    expired: { label: 'Expirado', icon: XCircle, className: 'bg-muted text-muted-foreground' },
  };

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/registro?token=${token}`);
    toast.success('Enlace copiado');
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivate.mutateAsync(id);
      toast.success('Enlace desactivado');
    } catch {
      toast.error('Error al desactivar');
    }
  };

  if (isLoading) return <div className="text-center py-4 text-sm text-muted-foreground">Cargando enlaces...</div>;

  if (tokens.length === 0) {
    return (
      <div className="text-center py-6 bg-muted/30 rounded-lg">
        <Link2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No hay enlaces generados</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tokens.map(token => {
        const status = getStatus(token);
        const config = statusConfig[status];
        const StatusIcon = config.icon;

        return (
          <div
            key={token.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">...{token.token.slice(-8)}</p>
                  <Badge className={`text-xs ${config.className}`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Creado {format(new Date(token.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                  {' • '}Expira {format(new Date(token.expires_at), 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {status === 'active' && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(token.token)} title="Copiar enlace">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeactivate(token.id)}
                    title="Desactivar"
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
