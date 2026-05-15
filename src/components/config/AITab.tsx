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
      icon: <Bot className="h-6 w-6 text-foreground/70" />,
      models: [
        'GPT-4o Mini — Rápido y económico', 
        'GPT-4o — Mayor capacidad de análisis', 
        'GPT-4 Turbo — Contexto extendido', 
        'GPT-3.5 Turbo — Más económico'
      ],
      suggested: 'GPT-4o Mini — Rápido y económico',
      docs: 'https://platform.openai.com/api-keys',
      description: 'Alta precisión y razonamiento avanzado para contenido detallado.',
      color: 'bg-emerald-500',
    },
    {
      id: 'anthropic',
      name: 'Anthropic (Claude)',
      icon: <Brain className="h-6 w-6 text-foreground/70" />,
      models: [
        'Claude Sonnet 4 — Equilibrio ideal', 
        'Claude 3.5 Haiku — Ultra rápido', 
        'Claude Opus 4 — Máxima inteligencia'
      ],
      suggested: 'Claude Sonnet 4 — Equilibrio ideal',
      docs: 'https://console.anthropic.com/settings/keys',
      description: 'Líder en seguridad y redacción natural.',
      color: 'bg-orange-500',
    },
    {
      id: 'gemini',
      name: 'Google (Gemini)',
      icon: <Sparkles className="h-6 w-6 text-primary" />,
      models: [
        'Gemini 2.0 Flash — Rápido y versátil', 
        'Gemini 2.5 Pro — Máxima capacidad', 
        'Gemini 2.0 Flash Lite — Ultra económico'
      ],
      suggested: 'Gemini 2.0 Flash — Rápido y versátil',
      docs: 'https://aistudio.google.com/app/apikey',
      description: 'Rápido y eficiente con ventana de contexto masiva.',
      color: 'bg-blue-500',
    },
    {
      id: 'heygen',
      name: 'HeyGen (Avatar)',
      icon: <Video className="h-6 w-6 text-foreground/70" />,
      models: [
        'Avatar Video API — Generación asíncrona', 
        'Streaming Avatar — Interacción real'
      ],
      suggested: 'Avatar Video API — Generación asíncrona',
      docs: 'https://app.heygen.com/settings/api',
      description: 'Genera videos con un avatar virtual que presenta las capacitaciones.',
      color: 'bg-purple-500',
    },
  ];

  const currentProviderData = providers.find(p => p.id === activeProvider) || providers[2];

  const maskKey = (key: string) => {
    if (!key) return 'No configurado';
    if (key.length <= 8) return '********';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-black tracking-tighter text-foreground sm:text-3xl">
            IA <span className="text-primary">&</span> Automatización
          </h2>
          <p className="text-muted-foreground text-xs max-w-xl font-medium">
            Configura el motor inteligente que impulsa el análisis de datos y la generación de capacitaciones.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingProvider(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl transition-all hover:scale-105 active:scale-95 gap-2 px-6 py-4 h-auto font-bold text-sm">
              <Plus className="h-4 w-4" /> Agregar Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] rounded-[2rem] border-border bg-card/95 p-0 overflow-hidden">
            <div className="p-6 pt-8">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-xl font-black tracking-tight">Configurar Motor IA</DialogTitle>
                <DialogDescription className="text-sm font-medium">
                  Selecciona y activa un proveedor para el sistema.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6">
                <div className="grid gap-2.5">
                  <Label htmlFor="provider" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Proveedor</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {providers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setAiConfig({ ...aiConfig, model: p.id })}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all relative group",
                          aiConfig.model === p.id 
                            ? "border-primary" 
                            : "border-muted bg-background /10 hover:border-border hover:bg-background"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-lg transition-all duration-300",
                          aiConfig.model === p.id ? "bg-primary/20 scale-110" : "bg-background group-hover:scale-110"
                        )}>
                          {p.icon}
                        </div>
                        <span className="text-[9px] font-black text-center uppercase tracking-tight leading-none truncate w-full">
                          {p.name.split(' ')[0]}
                        </span>
                        {aiConfig.model === p.id && (
                          <motion.div 
                            layoutId="active-provider-dot"
                            className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-card" 
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2.5">
                  <Label htmlFor="apiKey" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">API Key</Label>
                  <div className="relative group">
                    <Input
                      id="apiKey"
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
                      placeholder={`sk-... (Key de ${currentProviderData.name})`}
                      className="h-11 px-4 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys({ ...showKeys, [aiConfig.model]: !showKeys[aiConfig.model as keyof typeof showKeys] })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-background transition-colors"
                    >
                      {showKeys[aiConfig.model as keyof typeof showKeys] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between ml-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tokens</Label>
                      <Badge variant="outline" className="font-mono text-[9px] rounded-md px-1.5 h-4">{aiConfig.tokens}</Badge>
                    </div>
                    <Slider
                      value={[aiConfig.tokens]}
                      onValueChange={(v) => setAiConfig({ ...aiConfig, tokens: v[0] })}
                      max={4096}
                      step={128}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between ml-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Creatividad</Label>
                      <Badge variant="outline" className="font-mono text-[9px] rounded-md px-1.5 h-4">{aiConfig.temperature}</Badge>
                    </div>
                    <Slider
                      value={[aiConfig.temperature]}
                      onValueChange={(v) => setAiConfig({ ...aiConfig, temperature: v[0] })}
                      max={1}
                      step={0.1}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 pt-0 mt-2">
              <Button 
                onClick={() => handleSave()} 
                disabled={saving}
                className="w-full rounded-xl h-12 font-black text-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>Activar Configuración</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Highlight Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-primary/5 rounded-[1.5rem] relative group border-2">
          {/* Decorative elements */}
          
          
          <CardContent className="p-5 sm:p-6 flex flex-col md:flex-row items-center gap-6 relative z-10">
            <div className="relative">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-background flex items-center justify-center border border-primary/20 relative z-10 overflow-hidden transition-transform duration-500 group-hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-50" />
                {currentProviderData.icon && (
                  <div className="scale-[1.5] transition-transform duration-500">
                    {currentProviderData.icon}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-lg bg-primary flex items-center justify-center z-20 border-2 border-card">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/25 px-3 py-0.5 rounded-full text-[10px] font-black gap-1.5 uppercase tracking-wider">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Sincronizado
                </Badge>
                <div className="h-1 w-1 rounded-full bg-background -foreground/30 hidden sm:block" />
                <span className="text-muted-foreground text-[9px] font-black uppercase tracking-[0.15em] opacity-70">Cerebro de la Plataforma</span>
              </div>
              
              <div className="space-y-0.5">
                <h3 className="text-3xl font-black text-foreground tracking-tight">
                  {currentProviderData.name}
                </h3>
                <p className="text-sm text-muted-foreground font-medium max-w-lg leading-snug">
                  {currentProviderData.description}
                </p>
              </div>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <div className="flex items-center gap-2.5 bg-background /40 px-3 py-1.5 rounded-xl border border-border/50">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Database className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter leading-none mb-0.5">Modelo Activo</span>
                    <span className="text-sm font-black text-foreground truncate">
                      {currentProviderData.id === 'openai' ? 'GPT-4o Mini' : 
                       currentProviderData.id === 'gemini' ? 'Gemini 2.0 Flash' : 'Claude Sonnet 4'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter leading-none mb-0.5">Tokens</span>
                    <span className="text-base font-black text-primary font-mono leading-none">{aiConfig.tokens}</span>
                  </div>
                  <div className="w-px h-6 bg-border" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter leading-none mb-0.5">Temp</span>
                    <span className="text-base font-black text-primary font-mono leading-none">{aiConfig.temperature}</span>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(true)}
              className="h-auto rounded-2xl border-border bg-background px-6 py-3 hover:bg-background transition-all gap-2 font-black text-xs group/btn"
            >
              <Settings2 className="h-4 w-4 transition-transform group-hover/btn:rotate-45" /> 
              Personalizar
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Configured Providers Section */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2.5">
            <div className="h-0.5 w-6 bg-primary rounded-full" />
            Ecosistema de Motores
          </h4>
        </div>
        
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {providers.map((p, idx) => {
            const hasKey = p.id === 'openai' ? aiConfig.openai_api_key :
                          p.id === 'gemini' ? aiConfig.gemini_api_key :
                          p.id === 'heygen' ? aiConfig.heygen_api_key :
                          aiConfig.anthropic_api_key;
            
            const isActive = activeProvider === p.id;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + (idx * 0.05) }}
              >
                <Card className={cn(
                  "border-border/60 bg-card/40 hover:bg-card transition-all rounded-2xl overflow-hidden group border-2 h-full flex flex-col",
                  isActive ? "border-primary/40 ring-2 ring-primary/5" : "hover:border-primary/20"
                )}>
                  <CardContent className="p-4 flex flex-col h-full space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center border transition-all",
                        isActive ? "bg-primary/10 border-primary/20" : "bg-background border-border/50"
                      )}>
                        <div className={cn("scale-110", isActive ? "text-primary" : "text-muted-foreground")}>
                          {p.icon}
                        </div>
                      </div>
                      
                      {isActive ? (
                        <Badge className="bg-primary text-primary-foreground border-none rounded-full px-2 py-0.5 text-[8px] font-black uppercase">
                          Activo
                        </Badge>
                      ) : hasKey ? (
                        <Badge variant="outline" className="text-muted-foreground border-muted-foreground/20 rounded-full px-2 py-0.5 text-[8px] font-black uppercase">
                          OK
                        </Badge>
                      ) : null}
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="space-y-0.5">
                        <h5 className="font-black text-foreground text-sm tracking-tight">{p.name}</h5>
                        <p className="text-[10px] text-muted-foreground font-medium leading-tight line-clamp-1">
                          {p.description}
                        </p>
                      </div>
                      
                      {/* Detailed models list restored */}
                      <div className="space-y-1.5 py-1">
                        {p.models.map((model, mIdx) => (
                          <div key={mIdx} className="flex items-start gap-1.5 group/model">
                            <div className="h-1 w-1 rounded-full bg-primary/40 mt-1.5 shrink-0 group-hover/model:bg-primary" />
                            <span className="text-[10px] font-medium text-muted-foreground group-hover/model:text-foreground transition-colors leading-tight">
                              {model}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-1 flex flex-col gap-2 mt-auto">
                      <div className="flex items-center justify-between border-t border-border/40 pt-2">
                        <a
                          href={p.docs}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] font-black text-primary hover:underline flex items-center gap-1"
                        >
                          DOCS <ExternalLink className="h-2 w-2" />
                        </a>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => {
                              setEditingProvider(p.id);
                              setAiConfig({ ...aiConfig, model: p.id });
                              setIsDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Security & Info Grid */}
      <div className="grid gap-4 md:grid-cols-2 pt-2">
        <Alert className="border-border rounded-2xl p-4 flex items-start group hover:bg-primary/[0.07] transition-all">
          <Shield className="h-5 w-5 text-primary mt-0.5 mr-3 shrink-0" />
          <div className="space-y-0.5">
            <AlertTitle className="text-foreground font-black text-sm tracking-tight">Privacidad Corporativa</AlertTitle>
            <AlertDescription className="text-muted-foreground text-[11px] leading-snug font-medium">
              Credenciales cifradas con AES-256. Los datos procesados están aislados y no entrenan modelos públicos.
            </AlertDescription>
          </div>
        </Alert>

        <Alert className="bg-background border-border/40 rounded-2xl p-4 flex items-start group hover:bg-background transition-all">
          <Cpu className="h-5 w-5 text-foreground mt-0.5 mr-3 shrink-0" />
          <div className="space-y-0.5">
            <AlertTitle className="text-foreground font-black text-sm tracking-tight">Cómputo & SLA</AlertTitle>
            <AlertDescription className="text-muted-foreground text-[11px] leading-snug font-medium">
              Auto-scaling activo. Respuesta menor a 2s. SLA del 99.9% de disponibilidad garantizada.
            </AlertDescription>
          </div>
        </Alert>
      </div>
    </div>
  );
}
