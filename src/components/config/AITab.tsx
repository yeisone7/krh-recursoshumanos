import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Zap,
  Sparkles,
  Bot,
  Key,
  Shield,
  Info,
  ExternalLink,
  Plus,
  Settings2,
  Trash2,
  Pencil,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Cpu,
  Video,
  ChevronRight,
  Database,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface AITabProps {
  systemConfig: any;
  onUpdateConfig: (key: string, value: any, description?: string) => Promise<any>;
}

export function AITab({ systemConfig, onUpdateConfig }: AITabProps) {
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);

  // Form state
  const [aiConfig, setAiConfig] = useState({
    model: 'gemini',
    openai_api_key: '',
    gemini_api_key: '',
    anthropic_api_key: '',
    heygen_api_key: '',
    tokens: 1024,
    temperature: 0.3,
  });

  const [showKeys, setShowKeys] = useState({
    openai: false,
    gemini: false,
    anthropic: false,
    heygen: false,
  });

  useEffect(() => {
    if (systemConfig?.ai_config) {
      setAiConfig({
        ...aiConfig,
        ...systemConfig.ai_config,
      });
    }
  }, [systemConfig]);

  const handleSave = async (newConfig = aiConfig) => {
    setSaving(true);
    try {
      await onUpdateConfig('ai_config', newConfig, 'Configuración del modelo de IA para generación de capacitaciones');
      toast.success('Configuración de IA actualizada');
      setIsDialogOpen(false);
      setEditingProvider(null);
    } catch (error) {
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const activeProvider = aiConfig.model;
  
  const providers = [
    {
      id: 'openai',
      name: 'OpenAI',
      icon: <Bot className="h-6 w-6" />,
      models: [
        'GPT-4o Mini', 
        'GPT-4o', 
        'GPT-4 Turbo', 
        'GPT-3.5 Turbo'
      ],
      suggested: 'GPT-4o Mini',
      docs: 'https://platform.openai.com/api-keys',
      description: 'Alta precisión y razonamiento avanzado para contenido detallado.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50'
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      icon: <Brain className="h-6 w-6" />,
      models: [
        'Claude Sonnet 4', 
        'Claude 3.5 Haiku', 
        'Claude Opus 4'
      ],
      suggested: 'Claude Sonnet 4',
      docs: 'https://console.anthropic.com/settings/keys',
      description: 'Líder en seguridad y redacción natural.',
      color: 'text-orange-500',
      bg: 'bg-orange-50'
    },
    {
      id: 'gemini',
      name: 'Google',
      icon: <Sparkles className="h-6 w-6" />,
      models: [
        'Gemini 2.0 Flash', 
        'Gemini 2.5 Pro', 
        'Gemini 2.0 Flash Lite'
      ],
      suggested: 'Gemini 2.0 Flash',
      docs: 'https://aistudio.google.com/app/apikey',
      description: 'Rápido y eficiente con ventana de contexto masiva.',
      color: 'text-primary',
      bg: 'bg-primary/5'
    },
    {
      id: 'heygen',
      name: 'HeyGen',
      icon: <Video className="h-6 w-6" />,
      models: [
        'Avatar Video API', 
        'Streaming Avatar'
      ],
      suggested: 'Avatar Video API',
      docs: 'https://app.heygen.com/settings/api',
      description: 'Genera videos con un avatar virtual que presenta las capacitaciones.',
      color: 'text-purple-500',
      bg: 'bg-purple-50'
    },
  ];

  const currentProviderData = providers.find(p => p.id === activeProvider) || providers[2];

  const maskKey = (key: string) => {
    if (!key) return 'No configurado';
    if (key.length <= 8) return '********';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  return (
    <div className="space-y-8">
      {/* Banner de Estado Premium */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-[2.5rem] bg-slate-900 text-white p-8 sm:p-12 relative overflow-hidden shadow-2xl border border-slate-800"
      >
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none scale-150">
          {currentProviderData.icon}
        </div>
        
        <div className="relative flex flex-col lg:flex-row items-center gap-10">
          <div className="shrink-0">
            <div className="h-24 w-24 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-primary backdrop-blur-xl shadow-2xl">
              <div className="scale-[1.8]">
                {currentProviderData.icon}
              </div>
            </div>
          </div>

          <div className="flex-1 text-center lg:text-left space-y-4">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <Badge className="bg-primary text-white border-none font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                SISTEMA OPERATIVO
              </Badge>
              <div className="h-1 w-1 rounded-full bg-white/20" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Núcleo {currentProviderData.name}</span>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">Motor Cognitivo Activo</h2>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wide leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {currentProviderData.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-2">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Capacidad</span>
                  <span className="text-xl font-black text-white tracking-tighter">{aiConfig.tokens} <span className="text-[10px] text-primary">TOKENS</span></span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Creatividad</span>
                  <span className="text-xl font-black text-white tracking-tighter">{aiConfig.temperature} <span className="text-[10px] text-primary">SCALE</span></span>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 w-full lg:w-auto">
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="w-full lg:w-auto h-16 px-10 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black uppercase tracking-widest text-[10px] shadow-xl transition-all active:scale-95"
            >
              <Settings2 className="w-4 h-4 mr-3 stroke-[2.5]" />
              MODIFICAR CEREBRO
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Grid de Proveedores */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <div className="h-px flex-1 bg-slate-100" />
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Ecosistema de Inteligencia</h4>
          <div className="h-px flex-1 bg-slate-100" />
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {providers.map((p, idx) => {
            const hasKey = p.id === 'openai' ? aiConfig.openai_api_key :
                          p.id === 'gemini' ? aiConfig.gemini_api_key :
                          p.id === 'heygen' ? aiConfig.heygen_api_key :
                          aiConfig.anthropic_api_key;
            
            const isActive = activeProvider === p.id;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group"
              >
                <Card className={cn(
                  "rounded-[2.5rem] border border-slate-100 bg-white transition-all duration-500 h-full flex flex-col shadow-sm overflow-hidden",
                  isActive ? "ring-2 ring-primary border-transparent scale-[1.02] shadow-xl shadow-primary/5" : "hover:border-primary/20 hover:shadow-md"
                )}>
                  <CardContent className="p-8 flex flex-col h-full space-y-6">
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                        isActive ? "bg-primary text-white" : "bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary"
                      )}>
                        <div className="scale-110">
                          {p.icon}
                        </div>
                      </div>
                      
                      {isActive && (
                        <div className="h-3 w-3 rounded-full bg-primary animate-ping" />
                      )}
                    </div>

                    <div className="space-y-4 flex-1">
                      <div className="space-y-1">
                        <h5 className="font-black text-slate-900 text-lg uppercase tracking-tight">{p.name}</h5>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
                          {p.description}
                        </p>
                      </div>
                      
                      <div className="space-y-2 py-2 border-y border-slate-50">
                        {p.models.map((model, mIdx) => (
                          <div key={mIdx} className="flex items-center gap-3">
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{model}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <a
                        href={p.docs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] font-black text-primary hover:underline flex items-center gap-1.5 tracking-widest"
                      >
                        API DOCS <ExternalLink className="h-3 w-3" />
                      </a>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-xl hover:bg-slate-900 hover:text-white transition-all"
                        onClick={() => {
                          setEditingProvider(p.id);
                          setAiConfig({ ...aiConfig, model: p.id });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Info Boxes */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-8 rounded-[2.5rem] bg-emerald-50 border border-emerald-100 flex items-start gap-6 group hover:bg-emerald-100/50 transition-all shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200">
            <Shield className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <h5 className="text-sm font-black text-emerald-900 uppercase tracking-widest">Privacidad de Datos</h5>
            <p className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wide leading-relaxed">
              Toda la información es procesada bajo túneles cifrados. No compartimos datos con modelos de entrenamiento públicos.
            </p>
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 flex items-start gap-6 group hover:bg-slate-100 transition-all shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-lg shadow-slate-200">
            <Cpu className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <h5 className="text-sm font-black text-slate-900 uppercase tracking-widest">Alta Disponibilidad</h5>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-relaxed">
              Infraestructura redundante con escalamiento automático para garantizar tiempos de respuesta menores a 2 segundos.
            </p>
          </div>
        </div>
      </div>

      {/* Dialogo de Configuración */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[3rem] border-none bg-white p-0 overflow-hidden shadow-2xl">
          <div className="p-10 space-y-10">
            <DialogHeader>
              <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <Brain className="w-8 h-8 stroke-[2.5]" />
              </div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">Sincronizar Proveedor IA</DialogTitle>
              <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Configura los parámetros técnicos para el motor seleccionado.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Seleccionar Arquitectura</Label>
                <div className="grid grid-cols-4 gap-3">
                  {providers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setAiConfig({ ...aiConfig, model: p.id })}
                      className={cn(
                        "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all group relative",
                        aiConfig.model === p.id 
                          ? "border-primary bg-primary/5 shadow-lg shadow-primary/5" 
                          : "border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-white"
                      )}
                    >
                      <div className={cn(
                        "p-1 transition-transform duration-500",
                        aiConfig.model === p.id ? "text-primary scale-110" : "text-slate-300 group-hover:scale-110"
                      )}>
                        {p.icon}
                      </div>
                      <span className="text-[8px] font-black text-center uppercase tracking-tighter truncate w-full">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">API Access Key</Label>
                <div className="relative group">
                  <Input
                    type={showKeys[aiConfig.model as keyof typeof showKeys] ? 'text' : 'password'}
                    value={
                      aiConfig.model === 'openai' ? aiConfig.openai_api_key :
                      aiConfig.model === 'gemini' ? aiConfig.gemini_api_key :
                      aiConfig.model === 'heygen' ? aiConfig.heygen_api_key :
                      aiConfig.anthropic_api_key
                    }
                    onChange={(e) => {
                      const key = aiConfig.model === 'openai' ? 'openai_api_key' :
                                  aiConfig.model === 'gemini' ? 'gemini_api_key' :
                                  aiConfig.model === 'heygen' ? 'heygen_api_key' :
                                  'anthropic_api_key';
                      setAiConfig({ ...aiConfig, [key]: e.target.value });
                    }}
                    placeholder={`sk-****************`}
                    className="h-14 px-6 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-xs shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys({ ...showKeys, [aiConfig.model]: !showKeys[aiConfig.model as keyof typeof showKeys] })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors p-2"
                  >
                    {showKeys[aiConfig.model as keyof typeof showKeys] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ventana Contexto</Label>
                    <Badge variant="outline" className="font-black text-[9px] rounded-lg border-slate-100 text-primary">{aiConfig.tokens}</Badge>
                  </div>
                  <Slider
                    value={[aiConfig.tokens]}
                    onValueChange={(v) => setAiConfig({ ...aiConfig, tokens: v[0] })}
                    max={4096}
                    step={128}
                    className="py-2"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nivel Creativo</Label>
                    <Badge variant="outline" className="font-black text-[9px] rounded-lg border-slate-100 text-primary">{aiConfig.temperature}</Badge>
                  </div>
                  <Slider
                    value={[aiConfig.temperature]}
                    onValueChange={(v) => setAiConfig({ ...aiConfig, temperature: v[0] })}
                    max={1}
                    step={0.1}
                    className="py-2"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6">
              <Button 
                onClick={() => handleSave()} 
                disabled={saving}
                className="w-full h-16 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-slate-200 active:scale-95 transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    ACTUALIZANDO...
                  </>
                ) : (
                  <>SINCRONIZAR CONFIGURACIÓN</>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
