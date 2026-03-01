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
import petrocasinosIcon from '@/assets/petrocasinos-orange-icon.png';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Step = 'loading' | 'error' | 'form' | 'done';

interface TokenData {
  id: string;
  process_id: string;
  company_id: string;
  employee_id: string;
  is_used: boolean;
  expires_at: string;
}

interface ProcessInfo {
  case_number: string;
  fault_date: string;
  facts_description: string;
  fault_type: string;
  employee_name: string;
}

export default function DescargosPublico() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');

  const [step, setStep] = useState<Step>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [processInfo, setProcessInfo] = useState<ProcessInfo | null>(null);
  const [defenseContent, setDefenseContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      // Fetch token + process info via join
      const { data, error } = await supabase
        .from('disciplinary_defense_tokens' as any)
        .select('id, process_id, company_id, employee_id, is_used, expires_at')
        .eq('token', token)
        .single();

      if (error || !data) {
        setErrorMsg('El enlace no es válido o no existe.');
        setStep('error');
        return;
      }

      const row = data as any;

      if (row.is_used) {
        setErrorMsg('Este enlace ya fue utilizado para presentar descargos.');
        setStep('error');
        return;
      }

      if (new Date(row.expires_at) < new Date()) {
        setErrorMsg('Este enlace ha expirado.');
        setStep('error');
        return;
      }

      setTokenData(row as TokenData);

      // Fetch process details
      const { data: proc } = await supabase
        .from('disciplinary_processes')
        .select('case_number, fault_date, facts_description, fault_type, employee:employees_v2(first_name, last_name)')
        .eq('id', row.process_id)
        .single();

      if (proc) {
        const emp = (proc as any).employee;
        setProcessInfo({
          case_number: (proc as any).case_number,
          fault_date: (proc as any).fault_date,
          facts_description: (proc as any).facts_description,
          fault_type: (proc as any).fault_type,
          employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '',
        });
      }

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
      const { data, error } = await supabase.rpc('submit_defense_via_token' as any, {
        p_token: tokenParam,
        p_content: defenseContent.trim(),
        p_defense_type: 'escrito',
      });

      if (error) throw error;

      const result = data as any;
      if (result && !result.success) {
        setErrorMsg(result.error || 'Error al enviar los descargos.');
        setStep('error');
        return;
      }

      setStep('done');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enviar los descargos.');
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
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Validando enlace...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-muted">
        <BrandedHeader />
        <div className="max-w-lg mx-auto p-4 mt-8">
          <Card>
            <CardContent className="pt-8 text-center space-y-5">
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
              <h2 className="text-2xl font-bold">Descargos Enviados</h2>
              <p className="text-muted-foreground">
                Sus descargos han sido registrados exitosamente en el proceso {processInfo?.case_number}.
              </p>
              <div className="bg-muted rounded-lg p-4 text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Radicado</span>
                  <span className="font-medium">{processInfo?.case_number}</span>
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
    <div className="min-h-screen bg-muted">
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
                    ? format(new Date(processInfo.fault_date), 'dd/MM/yyyy')
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
              <p className="mt-1 text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">
                {processInfo?.facts_description}
              </p>
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

            <Button
              onClick={handleSubmit}
              disabled={submitting || defenseContent.trim().length < 10}
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
