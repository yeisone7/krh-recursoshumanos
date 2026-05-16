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
  History,
  CheckCircle2,
  Info,
  RefreshCw,
  MoreHorizontal,
  LayoutGrid,
  Check
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
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-sm">
          <Settings className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Sin empresa asignada</h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Contacta al administrador del sistema.</p>
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
    <div className="space-y-8 max-w-7xl mx-auto px-2">
      {/* Header Premium Flat */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm shrink-0">
            <Settings className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-foreground uppercase tracking-tight">Configuración</h1>
              <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest">CENTRO DE CONTROL</Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestión de parámetros corporativos y protocolos de negocio</p>
          </div>
        </div>
        
        <div className="h-12 px-6 rounded-2xl bg-white border border-slate-100 flex items-center gap-3 w-full md:w-auto shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Núcleo Sincronizado</span>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="flex justify-center px-1 overflow-x-auto no-scrollbar">
          <TabsList className="flex h-auto p-1.5 gap-1.5 bg-white border border-slate-100 rounded-2xl w-max md:w-full max-w-4xl shadow-sm">
            {[
              { value: 'company', label: 'Identidad', icon: Building2 },
              { value: 'alerts', label: 'Alertas', icon: Bell },
              { value: 'security', label: 'Protección', icon: Shield },
              { value: 'ai', label: 'IA Cognitiva', icon: Brain },
              { value: 'watermark', label: 'Branding', icon: Stamp },
            ].map((tab) => (
              <TabsTrigger 
                key={tab.value}
                value={tab.value} 
                className="text-[9px] font-black uppercase tracking-widest py-3 px-6 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all shrink-0 shadow-sm"
              >
                <tab.icon className="w-3.5 h-3.5 mr-2.5 shrink-0" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Company Tab */}
        <TabsContent value="company" className="space-y-8 focus-visible:outline-none px-1">
          <Card className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Activos Corporativos</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identidad legal y corporativa de la organización</CardDescription>
                </div>
                <Button 
                  onClick={() => setEditingCompany(!editingCompany)}
                  className={cn(
                    "h-12 px-10 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all w-full md:w-auto shadow-xl shadow-slate-100",
                    editingCompany 
                      ? "bg-slate-100 text-slate-400 hover:bg-slate-200" 
                      : "bg-primary text-white hover:bg-primary/90"
                  )}
                >
                  {editingCompany ? "DESCARTAR CAMBIOS" : "EDITAR PARÁMETROS"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {loadingCompany ? (
                <div className="space-y-6">
                  <Skeleton className="h-14 w-full rounded-2xl" />
                  <div className="grid grid-cols-2 gap-6">
                    <Skeleton className="h-14 rounded-2xl" />
                    <Skeleton className="h-14 rounded-2xl" />
                  </div>
                </div>
              ) : company && (
                <div className="space-y-10">
                  <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Razón Social</Label>
                      <Input 
                        disabled={!editingCompany}
                        className="h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-primary transition-all font-black text-xs uppercase tracking-tight px-6"
                        value={companyForm.name} 
                        onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">NIT / Tax ID</Label>
                      <Input 
                        disabled={!editingCompany}
                        className="h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-primary transition-all font-black text-xs uppercase tracking-tight px-6"
                        value={companyForm.nit} 
                        onChange={(e) => setCompanyForm({...companyForm, nit: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Correo Institucional</Label>
                      <Input 
                        disabled={!editingCompany}
                        className="h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-primary transition-all font-black text-xs lowercase tracking-tight px-6"
                        value={companyForm.email} 
                        onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Teléfono Directo</Label>
                      <Input 
                        disabled={!editingCompany}
                        className="h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-primary transition-all font-black text-xs uppercase tracking-tight px-6"
                        value={companyForm.phone} 
                        onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})} 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Sede Principal</Label>
                      <Input 
                        disabled={!editingCompany}
                        className="h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-primary transition-all font-black text-xs uppercase tracking-tight px-6"
                        value={companyForm.address} 
                        onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})} 
                      />
                    </div>
                  </div>

                  {editingCompany && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end pt-8 border-t border-slate-50">
                      <Button 
                        onClick={handleSaveCompanyInfo} 
                        disabled={updateCompany.isPending}
                        className="h-14 px-12 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                      >
                        {updateCompany.isPending ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <Save className="w-4 h-4 mr-3" />}
                        SINCRONIZAR DATOS
                      </Button>
                    </motion.div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logos Management */}
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
            {[
              { 
                title: 'Avatar de Marca', 
                desc: 'Visualización en perfiles y listas', 
                type: 'avatar', 
                icon: ImageIcon, 
                url: company?.logo_url, 
                ref: avatarInputRef, 
                uploading: uploadingAvatar,
                specs: '512x512px • Ratio 1:1'
              },
              { 
                title: 'Logo de Cabecera', 
                desc: 'Branding en reportes y papelería', 
                type: 'horizontal', 
                icon: LayoutGrid, 
                url: company?.horizontal_logo_url, 
                ref: horizontalInputRef, 
                uploading: uploadingHorizontal,
                specs: 'Recomendado: PNG • 400x120px'
              }
            ].map((logo) => (
              <Card key={logo.type} className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden group">
                <CardHeader className="p-8 border-b border-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900">{logo.title}</CardTitle>
                      <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">{logo.desc}</CardDescription>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <logo.icon className="w-6 h-6 stroke-[2.5]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10 flex flex-col items-center">
                  <div 
                    className="relative group/btn cursor-pointer w-full flex items-center justify-center"
                    onClick={() => logo.ref.current?.click()}
                  >
                    <div className={cn(
                      "rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden transition-all duration-500 hover:border-primary/50 hover:bg-white shadow-inner",
                      logo.type === 'avatar' ? 'w-48 h-48' : 'w-full h-48'
                    )}>
                      {logo.url ? (
                        <img src={logo.url} alt="Logo" className="max-w-[80%] max-h-[80%] object-contain p-4 transition-transform duration-700 hover:scale-110" />
                      ) : (
                        <div className="text-center space-y-3 opacity-20">
                          <Upload className="w-12 h-12 mx-auto" />
                          <span className="text-[10px] font-black uppercase tracking-widest block">Subir Activo</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-primary/80 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-3xl">
                        <Upload className="w-10 h-10 text-white stroke-[3]" />
                      </div>
                    </div>
                  </div>
                  
                  <input type="file" ref={logo.ref} className="hidden" accept="image/*" onChange={(e) => handleUploadCompanyLogo(e, logo.type as any)} />
                  
                  <div className="mt-8 text-center space-y-4">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{logo.specs}</p>
                    <Button 
                      variant="outline" 
                      className="h-12 px-8 rounded-2xl border-slate-100 font-black uppercase tracking-widest text-[9px] hover:bg-primary hover:text-white transition-all shadow-sm"
                      onClick={() => logo.ref.current?.click()}
                      disabled={logo.uploading}
                    >
                      {logo.uploading ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : <RefreshCw className="w-4 h-4 mr-3" />}
                      ACTUALIZAR RECURSO
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="focus-visible:outline-none px-1">
          <Card className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Protocolos de Alerta</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Automatización de preavisos y notificaciones críticas</CardDescription>
                </div>
                <Button 
                  onClick={handleSaveAlertConfig}
                  className="h-12 px-10 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] w-full md:w-auto shadow-lg shadow-primary/20"
                >
                  <Save className="w-4 h-4 mr-3 stroke-[2.5]" />
                  GUARDAR REGLAS
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-12">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" /> Destinatarios del Canal de Alerta
                </Label>
                <div className="relative group">
                  <Textarea
                    value={alertRecipients}
                    onChange={(e) => setAlertRecipients(e.target.value)}
                    placeholder="ADMIN@EMPRESA.COM&#10;RH@EMPRESA.COM"
                    className="min-h-40 rounded-3xl bg-slate-50 border-slate-100 focus:bg-white focus:border-primary transition-all font-bold text-xs uppercase tracking-widest p-8 leading-relaxed shadow-inner"
                  />
                  <div className="absolute top-6 right-6 h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300">
                    <Info className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Check className="w-3 h-3 text-emerald-500" />
                  Define los correos separándolos con saltos de línea para el sistema de broadcast.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { id: 'contratos', label: 'Vencimiento Contratos', icon: FileText, color: 'text-primary', bg: 'bg-primary/10', info: alertContractInfo, setInfo: setAlertContractInfo, warn: alertContractWarning, setWarn: setAlertContractWarning, crit: alertContractCritical, setCrit: setAlertContractCritical },
                  { id: 'examenes', label: 'Exámenes Médicos', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50', info: alertExamInfo, setInfo: setAlertExamInfo, warn: alertExamWarning, setWarn: setAlertExamWarning, crit: alertExamCritical, setCrit: setAlertExamCritical },
                  { id: 'dotacion', label: 'Entrega Dotación', icon: Shirt, color: 'text-amber-500', bg: 'bg-amber-50', info: alertDotationInfo, setInfo: setAlertDotationInfo, warn: alertDotationWarning, setWarn: setAlertDotationWarning, crit: alertDotationCritical, setCrit: setAlertDotationCritical },
                  { id: 'retiros', label: 'Procesos de Retiro', icon: History, color: 'text-red-500', bg: 'bg-red-50', warn: alertTerminationWarning, setWarn: setAlertTerminationWarning, crit: alertTerminationCritical, setCrit: setAlertTerminationCritical },
                ].map((item) => (
                  <div key={item.id} className="p-6 rounded-3xl bg-white border border-slate-100 hover:border-primary/20 transition-all group shadow-sm">
                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", item.bg, item.color)}>
                      <item.icon className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-6">{item.label}</h4>
                    
                    <div className="space-y-5">
                      {item.info !== undefined && (
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fase Info</Label>
                          <div className="relative">
                            <Input type="number" className="h-10 rounded-xl bg-slate-50 border-none font-black text-xs px-4" value={item.info} onChange={(e) => item.setInfo?.(parseInt(e.target.value) || 0)} />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-300">DÍAS</span>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black text-orange-500 uppercase tracking-widest ml-1">Fase Alerta</Label>
                        <div className="relative">
                          <Input type="number" className="h-10 rounded-xl bg-orange-50/50 border-none font-black text-xs px-4 text-orange-600" value={item.warn} onChange={(e) => item.setWarn(parseInt(e.target.value) || 0)} />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-orange-300">DÍAS</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">Fase Crítica</Label>
                        <div className="relative">
                          <Input type="number" className="h-10 rounded-xl bg-red-50/50 border-none font-black text-xs px-4 text-red-600" value={item.crit} onChange={(e) => item.setCrit(parseInt(e.target.value) || 0)} />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-red-300">DÍAS</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-10 rounded-3xl bg-primary text-white border-none shadow-xl shadow-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                  <Bell className="w-48 h-48" />
                </div>
                <div className="relative flex flex-col lg:flex-row lg:items-center gap-10">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-white/20 text-white flex items-center justify-center">
                        <Users className="w-6 h-6 stroke-[2.5]" />
                      </div>
                      <h4 className="text-lg font-black uppercase tracking-tight">Nodo de Bienvenida HHRR</h4>
                    </div>
                    <p className="text-[10px] font-black text-primary-foreground/60 uppercase tracking-widest leading-relaxed max-w-xl">
                      Define el rol administrativo encargado de formalizar la inducción y bienvenida de nuevos talentos.
                    </p>
                  </div>
                  <div className="shrink-0 w-full lg:w-[350px]">
                    <Select value={hiringNotifRoleId} onValueChange={setHiringNotifRoleId}>
                      <SelectTrigger className="h-14 rounded-2xl bg-white/5 border-white/10 font-black text-[10px] uppercase tracking-widest text-white focus:ring-white/20">
                        <SelectValue placeholder="SELECCIONAR ROL" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2">
                        <SelectItem value="none" className="rounded-xl font-black text-[10px] uppercase tracking-widest py-4">NOTIFICACIONES DESACTIVADAS</SelectItem>
                        <div className="h-px bg-slate-100 my-2" />
                        {customRoles?.map((role) => (
                          <SelectItem key={role.id} value={role.id} className="rounded-xl font-black text-[10px] uppercase tracking-widest py-4">{role.name.toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="pt-12 border-t border-slate-50">
                <DiversityGoalsConfig />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="focus-visible:outline-none px-1">
          <SecurityTab 
            systemConfig={systemConfig} 
            onUpdateConfig={async (key, value, description) => {
              return await updateConfig.mutateAsync({ key, value, description });
            }}
          />
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai" className="focus-visible:outline-none px-1">
          <AITab 
            systemConfig={systemConfig} 
            onUpdateConfig={async (key, value, description) => {
              return await updateConfig.mutateAsync({ key, value, description });
            }}
          />
        </TabsContent>

        {/* Watermark Tab */}
        <TabsContent value="watermark" className="focus-visible:outline-none px-1">
          <Card className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Marca de Agua Cognitiva</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Protección de activos visuales generados por IA</CardDescription>
                </div>
                <Button 
                  onClick={handleSaveWatermarkConfig} 
                  disabled={savingWatermark}
                  className="h-12 px-10 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                >
                  {savingWatermark ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <Save className="w-4 h-4 mr-3 stroke-[2.5]" />}
                  APLICAR SELLO
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-12">
              <div className="flex flex-col sm:flex-row items-center justify-between p-10 rounded-3xl bg-slate-50 border border-slate-100 gap-8 shadow-inner">
                <div className="space-y-2 text-center sm:text-left">
                  <Label className="text-lg font-black uppercase tracking-tight text-slate-900">Protección Perimetral de Imagen</Label>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-md">Estampa automáticamente el logo corporativo como sello de autenticidad en cada generación visual del sistema.</p>
                </div>
                <Switch
                  checked={watermarkEnabled}
                  onCheckedChange={setWatermarkEnabled}
                  className="data-[state=checked]:bg-primary scale-125"
                />
              </div>

              <div className={cn(
                "grid gap-12 lg:grid-cols-2 transition-all duration-700",
                !watermarkEnabled && "opacity-30 pointer-events-none grayscale scale-[0.98]"
              )}>
                {/* Logo Section */}
                <div className="space-y-6">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Activo de Marca</Label>
                  <div className="flex flex-col sm:flex-row items-center gap-8 p-10 rounded-3xl bg-white border border-slate-100 shadow-sm">
                    <div className="relative group/wm w-40 h-40 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-100 flex items-center justify-center overflow-hidden transition-all hover:border-primary/40 shadow-inner">
                      {watermarkLogoUrl ? (
                        <img src={watermarkLogoUrl} alt="Preview" className="max-w-[70%] max-h-[70%] object-contain drop-shadow-2xl transition-transform duration-500 group-hover/wm:scale-110" />
                      ) : (
                        <div className="text-center opacity-20">
                          <Stamp className="h-12 w-12 mx-auto mb-2" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Sello Vacío</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover/wm:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                        <Upload className="w-10 h-10 text-white stroke-[3]" />
                      </div>
                    </div>

                    <div className="flex-1 w-full space-y-4">
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadWatermarkLogo} />
                      <Button
                        variant="secondary"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] w-full shadow-lg shadow-slate-200"
                      >
                        {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin mr-3" /> : <Upload className="h-4 w-4 mr-3" />}
                        CARGAR SELLO
                      </Button>
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-center">Formato PNG Transparente • Máx 2MB</p>
                    </div>
                  </div>
                </div>

                {/* Position Section */}
                <div className="space-y-6">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Posicionamiento Geométrico</Label>
                  <div className="p-10 rounded-[3rem] bg-slate-50 border border-slate-100 shadow-inner">
                    <div className="grid grid-cols-2 gap-4">
                      {(Object.keys(positionLabels) as WatermarkPosition[]).map((pos) => (
                        <Button
                          key={pos}
                          variant="outline"
                          onClick={() => setWatermarkPosition(pos)}
                          className={cn(
                            "h-16 rounded-2xl border-none font-black text-[9px] uppercase tracking-widest transition-all",
                            watermarkPosition === pos 
                              ? "bg-slate-900 text-white shadow-xl scale-[1.02]" 
                              : "bg-white text-slate-400 hover:bg-white/80"
                          )}
                        >
                          {positionLabels[pos]}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Visual Simulator */}
                    <div className="mt-8 relative aspect-video bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-slate-100" />
                      </div>
                      {watermarkLogoUrl && (
                        <motion.img
                          layoutId="watermark"
                          src={watermarkLogoUrl}
                          className={cn(
                            "absolute w-12 h-12 object-contain opacity-50 p-2",
                            watermarkPosition === 'top-left' && "top-4 left-4",
                            watermarkPosition === 'top-right' && "top-4 right-4",
                            watermarkPosition === 'bottom-left' && "bottom-4 left-4",
                            watermarkPosition === 'bottom-right' && "bottom-4 right-4"
                          )}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
