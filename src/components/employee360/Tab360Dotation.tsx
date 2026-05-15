import { motion } from 'framer-motion';
import { Package, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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

  const allItems = dotation.flatMap((delivery) => delivery.items || []);
  const expiredCount = allItems.filter(d => new Date(d.expiration_date) < new Date()).length;
  const expiringSoonCount = allItems.filter(d => {
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
                <p className="text-2xl font-bold">{allItems.length - expiredCount}</p>
                <p className="text-sm text-muted-foreground">Artículos Vigentes</p>
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

      <Accordion type="multiple" className="space-y-3">
        {dotation.map((delivery, index) => {
          const items = delivery.items || [];
          const hasValidDate = delivery.delivery_date && !isNaN(new Date(delivery.delivery_date).getTime());
          const deliveryExpired = items.some((item: any) => differenceInDays(new Date(item.expiration_date), new Date()) < 0);
          const deliveryExpiringSoon = !deliveryExpired && items.some((item: any) => {
            const days = differenceInDays(new Date(item.expiration_date), new Date());
            return days >= 0 && days <= 30;
          });
          const status = deliveryExpired
            ? { label: 'Con vencidos', className: 'bg-destructive/10 text-destructive border-destructive/20' }
            : deliveryExpiringSoon
              ? { label: 'Por vencer', className: 'bg-warning-light text-warning border-warning/20' }
              : { label: 'Vigente', className: 'bg-success-light text-success border-success/20' };

          return (
            <motion.div
              key={delivery.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <AccordionItem value={delivery.id} className="rounded-lg border bg-card px-4 shadow-sm">
                <AccordionTrigger className="gap-3 py-4 text-left hover:no-underline">
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <h4 className="font-medium">Entrega de dotación</h4>
                        <Badge variant="outline" className={cn('text-xs', status.className)}>{status.label}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{hasValidDate ? format(new Date(delivery.delivery_date), "d MMM yyyy", { locale: es }) : 'Sin fecha'}</span>
                        <span>{items.length} artículo(s)</span>
                        {delivery.delivered_by && <span>Entregó: {delivery.delivered_by}</span>}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  {delivery.observations && <p className="rounded-md bg-background p-3 text-sm text-muted-foreground">{delivery.observations}</p>}
                  {items.map((item: any) => {
                    const daysToExpire = differenceInDays(new Date(item.expiration_date), new Date());
                    const isExpired = daysToExpire < 0;
                    const isExpiringSoon = daysToExpire >= 0 && daysToExpire <= 30;

                    return (
                      <div key={item.id} className={cn('rounded-lg border p-3', isExpired && 'border-destructive/50 bg-destructive/5', isExpiringSoon && 'border-warning/50 bg-warning/5')}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className="font-medium">{item.item_name}</h5>
                              <Badge variant="secondary">{itemTypeLabels[item.item_type] || item.item_type}</Badge>
                              {item.size && <Badge variant="outline">Talla: {item.size}</Badge>}
                              {item.quantity > 1 && <Badge variant="outline">Cantidad: {item.quantity}</Badge>}
                            </div>
                            {item.item_description && <p className="text-sm text-muted-foreground">{item.item_description}</p>}
                          </div>
                          <div className="space-y-1 text-sm sm:text-right">
                            <p><span className="text-muted-foreground">Vence: </span><span className={cn(isExpired && 'font-medium text-destructive', isExpiringSoon && 'font-medium text-warning')}>{format(new Date(item.expiration_date), "d MMM yyyy", { locale: es })}</span></p>
                            {!isExpired && <p className="text-xs text-muted-foreground">{daysToExpire} días restantes</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          );
        })}
      </Accordion>
    </motion.div>
  );
}
