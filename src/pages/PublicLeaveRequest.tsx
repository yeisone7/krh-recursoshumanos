import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileUp,
  Loader2,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Database } from '@/integrations/supabase/types';
import { buildDateOnlyFromParts, todayDateOnlyString } from '@/lib/dateOnly';
import { cn } from '@/lib/utils';
import { LeaveDurationType, LEAVE_DURATION_TYPE_LABELS } from '@/types/leave';

type PageStep = 'loading' | 'invalid' | 'identify' | 'request' | 'success';

interface PublicCompany {
  name: string;
  horizontal_logo_url?: string | null;
}

interface PublicLeaveType {
  leave_type: string;
  display_name: string;
  description?: string | null;
  requires_document: boolean;
  document_description?: string | null;
  min_days_advance?: number | null;
  allows_half_day: boolean;
  allows_hours: boolean;
}

interface FunctionResult<T> {
  data: T | null;
  error: unknown;
}

interface FunctionErrorLike {
  message?: string;
  context?: { json?: () => Promise<{ error?: string }> };
}

const publicSupabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storageKey: 'empatiq-public-leave-auth',
    },
  },
);

async function errorMessage(error: unknown, fallback: string) {
  const functionError = error as FunctionErrorLike | null;
  try {
    const payload = await functionError?.context?.json?.();
    return payload?.error || fallback;
  } catch {
    return functionError?.message || fallback;
  }
}

const REQUEST_STEPS = [
  { label: 'Identifícate', description: 'Confirma tus datos' },
  { label: 'Completa', description: 'Cuéntanos tu solicitud' },
  { label: 'Radica', description: 'Recibe tu número' },
];

const BIRTH_MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const BIRTH_DAYS = Array.from({ length: 31 }, (_, index) => String(index + 1));
const MIN_BIRTH_YEAR = 1900;
const CURRENT_YEAR = new Date().getFullYear();

function CompanyIdentity({ company }: { company: PublicCompany | null }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {company?.horizontal_logo_url ? (
        <div className="flex h-11 max-w-[152px] shrink-0 items-center rounded-xl border border-border/70 bg-card px-3 sm:max-w-[190px]">
          <img
            src={company.horizontal_logo_url}
            alt={`Logo de ${company.name}`}
            className="max-h-7 w-full object-contain object-left"
          />
        </div>
      ) : (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Building2 className="size-5" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold text-foreground sm:text-base">
          {company?.name || 'Portal de colaboradores'}
        </p>
        <p className="text-xs font-medium text-muted-foreground">Solicitud de permisos</p>
      </div>
    </div>
  );
}

function RequestProgress({ current }: { current: number }) {
  return (
    <nav aria-label={`Progreso de la solicitud. Etapa ${current} de 3`} className="border-b border-border/70 px-4 py-4 sm:px-7">
      <ol className="grid grid-cols-3 gap-2 sm:gap-4">
        {REQUEST_STEPS.map((item, index) => {
          const position = index + 1;
          const isActive = position === current;
          const isComplete = position < current;
          return (
            <li key={item.label} className="relative flex min-w-0 items-center gap-2 sm:gap-3" aria-current={isActive ? 'step' : undefined}>
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute right-[calc(100%+0.25rem)] top-4 hidden h-px w-[calc(100%-2.5rem)] sm:block',
                    isComplete || isActive ? 'bg-primary/50' : 'bg-border',
                  )}
                />
              )}
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold transition-colors',
                  isActive && 'border-primary bg-primary text-primary-foreground',
                  isComplete && 'border-primary/25 bg-primary/10 text-primary',
                  !isActive && !isComplete && 'border-border bg-muted/60 text-muted-foreground',
                )}
              >
                {isComplete ? <CheckCircle2 className="size-4" aria-hidden="true" /> : position}
              </span>
              <span className="min-w-0">
                <span className={cn('block truncate text-[11px] font-bold sm:text-sm', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                  {item.label}
                </span>
                <span className="hidden truncate text-[11px] text-muted-foreground md:block">{item.description}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function PublicLeaveRequest() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() || '';
  const [step, setStep] = useState<PageStep>('loading');
  const [company, setCompany] = useState<PublicCompany | null>(null);
  const [documentType, setDocumentType] = useState('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [session, setSession] = useState('');
  const [firstName, setFirstName] = useState('');
  const [leaveTypes, setLeaveTypes] = useState<PublicLeaveType[]>([]);
  const [leaveType, setLeaveType] = useState('');
  const [durationType, setDurationType] = useState<LeaveDurationType>('dias_completos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedType = useMemo(
    () => leaveTypes.find((item) => item.leave_type === leaveType) || null,
    [leaveType, leaveTypes],
  );
  const birthDate = useMemo(
    () => buildDateOnlyFromParts(birthYear, birthMonth, birthDay),
    [birthDay, birthMonth, birthYear],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) {
        setStep('invalid');
        return;
      }
      const { data, error: contextError } = await publicSupabase.functions.invoke('public-leave-request', {
        body: { action: 'context', token },
      }) as FunctionResult<{ valid: boolean; company: PublicCompany }>;
      if (cancelled) return;
      if (contextError || !data?.valid) {
        setStep('invalid');
        return;
      }
      setCompany(data.company);
      setStep('identify');
    };
    void load();
    return () => { cancelled = true; };
  }, [token]);

  const identify = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!documentNumber.trim() || !birthDay || !birthMonth || !birthYear) {
      setError('Completa todos los datos de identificación.');
      return;
    }
    if (!birthDate || birthDate < `${MIN_BIRTH_YEAR}-01-01` || birthDate > todayDateOnlyString()) {
      setError('Revisa la fecha de nacimiento ingresada.');
      return;
    }
    setIsSubmitting(true);
    const { data, error: identifyError } = await publicSupabase.functions.invoke('public-leave-request', {
      body: {
        action: 'identify',
        token,
        document_type: documentType,
        document_number: documentNumber,
        birth_date: birthDate,
      },
    }) as FunctionResult<{
      session: string;
      employee_first_name: string;
      leave_types: PublicLeaveType[];
    }>;
    setIsSubmitting(false);
    if (identifyError || !data?.session) {
      setError(await errorMessage(identifyError, 'No fue posible validar los datos ingresados.'));
      return;
    }
    setSession(data.session);
    setFirstName(data.employee_first_name);
    setLeaveTypes(data.leave_types || []);
    setLeaveType(data.leave_types?.[0]?.leave_type || '');
    setStep('request');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!leaveType || !startDate || (durationType === 'dias_completos' && !endDate) || reason.trim().length < 10) {
      setError('Completa el tipo, las fechas y un motivo de al menos 10 caracteres.');
      return;
    }
    if (durationType === 'horas' && (!startTime || !endTime)) {
      setError('Indica la hora inicial y final.');
      return;
    }
    if (selectedType?.requires_document && !file) {
      setError('Este tipo de permiso requiere un soporte.');
      return;
    }
    if (file && (file.size > 10 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type))) {
      setError('El soporte debe ser PDF, JPG o PNG y pesar máximo 10 MB.');
      return;
    }

    const form = new FormData();
    form.append('action', 'submit');
    form.append('session', session);
    form.append('request', JSON.stringify({
      leave_type: leaveType,
      duration_type: durationType,
      start_date: startDate,
      end_date: durationType === 'dias_completos' ? endDate : startDate,
      start_time: durationType === 'horas' ? startTime : null,
      end_time: durationType === 'horas' ? endTime : null,
      reason: reason.trim(),
    }));
    if (file) form.append('file', file);

    setIsSubmitting(true);
    const { data, error: submitError } = await publicSupabase.functions.invoke('public-leave-request', { body: form }) as FunctionResult<{ reference: string }>;
    setIsSubmitting(false);
    if (submitError || !data?.reference) {
      setError(await errorMessage(submitError, 'No fue posible registrar la solicitud.'));
      return;
    }
    setReference(data.reference);
    setStep('success');
  };

  const progress = step === 'identify' ? 1 : step === 'request' ? 2 : step === 'success' ? 3 : 0;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const durationOptions = useMemo(
    () => selectedType
      ? (['dias_completos', ...(selectedType.allows_half_day ? ['medio_dia'] : []), ...(selectedType.allows_hours ? ['horas'] : [])] as LeaveDurationType[])
      : ['dias_completos' as LeaveDurationType],
    [selectedType],
  );

  useEffect(() => {
    if (!durationOptions.includes(durationType)) setDurationType('dias_completos');
  }, [durationOptions, durationType]);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_15%_10%,hsl(var(--primary)/0.16),transparent_40%),radial-gradient(circle_at_90%_0%,hsl(var(--primary)/0.08),transparent_34%)]" />

      <header className="relative border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:min-h-[76px] sm:px-6 lg:px-8">
          <CompanyIdentity company={company} />
          <div className="flex shrink-0 items-center gap-2">
            {isStandalone && (
              <Button asChild variant="outline" size="sm" className="min-h-9 bg-background/80">
                <a href="/" aria-label="Volver a la plataforma EmpatiQ">
                  <LogIn className="mr-2 size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Volver a EmpatiQ</span>
                  <span className="sm:hidden">Volver</span>
                </a>
              </Button>
            )}
            <Badge variant="outline" className="hidden min-h-8 gap-2 border-primary/20 bg-primary/5 px-3 text-primary sm:flex">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Portal seguro
            </Badge>
          </div>
        </div>
      </header>

      <div className="relative mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-8 lg:px-8 lg:py-10">
        <aside className="relative overflow-hidden rounded-2xl bg-foreground px-5 py-6 text-background shadow-[0_24px_70px_hsl(var(--foreground)/0.16)] sm:px-7 sm:py-8 lg:min-h-[640px] lg:px-9 lg:py-10">
          <div aria-hidden="true" className="absolute -right-20 -top-24 size-64 rounded-full border-[44px] border-primary/25" />
          <div aria-hidden="true" className="absolute -bottom-28 -left-24 size-72 rounded-full bg-primary/15" />

          <div className="relative flex h-full flex-col">
            <div className="max-w-md">
              <p className="mb-3 text-xs font-bold text-background/65">Portal de {company?.name || 'tu empresa'}</p>
              <h1 className="font-display text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                Solicita tu permiso de forma fácil y segura
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-background/70 sm:text-base">
                Identifícate, completa la información y recibe tu número de radicado en pocos minutos.
              </p>
            </div>

            <div className="relative my-8 hidden flex-1 items-center justify-center lg:flex" aria-hidden="true">
              <div className="relative flex size-64 items-center justify-center rounded-full border border-background/10 bg-background/[0.04]">
                <div className="flex size-40 rotate-[-4deg] flex-col justify-between rounded-2xl border border-background/15 bg-background/[0.09] p-5 shadow-2xl shadow-black/15 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><ClipboardCheck className="size-6" /></span>
                    <CheckCircle2 className="size-7 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <span className="block h-2 w-full rounded-full bg-background/20" />
                    <span className="block h-2 w-4/5 rounded-full bg-background/15" />
                    <span className="block h-2 w-3/5 rounded-full bg-background/10" />
                  </div>
                </div>
                <span className="absolute -right-3 top-6 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg"><CalendarDays className="size-6" /></span>
                <span className="absolute bottom-8 left-0 flex size-11 items-center justify-center rounded-xl bg-background text-foreground shadow-lg"><FileCheck2 className="size-5" /></span>
              </div>
            </div>

            <div className="relative mt-6 hidden gap-3 sm:grid sm:grid-cols-3 lg:mt-auto lg:grid-cols-1">
              {REQUEST_STEPS.map((item, index) => (
                <div key={item.label} className="flex items-center gap-3 rounded-xl border border-background/10 bg-background/[0.05] px-3 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-black text-primary-foreground">{index + 1}</span>
                  <div>
                    <p className="text-sm font-bold text-background">{item.label}</p>
                    <p className="hidden text-xs text-background/60 sm:block">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0" aria-label="Formulario de solicitud de permiso">
          <Card className="overflow-hidden rounded-2xl border-border/80 bg-card shadow-[0_24px_70px_hsl(var(--foreground)/0.08)]">
            {progress > 0 && <RequestProgress current={progress} />}

            {step === 'loading' && (
              <CardContent className="min-h-[420px] p-5 sm:p-8">
                <div className="animate-pulse space-y-7" aria-label="Validando enlace seguro">
                  <div className="space-y-3">
                    <div className="h-7 w-3/5 rounded-lg bg-muted" />
                    <div className="h-4 w-4/5 rounded bg-muted/70" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="h-12 rounded-xl bg-muted/70" />
                    <div className="h-12 rounded-xl bg-muted/70" />
                  </div>
                  <div className="h-12 rounded-xl bg-muted/70" />
                  <div className="flex items-center gap-3 rounded-xl border border-border p-4">
                    <Loader2 className="size-5 animate-spin text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">Validando enlace seguro...</p>
                  </div>
                </div>
              </CardContent>
            )}

            {step === 'invalid' && (
              <CardContent className="flex min-h-[460px] flex-col items-center justify-center px-6 py-12 text-center sm:px-10">
                <span className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><LockKeyhole className="size-8" /></span>
                <h1 className="font-display text-2xl font-black tracking-tight text-foreground">Enlace no disponible</h1>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">El enlace es inválido, venció o fue reemplazado. Solicita uno nuevo a Recursos Humanos.</p>
              </CardContent>
            )}

            {step === 'identify' && (
              <>
                <CardHeader className="space-y-3 px-5 pb-4 pt-6 sm:px-8 sm:pt-8">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRoundCheck className="size-6" /></span>
                  <div className="space-y-1.5">
                    <CardTitle className="font-display text-2xl font-black tracking-tight sm:text-3xl">Verifica tu identidad</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">Ingresa los datos registrados en {company?.name || 'la empresa'}.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-6 pt-3 sm:px-8 sm:pb-8">
                  <form onSubmit={identify} className="space-y-5">
                    {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
                    <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                      <div className="space-y-2">
                        <Label htmlFor="document-type">Tipo de documento</Label>
                        <Select value={documentType} onValueChange={setDocumentType}>
                          <SelectTrigger id="document-type" className="min-h-12 text-base"><SelectValue /></SelectTrigger>
                          <SelectContent>{['CC', 'CE', 'TI', 'PA', 'PEP'].map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="document-number">Número de documento</Label>
                        <Input id="document-number" value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} autoComplete="off" inputMode="numeric" className="min-h-12 text-base" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label id="birth-date-label">Fecha de nacimiento</Label>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[100px_minmax(0,1fr)_130px]" role="group" aria-labelledby="birth-date-label">
                        <div className="space-y-1.5">
                          <Label htmlFor="birth-day" className="text-xs text-muted-foreground">Día</Label>
                          <Select value={birthDay} onValueChange={setBirthDay}>
                            <SelectTrigger id="birth-day" className="min-h-12 text-base"><SelectValue placeholder="Día" /></SelectTrigger>
                            <SelectContent>{BIRTH_DAYS.map((day) => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="birth-month" className="text-xs text-muted-foreground">Mes</Label>
                          <Select value={birthMonth} onValueChange={setBirthMonth}>
                            <SelectTrigger id="birth-month" className="min-h-12 text-base"><SelectValue placeholder="Mes" /></SelectTrigger>
                            <SelectContent>{BIRTH_MONTHS.map((month, index) => <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-1.5 sm:col-span-1">
                          <Label htmlFor="birth-year" className="text-xs text-muted-foreground">Año</Label>
                          <Input
                            id="birth-year"
                            type="text"
                            inputMode="numeric"
                            autoComplete="bday-year"
                            pattern="[0-9]{4}"
                            maxLength={4}
                            placeholder="Ej. 1970"
                            value={birthYear}
                            onChange={(event) => setBirthYear(event.target.value.replace(/\D/g, '').slice(0, 4))}
                            aria-describedby="birth-date-help"
                            className="min-h-12 text-base"
                            required
                          />
                        </div>
                      </div>
                      <p id="birth-date-help" className="text-xs leading-relaxed text-muted-foreground">
                        Escribe el año directamente, entre {MIN_BIRTH_YEAR} y {CURRENT_YEAR}.
                      </p>
                    </div>
                    <Alert className="border-primary/20 bg-primary/5 text-foreground">
                      <ShieldCheck className="size-4 text-primary" />
                      <AlertDescription className="leading-relaxed">Tus datos sólo se usan para validar esta solicitud. No se creará una cuenta.</AlertDescription>
                    </Alert>
                    <Button className="min-h-12 w-full text-base font-bold active:scale-[0.99]" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 size-5 animate-spin" /> : <ArrowRight className="mr-2 size-5" />} Continuar
                    </Button>
                  </form>
                </CardContent>
              </>
            )}

            {step === 'request' && (
              <>
                <CardHeader className="space-y-3 px-5 pb-4 pt-6 sm:px-8 sm:pt-8">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardCheck className="size-6" /></span>
                  <div className="space-y-1.5">
                    <CardTitle className="font-display text-2xl font-black tracking-tight sm:text-3xl">Hola, {firstName}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">Completa tu solicitud. Tienes 10 minutos desde la verificación.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-6 pt-3 sm:px-8 sm:pb-8">
                  <form onSubmit={submit} className="space-y-5">
                    {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
                    {leaveTypes.length === 0 ? (
                      <Alert><AlertDescription>No hay tipos de permiso habilitados. Comunícate con Recursos Humanos.</AlertDescription></Alert>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="leave-type">Tipo de permiso</Label>
                          <Select value={leaveType} onValueChange={setLeaveType}>
                            <SelectTrigger id="leave-type" className="min-h-12 text-base"><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger>
                            <SelectContent>{leaveTypes.map((type) => <SelectItem key={type.leave_type} value={type.leave_type}>{type.display_name}</SelectItem>)}</SelectContent>
                          </Select>
                          {selectedType?.description && <p className="text-xs leading-relaxed text-muted-foreground">{selectedType.description}</p>}
                          {!!selectedType?.min_days_advance && (
                            <p className="text-xs font-semibold text-primary">
                              Solicítalo con {selectedType.min_days_advance} {selectedType.min_days_advance === 1 ? 'día' : 'días'} de anticipación.
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="duration-type">Duración</Label>
                          <Select value={durationType} onValueChange={(value) => setDurationType(value as LeaveDurationType)}>
                            <SelectTrigger id="duration-type" className="min-h-12 text-base"><SelectValue /></SelectTrigger>
                            <SelectContent>{durationOptions.map((duration) => <SelectItem key={duration} value={duration}>{LEAVE_DURATION_TYPE_LABELS[duration]}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="start-date"><CalendarDays className="mr-1.5 inline size-4 text-primary" />Fecha {durationType === 'dias_completos' ? 'inicial' : 'del permiso'}</Label>
                            <Input id="start-date" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); if (durationType !== 'dias_completos') setEndDate(event.target.value); }} className="min-h-12 text-base" required />
                          </div>
                          {durationType === 'dias_completos' && (
                            <div className="space-y-2">
                              <Label htmlFor="end-date"><CalendarDays className="mr-1.5 inline size-4 text-primary" />Fecha final</Label>
                              <Input id="end-date" type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="min-h-12 text-base" required />
                            </div>
                          )}
                        </div>
                        {durationType === 'horas' && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2"><Label htmlFor="start-time"><Clock3 className="mr-1.5 inline size-4 text-primary" />Hora inicial</Label><Input id="start-time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="min-h-12 text-base" required /></div>
                            <div className="space-y-2"><Label htmlFor="end-time"><Clock3 className="mr-1.5 inline size-4 text-primary" />Hora final</Label><Input id="end-time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="min-h-12 text-base" required /></div>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="reason">Motivo</Label>
                          <Textarea id="reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={1000} rows={4} placeholder="Describe brevemente el motivo de tu solicitud" className="min-h-28 resize-y text-base" required />
                          <div className="flex justify-between gap-3 text-xs text-muted-foreground"><span>Mínimo 10 caracteres</span><span>{reason.trim().length}/1000</span></div>
                        </div>
                        <div className="space-y-2 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-4">
                          <Label htmlFor="support" className="flex items-center"><FileUp className="mr-2 size-4 text-primary" />Soporte {selectedType?.requires_document ? '(obligatorio)' : '(opcional)'}</Label>
                          <Input id="support" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] || null)} className="h-auto min-h-12 bg-card py-2 text-base file:mr-3" required={selectedType?.requires_document} />
                          <p className="text-xs leading-relaxed text-muted-foreground">PDF, JPG o PNG. Máximo 10 MB. {selectedType?.document_description}</p>
                        </div>
                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                          <Button type="button" variant="ghost" className="min-h-12" onClick={() => { setError(''); setStep('identify'); }}><ArrowLeft className="mr-2 size-4" /> Volver</Button>
                          <Button className="min-h-12 w-full text-base font-bold active:scale-[0.99] sm:w-auto sm:min-w-52" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 size-5 animate-spin" /> : <ShieldCheck className="mr-2 size-5" />} Radicar solicitud
                          </Button>
                        </div>
                      </>
                    )}
                  </form>
                </CardContent>
              </>
            )}

            {step === 'success' && (
              <CardContent className="flex min-h-[520px] flex-col items-center justify-center px-5 py-10 text-center sm:px-10">
                <span className="mb-5 flex size-20 items-center justify-center rounded-2xl bg-success-light text-success"><CheckCircle2 className="size-10" /></span>
                <h1 className="font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl">Solicitud radicada</h1>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">Tu solicitud ya está en el flujo de aprobación de {company?.name || 'la empresa'}.</p>
                <div className="mt-7 w-full max-w-sm rounded-2xl border border-primary/25 bg-primary/5 px-5 py-5">
                  <p className="text-xs font-bold text-muted-foreground">Número de radicado</p>
                  <p className="mt-2 break-all font-mono text-xl font-black text-primary sm:text-2xl">{reference}</p>
                </div>
                <p className="mt-6 max-w-sm text-xs leading-relaxed text-muted-foreground">Guarda este número como constancia. Este enlace no permite consultar solicitudes ni datos personales.</p>
              </CardContent>
            )}
          </Card>

          <footer className="mt-4 flex items-start justify-center gap-2 px-3 text-center text-xs leading-relaxed text-muted-foreground sm:items-center">
            <LockKeyhole className="mt-0.5 size-3.5 shrink-0 sm:mt-0" /> Conexión cifrada. Tus datos se usan sólo para gestionar esta solicitud.
          </footer>
        </section>
      </div>
    </main>
  );
}
