import { motion } from 'framer-motion';
import { Package, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Tab360DotationProps {
  dotation: any[];
  isLoading: boolean;
}

const itemTypeLabels: Record<string, string> = {
  uniforme: 'Uniforme',
  epp: 'EPP',
  calzado: 'Calzado',
  herramienta: 'Herramienta',
  accesorio: 'Accesorio',
  otro: 'Otro',
};

export function Tab360Dotation({ dotation, isLoading }: Tab360DotationProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (dotation.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Sin dotación</h3>
          <p className="text-muted-foreground">
            Este empleado no tiene entregas de dotación registradas.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by item type
  const grouped = dotation.reduce((acc: Record<string, any[]>, item) => {
    const type = item.item_type || 'otro';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  const expiredCount = dotation.filter(d => new Date(d.expiration_date) < new Date()).length;
  const expiringSoonCount = dotation.filter(d => {
    const days = differenceInDays(new Date(d.expiration_date), new Date());
    return days >= 0 && days <= 30;
  }).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dotation.length}</p>
                <p className="text-sm text-muted-foreground">Total Entregas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dotation.length - expiredCount}</p>
                <p className="text-sm text-muted-foreground">Vigentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiringSoonCount}</p>
                <p className="text-sm text-muted-foreground">Por Vencer</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiredCount}</p>
                <p className="text-sm text-muted-foreground">Vencidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dotation List */}
      <div className="space-y-3">
        {dotation.map((item, index) => {
          const daysToExpire = differenceInDays(new Date(item.expiration_date), new Date());
          const isExpired = daysToExpire < 0;
          const isExpiringSoon = daysToExpire >= 0 && daysToExpire <= 30;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={cn(
                isExpired && 'border-destructive/50 bg-destructive/5',
                isExpiringSoon && 'border-warning/50 bg-warning/5'
              )}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Package className="w-4 h-4 text-primary" />
                        <h4 className="font-medium">{item.item_name}</h4>
                        <Badge variant="secondary">
                          {itemTypeLabels[item.item_type] || item.item_type}
                        </Badge>
                        {item.size && (
                          <Badge variant="outline">Talla: {item.size}</Badge>
                        )}
                        {item.quantity > 1 && (
                          <Badge variant="outline">Cantidad: {item.quantity}</Badge>
                        )}
                        {isExpired && (
                          <Badge variant="destructive">Vencido</Badge>
                        )}
                        {isExpiringSoon && (
                          <Badge variant="outline" className="bg-warning-light text-warning">
                            Por vencer
                          </Badge>
                        )}
                      </div>

                      {item.item_description && (
                        <p className="text-sm text-muted-foreground">{item.item_description}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Entrega: {format(new Date(item.delivery_date), "d MMM yyyy", { locale: es })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Vence: </span>
                        <span className={cn(
                          isExpired && 'text-destructive font-medium',
                          isExpiringSoon && 'text-warning font-medium'
                        )}>
                          {format(new Date(item.expiration_date), "d MMM yyyy", { locale: es })}
                        </span>
                      </p>
                      {!isExpired && (
                        <p className="text-xs text-muted-foreground">
                          {daysToExpire} días restantes
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
