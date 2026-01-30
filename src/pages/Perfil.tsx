import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  User,
  Camera,
  Mail,
  Phone,
  Shield,
  Bell,
  Lock,
  Eye,
  EyeOff,
  Save,
  Loader2,
  FileText,
  HeartPulse,
  Package,
  Palmtree,
  ClipboardList,
  Gavel,
  Megaphone,
  Volume2,
  Laptop,
  LogOut,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { useAuth } from '@/contexts/AuthContext';
import {
  useUserPreferences,
  useCreateOrUpdatePreferences,
  useUpdatePassword,
  useUploadAvatar,
} from '@/hooks/useUserProfile';

const passwordSchema = z.object({
  newPassword: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string().min(6, 'Mínimo 6 caracteres'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Perfil() {
  const { user, roles, signOut } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: preferences, isLoading: loadingPreferences } = useUserPreferences();
  const updatePreferences = useCreateOrUpdatePreferences();
  const updatePassword = useUpdatePassword();
  const uploadAvatar = useUploadAvatar();

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Get user initials
  const getInitials = () => {
    const email = user?.email || '';
    return email.substring(0, 2).toUpperCase();
  };

  // Get avatar URL
  const avatarUrl = user?.user_metadata?.avatar_url;

  // Handle avatar upload
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato no válido', { description: 'Solo JPG, PNG o WebP' });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Archivo muy grande', { description: 'Máximo 5MB' });
      return;
    }

    try {
      await uploadAvatar.mutateAsync(file);
      toast.success('Foto actualizada');
    } catch (error: any) {
      toast.error('Error al subir la foto', { description: error.message });
    }
  };

  // Handle preference toggle
  const handlePreferenceToggle = async (key: string, value: boolean) => {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
    } catch (error: any) {
      toast.error('Error al guardar preferencia');
    }
  };

  // Handle password change
  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      await updatePassword.mutateAsync({ newPassword: data.newPassword });
      toast.success('Contraseña actualizada');
      passwordForm.reset();
    } catch (error: any) {
      toast.error('Error al cambiar contraseña', { description: error.message });
    }
  };

  // Role labels
  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    rrhh: 'Recursos Humanos',
    psicologo: 'Psicólogo',
    jefe_area: 'Jefe de Área',
    auditor: 'Auditor',
    empleado: 'Empleado',
  };

  const notificationSettings = [
    {
      key: 'notify_contract_expiry',
      label: 'Vencimiento de Contratos',
      description: 'Cuando un contrato está próximo a vencer',
      icon: FileText,
      color: 'text-blue-500',
    },
    {
      key: 'notify_medical_exam_expiry',
      label: 'Exámenes Médicos',
      description: 'Cuando un examen médico está por vencer',
      icon: HeartPulse,
      color: 'text-red-500',
    },
    {
      key: 'notify_dotation_expiry',
      label: 'Dotación',
      description: 'Cuando una dotación está por vencer',
      icon: Package,
      color: 'text-orange-500',
    },
    {
      key: 'notify_vacation_requests',
      label: 'Solicitudes de Vacaciones',
      description: 'Nuevas solicitudes de vacaciones pendientes',
      icon: Palmtree,
      color: 'text-green-500',
    },
    {
      key: 'notify_leave_requests',
      label: 'Solicitudes de Permisos',
      description: 'Nuevas solicitudes de permisos pendientes',
      icon: ClipboardList,
      color: 'text-purple-500',
    },
    {
      key: 'notify_disciplinary_updates',
      label: 'Procesos Disciplinarios',
      description: 'Actualizaciones en procesos disciplinarios',
      icon: Gavel,
      color: 'text-amber-600',
    },
    {
      key: 'notify_system_announcements',
      label: 'Anuncios del Sistema',
      description: 'Anuncios importantes del sistema',
      icon: Megaphone,
      color: 'text-indigo-500',
    },
  ];

  const emailSettings = [
    {
      key: 'email_notifications',
      label: 'Notificaciones por Email',
      description: 'Recibir notificaciones generales por correo electrónico',
      icon: Mail,
      color: 'text-cyan-500',
    },
    {
      key: 'email_requisition_approvals',
      label: 'Aprobación de Requisiciones',
      description: 'Recibir emails cuando tengas requisiciones pendientes de aprobación',
      icon: ClipboardList,
      color: 'text-emerald-500',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground">Mi Perfil</h1>
        <p className="text-muted-foreground mt-1">Gestiona tu información personal y preferencias</p>
      </motion.div>

      {/* Profile Photo */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Foto de Perfil
            </CardTitle>
            <CardDescription>Tu foto será visible para otros usuarios de la plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-primary/10">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  variant="outline"
                  onClick={handleAvatarClick}
                  disabled={uploadAvatar.isPending}
                >
                  {uploadAvatar.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 mr-2" />
                  )}
                  Cambiar foto
                </Button>
                <p className="text-xs text-muted-foreground">JPG, PNG o WebP. Máximo 5MB.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Personal Information */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Información Personal
            </CardTitle>
            <CardDescription>Tu información de cuenta y contacto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Correo electrónico
              </Label>
              <Input value={user?.email || ''} disabled />
              <p className="text-xs text-warning">El correo electrónico no se puede modificar</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Rol en el sistema
              </Label>
              <div className="flex flex-wrap gap-2">
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <Badge key={role} variant="secondary" className="bg-primary/10 text-primary">
                      {roleLabels[role] || role}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">Sin rol asignado</Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-muted-foreground" />
                ID de Usuario
              </Label>
              <Input value={user?.id || ''} disabled className="font-mono text-xs" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notification Preferences */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Preferencias de Notificaciones
            </CardTitle>
            <CardDescription>Configura qué notificaciones deseas recibir en la aplicación</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notificationSettings.map((setting) => {
                const Icon = setting.icon;
                const isEnabled = preferences?.[setting.key as keyof typeof preferences] ?? true;
                
                return (
                  <div key={setting.key} className="flex items-center justify-between py-2">
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 ${setting.color}`} />
                      <div>
                        <p className="font-medium text-sm">{setting.label}</p>
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled as boolean}
                      onCheckedChange={(checked) => handlePreferenceToggle(setting.key, checked)}
                      disabled={updatePreferences.isPending}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Email Preferences */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Preferencias de Email
            </CardTitle>
            <CardDescription>Configura qué notificaciones deseas recibir por correo electrónico</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {emailSettings.map((setting) => {
                const Icon = setting.icon;
                const isEnabled = preferences?.[setting.key as keyof typeof preferences] ?? true;
                
                return (
                  <div key={setting.key} className="flex items-center justify-between py-2">
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 ${setting.color}`} />
                      <div>
                        <p className="font-medium text-sm">{setting.label}</p>
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled as boolean}
                      onCheckedChange={(checked) => handlePreferenceToggle(setting.key, checked)}
                      disabled={updatePreferences.isPending}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Change Password */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Cambiar Contraseña
            </CardTitle>
            <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        Nueva contraseña
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Mínimo 6 caracteres"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        Confirmar nueva contraseña
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Repite la nueva contraseña"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={updatePassword.isPending}>
                  {updatePassword.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4 mr-2" />
                  )}
                  Cambiar contraseña
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Account Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <LogOut className="w-5 h-5" />
              Cerrar Sesión
            </CardTitle>
            <CardDescription>Cierra tu sesión actual en este dispositivo</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => signOut()}>
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
