import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Gavel,
  Landmark,
  ListChecks,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
  WalletCards,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  ComplianceDomain,
  ComplianceObligation,
  CompliancePriority,
  ComplianceStatus,
  ComplianceTemplate,
  useComplianceEvidences,
  useComplianceObligations,
  useComplianceTemplates,
  useCreateComplianceEvidence,
  useCreateComplianceObligation,
  useDeleteComplianceObligation,
  useUpdateComplianceObligation,
} from '@/hooks/useCompliance';
import { cn } from '@/lib/utils';

const domainOptions: Array<{ value: ComplianceDomain | 'all'; label: string; short: string; icon: typeof ShieldCheck; color: string }> = [
  { value: 'all', label: 'Todos', short: 'ALL', icon: ShieldCheck, color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { value: 'pila_ugpp', label: 'PILA / UGPP', short: 'PILA', icon: Landmark, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { value: 'nomina_electronica', label: 'Nomina Electronica', short: 'DIAN', icon: FileCheck2, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'sg_sst', label: 'SG-SST', short: 'SST', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'documental_laboral', label: 'Documental', short: 'DOC', icon: FileText, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { value: 'juridico_laboral', label: 'Juridico', short: 'JUR', icon: Gavel, color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { value: 'contratos', label: 'Contratos', short: 'CTR', icon: ClipboardCheck, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'seguridad_social', label: 'Seguridad Social', short: 'SS', icon: WalletCards, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
];

const statusOptions: Array<{ value: ComplianceStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'cumplido', label: 'Cumplido' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'no_aplica', label: 'No aplica' },
];

const priorityOptions: Array<{ value: CompliancePriority; label: string }> = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Critica' },
];

const statusStyles: Record<ComplianceStatus, string> = {
  pendiente: 'bg-slate-100 text-slate-700 border-slate-200',
  en_proceso: 'bg-sky-100 text-sky-700 border-sky-200',
  cumplido: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  vencido: 'bg-red-100 text-red-700 border-red-200',
  no_aplica: 'bg-zinc-100 text-zinc-500 border-zinc-200',
};

const priorityStyles: Record<CompliancePriority, string> = {
  baja: 'bg-slate-100 text-slate-600',
  media: 'bg-sky-100 text-sky-700',
  alta: 'bg-amber-100 text-amber-700',
  critica: 'bg-red-100 text-red-700',
};

function domainLabel(domain: ComplianceDomain | 'all') {
  return domainOptions.find((option) => option.value === domain)?.label || domain;
}

function daysUntil(date?: string | null) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${date}T00:00:00`);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

function statusLabel(status: ComplianceStatus) {
  return statusOptions.find((option) => option.value === status)?.label || status;
}

function priorityLabel(priority: CompliancePriority) {
  return priorityOptions.find((option) => option.value === priority)?.label || priority;
}

function ObligationDialog({
  open,
  onOpenChange,
  templates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ComplianceTemplate[];
}) {
  const createObligation = useCreateComplianceObligation();
  const [templateId, setTemplateId] = useState('manual');
  const [domain, setDomain] = useState<ComplianceDomain>('pila_ugpp');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [legalReference, setLegalReference] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [periodLabel, setPeriodLabel] = useState('');
  const [priority, setPriority] = useState<CompliancePriority>('media');
  const [recurrence, setRecurrence] = useState('');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setTemplateId('manual');
    setDomain('pila_ugpp');
    setTitle('');
    setDescription('');
    setLegalReference('');
    setDueDate('');
    setPeriodLabel('');
    setPriority('media');
    setRecurrence('');
    setNotes('');
  };

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    if (id === 'manual') return;
    const template = templates.find((item) => item.id === id);
    if (!template) return;
    setDomain(template.domain);
    setTitle(template.title);
    setDescription(template.description || '');
    setLegalReference(template.legal_reference || '');
    setPriority(template.default_priority);
    setRecurrence(template.suggested_frequency || '');
    setNotes(template.recommended_evidence ? `Evidencia sugerida: ${template.recommended_evidence}` : '');
  };

  const handleSubmit = async () => {
    await createObligation.mutateAsync({
      template_id: templateId === 'manual' ? null : templateId,
      domain,
      title,
      description,
      legal_reference: legalReference,
      due_date: dueDate || null,
      period_label: periodLabel || null,
      recurrence: recurrence || null,
      priority,
      notes,
      status: 'pendiente',
      progress: 0,
      requires_evidence: true,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-hidden rounded-[28px] border-slate-200 bg-white p-0">
        <DialogHeader className="border-b border-slate-100 bg-slate-50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-sky-100 text-sky-600">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black text-slate-950">Nueva obligacion</DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Registra un compromiso de cumplimiento con responsable, fecha y evidencia.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(92vh-178px)] space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <Label>Plantilla base</Label>
            <Select value={templateId} onValueChange={applyTemplate}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Crear manualmente</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {domainLabel(template.domain)} - {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Dominio</Label>
              <Select value={domain} onValueChange={(value) => setDomain(value as ComplianceDomain)}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {domainOptions.filter((option) => option.value !== 'all').map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as CompliancePriority)}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Titulo</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Validacion PILA mayo 2026" className="h-12 rounded-xl" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Input value={dueDate} onChange={(event) => setDueDate(event.target.value)} type="date" className="h-12 rounded-xl" />
            <Input value={periodLabel} onChange={(event) => setPeriodLabel(event.target.value)} placeholder="Periodo, ej. mayo 2026" className="h-12 rounded-xl" />
            <Input value={recurrence} onChange={(event) => setRecurrence(event.target.value)} placeholder="Frecuencia" className="h-12 rounded-xl" />
          </div>

          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descripcion de la obligacion" className="min-h-24 rounded-xl" />
          <Textarea value={legalReference} onChange={(event) => setLegalReference(event.target.value)} placeholder="Referencia normativa o interna" className="min-h-20 rounded-xl" />
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notas y evidencia esperada" className="min-h-24 rounded-xl" />
        </div>

        <DialogFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || createObligation.isPending} className="rounded-xl bg-sky-500 hover:bg-sky-600">
            Crear obligacion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EvidenceDialog({
  obligation,
  open,
  onOpenChange,
}: {
  obligation: ComplianceObligation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createEvidence = useCreateComplianceEvidence();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const reset = () => {
    setTitle('');
    setDescription('');
    setFileUrl('');
  };

  const handleSubmit = async () => {
    if (!obligation) return;
    await createEvidence.mutateAsync({
      obligation_id: obligation.id,
      title,
      description,
      file_url: fileUrl || null,
      file_name: fileUrl ? fileUrl.split('/').pop() : null,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent className="max-w-xl rounded-[28px] border-slate-200 bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-950">Registrar evidencia</DialogTitle>
          <DialogDescription>{obligation?.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nombre de la evidencia" className="h-12 rounded-xl" />
          <Input value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} placeholder="URL del archivo o soporte" className="h-12 rounded-xl" />
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descripcion o nota" className="min-h-28 rounded-xl" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || createEvidence.isPending} className="rounded-xl bg-sky-500 hover:bg-sky-600">
            Guardar evidencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ObligationCard({
  obligation,
  evidenceCount,
  canUpdate,
  canDelete,
  onEvidence,
}: {
  obligation: ComplianceObligation;
  evidenceCount: number;
  canUpdate: boolean;
  canDelete: boolean;
  onEvidence: (obligation: ComplianceObligation) => void;
}) {
  const updateObligation = useUpdateComplianceObligation();
  const deleteObligation = useDeleteComplianceObligation();
  const domain = domainOptions.find((option) => option.value === obligation.domain) || domainOptions[0];
  const DomainIcon = domain.icon;
  const remaining = daysUntil(obligation.due_date);
  const isOverdue = remaining !== null && remaining < 0 && !['cumplido', 'no_aplica'].includes(obligation.status);

  return (
    <Card className={cn('overflow-hidden rounded-3xl border bg-white shadow-sm', isOverdue ? 'border-red-200' : 'border-slate-200')}>
      <CardContent className="p-0">
        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="flex min-w-0 gap-4">
            <div className={cn('grid size-14 shrink-0 place-items-center rounded-2xl border', domain.color)}>
              <DomainIcon className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full border-slate-200 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                  {domain.label}
                </Badge>
                <Badge className={cn('rounded-full border text-[10px] font-black uppercase tracking-[0.12em]', statusStyles[obligation.status])}>
                  {statusLabel(obligation.status)}
                </Badge>
                <Badge className={cn('rounded-full text-[10px] font-black uppercase tracking-[0.12em]', priorityStyles[obligation.priority])}>
                  {priorityLabel(obligation.priority)}
                </Badge>
              </div>
              <h3 className="text-lg font-black leading-tight text-slate-950">{obligation.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{obligation.description || 'Sin descripcion registrada.'}</p>
              <div className="mt-4 grid gap-3 text-xs font-bold text-slate-500 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="block text-[10px] uppercase tracking-[0.12em] text-slate-400">Vence</span>
                  <span className={cn('mt-1 block', isOverdue && 'text-red-600')}>{obligation.due_date || 'Sin fecha'}</span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="block text-[10px] uppercase tracking-[0.12em] text-slate-400">Periodo</span>
                  <span className="mt-1 block">{obligation.period_label || 'General'}</span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="block text-[10px] uppercase tracking-[0.12em] text-slate-400">Evidencias</span>
                  <span className="mt-1 block">{evidenceCount} registradas</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-56 lg:grid-cols-1">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                <span>Avance</span>
                <span>{obligation.progress}%</span>
              </div>
              <Progress value={obligation.progress} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => onEvidence(obligation)}>
                <UploadCloud className="mr-2 size-4" />
                Evidencia
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={!canUpdate || updateObligation.isPending}
                onClick={() => updateObligation.mutate({ id: obligation.id, status: 'cumplido', progress: 100 })}
              >
                <CheckCircle2 className="mr-2 size-4" />
                Cumplir
              </Button>
              <Select
                value={obligation.status}
                disabled={!canUpdate}
                onValueChange={(status) => updateObligation.mutate({ id: obligation.id, status: status as ComplianceStatus })}
              >
                <SelectTrigger className="col-span-2 h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.filter((option) => option.value !== 'all').map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="col-span-2 rounded-xl text-red-500 hover:text-red-600"
                disabled={!canDelete || deleteObligation.isPending}
                onClick={() => deleteObligation.mutate(obligation.id)}
              >
                <Trash2 className="mr-2 size-4" />
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CumplimientoLaboral() {
  const [domain, setDomain] = useState<ComplianceDomain | 'all'>('all');
  const [status, setStatus] = useState<ComplianceStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [evidenceTarget, setEvidenceTarget] = useState<ComplianceObligation | null>(null);
  const { canCreate, canUpdate, canDelete } = useAuth();
  const templatesQuery = useComplianceTemplates();
  const obligationsQuery = useComplianceObligations(domain);
  const obligations = obligationsQuery.data || [];
  const obligationIds = useMemo(() => obligations.map((item) => item.id), [obligations]);
  const evidencesQuery = useComplianceEvidences(obligationIds);
  const evidences = evidencesQuery.data || [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return obligations.filter((item) => {
      const matchesStatus = status === 'all' || item.status === status;
      const matchesSearch = !term || [item.title, item.description, item.legal_reference, item.period_label]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [obligations, search, status]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const open = obligations.filter((item) => !['cumplido', 'no_aplica'].includes(item.status));
    const overdue = open.filter((item) => {
      const remaining = daysUntil(item.due_date);
      return remaining !== null && remaining < 0;
    }).length;
    const next15 = open.filter((item) => {
      const remaining = daysUntil(item.due_date);
      return remaining !== null && remaining >= 0 && remaining <= 15;
    }).length;
    const completed = obligations.filter((item) => item.status === 'cumplido').length;
    const complianceRate = obligations.length ? Math.round((completed / obligations.length) * 100) : 0;
    return { open: open.length, overdue, next15, completed, complianceRate };
  }, [obligations]);

  const evidenceCountByObligation = useMemo(() => {
    return evidences.reduce<Record<string, number>>((acc, evidence) => {
      acc[evidence.obligation_id] = (acc[evidence.obligation_id] || 0) + 1;
      return acc;
    }, {});
  }, [evidences]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-bl-full bg-sky-50" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid size-16 place-items-center rounded-3xl bg-sky-100 text-sky-600">
                <ShieldCheck className="size-8" />
              </div>
              <div>
                <Badge className="mb-2 rounded-full bg-sky-100 text-sky-700">Cumplimiento Colombia</Badge>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Cumplimiento Laboral</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Controla obligaciones de PILA/UGPP, nomina electronica, SG-SST, expedientes, contratos y casos laborales con evidencias y vencimientos.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setDialogOpen(true)}
              disabled={!canCreate('cumplimiento_laboral')}
              className="h-12 rounded-2xl bg-sky-500 px-5 font-black hover:bg-sky-600"
            >
              <Plus className="mr-2 size-4" />
              Nueva obligacion
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Abiertas', value: stats.open, helper: 'En seguimiento', icon: ListChecks, color: 'text-sky-600 bg-sky-50' },
          { label: 'Vencidas', value: stats.overdue, helper: 'Requieren accion', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
          { label: 'Proximas', value: stats.next15, helper: '0 a 15 dias', icon: CalendarDays, color: 'text-amber-600 bg-amber-50' },
          { label: 'Cumplidas', value: stats.completed, helper: 'Con cierre registrado', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Cumplimiento', value: `${stats.complianceRate}%`, helper: 'Avance general', icon: BookOpenCheck, color: 'text-violet-600 bg-violet-50' },
        ].map((metric) => (
          <Card key={metric.label} className="rounded-3xl border-slate-200 bg-white shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{metric.label}</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{metric.value}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{metric.helper}</p>
              </div>
              <div className={cn('grid size-12 place-items-center rounded-2xl', metric.color)}>
                <metric.icon className="size-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-100 p-1">
        <div className="grid gap-1 md:grid-cols-4 xl:grid-cols-8">
          {domainOptions.map((option) => {
            const Icon = option.icon;
            const active = domain === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setDomain(option.value)}
                className={cn(
                  'flex h-12 items-center justify-center gap-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.12em] transition',
                  active ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:bg-white/60'
                )}
              >
                <Icon className="size-4" />
                {option.short}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_220px]">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por obligacion, periodo, referencia o descripcion..." className="h-12 rounded-2xl" />
        <Select value={status} onValueChange={(value) => setStatus(value as ComplianceStatus | 'all')}>
          <SelectTrigger className="h-12 rounded-2xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {obligationsQuery.isLoading ? (
        <div className="grid min-h-64 place-items-center rounded-3xl border border-slate-200 bg-white text-slate-500">
          Cargando cumplimiento...
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((obligation) => (
            <ObligationCard
              key={obligation.id}
              obligation={obligation}
              evidenceCount={evidenceCountByObligation[obligation.id] || 0}
              canUpdate={canUpdate('cumplimiento_laboral')}
              canDelete={canDelete('cumplimiento_laboral')}
              onEvidence={(item) => setEvidenceTarget(item)}
            />
          ))}
        </div>
      ) : (
        <div className="grid min-h-72 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div>
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-sky-50 text-sky-500">
              <ShieldCheck className="size-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Sin obligaciones registradas</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Crea obligaciones desde plantillas para iniciar el control legal y operativo de la empresa.
            </p>
          </div>
        </div>
      )}

      <ObligationDialog open={dialogOpen} onOpenChange={setDialogOpen} templates={templatesQuery.data || []} />
      <EvidenceDialog obligation={evidenceTarget} open={!!evidenceTarget} onOpenChange={(open) => !open && setEvidenceTarget(null)} />
    </div>
  );
}
