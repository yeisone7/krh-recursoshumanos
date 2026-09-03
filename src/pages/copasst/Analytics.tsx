import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Download, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopasstElectionSelect } from '@/components/copasst/CopasstElectionSelect';
import { CopasstKpis } from '@/components/copasst/CopasstKpis';
import { COPASST_PERMISSIONS, getCopasstAnalytics, listCopasstElections, logCopasstExport, resolveCopasstTie } from '@/lib/copasst';
import type { CopasstSegment } from '@/types/copasst';

export default function CopasstAnalytics() {
  const { currentCompanyId, canExport, canUpdate } = useAuth();
  const queryClient = useQueryClient();
  const [electionId, setElectionId] = useState('');
  const [tieOpen, setTieOpen] = useState(false);
  const [tieSelection, setTieSelection] = useState<string[]>([]);
  const [tieNote, setTieNote] = useState('');
  const elections = useQuery({ queryKey: ['copasst-elections', currentCompanyId], queryFn: () => listCopasstElections(currentCompanyId!), enabled: !!currentCompanyId });
  const analytics = useQuery({ queryKey: ['copasst-analytics', electionId], queryFn: () => getCopasstAnalytics(electionId), enabled: !!electionId });
  const selectedElection = elections.data?.find((row) => row.id === electionId);
  const automaticWinnerCount = analytics.data?.results.winners.length ?? 0;
  const slotsLeft = Math.max(0, (analytics.data?.election.seats ?? 0) - automaticWinnerCount);
  const boundaryVotes = analytics.data?.results.candidates[analytics.data.election.seats - 1]?.votes;
  const tiedCandidates = useMemo(() => {
    const winners = new Set(analytics.data?.results.winners.map((winner) => winner.candidate_id));
    return analytics.data?.results.candidates.filter((candidate) => candidate.votes === boundaryVotes && !winners.has(candidate.id)) ?? [];
  }, [analytics.data, boundaryVotes]);
  const tieMutation = useMutation({ mutationFn: () => resolveCopasstTie(electionId, tieSelection, tieNote), onSuccess: () => { toast.success('Empate resuelto'); setTieOpen(false); queryClient.invalidateQueries({ queryKey: ['copasst-analytics', electionId] }); }, onError: (error: Error) => toast.error(error.message) });

  const exportPdf = async () => {
    if (!analytics.data || !selectedElection) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF(); const data = analytics.data; let y = 20;
    doc.setFontSize(18); doc.text('Acta de resultados COPASST', 14, y); y += 10;
    doc.setFontSize(11); [
      `Elección: ${data.election.title}`, `Período: ${data.election.term_label}`,
      `Inicio: ${new Date(data.election.starts_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`,
      `Cierre: ${new Date(data.election.ends_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`,
      `Puestos: ${data.election.seats}`, `Habilitados: ${data.kpis.eligible}`, `Votos: ${data.kpis.voted}`,
      `Participación: ${data.kpis.participation}%`, `Votos en blanco: ${data.results.blank_votes}`,
    ].forEach((line) => { doc.text(line, 14, y); y += 7; });
    y += 3; doc.setFontSize(14); doc.text('Conteo por candidato', 14, y); y += 8; doc.setFontSize(11);
    data.results.candidates.forEach((candidate, index) => { doc.text(`${index + 1}. ${candidate.display_name}: ${candidate.votes} voto(s)`, 18, y); y += 7; if (y > 275) { doc.addPage(); y = 20; } });
    y += 3; doc.text(data.results.tie_pending ? 'Estado: resolución de empate pendiente.' : 'Estado: resultados definidos.', 14, y); y += 8;
    data.results.winners.forEach((winner) => { const candidate = data.results.candidates.find((item) => item.id === winner.candidate_id); doc.text(`Ganador ${winner.selection_order}: ${candidate?.display_name ?? winner.candidate_id}${winner.resolution_note ? ` — ${winner.resolution_note}` : ''}`, 14, y); y += 7; });
    doc.save(`acta-copasst-${data.election.term_label.replace(/\s+/g, '-')}.pdf`); await logCopasstExport(electionId, 'minutes_pdf'); toast.success('Acta PDF generada');
  };

  return <div className="space-y-6 p-4 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold">Analítica COPASST</h1><p className="text-muted-foreground">Resultados agregados y participación por dimensiones congeladas.</p></div>{canExport(COPASST_PERMISSIONS.analytics) && <Button variant="outline" onClick={exportPdf} disabled={!analytics.data}><Download className="mr-2 h-4 w-4" />Generar acta PDF</Button>}</div>
    <CopasstElectionSelect elections={elections.data ?? []} value={electionId} onChange={setElectionId} />
    {analytics.data && <><CopasstKpis summary={analytics.data.kpis} />
      <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Resultados</CardTitle><CardDescription>{analytics.data.election.seats} puesto(s) · {analytics.data.results.blank_votes} voto(s) en blanco</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={320}><BarChart data={analytics.data.results.candidates} layout="vertical" margin={{ left: 30 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="display_name" width={120} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="votes" name="Votos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
      <Card><CardHeader><CardTitle>Evolución de participación</CardTitle><CardDescription>Acumulación horaria o diaria según la duración.</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={320}><LineChart data={analytics.data.timeline.map((item, index, all) => ({ ...item, total: all.slice(0, index + 1).reduce((sum, row) => sum + row.votes, 0), label: new Date(item.bucket).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' }) }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="total" name="Participantes" stroke="hsl(var(--primary))" strokeWidth={3} /></LineChart></ResponsiveContainer></CardContent></Card></div>
      {analytics.data.results.tie_pending && <Card className="border-amber-300"><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><AlertTriangle className="h-5 w-5 text-amber-600" /><div><p className="font-semibold">Resolución pendiente</p><p className="text-sm text-muted-foreground">Hay empate por el último puesto. Los votos originales no se modificarán.</p></div></div>{canUpdate(COPASST_PERMISSIONS.elections) && <Button onClick={() => setTieOpen(true)}>Resolver empate</Button>}</CardContent></Card>}
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" />Ganadores</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{analytics.data.results.winners.map((winner) => { const candidate = analytics.data!.results.candidates.find((row) => row.id === winner.candidate_id); return <div key={winner.candidate_id} className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Puesto {winner.selection_order}</p><p className="font-semibold">{candidate?.display_name}</p><p className="text-sm text-muted-foreground">{candidate?.votes} votos · {winner.selection_source === 'automatic' ? 'Automático' : 'Desempate'}</p></div>; })}{!analytics.data.results.winners.length && <p className="text-sm text-muted-foreground">Los ganadores se determinan al cerrar la elección.</p>}</CardContent></Card>
      <Tabs defaultValue="gender"><TabsList className="flex h-auto flex-wrap"><TabsTrigger value="gender">Sexo</TabsTrigger><TabsTrigger value="center">Centro</TabsTrigger><TabsTrigger value="area">Área</TabsTrigger><TabsTrigger value="position">Cargo</TabsTrigger></TabsList>{(['gender', 'center', 'area', 'position'] as const).map((key) => <TabsContent key={key} value={key}><SegmentChart data={analytics.data!.segments[key]} /></TabsContent>)}</Tabs>
      <Card><CardHeader><CardTitle>Calidad de datos</CardTitle><CardDescription>Categorías faltantes en el censo congelado.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-4">{Object.entries({ Sexo: analytics.data.quality.missing_gender, Centro: analytics.data.quality.missing_center, Área: analytics.data.quality.missing_area, Cargo: analytics.data.quality.missing_position }).map(([label, value]) => <div key={label} className="rounded-lg bg-muted p-4"><p className="text-sm text-muted-foreground">Sin {label.toLowerCase()}</p><p className="text-2xl font-bold">{value}</p></div>)}</CardContent></Card>
    </>}
    {!electionId && <p className="rounded-md border border-dashed p-10 text-center text-muted-foreground">Selecciona una elección para cargar sus indicadores.</p>}
    <Dialog open={tieOpen} onOpenChange={setTieOpen}><DialogContent><DialogHeader><DialogTitle>Resolver empate</DialogTitle><DialogDescription>Selecciona exactamente {slotsLeft} candidato(s) y registra la justificación. Esta acción queda auditada.</DialogDescription></DialogHeader><div className="space-y-3">{tiedCandidates.map((candidate) => <Label key={candidate.id} className="flex items-center gap-3 rounded-md border p-3"><Checkbox checked={tieSelection.includes(candidate.id)} onCheckedChange={(checked) => setTieSelection((current) => checked ? [...current, candidate.id] : current.filter((id) => id !== candidate.id))} />{candidate.display_name} · {candidate.votes} votos</Label>)}<Textarea placeholder="Observación obligatoria" value={tieNote} onChange={(event) => setTieNote(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setTieOpen(false)}>Cancelar</Button><Button disabled={tieSelection.length !== slotsLeft || tieNote.trim().length < 5 || tieMutation.isPending} onClick={() => tieMutation.mutate()}>Confirmar resolución</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function SegmentChart({ data }: { data: CopasstSegment[] }) {
  return <Card><CardHeader><CardTitle>Participación por segmento</CardTitle><CardDescription>Solo participación agregada; no se cruza la preferencia electoral.</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={360}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={70} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="eligible" name="Habilitados" fill="#94a3b8" /><Bar dataKey="voted" name="Votaron" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer></CardContent></Card>;
}
