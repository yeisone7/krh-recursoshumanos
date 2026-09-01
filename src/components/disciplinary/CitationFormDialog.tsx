import { useEffect, useState } from 'react';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DisciplinaryProcessWithEmployee, DisciplinaryQuestion } from '@/types/disciplinary';
import { useConfigureCitation } from '@/hooks/useDisciplinaryProcesses';
import { toast } from '@/hooks/use-toast';

const DEFAULT_QUESTIONS = [
  '¿Entiende sus derechos y la diligencia que se llevará a cabo?',
  '¿Conoce el motivo por el cual se encuentra en esta diligencia y cómo fue notificado?',
  '¿Conoce las obligaciones de su cargo y las normas internas relacionadas con los hechos?',
  'Explique libremente su versión de los hechos reportados.',
  '¿Desea aportar o solicitar alguna prueba?',
  '¿Tiene algo más que agregar que no se le haya preguntado?',
  '¿Considera que la empresa respetó su dignidad y le permitió ejercer su derecho de defensa?',
];

interface CitationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  process: DisciplinaryProcessWithEmployee;
}

export function CitationFormDialog({ open, onOpenChange, process }: CitationFormDialogProps) {
  const configureCitation = useConfigureCitation();
  const [place, setPlace] = useState(process.citation_place || 'Bucaramanga (Santander)');
  const [hearingDate, setHearingDate] = useState(process.hearing_date?.slice(0, 16) || '');
  const [method, setMethod] = useState(process.hearing_method || 'videoconferencia');
  const [location, setLocation] = useState(process.hearing_location || '');
  const [platform, setPlatform] = useState(process.hearing_platform || 'Google Meet');
  const [link, setLink] = useState(process.hearing_link || '');
  const [deadlineDays, setDeadlineDays] = useState(process.defense_deadline_days || 5);
  const [proofTransfer, setProofTransfer] = useState(process.proof_transfer || '');
  const [senderName, setSenderName] = useState(process.citation_sender_name || '');
  const [senderRole, setSenderRole] = useState(process.citation_sender_role || 'Dirección Jurídica y de Relaciones Laborales');
  const [questions, setQuestions] = useState<DisciplinaryQuestion[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuestions(process.hearing_questions?.length
      ? process.hearing_questions
      : DEFAULT_QUESTIONS.map((question) => ({ id: crypto.randomUUID(), question, required: true })));
  }, [open, process.hearing_questions]);

  const updateQuestion = (id: string, question: string) => {
    setQuestions((items) => items.map((item) => item.id === id ? { ...item, question } : item));
  };

  const handleSubmit = async () => {
    if (!hearingDate || !place.trim() || !senderName.trim() || questions.some((item) => !item.question.trim())) {
      toast({ title: 'Complete la citación', description: 'Fecha, lugar, responsable y preguntas son obligatorios.', variant: 'destructive' });
      return;
    }
    await configureCitation.mutateAsync({
      processId: process.id,
      currentStatus: process.status,
      data: {
        citation_place: place.trim(),
        hearing_date: new Date(hearingDate).toISOString(),
        hearing_method: method,
        hearing_location: location.trim() || undefined,
        hearing_platform: method === 'videoconferencia' ? platform.trim() : undefined,
        hearing_link: method === 'videoconferencia' ? link.trim() : undefined,
        defense_deadline_days: deadlineDays,
        proof_transfer: proofTransfer.trim() || undefined,
        citation_sender_name: senderName.trim(),
        citation_sender_role: senderRole.trim(),
        hearing_questions: questions,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl flex-col overflow-hidden p-0 sm:max-h-[95vh] sm:h-auto">
        <DialogHeader className="border-b bg-primary/5 px-6 py-6">
          <DialogTitle className="flex items-center gap-2 text-2xl font-black"><CalendarClock className="h-6 w-6 text-primary" /> Preparar citación a descargos</DialogTitle>
          <p className="text-sm text-muted-foreground">Configure la diligencia y el cuestionario que verá el trabajador.</p>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Lugar de expedición *</Label><Input value={place} onChange={(e) => setPlace(e.target.value)} /></div>
            <div className="space-y-2"><Label>Fecha y hora de la diligencia *</Label><Input type="datetime-local" value={hearingDate} onChange={(e) => setHearingDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Modalidad *</Label><Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="videoconferencia">Videoconferencia</SelectItem><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="escrito">Respuesta escrita por enlace</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Días hábiles para la defensa</Label><Input type="number" min={1} max={30} value={deadlineDays} onChange={(e) => setDeadlineDays(Number(e.target.value))} /></div>
            {method === 'videoconferencia' ? <>
              <div className="space-y-2"><Label>Plataforma</Label><Input value={platform} onChange={(e) => setPlatform(e.target.value)} /></div>
              <div className="space-y-2"><Label>Enlace de reunión</Label><Input value={link} onChange={(e) => setLink(e.target.value)} /></div>
            </> : <div className="space-y-2 sm:col-span-2"><Label>Lugar de la diligencia</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>}
            <div className="space-y-2"><Label>Quien cita *</Label><Input value={senderName} onChange={(e) => setSenderName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Cargo</Label><Input value={senderRole} onChange={(e) => setSenderRole(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Traslado de pruebas</Label><Textarea className="min-h-[100px]" value={proofTransfer} onChange={(e) => setProofTransfer(e.target.value)} placeholder="Enumere las pruebas que se ponen en conocimiento del trabajador." /></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><div><Label>Preguntas para el acta</Label><p className="text-xs text-muted-foreground">Puede agregar, editar o retirar preguntas según el caso.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setQuestions((items) => [...items, { id: crypto.randomUUID(), question: '', required: true }])}><Plus className="mr-1 h-4 w-4" /> Pregunta</Button></div>
            {questions.map((item, index) => <div key={item.id} className="flex gap-2"><Textarea className="min-h-[72px]" value={item.question} onChange={(e) => updateQuestion(item.id, e.target.value)} placeholder={`Pregunta ${index + 1}`} /><Button type="button" variant="ghost" size="icon" onClick={() => setQuestions((items) => items.filter((question) => question.id !== item.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t p-5"><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleSubmit} disabled={configureCitation.isPending}>{configureCitation.isPending ? 'Guardando...' : 'Guardar citación'}</Button></div>
      </DialogContent>
    </Dialog>
  );
}
