import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Clock3, Percent, Users } from 'lucide-react';
import type { CopasstSummary } from '@/types/copasst';

export function CopasstKpis({ summary }: { summary: CopasstSummary }) {
  const items = [
    { label: 'Habilitados', value: summary.eligible, icon: Users },
    { label: 'Votaron', value: summary.voted, icon: CheckCircle2 },
    { label: 'Pendientes', value: summary.pending, icon: Clock3 },
    { label: 'Participación', value: `${summary.participation}%`, icon: Percent },
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {items.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center justify-between p-5">
      <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>
      <div className="rounded-full bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div>
    </CardContent></Card>)}
  </div>;
}
