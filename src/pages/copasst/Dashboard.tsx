import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart3, ClipboardCheck, Settings2, Vote } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopasstElectionSelect } from '@/components/copasst/CopasstElectionSelect';
import { CopasstKpis } from '@/components/copasst/CopasstKpis';
import { getCopasstAnalytics, getEffectiveCopasstStatus, listCopasstElections } from '@/lib/copasst';

export default function CopasstDashboard() {
  const { currentCompanyId } = useAuth();
  const [electionId, setElectionId] = useState('');
  const elections = useQuery({ queryKey: ['copasst-elections', currentCompanyId], queryFn: () => listCopasstElections(currentCompanyId!), enabled: !!currentCompanyId });
  useEffect(() => { if (!electionId && elections.data?.length) setElectionId(elections.data[0].id); }, [electionId, elections.data]);
  const analytics = useQuery({ queryKey: ['copasst-analytics', electionId], queryFn: () => getCopasstAnalytics(electionId), enabled: !!electionId });
  const selected = elections.data?.find((row) => row.id === electionId);
  return <div className="space-y-6 p-4 sm:p-6"><div><h1 className="text-3xl font-bold">COPASST</h1><p className="text-muted-foreground">Elecciones internas, cumplimiento y resultados con privacidad por diseño.</p></div>
    <div className="grid gap-4 md:grid-cols-3">{[
      { title: 'Elecciones', description: 'Crear, publicar y administrar enlaces.', icon: Settings2, href: '/copasst/elecciones' },
      { title: 'Cumplimiento', description: 'Votantes, pendientes y censo.', icon: ClipboardCheck, href: '/copasst/cumplimiento' },
      { title: 'Analítica', description: 'Resultados, segmentos y evidencias.', icon: BarChart3, href: '/copasst/analitica' },
    ].map(({ title, description, icon: Icon, href }) => <Card key={title}><CardHeader><Icon className="h-6 w-6 text-primary" /><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><Button variant="outline" asChild><Link to={href}>Abrir</Link></Button></CardContent></Card>)}</div>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><CopasstElectionSelect elections={elections.data ?? []} value={electionId} onChange={setElectionId} />{selected && <Badge variant="secondary" className="w-fit">{getEffectiveCopasstStatus(selected)}</Badge>}</div>
    {analytics.data ? <><CopasstKpis summary={analytics.data.kpis} /><div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Conteo actual</CardTitle><CardDescription>Visible únicamente para usuarios autorizados.</CardDescription></CardHeader><CardContent className="space-y-3">{analytics.data.results.candidates.slice(0, 6).map((candidate, index) => <div key={candidate.id} className="flex items-center justify-between rounded-md border p-3"><span>{index + 1}. {candidate.display_name}</span><strong>{candidate.votes}</strong></div>)}<div className="flex justify-between rounded-md bg-muted p-3"><span>Voto en blanco</span><strong>{analytics.data.results.blank_votes}</strong></div></CardContent></Card><Card><CardHeader><CardTitle>Estado de la elección</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-lg bg-primary/5 p-5 text-center"><Vote className="mx-auto mb-2 h-8 w-8 text-primary" /><p className="text-3xl font-bold">{analytics.data.kpis.participation}%</p><p className="text-sm text-muted-foreground">participación total</p></div><Button className="w-full" asChild><Link to="/copasst/analitica">Ver analítica completa</Link></Button></CardContent></Card></div></> : <p className="rounded-md border border-dashed p-10 text-center text-muted-foreground">Crea o selecciona una elección para ver el resumen.</p>}
  </div>;
}
