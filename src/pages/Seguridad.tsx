import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  Building2, 
  UserPlus, 
  Key,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { UsersTable } from '@/components/admin/UsersTable';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';

export default function Seguridad() {
  const { isAdmin, roles, companies } = useAuth();
  const { data: users = [], isLoading } = useAdminUsers();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Calculate stats
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.roles.includes('admin')).length;
  const rrhhCount = users.filter(u => u.roles.includes('rrhh')).length;
  const usersWithCenters = users.filter(u => u.centers.length > 0).length;

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
                No tienes permisos para acceder a esta sección. Solo los administradores pueden gestionar usuarios y roles.
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Seguridad y Roles</h1>
          <p className="text-muted-foreground">
            Gestiona usuarios, roles y permisos de acceso
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invitar Usuario
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 md:grid-cols-4"
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-sm text-muted-foreground">Usuarios Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/10">
                <Shield className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{adminCount}</p>
                <p className="text-sm text-muted-foreground">Administradores</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <Key className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rrhhCount}</p>
                <p className="text-sm text-muted-foreground">Usuarios RRHH</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary">
                <Building2 className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{usersWithCenters}</p>
                <p className="text-sm text-muted-foreground">Con Centros Asignados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2">
              <Shield className="w-4 h-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-2">
              <Info className="w-4 h-4" />
              Información
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <UsersTable users={users} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <Shield className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Administrador</CardTitle>
                      <Badge variant="destructive" className="mt-1">Acceso Total</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Gestión completa de usuarios y roles
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Configuración de empresa y centros
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Acceso a todos los módulos
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Eliminación de registros
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">RRHH</CardTitle>
                      <Badge variant="secondary" className="mt-1">Gestión de Personal</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Gestión de empleados
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Administración de contratos
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Control de dotación
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Exámenes médicos
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Key className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Psicólogo</CardTitle>
                      <Badge variant="outline" className="mt-1">Evaluaciones</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Gestión de exámenes médicos
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Evaluaciones psicológicas
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Consulta de empleados
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <Building2 className="w-5 h-5 text-warning-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Jefe de Área</CardTitle>
                      <Badge variant="outline" className="mt-1">Supervisión</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Consulta de su equipo
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Visualización de contratos
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Acceso por centro asignado
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-info/10">
                      <Shield className="w-5 h-5 text-info" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Auditor</CardTitle>
                      <Badge variant="outline" className="mt-1">Solo Lectura</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Consulta de todos los registros
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Generación de reportes
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Sin permisos de modificación
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
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

      {/* Invite Dialog */}
      <InviteUserDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen} 
      />
    </div>
  );
}
