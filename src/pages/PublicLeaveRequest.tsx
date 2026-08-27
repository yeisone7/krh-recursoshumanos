import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileUp,
  Loader2,
  LockKeyhole,
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
import { supabase } from '@/integrations/supabase/client';
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

async function errorMessage(error: unknown, fallback: string) {
  const functionError = error as FunctionErrorLike | null;
  try {
    const payload = await functionError?.context?.json?.();
    return payload?.error || fallback;
  } catch {
    return functionError?.message || fallback;
  }
}

export default function PublicLeaveRequest() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() || '';
  const [step, setStep] = useState<PageStep>('loading');
  const [company, setCompany] = useState<PublicCompany | null>(null);
  const [documentType, setDocumentType] = useState('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) {
        setStep('invalid');
        return;
      }
      const { data, error: contextError } = await supabase.functions.invoke('public-leave-request', {
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
    if (!documentNumber.trim() || !birthDate) {
      setError('Completa todos los datos de identificación.');
      return;
    }
    setIsSubmitting(true);
    const { data, error: identifyError } = await supabase.functions.invoke('public-leave-request', {
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
    if (!leaveType || !startDate || !endDate || reason.trim().length < 10) {
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
    const { data, error: submitError } = await supabase.functions.invoke('public-leave-request', { body: form }) as FunctionResult<{ reference: string }>;
    setIsSubmitting(false);
    if (submitError || !data?.reference) {
      setError(await errorMessage(submitError, 'No fue posible registrar la solicitud.'));
      return;
    }
    setReference(data.reference);
    setStep('success');
  };

  const progress = step === 'identify' ? 1 : step === 'request' ? 2 : step === 'success' ? 3 : 0;
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
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_38%),linear-gradient(to_bottom,hsl(var(--background)),white)] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6 flex min-h-12 items-center justify-center">
          {company?.horizontal_logo_url ? (
            <img src={company.horizontal_logo_url} alt={company.name} className="max-h-12 max-w-[220px] object-contain" />
          ) : company ? (
            <div className="flex items-center gap-3 text-foreground">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Building2 className="size-5" /></span>
              <span className="text-lg font-bold">{company.name}</span>
            </div>
          ) : null}
        </header>

        {progress > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-2" aria-label={`Paso ${progress} de 3`}>
            {['Identificación', 'Solicitud', 'Confirmación'].map((label, index) => (
              <div key={label} className="space-y-2 text-center">
                <div className={cn('h-1.5 rounded-full', index + 1 <= progress ? 'bg-primary' : 'bg-border')} />
                <span className={cn('text-[10px] font-bold uppercase tracking-wide sm:text-xs', index + 1 === progress ? 'text-primary' : 'text-muted-foreground')}>{label}</span>
              </div>
            ))}
          </div>
        )}

        <Card className="overflow-hidden border-border/80 shadow-xl shadow-primary/5">
          {step === 'loading' && (
            <CardContent className="flex min-h-80 flex-col items-center justify-center gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Validando enlace seguro…</p>
            </CardContent>
          )}

          {step === 'invalid' && (
            <CardContent className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><LockKeyhole className="size-7" /></span>
              <h1 className="text-xl font-bold">Enlace no disponible</h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">El enlace es inválido, venció o fue reemplazado. Solicita uno nuevo a Recursos Humanos.</p>
            </CardContent>
          )}

          {step === 'identify' && (
            <>
              <CardHeader className="border-b bg-muted/20">
                <Badge variant="outline" className="mb-2 w-fit">Paso 1 de 3</Badge>
                <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl"><UserRoundCheck className="size-6 text-primary" /> Verifica tu identidad</CardTitle>
                <CardDescription>Ingresa tus datos exactamente como aparecen registrados en la empresa.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-7">
                <form onSubmit={identify} className="space-y-5">
                  {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                  <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                    <div className="space-y-2">
                      <Label htmlFor="document-type">Tipo de documento</Label>
                      <Select value={documentType} onValueChange={setDocumentType}>
                        <SelectTrigger id="document-type"><SelectValue /></SelectTrigger>
                        <SelectContent>{['CC', 'CE', 'TI', 'PA', 'PEP'].map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="document-number">Número de documento</Label>
                      <Input id="document-number" value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} autoComplete="off" inputMode="numeric" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth-date">Fecha de nacimiento</Label>
                    <Input id="birth-date" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} max={new Date().toISOString().slice(0, 10)} />
                  </div>
                  <Alert><ShieldCheck className="size-4" /><AlertDescription>Esta validación no crea una cuenta ni permite consultar información personal.</AlertDescription></Alert>
                  <Button className="h-11 w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ArrowRight className="mr-2 size-4" />} Continuar
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {step === 'request' && (
            <>
              <CardHeader className="border-b bg-muted/20">
                <Badge variant="outline" className="mb-2 w-fit">Paso 2 de 3</Badge>
                <CardTitle className="text-xl sm:text-2xl">Hola, {firstName}</CardTitle>
                <CardDescription>Completa los datos de tu solicitud. La verificación es válida durante 10 minutos.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-7">
                <form onSubmit={submit} className="space-y-5">
                  {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                  {leaveTypes.length === 0 ? (
                    <Alert><AlertDescription>No hay tipos de permiso habilitados. Comunícate con Recursos Humanos.</AlertDescription></Alert>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="leave-type">Tipo de permiso</Label>
                        <Select value={leaveType} onValueChange={setLeaveType}>
                          <SelectTrigger id="leave-type"><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger>
                          <SelectContent>{leaveTypes.map((type) => <SelectItem key={type.leave_type} value={type.leave_type}>{type.display_name}</SelectItem>)}</SelectContent>
                        </Select>
                        {selectedType?.description && <p className="text-xs text-muted-foreground">{selectedType.description}</p>}
                        {!!selectedType?.min_days_advance && <p className="text-xs font-medium text-primary">Requiere {selectedType.min_days_advance} día(s) de anticipación.</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration-type">Duración</Label>
                        <Select value={durationType} onValueChange={(value) => setDurationType(value as LeaveDurationType)}>
                          <SelectTrigger id="duration-type"><SelectValue /></SelectTrigger>
                          <SelectContent>{durationOptions.map((duration) => <SelectItem key={duration} value={duration}>{LEAVE_DURATION_TYPE_LABELS[duration]}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="start-date"><CalendarDays className="mr-1 inline size-4" />Fecha {durationType === 'dias_completos' ? 'inicial' : 'del permiso'}</Label>
                          <Input id="start-date" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); if (durationType !== 'dias_completos') setEndDate(event.target.value); }} />
                        </div>
                        {durationType === 'dias_completos' && (
                          <div className="space-y-2"><Label htmlFor="end-date"><CalendarDays className="mr-1 inline size-4" />Fecha final</Label><Input id="end-date" type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
                        )}
                      </div>
                      {durationType === 'horas' && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2"><Label htmlFor="start-time"><Clock3 className="mr-1 inline size-4" />Hora inicial</Label><Input id="start-time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></div>
                          <div className="space-y-2"><Label htmlFor="end-time"><Clock3 className="mr-1 inline size-4" />Hora final</Label><Input id="end-time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="reason">Motivo</Label>
                        <Textarea id="reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={1000} rows={4} placeholder="Describe brevemente el motivo de tu solicitud" />
                        <p className="text-right text-xs text-muted-foreground">{reason.trim().length}/1000</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="support"><FileUp className="mr-1 inline size-4" />Soporte {selectedType?.requires_document ? '(obligatorio)' : '(opcional)'}</Label>
                        <Input id="support" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] || null)} className="h-auto py-2" />
                        <p className="text-xs text-muted-foreground">PDF, JPG o PNG. Máximo 10 MB. {selectedType?.document_description}</p>
                      </div>
                      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
                        <Button type="button" variant="ghost" onClick={() => { setError(''); setStep('identify'); }}><ArrowLeft className="mr-2 size-4" /> Volver</Button>
                        <Button className="h-11 sm:min-w-48" disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldCheck className="mr-2 size-4" />} Radicar solicitud
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              </CardContent>
            </>
          )}

          {step === 'success' && (
            <CardContent className="flex min-h-[420px] flex-col items-center justify-center px-5 py-10 text-center sm:px-10">
              <span className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-success-light text-success"><CheckCircle2 className="size-9" /></span>
              <Badge variant="outline" className="mb-3">Paso 3 de 3</Badge>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Solicitud radicada</h1>
              <p className="mt-3 max-w-md text-sm text-muted-foreground">Guarda este número como constancia. La solicitud continuará por el flujo de aprobación interno de la empresa.</p>
              <div className="mt-6 rounded-2xl border-2 border-primary/20 bg-primary/5 px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Número de radicado</p>
                <p className="mt-1 break-all font-mono text-xl font-black text-primary sm:text-2xl">{reference}</p>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">Por seguridad, este enlace no permite consultar solicitudes ni datos personales.</p>
            </CardContent>
          )}
        </Card>

        <footer className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <LockKeyhole className="size-3.5" /> Conexión segura · Tus datos se usan sólo para validar esta solicitud
        </footer>
      </div>
    </main>
  );
}
