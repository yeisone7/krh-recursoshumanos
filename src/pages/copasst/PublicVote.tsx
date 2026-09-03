import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, LockKeyhole, Vote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { castCopasstVote, getCopasstBallot, verifyCopasstVoter } from '@/lib/copasst';
import type { CopasstPublicBallot } from '@/types/copasst';

type Step = 'identify' | 'ballot' | 'receipt';

export default function CopasstPublicVote() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [ballot, setBallot] = useState<CopasstPublicBallot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [document, setDocument] = useState('');
  const [selection, setSelection] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<Step>('identify');
  const [receipt, setReceipt] = useState('');

  useEffect(() => {
    let active = true;
    getCopasstBallot(token).then((data) => active && setBallot(data)).catch(() => active && setBallot({ valid: false })).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [token]);

  const identify = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setMessage('');
    try { const response = await verifyCopasstVoter(token, document); setMessage(response.message); if (response.eligible) setStep('ballot'); }
    catch { setMessage('No fue posible validar la información suministrada'); }
    finally { setSubmitting(false); }
  };

  const vote = async () => {
    if (!selection) { setMessage('Selecciona una opción para continuar'); return; }
    setSubmitting(true); setMessage('');
    try {
      const isBlank = selection === 'blank';
      const response = await castCopasstVote(token, document, isBlank ? null : selection, isBlank);
      setReceipt(response.receipt_code); setStep('receipt');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible registrar el voto'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-muted/30 p-4"><p>Cargando elección…</p></main>;
  if (!ballot?.valid || !ballot.election) return <PublicState icon={LockKeyhole} title="Enlace no disponible" text="El enlace es inválido, fue desactivado o la elección fue cancelada." />;
  if (ballot.election.status === 'scheduled') return <PublicState icon={Clock3} title="La elección aún no inicia" text={`Podrás votar desde ${new Date(ballot.election.starts_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}.`} />;
  if (ballot.election.status === 'closed') return <main className="min-h-screen bg-muted/30 p-4 sm:p-8"><div className="mx-auto max-w-3xl space-y-5"><ElectionHeader ballot={ballot} /><Card><CardHeader><CardTitle>Resultados finales</CardTitle><CardDescription>{ballot.results?.total_votes ?? 0} votos registrados · {ballot.results?.blank_votes ?? 0} en blanco</CardDescription></CardHeader><CardContent className="space-y-4">{ballot.results?.candidates.map((candidate) => { const percent = ballot.results?.total_votes ? Math.round(candidate.votes * 100 / ballot.results.total_votes) : 0; return <div key={candidate.id}><div className="mb-1 flex justify-between gap-3 text-sm"><span>{candidate.display_name}</span><strong>{candidate.votes} ({percent}%)</strong></div><Progress value={percent} /></div>; })}{ballot.results?.tie_pending && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Hay una resolución de empate pendiente para el último puesto.</p>}</CardContent></Card></div></main>;

  return <main className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background p-4 sm:p-8"><div className="mx-auto max-w-3xl space-y-5"><ElectionHeader ballot={ballot} />
    {step === 'identify' && <Card><CardHeader><CardTitle>Verifica que haces parte del censo</CardTitle><CardDescription>Ingresa tu documento sin puntos ni espacios. Esta verificación no se guarda junto a tu elección.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={identify}><div className="space-y-2"><Label htmlFor="document">Número de documento</Label><Input id="document" inputMode="numeric" autoComplete="off" value={document} onChange={(event) => setDocument(event.target.value)} required /></div>{message && <p className="text-sm text-destructive" role="alert">{message}</p>}<Button className="w-full" type="submit" disabled={submitting}>{submitting ? 'Validando…' : 'Continuar'}</Button></form></CardContent></Card>}
    {step === 'ballot' && <Card><CardHeader><CardTitle>Elige un representante</CardTitle><CardDescription>Selección única. Revisa tu opción: al confirmar no podrás modificarla.</CardDescription></CardHeader><CardContent className="space-y-5"><RadioGroup value={selection} onValueChange={setSelection} className="grid gap-3 sm:grid-cols-2">{ballot.candidates?.map((candidate) => <Label key={candidate.id} htmlFor={candidate.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${selection === candidate.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-muted/50'}`}><RadioGroupItem id={candidate.id} value={candidate.id} /><Avatar className="h-16 w-16"><AvatarImage src={candidate.photo_url} /><AvatarFallback>{candidate.display_name.slice(0, 2)}</AvatarFallback></Avatar><div><p className="font-semibold">{candidate.display_name}</p><p className="text-sm text-muted-foreground">{candidate.position_name ?? 'Sin cargo'}</p><p className="text-xs text-muted-foreground">{candidate.operation_center_name ?? 'Sin centro'}</p></div></Label>)}{ballot.election.allow_blank_vote && <Label htmlFor="blank" className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${selection === 'blank' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : ''}`}><RadioGroupItem id="blank" value="blank" /><div><p className="font-semibold">Voto en blanco</p><p className="text-sm text-muted-foreground">No se asigna a ningún candidato.</p></div></Label>}</RadioGroup>{message && <p className="text-sm text-destructive" role="alert">{message}</p>}<div className="flex gap-2"><Button variant="outline" onClick={() => setStep('identify')}>Atrás</Button><Button className="flex-1" onClick={vote} disabled={submitting}>{submitting ? 'Registrando…' : 'Confirmar voto'}</Button></div></CardContent></Card>}
    {step === 'receipt' && <Card className="text-center"><CardContent className="space-y-4 py-10"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" /><div><h2 className="text-2xl font-bold">Tu voto fue registrado</h2><p className="text-muted-foreground">Este comprobante confirma la participación, pero no revela ni permite reconstruir tu selección.</p></div><div className="rounded-lg bg-muted p-4 font-mono text-sm break-all">{receipt}</div></CardContent></Card>}
  </div></main>;
}

function ElectionHeader({ ballot }: { ballot: CopasstPublicBallot }) {
  return <Card><CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">{ballot.company?.logo_url ? <img src={ballot.company.logo_url} alt={`Logo de ${ballot.company.name}`} className="h-16 max-w-44 object-contain" /> : <div className="rounded-full bg-primary/10 p-4"><Vote className="h-8 w-8 text-primary" /></div>}<div><p className="text-sm font-medium text-primary">{ballot.company?.name}</p><h1 className="text-2xl font-bold">{ballot.election?.title}</h1><p className="text-muted-foreground">{ballot.election?.term_label}</p>{ballot.election?.description && <p className="mt-2 text-sm">{ballot.election.description}</p>}</div></CardContent></Card>;
}

function PublicState({ icon: Icon, title, text }: { icon: typeof Vote; title: string; text: string }) {
  return <main className="grid min-h-screen place-items-center bg-muted/30 p-4"><Card className="max-w-lg text-center"><CardContent className="space-y-3 py-10"><Icon className="mx-auto h-12 w-12 text-muted-foreground" /><h1 className="text-2xl font-bold">{title}</h1><p className="text-muted-foreground">{text}</p></CardContent></Card></main>;
}
