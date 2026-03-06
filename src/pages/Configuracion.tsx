import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Building2,
  FileText,
  Bell,
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

import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompanies';
import {
  useSystemConfig,
  useUpdateSystemConfig,
} from '@/hooks/useSystemConfig';
import { supabase } from '@/integrations/supabase/client';
import type { WatermarkPosition } from '@/lib/watermark';
import { DEFAULT_WATERMARK_CONFIG } from '@/lib/watermark';
import { SecurityTab } from '@/components/config/SecurityTab';

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState('company');

  // Alert config state
  const [alertContractWarning, setAlertContractWarning] = useState(30);
  const [alertContractCritical, setAlertContractCritical] = useState(7);
  const [alertExamWarning, setAlertExamWarning] = useState(30);
  const [alertExamCritical, setAlertExamCritical] = useState(7);
  const [alertDotationWarning, setAlertDotationWarning] = useState(30);
  const [alertDotationCritical, setAlertDotationCritical] = useState(7);
  const [alertTerminationPendingDays, setAlertTerminationPendingDays] = useState(7);

  // AI config state
  const [aiModel, setAiModel] = useState<'gemini' | 'openai'>('gemini');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [testingOpenai, setTestingOpenai] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [savingAi, setSavingAi] = useState(false);

  // HeyGen config state
  const [heygenApiKey, setHeygenApiKey] = useState('');
  const [showHeygenKey, setShowHeygenKey] = useState(false);
  const [testingHeygen, setTestingHeygen] = useState(false);

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

  const { currentCompanyId, user } = useAuth();
  const { data: company, isLoading: loadingCompany } = useCompany(currentCompanyId || undefined);
  const { data: systemConfig, isLoading: loadingConfig } = useSystemConfig();

  const updateConfig = useUpdateSystemConfig();

  // Load config values
  useMemo(() => {
    if (systemConfig) {
      const contractDays = systemConfig.alert_contract_days;
      const examDays = systemConfig.alert_exam_days;
      const dotationDays = systemConfig.alert_dotation_days;
      const terminationPendingDays = systemConfig.alert_termination_pending_days;
      
      if (contractDays) {
        setAlertContractWarning(contractDays.warning || 30);
        setAlertContractCritical(contractDays.critical || 7);
      }
      if (examDays) {
        setAlertExamWarning(examDays.warning || 30);
        setAlertExamCritical(examDays.critical || 7);
      }
      if (dotationDays) {
        setAlertDotationWarning(dotationDays.warning || 30);
        setAlertDotationCritical(dotationDays.critical || 7);
      }
      if (terminationPendingDays) {
        setAlertTerminationPendingDays(terminationPendingDays.min_days || 7);
      }

      // Load AI config
      const aiConfig = systemConfig.ai_config;
      if (aiConfig) {
        setAiModel(aiConfig.model || 'gemini');
        setOpenaiApiKey(aiConfig.openai_api_key || '');
        setGeminiApiKey(aiConfig.gemini_api_key || '');
        setHeygenApiKey(aiConfig.heygen_api_key || '');
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
    }
  }, [systemConfig]);

  const handleSaveAlertConfig = async () => {
    try {
      await Promise.all([
        updateConfig.mutateAsync({
          key: 'alert_contract_days',
          value: { warning: alertContractWarning, critical: alertContractCritical },
        }),
        updateConfig.mutateAsync({
          key: 'alert_exam_days',
          value: { warning: alertExamWarning, critical: alertExamCritical },
        }),
        updateConfig.mutateAsync({
          key: 'alert_dotation_days',
          value: { warning: alertDotationWarning, critical: alertDotationCritical },
        }),
        updateConfig.mutateAsync({
          key: 'alert_termination_pending_days',
          value: { min_days: alertTerminationPendingDays },
          description: 'Días mínimos de espera antes de notificar retiros pendientes',
        }),
      ]);
      toast.success('Configuración de alertas guardada');
    } catch (error) {
      toast.error('Error al guardar la configuración');
    }
  };

  const handleSaveAiConfig = async () => {
    setSavingAi(true);
    try {
      await updateConfig.mutateAsync({
        key: 'ai_config',
        value: {
          model: aiModel,
          openai_api_key: openaiApiKey,
          gemini_api_key: geminiApiKey,
          heygen_api_key: heygenApiKey,
        },
        description: 'Configuración del modelo de IA para generación de capacitaciones',
      });
      toast.success('Configuración de IA guardada');
    } catch (error) {
      toast.error('Error al guardar la configuración de IA');
    } finally {
      setSavingAi(false);
    }
  };

  const handleTestApiKey = async (provider: 'openai' | 'gemini') => {
    const key = provider === 'openai' ? openaiApiKey : geminiApiKey;
    if (!key) {
      toast.error('Ingresa una API Key para probar');
      return;
    }
    if (provider === 'openai') setTestingOpenai(true);
    else setTestingGemini(true);

    setTimeout(() => {
      if (provider === 'openai') {
        if (key.startsWith('sk-')) {
          toast.success('Formato de API Key de OpenAI válido');
        } else {
          toast.warning('La API Key de OpenAI normalmente comienza con "sk-"');
        }
        setTestingOpenai(false);
      } else {
        if (key.length > 20) {
          toast.success('Formato de API Key de Google Gemini válido');
        } else {
          toast.warning('La API Key parece muy corta');
        }
        setTestingGemini(false);
      }
    }, 1000);
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
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground mt-1">Administra la configuración del sistema</p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="w-4 h-4" /><span className="hidden sm:inline">Empresa</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="w-4 h-4" /><span className="hidden sm:inline">Alertas</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" /><span className="hidden sm:inline">Seguridad</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Brain className="w-4 h-4" /><span className="hidden sm:inline">IA</span>
          </TabsTrigger>
          <TabsTrigger value="watermark" className="gap-2">
            <Stamp className="w-4 h-4" /><span className="hidden sm:inline">Marca de agua</span>
          </TabsTrigger>
        </TabsList>

        {/* Company Tab */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Empresa</CardTitle>
              <CardDescription>Datos generales de la empresa</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCompany ? (
                <Skeleton className="h-32 w-full" />
              ) : company && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Nombre</Label>
                    <p className="font-medium mt-1">{company.name}</p>
                  </div>
                  <div>
                    <Label>NIT</Label>
                    <p className="font-medium mt-1">{company.nit}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="font-medium mt-1">{company.email || '-'}</p>
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <p className="font-medium mt-1">{company.phone || '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Dirección</Label>
                    <p className="font-medium mt-1">{company.address || '-'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Alertas</CardTitle>
              <CardDescription>Define los días de anticipación para las alertas de vencimiento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />Contratos
                  </h4>
                  <div>
                    <Label>Advertencia (días)</Label>
                    <Input 
                      type="number" 
                      value={alertContractWarning} 
                      onChange={(e) => setAlertContractWarning(parseInt(e.target.value) || 30)} 
                    />
                  </div>
                  <div>
                    <Label>Crítico (días)</Label>
                    <Input 
                      type="number" 
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
                    <Label>Advertencia (días)</Label>
                    <Input 
                      type="number" 
                      value={alertExamWarning} 
                      onChange={(e) => setAlertExamWarning(parseInt(e.target.value) || 30)} 
                    />
                  </div>
                  <div>
                    <Label>Crítico (días)</Label>
                    <Input 
                      type="number" 
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
                    <Label>Advertencia (días)</Label>
                    <Input 
                      type="number" 
                      value={alertDotationWarning} 
                      onChange={(e) => setAlertDotationWarning(parseInt(e.target.value) || 30)} 
                    />
                  </div>
                  <div>
                    <Label>Crítico (días)</Label>
                    <Input 
                      type="number" 
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
              <Button onClick={handleSaveAlertConfig} disabled={updateConfig.isPending}>
                {updateConfig.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Modelo de Inteligencia Artificial</CardTitle>
                  <CardDescription>Selecciona el proveedor de IA para generar capacitaciones y multimedia</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Model Selection with integrated API Keys */}
              <div className="space-y-3">
                {/* Google Gemini Card */}
                <div
                  className={`w-full rounded-xl border-2 transition-all ${
                    aiModel === 'gemini' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setAiModel('gemini')}
                    className="w-full flex items-start gap-4 p-4 text-left"
                  >
                    <div className="flex items-center gap-3 mt-0.5">
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        aiModel === 'gemini' ? 'border-primary' : 'border-muted-foreground/40'
                      }`}>
                        {aiModel === 'gemini' && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <Zap className={`h-5 w-5 ${aiModel === 'gemini' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Google Gemini</p>
                      <p className="text-sm text-muted-foreground">Rápido y eficiente. Ideal para generación ágil de contenido.</p>
                      <Badge variant="secondary" className="mt-2 font-mono text-xs">gemini-3-flash-preview</Badge>
                    </div>
                  </button>

                  {aiModel === 'gemini' && (
                    <div className="px-4 pb-4 pt-1 border-t border-primary/20 mx-4 mt-1">
                      <div className="space-y-1.5 pt-3">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5 text-muted-foreground" />
                          Google Gemini API Key
                          <span className="text-muted-foreground font-normal">(Opcional)</span>
                        </Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showGeminiKey ? 'text' : 'password'}
                              value={geminiApiKey}
                              onChange={(e) => setGeminiApiKey(e.target.value)}
                              placeholder="AIza..."
                              className="text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setShowGeminiKey(!showGeminiKey)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestApiKey('gemini')}
                            disabled={testingGemini || !geminiApiKey}
                          >
                            {testingGemini ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Probar'}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Déjala vacía para usar el gateway integrado por defecto.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* OpenAI Card */}
                <div
                  className={`w-full rounded-xl border-2 transition-all ${
                    aiModel === 'openai' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setAiModel('openai')}
                    className="w-full flex items-start gap-4 p-4 text-left"
                  >
                    <div className="flex items-center gap-3 mt-0.5">
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        aiModel === 'openai' ? 'border-primary' : 'border-muted-foreground/40'
                      }`}>
                        {aiModel === 'openai' && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <Sparkles className={`h-5 w-5 ${aiModel === 'openai' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">OpenAI ChatGPT</p>
                      <p className="text-sm text-muted-foreground">Alta precisión y razonamiento avanzado para contenido detallado.</p>
                      <Badge variant="secondary" className="mt-2 font-mono text-xs">gpt-5-mini</Badge>
                    </div>
                  </button>

                  {aiModel === 'openai' && (
                    <div className="px-4 pb-4 pt-1 border-t border-primary/20 mx-4 mt-1">
                      <div className="space-y-1.5 pt-3">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5 text-muted-foreground" />
                          OpenAI API Key
                          <span className="text-muted-foreground font-normal">(Opcional)</span>
                        </Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showOpenaiKey ? 'text' : 'password'}
                              value={openaiApiKey}
                              onChange={(e) => setOpenaiApiKey(e.target.value)}
                              placeholder="sk-..."
                              className="text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestApiKey('openai')}
                            disabled={testingOpenai || !openaiApiKey}
                          >
                            {testingOpenai ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Probar'}
                          </Button>
              </div>

              {/* HeyGen Avatar Card */}
              <div className="w-full rounded-xl border-2 border-border bg-card">
                <div className="flex items-start gap-4 p-4">
                  <div className="flex items-center gap-3 mt-0.5">
                    <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      <Video className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">HeyGen — Avatar IA</p>
                    <p className="text-sm text-muted-foreground">Genera videos con un avatar virtual que presenta las capacitaciones</p>
                    <Badge variant="secondary" className="mt-2 font-mono text-xs">Avatar Video API</Badge>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-1 border-t mx-4 mt-1">
                  <div className="space-y-1.5 pt-3">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-muted-foreground" />
                      HeyGen API Key
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showHeygenKey ? 'text' : 'password'}
                          value={heygenApiKey}
                          onChange={(e) => setHeygenApiKey(e.target.value)}
                          placeholder="sk_V2_..."
                          className="text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowHeygenKey(!showHeygenKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showHeygenKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!heygenApiKey) {
                            toast.error('Ingresa una API Key de HeyGen');
                            return;
                          }
                          setTestingHeygen(true);
                          try {
                            // Save first so the edge function can read it
                            await updateConfig.mutateAsync({
                              key: 'ai_config',
                              value: {
                                model: aiModel,
                                openai_api_key: openaiApiKey,
                                gemini_api_key: geminiApiKey,
                                heygen_api_key: heygenApiKey,
                              },
                            });
                            const { data, error } = await supabase.functions.invoke('generate-training-avatar', {
                              body: { action: 'test', companyId: currentCompanyId },
                            });
                            if (error) throw error;
                            if (data?.success) {
                              toast.success(`Conexión exitosa — ${data.avatarCount} avatares disponibles`);
                            } else {
                              toast.error(data?.error || 'No se pudo conectar con HeyGen');
                            }
                          } catch (err: any) {
                            toast.error(err?.message || 'Error al probar la conexión');
                          } finally {
                            setTestingHeygen(false);
                          }
                        }}
                        disabled={testingHeygen || !heygenApiKey}
                      >
                        {testingHeygen ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Probar'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Obtén tu API Key en <a href="https://app.heygen.com/settings/api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">heygen.com/settings/api</a>
                    </p>
                  </div>
                </div>
              </div>
                        <p className="text-xs text-muted-foreground">
                          Déjala vacía para usar el gateway integrado por defecto.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={handleSaveAiConfig} disabled={savingAi} className="bg-primary hover:bg-primary/90">
                {savingAi ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar Configuración IA
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Watermark Tab */}
        <TabsContent value="watermark">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
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
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
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

                  <div className="flex items-start gap-4">
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

                    <div className="flex flex-col gap-2">
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
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(positionLabels) as [WatermarkPosition, string][]).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Visual position indicator */}
                  <div className="w-48 h-32 border rounded-lg bg-muted/20 relative mt-3">
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

              <Button onClick={handleSaveWatermarkConfig} disabled={savingWatermark}>
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
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
