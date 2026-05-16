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
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="border-destructive/50">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle>Acceso Restringido</CardTitle>
              <CardDescription>
                No tienes permisos para acceder a esta sección. Solo los administradores pueden gestionar la seguridad.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Tus roles actuales:
              </p>
              <div className="flex justify-center gap-2">
                {roles.length === 0 ? (
                  <Badge variant="outline">Sin roles asignados</Badge>
                ) : (
                  roles.map(role => (
                    <Badge key={role} variant="secondary">{role}</Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 space-y-8 max-w-7xl mx-auto px-4 sm:px-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative p-8 rounded-[2.5rem] bg-white border border-slate-100"
      >
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative h-20 w-20 flex items-center justify-center rounded-[1.75rem] bg-primary transition-all duration-300">
              <Shield className="w-10 h-10 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest">
                  Centro de Seguridad
                </Badge>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-foreground uppercase sm:text-4xl">
                Seguridad
              </h1>
              <p className="text-muted-foreground font-medium mt-1 tracking-wide">
                Gestión avanzada de identidades y protocolos de acceso
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="h-10 px-4 rounded-xl border border-border flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Protocolo Activo</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs defaultValue="roles" className="space-y-8 min-w-0">
          <div className="flex justify-center">
          <TabsList>
            {[
              { value: 'roles', label: 'Roles y permisos', icon: ShieldCheck },
              { value: 'quick-permissions', label: 'Permisos rápidos', icon: ShieldCheck },
              { value: 'audit', label: 'Auditoría', icon: History },
              { value: 'ai-access', label: 'Acceso IA', icon: Bot },
              { value: 'info', label: 'Información', icon: Info },
            ].map((tab) => (
              <TabsTrigger 
                key={tab.value}
                value={tab.value} 
              >
                <tab.icon className="w-3.5 h-3.5 mr-2" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          </div>

          <TabsContent value="roles" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="overflow-hidden rounded-[2.5rem] border border-border/40 bg-background p-2">
              <RolesManager />
            </div>
          </TabsContent>

          <TabsContent value="quick-permissions" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="overflow-hidden rounded-[2.5rem] border border-border/40 bg-background p-2">
              <QuickRolePermissions />
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="overflow-hidden rounded-[2.5rem] border border-border/40 bg-background p-2">
              <AuditLogViewer />
            </div>
          </TabsContent>

          <TabsContent value="ai-access" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="overflow-hidden rounded-[2.5rem] border border-border/40 bg-background p-2">
              <AiAccessManager />
            </div>
          </TabsContent>

          <TabsContent value="info" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-8">
              <Card className="rounded-[2.5rem] bg-white border border-slate-100 overflow-hidden">
                <CardHeader className="p-10 border-b border-slate-100">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest">
                      Arquitectura de Seguridad
                    </Badge>
                  </div>
                  <CardTitle className="text-3xl font-black tracking-tight uppercase">Protocolos de Control de Acceso</CardTitle>
                  <CardDescription className="text-base font-medium max-w-2xl mt-2">
                    Nuestra plataforma utiliza un sistema híbrido de Control de Acceso Basado en Roles (RBAC) y Seguridad a Nivel de Fila (RLS) para garantizar la integridad absoluta de sus datos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-10">
                  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {[
                      { 
                        title: 'Aislamiento Multi-Tenant', 
                        desc: 'Cada empresa opera en una cápsula lógica independiente. Los datos nunca se mezclan y el acceso se valida en cada transacción a nivel de base de datos.',
                        icon: Shield,
                        color: 'text-primary'
                      },
                      { 
                        title: 'Segregación por Centro', 
                        desc: 'Defina perímetros de acceso específicos por sede o centro de operación. Los usuarios solo visualizan lo que ocurre dentro de su radio de acción asignado.',
                        icon: AlertTriangle,
                        color: 'text-amber-500'
                      },
                      { 
                        title: 'Jerarquías Dinámicas', 
                        desc: 'Los permisos son aditivos. Un usuario con múltiples roles hereda la suma de todas las facultades, permitiendo una gestión de permisos granular y flexible.',
                        icon: Bot,
                        color: 'text-violet-500'
                      },
                      { 
                        title: 'Trazabilidad Inmutable', 
                        desc: 'Cada inserción, edición o eliminación es registrada en nuestra red de auditoría, incluyendo metadatos del autor, IP y cambios detallados en los valores.',
                        icon: History,
                        color: 'text-blue-500'
                      },
                      { 
                        title: 'Validación en Tiempo Real', 
                        desc: 'El sistema verifica los tokens de sesión y permisos específicos en cada petición al servidor, previniendo cualquier intento de escalamiento de privilegios.',
                        icon: Info,
                        color: 'text-cyan-500'
                      },
                      { 
                        title: 'Encriptación de Datos', 
                        desc: 'Toda la comunicación entre el cliente y el servidor viaja cifrada bajo protocolos TLS de última generación, protegiendo la información sensible.',
                        icon: ShieldCheck,
                        color: 'text-emerald-500'
                      }
                    ].map((item) => (
                      <div key={item.title} className="p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 hover:bg-white transition-all group">
                        <div className={cn("h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:-rotate-3 shadow-none", item.color)}>
                          <item.icon className="w-6 h-6" />
                        </div>
                        <h4 className="font-black text-xs uppercase tracking-widest text-slate-900 mb-3">{item.title}</h4>
                        <p className="text-slate-500 text-sm leading-relaxed font-medium">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-8 md:grid-cols-2">
                <Card className="rounded-[2rem] bg-primary text-primary-foreground border-none overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 transition-transform group-hover:scale-110 group-hover:rotate-12">
                    <ShieldCheck className="w-32 h-32" />
                  </div>
                  <CardHeader className="p-8">
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Mejores Prácticas para Administradores</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 pt-0 space-y-4">
                    {[
                      'Aplique el Principio del Menor Privilegio (PoLP).',
                      'Revise mensualmente el registro de auditoría.',
                      'Desactive roles que no estén en uso activo.',
                      'No comparta cuentas administrativas.',
                      'Utilice roles de sistema para procesos críticos.'
                    ].map((tip, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">{i + 1}</div>
                        <p className="text-sm font-bold opacity-90">{tip}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] bg-white border border-slate-100 overflow-hidden">
                  <CardHeader className="p-8">
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Estado de la Red de Seguridad</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 pt-0">
                    <div className="space-y-6">
                      {[
                        { label: 'Encriptación de Base de Datos', status: 'Activo', value: 100 },
                        { label: 'Integridad de Auditoría', status: 'Sincronizado', value: 100 },
                        { label: 'Control Multi-Tenant', status: 'Verificado', value: 100 },
                      ].map((item) => (
                        <div key={item.label} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.label}</span>
                            <span className="text-[10px] font-black uppercase text-primary">{item.status}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${item.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-8 p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                      <Info className="w-4 h-4 text-primary mt-0.5" />
                      <p className="text-[11px] font-medium text-primary leading-tight">
                        Todos los sistemas de protección perimetral y lógica se encuentran operando bajo parámetros normales.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
