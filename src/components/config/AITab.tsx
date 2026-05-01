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
      models: ['GPT-4o Mini', 'GPT-4o', 'GPT-4 Turbo', 'GPT-3.5 Turbo'],
      suggested: 'GPT-4o Mini — Rápido y económico',
      docs: 'https://platform.openai.com/api-keys',
      description: 'Alta precisión y razonamiento avanzado para contenido detallado.',
      color: 'bg-emerald-500',
    },
    {
      id: 'anthropic',
      name: 'Anthropic (Claude)',
      icon: <Brain className="h-6 w-6 text-foreground/70" />,
      models: ['Claude Sonnet 4', 'Claude 3.5 Haiku', 'Claude Opus 4'],
      suggested: 'Claude Sonnet 4 — Equilibrio ideal',
      docs: 'https://console.anthropic.com/settings/keys',
      description: 'Líder en seguridad y redacción natural.',
      color: 'bg-orange-500',
    },
    {
      id: 'gemini',
      name: 'Google (Gemini)',
      icon: <Sparkles className="h-6 w-6 text-primary" />,
      models: ['Gemini 2.0 Flash', 'Gemini 2.5 Pro', 'Gemini 2.0 Flash Lite'],
      suggested: 'Gemini 2.0 Flash — Rápido y versátil',
      docs: 'https://aistudio.google.com/app/apikey',
      description: 'Rápido y eficiente con ventana de contexto masiva.',
      color: 'bg-blue-500',
    },
    {
      id: 'heygen',
      name: 'HeyGen (Avatar)',
      icon: <Video className="h-6 w-6 text-foreground/70" />,
      models: ['Avatar Video API', 'Streaming Avatar'],
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header section */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tighter text-foreground sm:text-4xl">
            IA <span className="text-primary">&</span> Automatización
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl font-medium">
            Configura el motor inteligente que impulsa el análisis de datos, el asistente virtual y la generación automática de capacitaciones.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingProvider(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl shadow-xl shadow-primary/25 transition-all hover:scale-105 active:scale-95 gap-2 px-8 py-6 h-auto font-bold text-base">
              <Plus className="h-5 w-5" /> Agregar Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-border bg-card/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden">
            <div className="p-8 pt-10">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-2xl font-black tracking-tight">Configurar Motor IA</DialogTitle>
                <DialogDescription className="text-base font-medium">
                  Selecciona y activa un proveedor para las capacidades inteligentes del sistema.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-8">
                <div className="grid gap-3">
                  <Label htmlFor="provider" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Seleccionar Proveedor</Label>
                  <div className="grid grid-cols-4 gap-3">
                    {providers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setAiConfig({ ...aiConfig, model: p.id })}
                        className={cn(
                          "flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all relative group",
                          aiConfig.model === p.id 
                            ? "border-primary bg-primary/5 shadow-inner" 
                            : "border-muted bg-muted/20 hover:border-border hover:bg-muted/40"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-xl transition-all duration-300",
                          aiConfig.model === p.id ? "bg-primary/20 scale-110" : "bg-muted group-hover:scale-110"
                        )}>
                          {p.icon}
                        </div>
                        <span className="text-[10px] font-black text-center uppercase tracking-tight leading-none truncate w-full">
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

                <div className="grid gap-3">
                  <Label htmlFor="apiKey" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">API Key del Servicio</Label>
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
                      className="h-14 px-5 rounded-2xl bg-muted/40 border-border focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys({ ...showKeys, [aiConfig.model]: !showKeys[aiConfig.model as keyof typeof showKeys] })}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors"
                    >
                      {showKeys[aiConfig.model as keyof typeof showKeys] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 ml-1">
                    <Shield className="h-3.5 w-3.5 text-primary/60" />
                    <p className="text-[11px] text-muted-foreground font-medium italic">
                      Cifrado de extremo a extremo con seguridad AES-256.
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between ml-1">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tokens Máximos</Label>
                      <Badge variant="outline" className="font-mono text-[10px] rounded-md">{aiConfig.tokens}</Badge>
                    </div>
                    <Slider
                      value={[aiConfig.tokens]}
                      onValueChange={(v) => setAiConfig({ ...aiConfig, tokens: v[0] })}
                      max={4096}
                      step={128}
                      className="py-2"
                    />
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between ml-1">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Creatividad</Label>
                      <Badge variant="outline" className="font-mono text-[10px] rounded-md">{aiConfig.temperature}</Badge>
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
            </div>

            <div className="p-8 pt-0 mt-4">
              <Button 
                onClick={() => handleSave()} 
                disabled={saving}
                className="w-full rounded-2xl h-14 font-black text-base shadow-lg shadow-primary/20"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-primary/5 shadow-2xl shadow-black/5 dark:shadow-none rounded-[2rem] relative group border-2">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none opacity-50 group-hover:opacity-80 transition-opacity duration-1000" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 blur-[80px] rounded-full -ml-32 -mb-32 pointer-events-none opacity-30" />
          
          <CardContent className="p-8 sm:p-12 flex flex-col md:flex-row items-center gap-12 relative z-10">
            <div className="relative">
              <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-[2.5rem] bg-background/50 backdrop-blur-md shadow-2xl flex items-center justify-center border border-primary/20 relative z-10 overflow-hidden group-hover:rotate-3 transition-transform duration-500">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-50" />
                {currentProviderData.icon && (
                  <div className="scale-[1.8] sm:scale-[2.2] transition-transform duration-500 group-hover:scale-[2] sm:group-hover:scale-[2.4]">
                    {currentProviderData.icon}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-primary shadow-xl flex items-center justify-center z-20 border-4 border-card">
                <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="absolute inset-0 rounded-[2.5rem] bg-primary/20 blur-xl scale-75 opacity-50 animate-pulse" />
            </div>

            <div className="flex-1 text-center md:text-left space-y-5">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/25 px-4 py-1.5 rounded-full text-xs font-black gap-2 uppercase tracking-widest">
                  <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
                  Sincronizado
                </Badge>
                <div className="h-1 w-1 rounded-full bg-muted-foreground/30 hidden sm:block" />
                <span className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Cerebro de la Plataforma</span>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter">
                  {currentProviderData.name}
                </h3>
                <p className="text-lg text-muted-foreground font-medium max-w-lg leading-relaxed">
                  {currentProviderData.description}
                </p>
              </div>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
                <div className="flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-2xl border border-border/50">
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

                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter leading-none mb-1">Tokens</span>
                    <span className="text-xl font-black text-primary font-mono">{aiConfig.tokens}</span>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter leading-none mb-1">Temperatura</span>
                    <span className="text-xl font-black text-primary font-mono">{aiConfig.temperature}</span>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(true)}
              className="h-auto rounded-3xl border-border bg-background shadow-lg px-10 py-6 hover:bg-muted/50 hover:border-primary/30 transition-all gap-3 font-black text-base group/btn"
            >
              <Settings2 className="h-5 w-5 transition-transform group-hover/btn:rotate-90 duration-500" /> 
              Personalizar
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Configured Providers Section */}
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-xs font-black uppercase tracking-[0.25em] text-muted-foreground/80 flex items-center gap-3">
            <div className="h-1 w-8 bg-primary rounded-full" />
            Ecosistema de Motores
          </h4>
          <span className="text-[10px] font-bold text-muted-foreground italic">Proveedores listos para usar</span>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                transition={{ duration: 0.4, delay: 0.2 + (idx * 0.1) }}
              >
                <Card className={cn(
                  "border-border/60 bg-card/40 hover:bg-card transition-all rounded-[1.75rem] overflow-hidden group border-2 h-full flex flex-col",
                  isActive ? "border-primary/40 ring-4 ring-primary/5" : "hover:border-primary/20"
                )}>
                  <CardContent className="p-6 flex flex-col h-full space-y-5">
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:scale-110",
                        isActive ? "bg-primary/15 border-primary/20" : "bg-muted/50 border-border/50"
                      )}>
                        <div className={cn("scale-125", isActive ? "text-primary" : "text-muted-foreground")}>
                          {p.icon}
                        </div>
                      </div>
                      
                      {isActive ? (
                        <Badge className="bg-primary text-primary-foreground border-none rounded-full px-3 py-1 text-[9px] font-black uppercase">
                          Activo
                        </Badge>
                      ) : hasKey ? (
                        <Badge variant="outline" className="text-muted-foreground border-muted-foreground/20 rounded-full px-3 py-1 text-[9px] font-black uppercase">
                          Configurado
                        </Badge>
                      ) : null}
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <h5 className="font-black text-foreground text-lg tracking-tight group-hover:text-primary transition-colors">{p.name}</h5>
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed line-clamp-2">
                        {p.description}
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Top Model</p>
                        <p className="text-xs font-bold text-foreground truncate">{p.models[0]}</p>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <a
                          href={p.docs}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-[11px] font-black text-primary hover:gap-3 gap-2 transition-all"
                        >
                          DOCS <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                        
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary"
                            onClick={() => {
                              setEditingProvider(p.id);
                              setAiConfig({ ...aiConfig, model: p.id });
                              setIsDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {hasKey && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
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
      <div className="grid gap-6 md:grid-cols-2 pt-4">
        <Alert className="bg-primary/5 border-primary/20 rounded-[2rem] p-8 flex items-start group hover:bg-primary/[0.07] transition-all duration-500">
          <div className="bg-primary shadow-xl shadow-primary/20 p-4 rounded-[1.25rem] mr-6 group-hover:scale-110 transition-transform">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="space-y-2">
            <AlertTitle className="text-foreground font-black text-xl tracking-tight">Privacidad Corporativa</AlertTitle>
            <AlertDescription className="text-muted-foreground text-sm leading-relaxed font-medium">
              Tus credenciales se almacenan bajo el estándar <span className="text-foreground font-bold underline decoration-primary/40">FIPS 140-2</span>. 
              Los datos procesados por la IA en este entorno están aislados y no se utilizan para entrenar modelos públicos externos.
            </AlertDescription>
          </div>
        </Alert>

        <Alert className="bg-muted/30 border-border/60 rounded-[2rem] p-8 flex items-start group hover:bg-muted/40 transition-all duration-500">
          <div className="bg-card shadow-lg p-4 rounded-[1.25rem] mr-6 border border-border group-hover:scale-110 transition-transform">
            <Cpu className="h-6 w-6 text-foreground" />
          </div>
          <div className="space-y-2">
            <AlertTitle className="text-foreground font-black text-xl tracking-tight">Capacidad de Cómputo</AlertTitle>
            <AlertDescription className="text-muted-foreground text-sm leading-relaxed font-medium">
              El sistema utiliza auto-scaling para garantizar tiempos de respuesta menores a 2 segundos en generación de contenido.
              <span className="block mt-2 text-xs font-bold text-primary uppercase tracking-widest">SLA Actual: 99.9% Disponibilidad</span>
            </AlertDescription>
          </div>
        </Alert>
      </div>
    </div>
  );
}
