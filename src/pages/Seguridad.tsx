import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle,
  Info,
  History,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuditLogViewer } from '@/components/audit/AuditLogViewer';
import { RolesManager } from '@/components/roles/RolesManager';
import { QuickRolePermissions } from '@/components/roles/QuickRolePermissions';
import { AiAccessManager } from '@/components/ai/AiAccessManager';

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
        className="relative p-8 rounded-[2.5rem] bg-background border border-border/40 overflow-hidden"
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
            <TabsList className="h-14 bg-background border border-border/50 p-1.5 rounded-[1.25rem]">
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
                  className="rounded-[1rem] px-6 py-2 font-black text-[10px] uppercase tracking-widest transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
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
            <Card className="rounded-[2.5rem] border border-border/40 overflow-hidden">
              <CardHeader className="p-8 border-b border-border/50">
                <CardTitle className="text-2xl font-black tracking-tight">Acerca del Sistema de Seguridad</CardTitle>
                <CardDescription className="text-sm font-medium">
                  Información sobre el control de acceso basado en roles (RBAC)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 prose prose-sm max-w-none">
                <div className="grid gap-8 md:grid-cols-2">
                  {[
                    { title: 'Segregación por Empresa', desc: 'Cada usuario puede estar asignado a una o más empresas. Los datos de cada empresa están completamente aislados y un usuario solo puede ver la información de las empresas a las que pertenece.' },
                    { title: 'Restricción por Centro', desc: 'Opcionalmente, un usuario puede tener acceso restringido a centros de operación específicos. Si no tiene centros asignados, puede ver todos los centros de sus empresas.' },
                    { title: 'Múltiples Roles', desc: 'Un usuario puede tener varios roles simultáneamente. Los permisos se combinan, otorgando acceso a todas las funciones de cada rol asignado.' },
                    { title: 'Auditoría', desc: 'Todas las acciones sobre datos sensibles quedan registradas con información del usuario, fecha y tipo de operación para cumplimiento normativo.' },
                  ].map((item) => (
                    <div key={item.title} className="p-6 rounded-2xl bg-slate-50/50 border border-border/40">
                      <h4 className="font-black text-xs uppercase tracking-widest text-primary mb-2">{item.title}</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
