import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle, Calendar, CheckCircle2, FileText,
  Loader2, Scale, Send, ShieldAlert
} from 'lucide-react';
import { SignatureCanvas } from '@/components/training/SignatureCanvas';
import petrocasinosIcon from '@/assets/petrocasinos-orange-icon.png';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';

type Step = 'loading' | 'error' | 'form' | 'done';

interface ProcessInfo {
  case_number: string;
  fault_date: string;
  facts_description: string;
  fault_type: string;
  employee_name: string;
  employee_document: string;
  company_name: string;
  report_facts: Array<{ title: string; description: string; occurred_at?: string; location?: string }>;
  hearing_questions: Array<{ id: string; question: string; required?: boolean }>;
}

export default function DescargosPublico() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');

  const [step, setStep] = useState<Step>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [processInfo, setProcessInfo] = useState<ProcessInfo | null>(null);
  const [defenseContent, setDefenseContent] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [rightsAcknowledged, setRightsAcknowledged] = useState(false);
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [witnessDocument, setWitnessDocument] = useState('');

  useEffect(() => {
    if (!tokenParam) {
      setErrorMsg('No se proporcionó un enlace válido.');
      setStep('error');
      return;
    }
    validateToken(tokenParam);
  }, [tokenParam]);

  const validateToken = async (token: string) => {
    try {
      const { data, error } = await supabase.rpc('get_disciplinary_defense_form', { p_token: token });

      if (error || !data) {
        setErrorMsg('El enlace no es válido o no existe.');
        setStep('error');
        return;
      }

      const payload = data as unknown as ProcessInfo & { success: boolean; error?: string };
      if (!payload.success) {
        setErrorMsg(payload.error || 'El enlace no está disponible.');
        setStep('error');
        return;
      }

      setProcessInfo(payload as ProcessInfo);
      setAnswers(Object.fromEntries((payload.hearing_questions || []).map((question) => [question.id, ''])));

      setStep('form');
    } catch {
      setErrorMsg('Error al validar el enlace.');
      setStep('error');
    }
  };

  const handleSubmit = async () => {
    if (!defenseContent.trim() || defenseContent.trim().length < 10) return;
    setSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('submit_defense_via_token', {
        p_token: tokenParam,
        p_content: defenseContent.trim(),
        p_defense_type: 'escrito',
        p_answers: (processInfo?.hearing_questions || []).map((question) => ({ question_id: question.id, question: question.question, answer: answers[question.id] || '' })),
        p_signature_data: signatureData,
        p_rights_acknowledged: rightsAcknowledged,
        p_employee_email: employeeEmail || undefined,
        p_witness_name: witnessName || undefined,
        p_witness_document: witnessDocument || undefined,
      });

      if (error) throw error;

      const result = data as unknown as { success?: boolean; error?: string } | null;
      if (result && !result.success) {
        setErrorMsg(result.error || 'Error al enviar los descargos.');
        setStep('error');
        return;
      }

      setStep('done');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al enviar los descargos.');
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  };

  const faultTypeLabels: Record<string, string> = {
    leve: 'Leve',
    grave: 'Grave',
    gravisima: 'Gravísima',
  };

  const todayStr = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

  const BrandedHeader = () => (
    <div className="gradient-primary text-primary-foreground py-4 px-4">
      <div className="max-w-3xl mx-auto flex items-center gap-3">
        <img src={petrocasinosIcon} alt="Logo" className="h-12 w-12 rounded-xl border-2 border-white" />
        <div>
          <h1 className="text-lg font-bold tracking-wide">PETROCASINOS S.A.</h1>
          <p className="text-xs opacity-80 uppercase tracking-widest">Proceso Disciplinario — Descargos</p>
        </div>
      </div>
    </div>
  );

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Validando enlace...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Acceso no disponible</h2>
            <p className="text-muted-foreground">{errorMsg}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-background ">
        <BrandedHeader />
        <div className="max-w-lg mx-auto p-4 mt-8">
          <Card>
            <CardContent className="pt-8 text-center space-y-5">
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
              <h2 className="text-2xl font-bold">Descargos firmados y enviados</h2>
              <p className="text-muted-foreground">
                Sus descargos han sido registrados exitosamente en el proceso <strong>{processInfo?.case_number || 'disciplinario'}</strong>.
              </p>
              <div className="bg-background rounded-lg p-4 text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Radicado</span>
                  <span className="font-medium">{processInfo?.case_number || '—'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha de envío</span>
                  <span className="font-medium">{todayStr}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Puede cerrar esta ventana.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Form step
  return (
    <div className="min-h-screen bg-background ">
      <BrandedHeader />

      <div className="max-w-3xl mx-auto p-4 space-y-6 mt-4">
        {/* Case info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scale className="h-5 w-5" />
              Información del Caso
            </CardTitle>
            <CardDescription>
              Revise la información del proceso antes de presentar sus descargos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Radicado:</span>
                <p className="font-medium">{processInfo?.case_number}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo de falta:</span>
                <p>
                  <Badge variant="outline">
                    {faultTypeLabels[processInfo?.fault_type || ''] || processInfo?.fault_type}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha de los hechos:</span>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {processInfo?.fault_date
                    ? formatDateOnly(processInfo.fault_date, 'dd/MM/yyyy')
                    : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Empleado:</span>
                <p className="font-medium">{processInfo?.employee_name}</p>
              </div>
            </div>

            <Separator />

            <div>
              <span className="text-sm text-muted-foreground">Descripción de los hechos:</span>
              <div className="mt-2 space-y-3">
                {(processInfo?.report_facts?.length ? processInfo.report_facts : [{ title: 'Hechos reportados', description: processInfo?.facts_description || '' }]).map((fact, index) => (
                  <div key={`${fact.title}-${index}`} className="rounded-lg bg-background p-3 text-sm"><p className="font-semibold">{index + 1}. {fact.title}</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{fact.description}</p></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Defense form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Presentar Descargos
            </CardTitle>
            <CardDescription>
              Escriba su versión de los hechos. Este formulario solo puede ser utilizado una vez.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 bg-accent border border-border rounded-lg p-3 text-sm">
              <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
              <span className="text-foreground">
                Una vez enviados, sus descargos no podrán ser modificados. Asegúrese de incluir toda la información relevante.
              </span>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={rightsAcknowledged} onChange={(event) => setRightsAcknowledged(event.target.checked)} />
              <span>Declaro que comprendo mi derecho a no declarar contra mí mismo, controvertir los cargos y aportar o solicitar pruebas.</span>
            </label>

            {!!processInfo?.hearing_questions?.length && (
              <div className="space-y-4">
                <div><Label>Cuestionario de la diligencia *</Label><p className="text-xs text-muted-foreground">Responda cada pregunta de forma libre, concreta y fiel a los hechos.</p></div>
                {processInfo.hearing_questions.map((question, index) => (
                  <div key={question.id} className="space-y-2 rounded-lg border p-4">
                    <Label>{index + 1}. {question.question}</Label>
                    <Textarea value={answers[question.id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} rows={4} placeholder="Escriba su respuesta..." />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="defense-content">Sus descargos *</Label>
              <Textarea
                id="defense-content"
                value={defenseContent}
                onChange={(e) => setDefenseContent(e.target.value)}
                placeholder="Escriba aquí su versión de los hechos y los argumentos de su defensa..."
                rows={10}
                className="resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 10 caracteres. Sea lo más detallado posible.
              </p>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Correo electrónico</Label><input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" type="email" value={employeeEmail} onChange={(event) => setEmployeeEmail(event.target.value)} /></div>
              <div className="space-y-2"><Label>Acompañante o testigo</Label><input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={witnessName} onChange={(event) => setWitnessName(event.target.value)} /></div>
              {witnessName && <div className="space-y-2 sm:col-span-2"><Label>Documento del testigo</Label><input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={witnessDocument} onChange={(event) => setWitnessDocument(event.target.value)} /></div>}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Firma del empleado *</Label>
              <SignatureCanvas onSave={(data) => setSignatureData(data)} />
              {signatureData && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Firma registrada
                </p>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || defenseContent.trim().length < 10 || !signatureData || !rightsAcknowledged || (processInfo?.hearing_questions || []).some((question) => !(answers[question.id] || '').trim())}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Descargos
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
