import { useEffect, useState } from 'react';
import { Activity, Bell, Check, FileText, History, Loader2, Mail, MessageSquareText, Save, Shirt, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DiversityGoalsConfig } from '@/components/config/DiversityGoalsConfig';
import { useCustomRoles } from '@/hooks/useRolesPermissions';
import { useSystemConfig, useUpdateSystemConfig } from '@/hooks/useSystemConfig';
import { cn } from '@/lib/utils';

function normalizeTwilioWhatsappSender(value: string) {
  const compact = value.trim().replace(/\s+/g, '');
  if (!compact) return { from: '', phoneNumber: '' };
  const withoutPrefix = compact.replace(/^whatsapp:/i, '');
  const phoneNumber = withoutPrefix.startsWith('+') ? withoutPrefix : `+${withoutPrefix}`;
  return {
    from: `whatsapp:${phoneNumber}`,
    phoneNumber,
  };
}

export function AlertProtocolSettings() {
  const { data: systemConfig } = useSystemConfig();
  const { data: customRoles } = useCustomRoles();
  const updateConfig = useUpdateSystemConfig();

  const [alertRecipients, setAlertRecipients] = useState('');
  const [alertContractInfo, setAlertContractInfo] = useState(60);
  const [alertContractWarning, setAlertContractWarning] = useState(30);
  const [alertContractCritical, setAlertContractCritical] = useState(7);
  const [alertExamInfo, setAlertExamInfo] = useState(60);
  const [alertExamWarning, setAlertExamWarning] = useState(30);
  const [alertExamCritical, setAlertExamCritical] = useState(7);
  const [alertDotationInfo, setAlertDotationInfo] = useState(60);
  const [alertDotationWarning, setAlertDotationWarning] = useState(30);
  const [alertDotationCritical, setAlertDotationCritical] = useState(7);
  const [alertTerminationInfo, setAlertTerminationInfo] = useState(15);
  const [alertTerminationWarning, setAlertTerminationWarning] = useState(7);
  const [alertTerminationCritical, setAlertTerminationCritical] = useState(3);
  const [alertTerminationPendingDays, setAlertTerminationPendingDays] = useState(7);
  const [twilioWhatsappEnabled, setTwilioWhatsappEnabled] = useState(false);
  const [twilioWhatsappSender, setTwilioWhatsappSender] = useState('');
  const [hiringNotifRoleId, setHiringNotifRoleId] = useState<string>('none');

  useEffect(() => {
    if (!systemConfig) return;

    const contractDays = systemConfig.alert_contract_days;
    const examDays = systemConfig.alert_exam_days;
    const dotationDays = systemConfig.alert_dotation_days;
    const terminationPendingDays = systemConfig.alert_termination_pending_days;
    const notificationRecipients = systemConfig.alert_notification_recipients;
    const twilioWhatsappConfig = systemConfig.twilio_whatsapp_sender;
    const hiringConfig = systemConfig.hiring_notification_role;

    if (notificationRecipients?.emails) setAlertRecipients(notificationRecipients.emails.join('\n'));
    if (contractDays) {
      setAlertContractInfo(contractDays.info || 60);
      setAlertContractWarning(contractDays.warning || 30);
      setAlertContractCritical(contractDays.critical || 7);
    }
    if (examDays) {
      setAlertExamInfo(examDays.info || 60);
      setAlertExamWarning(examDays.warning || 30);
      setAlertExamCritical(examDays.critical || 7);
    }
    if (dotationDays) {
      setAlertDotationInfo(dotationDays.info || 60);
      setAlertDotationWarning(dotationDays.warning || 30);
      setAlertDotationCritical(dotationDays.critical || 7);
    }
    if (terminationPendingDays) {
      setAlertTerminationPendingDays(terminationPendingDays.min_days || 7);
      setAlertTerminationInfo(terminationPendingDays.info || 15);
      setAlertTerminationWarning(terminationPendingDays.warning || 7);
      setAlertTerminationCritical(terminationPendingDays.critical || 3);
    }
    if (twilioWhatsappConfig) {
      setTwilioWhatsappEnabled(twilioWhatsappConfig.enabled ?? false);
      setTwilioWhatsappSender(twilioWhatsappConfig.from || twilioWhatsappConfig.phone_number || '');
    }
    if (hiringConfig?.role_id) setHiringNotifRoleId(hiringConfig.role_id);
  }, [systemConfig]);

  const handleSaveAlertConfig = async () => {
    try {
      const emails = alertRecipients
        .split(/[\n,;]/)
        .map((email) => email.trim())
        .filter(Boolean);
      const whatsappSender = normalizeTwilioWhatsappSender(twilioWhatsappSender);

      if (twilioWhatsappEnabled && !whatsappSender.phoneNumber) {
        toast.error('Ingresa el numero de WhatsApp de Twilio o desactiva el canal.');
        return;
      }

      await Promise.all([
        updateConfig.mutateAsync({
          key: 'alert_notification_recipients',
          value: { emails },
          description: 'Correos destinatarios para alertas por empresa',
        }),
        updateConfig.mutateAsync({
          key: 'alert_contract_days',
          value: { info: alertContractInfo, warning: alertContractWarning, critical: alertContractCritical },
        }),
        updateConfig.mutateAsync({
          key: 'alert_exam_days',
          value: { info: alertExamInfo, warning: alertExamWarning, critical: alertExamCritical },
        }),
        updateConfig.mutateAsync({
          key: 'alert_dotation_days',
          value: { info: alertDotationInfo, warning: alertDotationWarning, critical: alertDotationCritical },
        }),
        updateConfig.mutateAsync({
          key: 'alert_termination_pending_days',
          value: {
            min_days: alertTerminationPendingDays,
            info: alertTerminationInfo,
            warning: alertTerminationWarning,
            critical: alertTerminationCritical,
          },
          description: 'Dias minimos de espera antes de notificar retiros pendientes',
        }),
        updateConfig.mutateAsync({
          key: 'hiring_notification_role',
          value: { role_id: hiringNotifRoleId === 'none' ? null : hiringNotifRoleId },
          description: 'Rol que recibe notificaciones al contratar candidatos',
        }),
        updateConfig.mutateAsync({
          key: 'twilio_whatsapp_sender',
          value: {
            enabled: twilioWhatsappEnabled,
            provider: 'twilio',
            from: whatsappSender.from || null,
            phone_number: whatsappSender.phoneNumber || null,
          },
          description: 'Numero remitente de WhatsApp configurado en Twilio para notificaciones',
        }),
      ]);
      toast.success('Configuracion de alertas guardada');
    } catch {
      toast.error('Error al guardar la configuracion');
    }
  };

  const alertWindows = [
    { id: 'contratos', label: 'Vencimiento contratos', icon: FileText, color: 'text-primary', bg: 'bg-primary/10', info: alertContractInfo, setInfo: setAlertContractInfo, warn: alertContractWarning, setWarn: setAlertContractWarning, crit: alertContractCritical, setCrit: setAlertContractCritical },
    { id: 'examenes', label: 'Examenes medicos', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50', info: alertExamInfo, setInfo: setAlertExamInfo, warn: alertExamWarning, setWarn: setAlertExamWarning, crit: alertExamCritical, setCrit: setAlertExamCritical },
    { id: 'dotacion', label: 'Entrega dotacion', icon: Shirt, color: 'text-amber-600', bg: 'bg-amber-50', info: alertDotationInfo, setInfo: setAlertDotationInfo, warn: alertDotationWarning, setWarn: setAlertDotationWarning, crit: alertDotationCritical, setCrit: setAlertDotationCritical },
    { id: 'retiros', label: 'Procesos de retiro', icon: History, color: 'text-red-600', bg: 'bg-red-50', info: alertTerminationInfo, setInfo: setAlertTerminationInfo, warn: alertTerminationWarning, setWarn: setAlertTerminationWarning, crit: alertTerminationCritical, setCrit: setAlertTerminationCritical },
  ];

  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 bg-background shadow-sm">
      <CardHeader className="border-b bg-muted/25">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-black tracking-tight">Protocolos de alerta</CardTitle>
            <CardDescription className="mt-1">Ventanas, destinatarios y canales usados por las alertas operativas.</CardDescription>
          </div>
          <Button onClick={handleSaveAlertConfig} disabled={updateConfig.isPending} className="h-11 rounded-xl font-black uppercase tracking-widest text-[10px]">
            {updateConfig.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar protocolos
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <Mail className="h-4 w-4 text-primary" />
              Destinatarios de alerta
            </Label>
            <Textarea
              value={alertRecipients}
              onChange={(event) => setAlertRecipients(event.target.value)}
              placeholder={'admin@empresa.com\nrh@empresa.com'}
              className="min-h-32 rounded-xl font-medium"
            />
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-emerald-600" />
              Separa correos con saltos de linea, coma o punto y coma.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/35 p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-black uppercase tracking-widest text-foreground">WhatsApp Twilio</h4>
                  <Badge variant="outline" className={cn('rounded-md text-[10px] font-black uppercase', twilioWhatsappEnabled ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'bg-background text-muted-foreground')}>
                    {twilioWhatsappEnabled ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Numero remitente aprobado para reglas que usen WhatsApp.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Numero remitente</Label>
                <Input value={twilioWhatsappSender} onChange={(event) => setTwilioWhatsappSender(event.target.value)} placeholder="whatsapp:+14155238886" />
              </div>
              <label className="flex h-10 items-center justify-between gap-3 rounded-xl border bg-background px-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Usar</span>
                <Switch checked={twilioWhatsappEnabled} onCheckedChange={setTwilioWhatsappEnabled} />
              </label>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {alertWindows.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className={cn('mb-4 flex h-10 w-10 items-center justify-center rounded-xl', item.bg, item.color)}>
                <item.icon className="h-5 w-5" />
              </div>
              <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-foreground">{item.label}</h4>
              <div className="space-y-3">
                <WindowInput label="Info" value={item.info} onChange={item.setInfo} />
                <WindowInput label="Alerta" value={item.warn} onChange={item.setWarn} tone="warning" />
                <WindowInput label="Critica" value={item.crit} onChange={item.setCrit} tone="danger" />
                {item.id === 'retiros' && <WindowInput label="Espera minima" value={alertTerminationPendingDays} onChange={setAlertTerminationPendingDays} />}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
          <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest">Rol de bienvenida RRHH</h4>
                <p className="mt-1 text-xs font-semibold text-primary-foreground/70">Rol administrativo que recibe notificaciones al contratar candidatos.</p>
              </div>
            </div>
            <Select value={hiringNotifRoleId} onValueChange={setHiringNotifRoleId}>
              <SelectTrigger className="h-11 rounded-xl border-white/15 bg-white/10 font-black uppercase tracking-widest text-[10px] text-white">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Notificaciones desactivadas</SelectItem>
                {customRoles?.map((role) => (
                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t pt-6">
          <DiversityGoalsConfig />
        </div>
      </CardContent>
    </Card>
  );
}

function WindowInput({
  label,
  value,
  onChange,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  tone?: 'neutral' | 'warning' | 'danger';
}) {
  const toneClass = tone === 'danger'
    ? 'border-red-200 text-red-700'
    : tone === 'warning'
      ? 'border-amber-200 text-amber-700'
      : 'border-border text-foreground';

  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(event) => onChange(parseInt(event.target.value, 10) || 0)}
          className={cn('h-10 rounded-xl pr-12 font-black text-xs', toneClass)}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-muted-foreground">dias</span>
      </div>
    </div>
  );
}
