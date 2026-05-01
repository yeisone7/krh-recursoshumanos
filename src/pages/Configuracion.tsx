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
  const { currentCompanyId } = useAuth();
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
    <div className="space-y-4 overflow-x-hidden p-4 sm:space-y-6 sm:p-0">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">Administra la configuración del sistema</p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
        <div className="scrollbar-hide w-full overflow-x-auto pb-1">
        <TabsList className="inline-flex h-auto min-w-max justify-start sm:grid sm:w-full sm:grid-cols-5">
          <TabsTrigger value="company" className="gap-2 whitespace-nowrap text-xs sm:text-sm">
            <Building2 className="w-4 h-4" /><span>Empresa</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2 whitespace-nowrap text-xs sm:text-sm">
            <Bell className="w-4 h-4" /><span>Alertas</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 whitespace-nowrap text-xs sm:text-sm">
            <Shield className="w-4 h-4" /><span>Seguridad</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 whitespace-nowrap text-xs sm:text-sm">
            <Brain className="w-4 h-4" /><span>IA</span>
          </TabsTrigger>
          <TabsTrigger value="watermark" className="gap-2 whitespace-nowrap text-xs sm:text-sm">
            <Stamp className="w-4 h-4" /><span>Marca de agua</span>
          </TabsTrigger>
        </TabsList>
        </div>

        {/* Company Tab */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Información de la Empresa</CardTitle>
                <CardDescription>Datos generales y contacto</CardDescription>
              </div>
              <Button 
                variant={editingCompany ? "ghost" : "outline"}
                size="sm"
                onClick={() => setEditingCompany(!editingCompany)}
              >
                {editingCompany ? "Cancelar" : "Editar"}
              </Button>
            </CardHeader>
            <CardContent>
              {loadingCompany ? (
                <Skeleton className="h-32 w-full" />
              ) : company && (
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nombre de la Empresa</Label>
                      {editingCompany ? (
                        <Input 
                          value={companyForm.name} 
                          onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})} 
                        />
                      ) : (
                        <p className="font-medium p-2 bg-muted/30 rounded-md border border-transparent">{company.name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>NIT</Label>
                      {editingCompany ? (
                        <Input 
                          value={companyForm.nit} 
                          onChange={(e) => setCompanyForm({...companyForm, nit: e.target.value})} 
                        />
                      ) : (
                        <p className="font-medium p-2 bg-muted/30 rounded-md border border-transparent">{company.nit}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Email Corporativo</Label>
                      {editingCompany ? (
                        <Input 
                          value={companyForm.email} 
                          onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})} 
                        />
                      ) : (
                        <p className="font-medium p-2 bg-muted/30 rounded-md border border-transparent">{company.email || '-'}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      {editingCompany ? (
                        <Input 
                          value={companyForm.phone} 
                          onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})} 
                        />
                      ) : (
                        <p className="font-medium p-2 bg-muted/30 rounded-md border border-transparent">{company.phone || '-'}</p>
                      )}
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Dirección</Label>
                      {editingCompany ? (
                        <Input 
                          value={companyForm.address} 
                          onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})} 
                        />
                      ) : (
                        <p className="font-medium p-2 bg-muted/30 rounded-md border border-transparent">{company.address || '-'}</p>
                      )}
                    </div>
                  </div>

                  {editingCompany && (
                    <div className="flex justify-end">
                      <Button onClick={handleSaveCompanyInfo} disabled={updateCompany.isPending}>
                        {updateCompany.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Guardar Cambios
                      </Button>
                    </div>
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
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Alertas por Empresa</CardTitle>
              <CardDescription>Define destinatarios, preavisos y niveles para cada tipo de alerta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Correos destinatarios
                </Label>
                <Textarea
                  value={alertRecipients}
                  onChange={(e) => setAlertRecipients(e.target.value)}
                  placeholder="gerencia.talento@empresa.com&#10;coordinacion.rrhh@empresa.com"
                  className="min-h-24"
                />
                <p className="text-xs text-muted-foreground">Puedes separar los correos por salto de línea, coma o punto y coma.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />Contratos
                  </h4>
                  <div>
                    <Label>Info (días)</Label>
                    <Input 
                      type="number" 
                      min={1}
                      value={alertContractInfo} 
                      onChange={(e) => setAlertContractInfo(parseInt(e.target.value) || 60)} 
                    />
                  </div>
                  <div>
                    <Label>Advertencia (días)</Label>
                    <Input 
                      type="number" 
                      min={1}
                      value={alertContractWarning} 
                      onChange={(e) => setAlertContractWarning(parseInt(e.target.value) || 30)} 
                    />
                  </div>
                  <div>
                    <Label>Crítico (días)</Label>
                    <Input 
                      type="number" 
                      min={1}
                      value={alertContractCritical} 
                      onChange={(e) => setAlertContractCritical(parseInt(e.target.value) || 7)} 
                    />
                  </div>
                </div>
                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />Exámenes Médicos
                  </h4>
                  <div>
                    <Label>Info (días)</Label>
                    <Input 
                      type="number" 
                      min={1}
                      value={alertExamInfo} 
                      onChange={(e) => setAlertExamInfo(parseInt(e.target.value) || 60)} 
                    />
                  </div>
                  <div>
                    <Label>Advertencia (días)</Label>
                    <Input 
                      type="number" 
                      min={1}
                      value={alertExamWarning} 
                      onChange={(e) => setAlertExamWarning(parseInt(e.target.value) || 30)} 
                    />
                  </div>
                  <div>
                    <Label>Crítico (días)</Label>
                    <Input 
                      type="number" 
                      min={1}
                      value={alertExamCritical} 
                      onChange={(e) => setAlertExamCritical(parseInt(e.target.value) || 7)} 
                    />
                  </div>
                </div>
                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Shirt className="w-4 h-4" />Dotación
                  </h4>
                  <div>
                    <Label>Info (días)</Label>
                    <Input 
                      type="number" 
                      min={1}
                      value={alertDotationInfo} 
                      onChange={(e) => setAlertDotationInfo(parseInt(e.target.value) || 60)} 
                    />
                  </div>
                  <div>
                    <Label>Advertencia (días)</Label>
                    <Input 
                      type="number" 
                      min={1}
                      value={alertDotationWarning} 
                      onChange={(e) => setAlertDotationWarning(parseInt(e.target.value) || 30)} 
                    />
                  </div>
                  <div>
                    <Label>Crítico (días)</Label>
                    <Input 
                      type="number" 
                      min={1}
                      value={alertDotationCritical} 
                      onChange={(e) => setAlertDotationCritical(parseInt(e.target.value) || 7)} 
                    />
                  </div>
                </div>
                <div className="space-y-3 p-4 border rounded-lg bg-warning/5 border-warning/20">
                  <h4 className="font-medium flex items-center gap-2">
                    <Bell className="w-4 h-4 text-warning" />Notificación Retiros
                  </h4>
                  <div>
                    <Label>Info (días)</Label>
                    <Input 
                      type="number" 
                      min={1}
                      value={alertTerminationInfo} 
                      onChange={(e) => setAlertTerminationInfo(parseInt(e.target.value) || 15)} 
                    />
                  </div>
                  <div>
                    <Label>Advertencia (días)</Label>
                    <Input 
                      type="number" 
                      min={1}
                      value={alertTerminationWarning} 
                      onChange={(e) => setAlertTerminationWarning(parseInt(e.target.value) || 7)} 
                    />
                  </div>
                  <div>
                    <Label>Crítico (días)</Label>
                    <Input 
                      type="number" 
                      min={1}
                      value={alertTerminationCritical} 
                      onChange={(e) => setAlertTerminationCritical(parseInt(e.target.value) || 3)} 
                    />
                  </div>
                  <div>
                    <Label>Días pendientes mínimos</Label>
                    <Input 
                      type="number" 
                      min={1}
                      value={alertTerminationPendingDays} 
                      onChange={(e) => setAlertTerminationPendingDays(parseInt(e.target.value) || 7)} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Envía email si el proceso de retiro lleva más de estos días sin completar
                  </p>
                </div>
              </div>

              {/* Hiring notification role */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Notificación de Contratación
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cuando se contrata un candidato, se enviará una notificación a todos los usuarios con el rol seleccionado
                      </p>
                    </div>
                    <Select value={hiringNotifRoleId} onValueChange={setHiringNotifRoleId}>
                      <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin notificación</SelectItem>
                        {customRoles?.map((role) => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSaveAlertConfig} disabled={updateConfig.isPending} className="w-full sm:w-auto">
                {updateConfig.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />Guardar Configuración
              </Button>

              {/* Diversity Goals */}
              <DiversityGoalsConfig />
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
        <TabsContent value="watermark">
          <Card>
            <CardHeader>
                <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Stamp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Marca de Agua</CardTitle>
                  <CardDescription>Configura el logo que se aplica a las imágenes generadas con IA en capacitaciones</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-start justify-between gap-4 p-4 border rounded-lg">
                <div className="min-w-0 space-y-0.5">
                  <Label className="text-base font-medium">Activar marca de agua</Label>
                  <p className="text-sm text-muted-foreground">
                    Agrega automáticamente el logo a las imágenes, mapas mentales e infografías generadas
                  </p>
                </div>
                <Switch
                  checked={watermarkEnabled}
                  onCheckedChange={setWatermarkEnabled}
                />
              </div>

              <div className={`space-y-5 transition-opacity ${watermarkEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                {/* Logo Upload */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4" /> Logo personalizado
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Sube un logo PNG transparente. Si no subes uno, se usará el logo por defecto de Petrocasinos.
                  </p>

                  <div className="flex flex-col items-start gap-4 sm:flex-row">
                    {/* Preview */}
                    <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden flex-shrink-0">
                      {watermarkLogoUrl ? (
                        <img
                          src={watermarkLogoUrl}
                          alt="Logo watermark"
                          className="max-w-full max-h-full object-contain p-2"
                        />
                      ) : (
                        <div className="text-center p-2">
                          <ImageIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-1" />
                          <span className="text-xs text-muted-foreground">Logo por defecto</span>
                        </div>
                      )}
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:w-auto">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={handleUploadWatermarkLogo}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="gap-2"
                      >
                        {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Subir logo
                      </Button>
                      {watermarkLogoUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setWatermarkLogoUrl(null)}
                          className="gap-2 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" /> Usar por defecto
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">Posición del logo</Label>
                  <Select value={watermarkPosition} onValueChange={(v) => setWatermarkPosition(v as WatermarkPosition)}>
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(positionLabels) as [WatermarkPosition, string][]).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Visual position indicator */}
                  <div className="relative mt-3 h-32 w-full max-w-48 border rounded-lg bg-muted/20">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground/50">Imagen</span>
                    </div>
                    <div className={`absolute w-10 h-6 rounded bg-primary/20 border border-primary/40 flex items-center justify-center ${
                      watermarkPosition === 'top-left' ? 'top-2 left-2' :
                      watermarkPosition === 'top-right' ? 'top-2 right-2' :
                      watermarkPosition === 'bottom-left' ? 'bottom-2 left-2' :
                      'bottom-2 right-2'
                    }`}>
                      <Stamp className="h-3 w-3 text-primary" />
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveWatermarkConfig} disabled={savingWatermark} className="w-full sm:w-auto">
                {savingWatermark ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar Configuración
              </Button>
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
