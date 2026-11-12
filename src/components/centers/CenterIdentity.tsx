import { differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import type { Tables } from '@/integrations/supabase/types';
import { formatDateOnly, parseDateOnly } from '@/lib/dateOnly';

export type CenterProfile = Pick<Tables<'operation_centers'>,
  'id' | 'name' | 'code' | 'city' | 'department' | 'address' | 'phone' | 'manager_name' |
  'main_client' | 'is_active' | 'contract_start_date' | 'contract_commercial_date' | 'notes'>;

export function CenterStatus({ active }: { active: boolean | null }) {
  if (active === false) return <Badge variant="secondary">Inactivo</Badge>;

  return (
    <Badge variant="outline" className="gap-1.5 border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      Activo
    </Badge>
  );
}

export function CenterDate({ date }: { date: string | null }) {
  if (!date) return <>Sin definir</>;
  return <time dateTime={date}>{formatDateOnly(date, 'dd MMM yyyy', { locale: es }) || 'Sin definir'}</time>;
}

export function CenterContractStatus({ endDate }: { endDate: string | null }) {
  const date = parseDateOnly(endDate);
  if (!date) return <span className="text-xs text-muted-foreground">Sin fecha de vencimiento</span>;

  const days = differenceInCalendarDays(date, new Date());
  if (days === 0) return <Badge variant="destructive">Vence hoy</Badge>;
  if (days < 0) return <Badge variant="destructive">Vencido hace {Math.abs(days)} {days === -1 ? 'día' : 'días'}</Badge>;
  if (days <= 7) return <Badge variant="destructive">Vence en {days} {days === 1 ? 'día' : 'días'}</Badge>;
  if (days <= 30) {
    return <Badge variant="outline" className="border-amber-600/20 bg-amber-500/10 text-amber-800 dark:text-amber-300">Vence en {days} días</Badge>;
  }
  return <Badge variant="secondary">{days} días restantes</Badge>;
}
