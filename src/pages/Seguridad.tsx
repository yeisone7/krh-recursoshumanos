import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle,
  Info,
  History,
  ShieldCheck,
  Shield,
  Bot,
  Lock,
  LayoutGrid,
  Zap,
  CheckCircle2,
  Activity,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuditLogViewer } from '@/components/audit/AuditLogViewer';
import { RolesManager } from '@/components/roles/RolesManager';
import { QuickRolePermissions } from '@/components/roles/QuickRolePermissions';
import { AiAccessManager } from '@/components/ai/AiAccessManager';
import { cn } from '@/lib/utils';

export default function Seguridad() {
  const { isAdmin, roles } = useAuth();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md space-y-6"
        >
          <div className="mx-auto w-20 h-20 rounded-[2rem] bg-red-50 flex items-center justify-center text-red-500 shadow-xl shadow-red-100">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Acceso Restringido</h2>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
              No dispones de los privilegios administrativos requeridos para acceder al Centro de Control de Seguridad.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            {roles.length === 0 ? (
              <Badge className="bg-slate-100 text-slate-400 border-none font-black text-[9px] uppercase px-3 py-1 rounded-lg">Identidad Sin Atributos</Badge>
            ) : (
              roles.map(role => (
                 <Badge key={role} className="bg-primary text-white border-none font-black text-[9px] uppercase px-3 py-1 rounded-lg tracking-widest shadow-sm">{role}</Badge>
              ))
            )}
          </div>
        </motion.div>
      </div>
    );
  }

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
             <Shield className="w-8 h-8 stroke-[2.5]" />
           </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
               <h1 className="text-3xl font-black text-foreground uppercase tracking-tight">Seguridad</h1>
              <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest">GATEKEEPER</Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestión de identidades, privilegios y auditoría transaccional</p>
          </div>
        </div>
        
        <div className="h-12 px-6 rounded-2xl bg-white border border-slate-100 flex items-center gap-3 w-full md:w-auto shadow-sm">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[9px] font-black text-primary uppercase tracking-widest">Protocolo de Control Activo</span>
        </div>
      </motion.div>

      <Tabs defaultValue="roles" className="space-y-8">
        <div className="flex justify-center px-1 overflow-x-auto no-scrollbar">
          <TabsList className="flex h-auto p-1.5 gap-1.5 bg-white border border-slate-100 rounded-2xl w-max md:w-full max-w-3xl shadow-sm">
            {[
              { value: 'roles', label: 'Matriz Roles', icon: ShieldCheck },
              { value: 'quick-permissions', label: 'Privilegios', icon: Zap },
              { value: 'audit', label: 'Bitácora', icon: History },
              { value: 'ai-access', label: 'Inteligencia', icon: Bot },
              { value: 'info', label: 'Arquitectura', icon: Info },
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

        <TabsContent value="roles" className="mt-0 outline-none px-1">
          <RolesManager />
        </TabsContent>

        <TabsContent value="quick-permissions" className="mt-0 outline-none px-1">
           <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden p-1">
            <QuickRolePermissions />
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-0 outline-none px-1">
           <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden p-2">
            <AuditLogViewer />
          </div>
        </TabsContent>

        <TabsContent value="ai-access" className="mt-0 outline-none px-1">
           <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden p-1">
            <AiAccessManager />
          </div>
        </TabsContent>

        <TabsContent value="info" className="mt-0 outline-none px-1 space-y-8">
           <Card className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
             <CardHeader className="p-10 border-b border-slate-50">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
                </div>
                <Badge className="bg-primary/5 text-primary border-none font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest">
                  INFRASTRUCTURE DESIGN
                </Badge>
              </div>
               <CardTitle className="text-2xl font-black uppercase tracking-tight text-foreground">Protocolos de Control y Resiliencia</CardTitle>
              <CardDescription className="text-[11px] font-black uppercase tracking-widest text-slate-400 max-w-2xl mt-2 leading-relaxed">
                Nuestra arquitectura implementa un sistema híbrido de RBAC (Role-Based Access Control) y RLS (Row Level Security) para garantizar la integridad absoluta de los datos.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-10">
              <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {[
                  { 
                    title: 'Aislamiento Multi-Tenant', 
                    desc: 'Cápsulas lógicas independientes para cada empresa, garantizando que el flujo de información sea estrictamente privado.',
                    icon: Shield,
                    color: 'text-slate-900',
                    bg: 'bg-slate-50'
                  },
                  { 
                    title: 'Segregación Perimetral', 
                    desc: 'Control granular por centros de operación, limitando la visibilidad del talento según la ubicación geográfica asignada.',
                    icon: LayoutGrid,
                    color: 'text-primary',
                    bg: 'bg-primary/5'
                  },
                  { 
                    title: 'Herencia de Atributos', 
                    desc: 'Los permisos son aditivos y dinámicos. La suma de roles define el perímetro total de acción de cada operador.',
                    icon: Zap,
                    color: 'text-amber-500',
                    bg: 'bg-amber-50'
                  },
                  { 
                    title: 'Trazabilidad Forense', 
                    desc: 'Cada mutación en la base de datos genera una estampa de tiempo e identidad inmutable en nuestra red de auditoría.',
                    icon: History,
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-50'
                  },
                  { 
                    title: 'Validación en Tiempo Real', 
                    desc: 'Verificación constante de tokens JWT y privilegios locales en cada petición HTTP al motor de base de datos.',
                    icon: Lock,
                    color: 'text-blue-500',
                    bg: 'bg-blue-50'
                  },
                  { 
                    title: 'Cifrado de Alto Nivel', 
                    desc: 'Protocolos de encriptación TLS 1.3 en tránsito y cifrado AES-256 en reposo para toda la capa de persistencia.',
                    icon: ShieldCheck,
                    color: 'text-indigo-500',
                    bg: 'bg-indigo-50'
                  }
                ].map((item) => (
                  <div key={item.title} className="p-8 rounded-[2rem] bg-white border border-slate-100 hover:border-primary/20 transition-all group shadow-sm">
                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 shadow-sm", item.bg, item.color)}>
                      <item.icon className="w-6 h-6 stroke-[2.5]" />
                    </div>
                     <h4 className="font-black text-[11px] uppercase tracking-widest text-foreground mb-4">{item.title}</h4>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-tight leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-8 md:grid-cols-2">
             <Card className="rounded-3xl bg-primary text-white border-none overflow-hidden relative group shadow-xl shadow-primary/20">
              <div className="absolute top-0 right-0 p-10 opacity-5 transition-transform group-hover:scale-110 group-hover:rotate-12 pointer-events-none">
                <ShieldCheck className="w-48 h-48" />
              </div>
              <CardHeader className="p-10">
                <CardTitle className="text-xl font-black uppercase tracking-tight">Directivas de Operación</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/60">Mejores prácticas administrativas</CardDescription>
              </CardHeader>
              <CardContent className="p-10 pt-0 space-y-6">
                {[
                  'Implementar el Principio de Privilegio Mínimo (PoLP).',
                  'Auditar mensualmente los flujos de eventos críticos.',
                  'Desactivar identidades sin actividad superior a 30 días.',
                  'Restringir el uso de cuentas maestras compartidas.',
                  'Validar perímetros de acceso tras cambios estructurales.'
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-4 group/tip">
                    <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black text-white transition-colors group-hover/tip:bg-white group-hover/tip:text-primary">{i + 1}</div>
                    <p className="text-[11px] font-black uppercase tracking-widest opacity-80 group-hover/tip:opacity-100 transition-opacity">{tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

             <Card className="rounded-3xl bg-white border border-slate-100 overflow-hidden shadow-sm">
              <CardHeader className="p-10 border-b border-slate-50">
                <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Estado de los Nodos</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Integridad de la red de seguridad</CardDescription>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                {[
                  { label: 'Cifrado de Persistencia', status: 'Blindado', value: 100, color: 'bg-primary' },
                  { label: 'Red de Auditoría', status: 'Sincronizada', value: 100, color: 'bg-emerald-500' },
                  { label: 'Aislamiento Lógico', status: 'Verificado', value: 100, color: 'bg-blue-500' },
                ].map((item) => (
                  <div key={item.label} className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
                       <Badge className="bg-white/20 text-white border-none font-black text-[8px] uppercase">{item.status}</Badge>
                     </div>
                     <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        className={cn("h-full rounded-full shadow-sm", item.color)} 
                      />
                    </div>
                  </div>
                ))}
                <div className="mt-10 p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-4">
                  <Activity className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-[10px] font-black uppercase text-slate-400 leading-relaxed tracking-widest">
                    Todos los protocolos de vigilancia lógica operan bajo umbrales de integridad óptima.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
