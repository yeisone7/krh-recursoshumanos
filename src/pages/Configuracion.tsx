import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Building2,
  FileText,
  Bell,
  Mail,
  Loader2,
  Save,
  Users,
  Shirt,
  Brain,
  Zap,
  Sparkles,
  Eye,
  EyeOff,
  Key,
  Image as ImageIcon,
  Upload,
  X,
  Stamp,
  Video,
  Shield,
  Cpu,
  Layout,
  Palette,
  Fingerprint,
  Activity,
  History
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { useAuth } from '@/contexts/AuthContext';
import { useCompany, useUpdateCompany } from '@/hooks/useCompanies';
import {
  useSystemConfig,
  useUpdateSystemConfig,
} from '@/hooks/useSystemConfig';
import { useCustomRoles } from '@/hooks/useRolesPermissions';
import { supabase } from '@/integrations/supabase/client';
import type { WatermarkPosition } from '@/lib/watermark';
import { DEFAULT_WATERMARK_CONFIG } from '@/lib/watermark';
import { SecurityTab } from '@/components/config/SecurityTab';
import { DiversityGoalsConfig } from '@/components/config/DiversityGoalsConfig';
import { AITab } from '@/components/config/AITab';

export default function Configuracion() {
  const { currentCompanyId, isAdmin } = useAuth();
  const { data: company, isLoading: loadingCompany } = useCompany(currentCompanyId || undefined);
  const updateCompany = useUpdateCompany();
  
  const [activeTab, setActiveTab] = useState('company');
  const [editingCompany, setEditingCompany] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingHorizontal, setUploadingHorizontal] = useState(false);

  // Form state for company
  const [companyForm, setCompanyForm] = useState({
    name: '',
    nit: '',
    email: '',
    phone: '',
    address: ''
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const horizontalInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when company data loads
  useMemo(() => {
    if (company && !editingCompany) {
      setCompanyForm({
        name: company.name || '',
        nit: company.nit || '',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || ''
      });
    }
  }, [company, editingCompany]);

  // Alert config state
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

  // Watermark config state
  const [watermarkEnabled, setWatermarkEnabled] = useState(DEFAULT_WATERMARK_CONFIG.enabled);
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>(DEFAULT_WATERMARK_CONFIG.position);
  const [watermarkLogoUrl, setWatermarkLogoUrl] = useState<string | null>(DEFAULT_WATERMARK_CONFIG.logo_url);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingWatermark, setSavingWatermark] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Inactivity timeout state
  const [inactivityEnabled, setInactivityEnabled] = useState(false);
  const [inactivityMinutes, setInactivityMinutes] = useState(15);

  // Account lockout state
  const [lockoutEnabled, setLockoutEnabled] = useState(false);
  const [lockoutMaxAttempts, setLockoutMaxAttempts] = useState(5);
  const [lockoutMinutes, setLockoutMinutes] = useState(15);

  // App update check state
  const [updateCheckEnabled, setUpdateCheckEnabled] = useState(true);
  const [updateCheckMinutes, setUpdateCheckMinutes] = useState(5);

  // Hiring notification role state
  const [hiringNotifRoleId, setHiringNotifRoleId] = useState<string>('none');
  
  const { user } = useAuth();
  const { data: systemConfig, isLoading: loadingConfig } = useSystemConfig();
  const { data: customRoles } = useCustomRoles();

  const updateConfig = useUpdateSystemConfig();

  // Load config values
  useMemo(() => {
    if (systemConfig) {
      const contractDays = systemConfig.alert_contract_days;
      const examDays = systemConfig.alert_exam_days;
      const dotationDays = systemConfig.alert_dotation_days;
      const terminationPendingDays = systemConfig.alert_termination_pending_days;
      const notificationRecipients = systemConfig.alert_notification_recipients;
      
      if (notificationRecipients?.emails) {
        setAlertRecipients(notificationRecipients.emails.join('\n'));
      }
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

      // Load Watermark config
      const wmConfig = systemConfig.watermark_config;
      if (wmConfig) {
        setWatermarkEnabled(wmConfig.enabled ?? DEFAULT_WATERMARK_CONFIG.enabled);
        setWatermarkPosition(wmConfig.position || DEFAULT_WATERMARK_CONFIG.position);
        setWatermarkLogoUrl(wmConfig.logo_url || null);
      }

      // Load inactivity timeout config
      const timeoutConfig = systemConfig.inactivity_timeout_minutes;
      if (timeoutConfig) {
        setInactivityEnabled(timeoutConfig.enabled ?? false);
        setInactivityMinutes(timeoutConfig.minutes ?? 15);
      }

      // Load account lockout config
      const lockoutConfig = systemConfig.account_lockout;
      if (lockoutConfig) {
        setLockoutEnabled(lockoutConfig.enabled ?? false);
        setLockoutMaxAttempts(lockoutConfig.max_attempts ?? 5);
        setLockoutMinutes(lockoutConfig.lockout_minutes ?? 15);
      }

      // Load app update check config
      const appUpdateCheckConfig = systemConfig.app_update_check;
      if (appUpdateCheckConfig) {
        setUpdateCheckEnabled(appUpdateCheckConfig.enabled ?? true);
        setUpdateCheckMinutes(appUpdateCheckConfig.minutes ?? 5);
      }

      // Load hiring notification role config
      const hiringConfig = systemConfig.hiring_notification_role;
      if (hiringConfig?.role_id) {
        setHiringNotifRoleId(hiringConfig.role_id);
      }
    }
  }, [systemConfig]);

  const handleSaveAlertConfig = async () => {
    try {
      const emails = alertRecipients
        .split(/[\n,;]/)
        .map((email) => email.trim())
        .filter(Boolean);

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
          description: 'Días mínimos de espera antes de notificar retiros pendientes',
        }),
        updateConfig.mutateAsync({
          key: 'hiring_notification_role',
          value: { role_id: hiringNotifRoleId === 'none' ? null : hiringNotifRoleId },
          description: 'Rol que recibe notificaciones al contratar candidatos',
        }),
      ]);
      toast.success('Configuración de alertas guardada');
    } catch (error) {
      toast.error('Error al guardar la configuración');
    }
  };



  const handleSaveCompanyInfo = async () => {
    if (!company) return;
    try {
      await updateCompany.mutateAsync({
        id: company.id,
        ...companyForm
      });
      setEditingCompany(false);
      toast.success('Información de la empresa actualizada');
    } catch (error) {
      toast.error('Error al actualizar la información');
    }
  };

  const handleUploadCompanyLogo = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'horizontal') => {
    const file = e.target.files?.[0];
    if (!file || !company) return;

    if (type === 'avatar') setUploadingAvatar(true);
    else setUploadingHorizontal(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${company.id}/${type}-${Date.now()}.${fileExt}`;
      const filePath = `company-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateCompany.mutateAsync({
        id: company.id,
        [type === 'avatar' ? 'logo_url' : 'horizontal_logo_url']: publicUrl
      });

      toast.success(`Logo ${type === 'avatar' ? 'de perfil' : 'horizontal'} actualizado`);
    } catch (error) {
      console.error(error);
      toast.error('Error al subir el logo');
    } finally {
      if (type === 'avatar') setUploadingAvatar(false);
      else setUploadingHorizontal(false);
    }
  };

  const handleUploadWatermarkLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }
    setUploadingLogo(true);
    try {
      const fileName = `watermark/${currentCompanyId}_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('training-media')
        .upload(fileName, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('training-media').getPublicUrl(fileName);
      setWatermarkLogoUrl(urlData.publicUrl);
      toast.success('Logo subido exitosamente');
    } catch (err: any) {
      toast.error(err?.message || 'Error al subir el logo');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleSaveWatermarkConfig = async () => {
    setSavingWatermark(true);
    try {
      await updateConfig.mutateAsync({
        key: 'watermark_config',
        value: {
          enabled: watermarkEnabled,
          position: watermarkPosition,
          logo_url: watermarkLogoUrl,
          opacity: DEFAULT_WATERMARK_CONFIG.opacity,
          scale: DEFAULT_WATERMARK_CONFIG.scale,
        },
        description: 'Configuración de marca de agua para imágenes generadas con IA',
      });
      toast.success('Configuración de marca de agua guardada');
    } catch (error) {
      toast.error('Error al guardar la configuración');
    } finally {
      setSavingWatermark(false);
    }
  };

  if (!currentCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Settings className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin empresa asignada</h2>
        <p className="text-muted-foreground">Contacta al administrador.</p>
      </div>
    );
  }

  const positionLabels: Record<WatermarkPosition, string> = {
    'bottom-right': 'Inferior derecha',
    'bottom-left': 'Inferior izquierda',
    'top-right': 'Superior derecha',
    'top-left': 'Superior izquierda',
  };

  return (
    <div className="min-h-screen pb-20 space-y-8 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header Premium */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative p-8 rounded-[2.5rem] bg-background/50 backdrop-blur-xl border border-border/40 overflow-hidden shadow-lg shadow-primary/5"
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative shrink-0 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary-foreground rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative h-20 w-20 flex items-center justify-center rounded-[1.75rem] bg-background border border-border/40 shadow-md overflow-hidden group-hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Settings className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-500" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent uppercase sm:text-4xl">
                Configuración
              </h1>
              <p className="text-muted-foreground font-medium mt-1 tracking-wide">
                Personaliza la experiencia, políticas y seguridad global del sistema
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="h-10 px-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Protocolo Activo</span>
            </div>
          </div>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8 min-w-0">
        <div className="flex justify-center">
          <TabsList className="inline-flex h-16 p-2 rounded-[1.25rem] bg-muted/30 backdrop-blur-md border border-border/50 shadow-inner">
            <TabsTrigger value="company" className="px-8 rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all font-black uppercase text-[10px] tracking-widest">
              <Building2 className="w-4 h-4" />
              Identidad
            </TabsTrigger>
            <TabsTrigger value="alerts" className="px-8 rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all font-black uppercase text-[10px] tracking-widest">
              <Bell className="w-4 h-4" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="security" className="px-8 rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all font-black uppercase text-[10px] tracking-widest">
              <Shield className="w-4 h-4" />
              Seguridad
            </TabsTrigger>
            <TabsTrigger value="ai" className="px-8 rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all font-black uppercase text-[10px] tracking-widest">
              <Brain className="w-4 h-4" />
              IA
            </TabsTrigger>
            <TabsTrigger value="watermark" className="px-8 rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all font-black uppercase text-[10px] tracking-widest">
              <Stamp className="w-4 h-4" />
              Marca de agua
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Company Tab */}
        <TabsContent value="company" className="space-y-8">
          <Card className="rounded-[2.5rem] bg-background/50 backdrop-blur-xl border border-border/40 shadow-lg shadow-black/[0.02] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Identidad Corporativa</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">Datos legales y puntos de contacto de tu organización</CardDescription>
                  </div>
                </div>
                <Button 
                  onClick={() => setEditingCompany(!editingCompany)}
                  className={cn(
                    "h-11 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
                    editingCompany 
                      ? "bg-slate-200 text-slate-600 hover:bg-slate-300 shadow-none" 
                      : "bg-[#004a80] text-white hover:bg-[#003a66] shadow-lg shadow-blue-900/20"
                  )}
                >
                  {editingCompany ? "CANCELAR EDICIÓN" : "MODIFICAR DATOS"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {loadingCompany ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                </div>
              ) : company && (
                <div className="space-y-8">
                  <div className="grid gap-8 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Razón Social</Label>
                      {editingCompany ? (
                        <Input 
                          className="h-12 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-bold text-xs"
                          value={companyForm.name} 
                          onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})} 
                        />
                      ) : (
                        <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 border border-slate-100 font-black text-xs text-slate-900 tracking-tight">
                          {company.name}
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">NIT / Identificación</Label>
                      {editingCompany ? (
                        <Input 
                          className="h-12 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-bold text-xs"
                          value={companyForm.nit} 
                          onChange={(e) => setCompanyForm({...companyForm, nit: e.target.value})} 
                        />
                      ) : (
                        <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 border border-slate-100 font-black text-xs text-slate-900 tracking-tight">
                          {company.nit}
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Correo Institucional</Label>
                      {editingCompany ? (
                        <Input 
                          className="h-12 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-bold text-xs"
                          value={companyForm.email} 
                          onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})} 
                        />
                      ) : (
                        <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 border border-slate-100 font-black text-xs text-slate-900 tracking-tight">
                          {company.email || 'SIN ASIGNAR'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Línea de Atención</Label>
                      {editingCompany ? (
                        <Input 
                          className="h-12 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-bold text-xs"
                          value={companyForm.phone} 
                          onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})} 
                        />
                      ) : (
                        <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 border border-slate-100 font-black text-xs text-slate-900 tracking-tight">
                          {company.phone || 'SIN ASIGNAR'}
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2 space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Dirección Principal</Label>
                      {editingCompany ? (
                        <Input 
                          className="h-12 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-bold text-xs"
                          value={companyForm.address} 
                          onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})} 
                        />
                      ) : (
                        <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 border border-slate-100 font-black text-xs text-slate-900 tracking-tight">
                          {company.address || 'SIN ASIGNAR'}
                        </div>
                      )}
                    </div>
                  </div>

                  {editingCompany && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end pt-4 border-t border-slate-100">
                      <Button 
                        onClick={handleSaveCompanyInfo} 
                        disabled={updateCompany.isPending}
                        className="h-12 px-10 rounded-xl bg-[#004a80] text-white hover:bg-[#003a66] shadow-lg shadow-blue-900/20 font-black uppercase tracking-widest text-[10px]"
                      >
                        {updateCompany.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        CONFIRMAR ACTUALIZACIÓN
                      </Button>
                    </motion.div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logos Management */}
          <div className="grid gap-8 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-primary/10 overflow-hidden rounded-[2rem] shadow-xl shadow-black/5 bg-gradient-to-b from-card to-muted/10 group">
                <CardHeader className="bg-muted/30 border-b border-border/50 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-black flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        Logo Identitario
                      </CardTitle>
                      <CardDescription className="text-xs font-medium uppercase tracking-tighter">Avatar y Perfiles</CardDescription>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center gap-8">
                    <div className="relative group/logo cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                      <div className="w-40 h-40 rounded-[2.5rem] border-2 border-dashed border-primary/20 flex items-center justify-center overflow-hidden bg-background shadow-inner transition-all duration-500 group-hover/logo:border-primary/50 group-hover/logo:shadow-2xl group-hover/logo:shadow-primary/10 group-hover/logo:-rotate-2">
                        {company?.logo_url ? (
                          <img src={company.logo_url} alt="Avatar" className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover/logo:scale-110" />
                        ) : (
                          <Building2 className="w-16 h-16 text-primary/10" />
                        )}
                        <div className="absolute inset-0 bg-primary/60 backdrop-blur-[2px] opacity-0 group-hover/logo:opacity-100 transition-all duration-300 flex items-center justify-center">
                          <div className="bg-white text-primary rounded-full p-3 shadow-xl">
                            <Upload className="w-6 h-6" />
                          </div>
                        </div>
                      </div>
                      <div className="absolute -bottom-3 -right-3 h-12 w-12 rounded-2xl bg-primary shadow-xl flex items-center justify-center border-4 border-card z-10 group-hover/logo:scale-110 transition-transform">
                        <ImageIcon className="w-5 h-5 text-primary-foreground" />
                      </div>
                    </div>

                    <input 
                      type="file" 
                      ref={avatarInputRef} 
                      className="hidden" 
                      onChange={(e) => handleUploadCompanyLogo(e, 'avatar')}
                      accept="image/*"
                    />

                    <div className="text-center space-y-4">
                      <div className="space-y-1">
                        <p className="text-sm font-black text-foreground">Formato Cuadrado</p>
                        <p className="text-[11px] text-muted-foreground font-medium">Recomendado: 512x512px (PNG, SVG, JPG)</p>
                      </div>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="rounded-xl px-6 font-bold shadow-sm hover:shadow-md transition-all h-10"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                      >
                        {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                        Sustituir Avatar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-primary/10 overflow-hidden rounded-[2rem] shadow-xl shadow-black/5 bg-gradient-to-b from-card to-muted/10 group">
                <CardHeader className="bg-muted/30 border-b border-border/50 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-black flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        Logo Institucional
                      </CardTitle>
                      <CardDescription className="text-xs font-medium uppercase tracking-tighter">Documentos y Reportes</CardDescription>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center gap-8">
                    <div className="relative group/logo w-full cursor-pointer" onClick={() => horizontalInputRef.current?.click()}>
                      <div className="w-full h-40 rounded-[2.5rem] border-2 border-dashed border-primary/20 flex items-center justify-center overflow-hidden bg-background shadow-inner transition-all duration-500 group-hover/logo:border-primary/50 group-hover/logo:shadow-2xl group-hover/logo:shadow-primary/10">
                        {company?.horizontal_logo_url ? (
                          <img src={company.horizontal_logo_url} alt="Horizontal Logo" className="w-full h-full object-contain p-6 transition-transform duration-700 group-hover/logo:scale-105" />
                        ) : (
                          <div className="text-center">
                            <ImageIcon className="w-12 h-12 text-primary/10 mx-auto mb-2" />
                            <span className="text-xs text-muted-foreground font-bold">Sin logo horizontal</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-primary/60 backdrop-blur-[2px] opacity-0 group-hover/logo:opacity-100 transition-all duration-300 flex items-center justify-center">
                          <div className="bg-white text-primary rounded-full p-3 shadow-xl">
                            <Upload className="w-6 h-6" />
                          </div>
                        </div>
                      </div>
                      <div className="absolute -bottom-3 -right-3 h-12 w-12 rounded-2xl bg-primary shadow-xl flex items-center justify-center border-4 border-card z-10 group-hover/logo:scale-110 transition-transform">
                        <FileText className="w-5 h-5 text-primary-foreground" />
                      </div>
                    </div>

                    <input 
                      type="file" 
                      ref={horizontalInputRef} 
                      className="hidden" 
                      onChange={(e) => handleUploadCompanyLogo(e, 'horizontal')}
                      accept="image/*"
                    />

                    <div className="text-center space-y-4 w-full">
                      <div className="space-y-1">
                        <p className="text-sm font-black text-foreground">Formato Horizontal</p>
                        <p className="text-[11px] text-muted-foreground font-medium">Recomendado: Relación 3:1 o 4:1 (PNG Transparente)</p>
                      </div>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="rounded-xl px-6 font-bold shadow-sm hover:shadow-md transition-all h-10 w-full sm:w-auto"
                        onClick={() => horizontalInputRef.current?.click()}
                        disabled={uploadingHorizontal}
                      >
                        {uploadingHorizontal ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                        Sustituir Logo Horizontal
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-8">
          <Card className="rounded-[2.5rem] bg-background/50 backdrop-blur-xl border border-border/40 shadow-lg shadow-black/[0.02] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                    <Bell className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Protocolos de Alerta</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">Tiempos de preaviso y destinatarios globales</CardDescription>
                  </div>
                </div>
                <Button 
                  onClick={handleSaveAlertConfig}
                  className="h-11 px-8 rounded-xl bg-[#004a80] text-white hover:bg-[#003a66] shadow-lg shadow-blue-900/20 font-black uppercase tracking-widest text-[10px]"
                >
                  GUARDAR CONFIGURACIÓN
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1 flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> Suscriptores a Notificaciones
                </Label>
                <Textarea
                  value={alertRecipients}
                  onChange={(e) => setAlertRecipients(e.target.value)}
                  placeholder="gerencia.talento@empresa.com&#10;coordinacion.rrhh@empresa.com"
                  className="min-h-32 rounded-2xl bg-white border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-bold text-xs p-4"
                />
                <div className="flex items-center gap-2 px-1">
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Separa los correos por salto de línea para una mejor organización.</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {/* Contratos Card */}
                <div className="relative group p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:shadow-black/5">
                  <div className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 mb-6 flex items-center gap-2">
                    Contratos
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Información</Label>
                      <Input type="number" className="h-10 rounded-xl font-black text-xs" value={alertContractInfo} onChange={(e) => setAlertContractInfo(parseInt(e.target.value) || 60)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Advertencia</Label>
                      <Input type="number" className="h-10 rounded-xl font-black text-xs border-amber-200 bg-amber-50/30" value={alertContractWarning} onChange={(e) => setAlertContractWarning(parseInt(e.target.value) || 30)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-destructive uppercase tracking-widest">Crítico</Label>
                      <Input type="number" className="h-10 rounded-xl font-black text-xs border-red-200 bg-red-50/30" value={alertContractCritical} onChange={(e) => setAlertContractCritical(parseInt(e.target.value) || 7)} />
                    </div>
                  </div>
                </div>

                {/* Exámenes Card */}
                <div className="relative group p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:shadow-black/5">
                  <div className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 mb-6">Exámenes</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Información</Label>
                      <Input type="number" className="h-10 rounded-xl font-black text-xs" value={alertExamInfo} onChange={(e) => setAlertExamInfo(parseInt(e.target.value) || 60)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Advertencia</Label>
                      <Input type="number" className="h-10 rounded-xl font-black text-xs border-amber-200 bg-amber-50/30" value={alertExamWarning} onChange={(e) => setAlertExamWarning(parseInt(e.target.value) || 30)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-destructive uppercase tracking-widest">Crítico</Label>
                      <Input type="number" className="h-10 rounded-xl font-black text-xs border-red-200 bg-red-50/30" value={alertExamCritical} onChange={(e) => setAlertExamCritical(parseInt(e.target.value) || 7)} />
                    </div>
                  </div>
                </div>

                {/* Dotación Card */}
                <div className="relative group p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:shadow-black/5">
                  <div className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                    <Shirt className="w-4 h-4 text-primary" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 mb-6">Dotación</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Información</Label>
                      <Input type="number" className="h-10 rounded-xl font-black text-xs" value={alertDotationInfo} onChange={(e) => setAlertDotationInfo(parseInt(e.target.value) || 60)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Advertencia</Label>
                      <Input type="number" className="h-10 rounded-xl font-black text-xs border-amber-200 bg-amber-50/30" value={alertDotationWarning} onChange={(e) => setAlertDotationWarning(parseInt(e.target.value) || 30)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-destructive uppercase tracking-widest">Crítico</Label>
                      <Input type="number" className="h-10 rounded-xl font-black text-xs border-red-200 bg-red-50/30" value={alertDotationCritical} onChange={(e) => setAlertDotationCritical(parseInt(e.target.value) || 7)} />
                    </div>
                  </div>
                </div>

                {/* Retiros Card */}
                <div className="relative group p-6 rounded-[2rem] bg-slate-900 text-white transition-all hover:shadow-2xl hover:shadow-primary/20">
                  <div className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center">
                    <History className="w-4 h-4 text-primary" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-6">Procesos de Retiro</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Advertencia</Label>
                      <Input type="number" className="h-10 rounded-xl bg-white/5 border-white/10 font-black text-xs text-white" value={alertTerminationWarning} onChange={(e) => setAlertTerminationWarning(parseInt(e.target.value) || 7)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-primary uppercase tracking-widest">Días Críticos</Label>
                      <Input type="number" className="h-10 rounded-xl bg-white/5 border-white/10 font-black text-xs text-white" value={alertTerminationCritical} onChange={(e) => setAlertTerminationCritical(parseInt(e.target.value) || 3)} />
                    </div>
                    <div className="pt-2">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[9px] font-bold text-slate-400 leading-relaxed uppercase tracking-tighter">
                        Alertas automáticas por inactividad en liquidaciones
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Hiring notification role */}
              <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="flex-1">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-1">
                      <Users className="w-3.5 h-3.5" /> Notificación de Contratación
                    </h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-relaxed">
                      Al contratar un candidato, se notificará automáticamente a los usuarios con este rol.
                    </p>
                  </div>
                  <Select value={hiringNotifRoleId} onValueChange={setHiringNotifRoleId}>
                    <SelectTrigger className="w-full sm:w-[240px] h-11 rounded-xl bg-white border-slate-200 shadow-sm font-bold text-[10px] uppercase tracking-widest">
                      <SelectValue placeholder="SELECCIONAR ROL" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      <SelectItem value="none" className="text-[10px] font-bold uppercase tracking-widest">SIN NOTIFICACIÓN</SelectItem>
                      {customRoles?.map((role) => (
                        <SelectItem key={role.id} value={role.id} className="text-[10px] font-bold uppercase tracking-widest">{role.name.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <DiversityGoalsConfig />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai">
          <AITab 
            systemConfig={systemConfig} 
            onUpdateConfig={async (key, value, description) => {
              return await updateConfig.mutateAsync({ key, value, description });
            }}
          />
        </TabsContent>

        {/* Watermark Tab */}
        {/* Watermark Tab */}
        <TabsContent value="watermark" className="space-y-8">
          <Card className="rounded-[2.5rem] bg-background/50 backdrop-blur-xl border border-border/40 shadow-lg shadow-black/[0.02] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                    <Stamp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Marca de Agua</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">Protección visual para contenido generado</CardDescription>
                  </div>
                </div>
                <Button 
                  onClick={handleSaveWatermarkConfig} 
                  disabled={savingWatermark}
                  className="h-11 px-8 rounded-xl bg-[#004a80] text-white hover:bg-[#003a66] shadow-lg shadow-blue-900/20 font-black uppercase tracking-widest text-[10px]"
                >
                  {savingWatermark ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  GUARDAR CONFIGURACIÓN
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              {/* Enable/Disable Toggle Card */}
              <div className="flex items-center justify-between p-6 rounded-[2rem] bg-primary/5 border border-primary/10">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Estado de Protección</Label>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Activar superposición automática en imágenes e infografías IA</p>
                </div>
                <Switch
                  checked={watermarkEnabled}
                  onCheckedChange={setWatermarkEnabled}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className={cn(
                "grid gap-12 md:grid-cols-2 transition-all duration-500",
                !watermarkEnabled && "opacity-40 pointer-events-none grayscale"
              )}>
                {/* Logo Section */}
                <div className="space-y-6">
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1 block mb-4">Identidad de Marca</Label>
                    <div className="flex flex-col sm:flex-row items-center gap-8 p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100">
                      <div className="relative group w-32 h-32 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
                        {watermarkLogoUrl ? (
                          <img src={watermarkLogoUrl} alt="Logo preview" className="max-w-[80%] max-h-[80%] object-contain" />
                        ) : (
                          <div className="text-center p-2 opacity-40">
                            <ImageIcon className="h-8 w-8 mx-auto mb-1 text-slate-400" />
                            <span className="text-[8px] font-black uppercase tracking-tighter">POR DEFECTO</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <Upload className="w-6 h-6 text-white" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 flex-1">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/png,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={handleUploadWatermarkLogo}
                        />
                        <Button
                          variant="outline"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={uploadingLogo}
                          className="h-10 rounded-xl border-slate-200 bg-white font-black uppercase tracking-widest text-[9px] w-full"
                        >
                          {uploadingLogo ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Upload className="h-3 w-3 mr-2" />}
                          SUBIR NUEVO LOGO
                        </Button>
                        {watermarkLogoUrl && (
                          <Button
                            variant="ghost"
                            onClick={() => setWatermarkLogoUrl(null)}
                            className="h-10 rounded-xl text-destructive hover:text-destructive hover:bg-red-50 font-black uppercase tracking-widest text-[9px] w-full"
                          >
                            <X className="h-3 w-3 mr-2" /> RESTABLECER
                          </Button>
                        )}
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter leading-relaxed">Formatos: PNG, WEBP o SVG transparente</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Position Section */}
                <div className="space-y-6">
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1 block mb-4">Ubicación Visual</Label>
                    <div className="space-y-6">
                      <Select value={watermarkPosition} onValueChange={(v) => setWatermarkPosition(v as WatermarkPosition)}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-[10px] uppercase tracking-widest">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {(Object.entries(positionLabels) as [WatermarkPosition, string][]).map(([value, label]) => (
                            <SelectItem key={value} value={value} className="text-[10px] font-bold uppercase tracking-widest">{label.toUpperCase()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Visual Guide */}
                      <div className="relative aspect-video rounded-[2rem] bg-slate-100 border border-slate-200 overflow-hidden shadow-inner group/preview">
                        <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover/preview:opacity-40 transition-opacity">
                          <ImageIcon className="w-24 h-24 text-slate-400" />
                        </div>
                        <motion.div 
                          layout
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          className={cn(
                            "absolute w-12 h-12 flex items-center justify-center",
                            watermarkPosition === 'top-left' ? 'top-6 left-6' :
                            watermarkPosition === 'top-right' ? 'top-6 right-6' :
                            watermarkPosition === 'bottom-left' ? 'bottom-6 left-6' :
                            'bottom-6 right-6'
                          )}
                        >
                          <div className="w-full h-full rounded-xl bg-white shadow-xl border border-slate-200 flex items-center justify-center">
                            <Stamp className="w-5 h-5 text-primary" />
                          </div>
                        </motion.div>
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Vista Previa de Composición</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <SecurityTab
            inactivityMinutes={inactivityMinutes}
            inactivityEnabled={inactivityEnabled}
            onInactivityMinutesChange={setInactivityMinutes}
            onInactivityEnabledChange={setInactivityEnabled}
            lockoutEnabled={lockoutEnabled}
            lockoutMaxAttempts={lockoutMaxAttempts}
            lockoutMinutes={lockoutMinutes}
            onLockoutEnabledChange={setLockoutEnabled}
            onLockoutMaxAttemptsChange={setLockoutMaxAttempts}
            onLockoutMinutesChange={setLockoutMinutes}
            updateCheckEnabled={updateCheckEnabled}
            updateCheckMinutes={updateCheckMinutes}
            onUpdateCheckEnabledChange={setUpdateCheckEnabled}
            onUpdateCheckMinutesChange={setUpdateCheckMinutes}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
