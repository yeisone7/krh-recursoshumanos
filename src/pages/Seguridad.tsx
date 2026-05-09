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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Seguridad</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Auditoría y políticas de seguridad del sistema
        </p>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
          <Tabs defaultValue="roles" className="space-y-4 min-w-0">
          <div className="scrollbar-hide w-full overflow-x-auto pb-1">
            <TabsList className="inline-flex h-auto min-w-max justify-start">
              <TabsTrigger value="roles" className="gap-2 whitespace-nowrap text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4" />
                Roles y permisos
              </TabsTrigger>
              <TabsTrigger value="quick-permissions" className="gap-2 whitespace-nowrap text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4" />
                Permisos rápidos
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2 whitespace-nowrap text-xs sm:text-sm">
                <History className="w-4 h-4" />
                Auditoría
              </TabsTrigger>
              <TabsTrigger value="ai-access" className="gap-2 whitespace-nowrap text-xs sm:text-sm">
                <Bot className="w-4 h-4" />
                Acceso IA
              </TabsTrigger>
              <TabsTrigger value="info" className="gap-2 whitespace-nowrap text-xs sm:text-sm">
                <Info className="w-4 h-4" />
                Información
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="roles" className="space-y-4">
            <RolesManager />
          </TabsContent>

          <TabsContent value="quick-permissions" className="space-y-4">
            <QuickRolePermissions />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <AuditLogViewer />
          </TabsContent>

          <TabsContent value="ai-access" className="space-y-4">
            <AiAccessManager />
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Acerca del Sistema de Seguridad</CardTitle>
                <CardDescription>
                  Información sobre el control de acceso basado en roles (RBAC)
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Segregación por Empresa</h4>
                    <p className="text-muted-foreground text-sm">
                      Cada usuario puede estar asignado a una o más empresas. Los datos de cada empresa 
                      están completamente aislados y un usuario solo puede ver la información de las 
                      empresas a las que pertenece.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Restricción por Centro</h4>
                    <p className="text-muted-foreground text-sm">
                      Opcionalmente, un usuario puede tener acceso restringido a centros de operación 
                      específicos. Si no tiene centros asignados, puede ver todos los centros de sus 
                      empresas.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Múltiples Roles</h4>
                    <p className="text-muted-foreground text-sm">
                      Un usuario puede tener varios roles simultáneamente. Los permisos se combinan, 
                      otorgando acceso a todas las funciones de cada rol asignado.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Auditoría</h4>
                    <p className="text-muted-foreground text-sm">
                      Todas las acciones sobre datos sensibles quedan registradas con información del 
                      usuario, fecha y tipo de operación para cumplimiento normativo.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
