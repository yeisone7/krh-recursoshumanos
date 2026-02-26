import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompanies';
import {
  useSystemConfig,
  useUpdateSystemConfig,
} from '@/hooks/useSystemConfig';

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

  const { currentCompanyId } = useAuth();
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

    // Simple validation: just check the key format
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

  if (!currentCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Settings className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin empresa asignada</h2>
        <p className="text-muted-foreground">Contacta al administrador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground mt-1">Administra la configuración del sistema</p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="w-4 h-4" />Empresa
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="w-4 h-4" />Alertas
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Brain className="w-4 h-4" />Inteligencia Artificial
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
              {/* Model Selection */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setAiModel('gemini')}
                  className={`w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                    aiModel === 'gemini' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
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

                <button
                  type="button"
                  onClick={() => setAiModel('openai')}
                  className={`w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                    aiModel === 'openai' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
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
              </div>

              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                La generación de imágenes siempre usa Google Gemini independientemente del modelo seleccionado.
              </p>

              {/* API Keys Section */}
              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-semibold">API Keys (Opcional)</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Si proporcionas tus propias API keys, se usarán directamente en vez del gateway integrado. Déjalas vacías para usar el servicio por defecto.
                </p>

                <div className="space-y-1.5">
                  <Label>OpenAI API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showOpenaiKey ? 'text' : 'password'}
                        value={openaiApiKey}
                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                        placeholder="sk-..."
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
                </div>

                <div className="space-y-1.5">
                  <Label>Google Gemini API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showGeminiKey ? 'text' : 'password'}
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="AIza..."
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
                </div>
              </div>

              <Button onClick={handleSaveAiConfig} disabled={savingAi} className="bg-primary hover:bg-primary/90">
                {savingAi ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar Configuración IA
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
