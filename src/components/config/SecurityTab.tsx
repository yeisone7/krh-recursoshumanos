import { useState } from 'react';
import { Shield, LogOut, Timer, Loader2, Save, Monitor, Lock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateSystemConfig } from '@/hooks/useSystemConfig';
import { supabase } from '@/integrations/supabase/client';
import { SessionHistory } from './SessionHistory';

interface SecurityTabProps {
  inactivityMinutes: number;
  inactivityEnabled: boolean;
  onInactivityMinutesChange: (v: number) => void;
  onInactivityEnabledChange: (v: boolean) => void;
  lockoutEnabled: boolean;
  lockoutMaxAttempts: number;
  lockoutMinutes: number;
  onLockoutEnabledChange: (v: boolean) => void;
  onLockoutMaxAttemptsChange: (v: number) => void;
  onLockoutMinutesChange: (v: number) => void;
  updateCheckEnabled: boolean;
  updateCheckMinutes: number;
  onUpdateCheckEnabledChange: (v: boolean) => void;
  onUpdateCheckMinutesChange: (v: number) => void;
}

export function SecurityTab({
  inactivityMinutes,
  inactivityEnabled,
  onInactivityMinutesChange,
  onInactivityEnabledChange,
  lockoutEnabled,
  lockoutMaxAttempts,
  lockoutMinutes,
  onLockoutEnabledChange,
  onLockoutMaxAttemptsChange,
  onLockoutMinutesChange,
  updateCheckEnabled,
  updateCheckMinutes,
  onUpdateCheckEnabledChange,
  onUpdateCheckMinutesChange,
}: SecurityTabProps) {
  const { signOut } = useAuth();
  const updateConfig = useUpdateSystemConfig();
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [savingTimeout, setSavingTimeout] = useState(false);
  const [savingLockout, setSavingLockout] = useState(false);
  const [savingUpdateCheck, setSavingUpdateCheck] = useState(false);

  const handleSignOutAll = async () => {
    setSigningOutAll(true);
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast.success('Se han cerrado todas las sesiones activas');
      await signOut();
    } catch {
      toast.error('Error al cerrar sesiones');
    } finally {
      setSigningOutAll(false);
    }
  };

  const handleSaveTimeout = async () => {
    setSavingTimeout(true);
    try {
      await updateConfig.mutateAsync({
        key: 'inactivity_timeout_minutes',
        value: { enabled: inactivityEnabled, minutes: inactivityEnabled ? inactivityMinutes : 0 },
        description: 'Minutos de inactividad antes de cerrar sesión automáticamente',
      });
      toast.success('Configuración de seguridad guardada');
    } catch {
      toast.error('Error al guardar la configuración');
    } finally {
      setSavingTimeout(false);
    }
  };

  const handleSaveLockout = async () => {
    setSavingLockout(true);
    try {
      await updateConfig.mutateAsync({
        key: 'account_lockout',
        value: {
          enabled: lockoutEnabled,
          max_attempts: lockoutMaxAttempts,
          lockout_minutes: lockoutMinutes,
        },
        description: 'Configuración de bloqueo de cuenta por intentos fallidos de login',
      });
      toast.success('Configuración de bloqueo guardada');
    } catch {
      toast.error('Error al guardar la configuración');
    } finally {
      setSavingLockout(false);
    }
  };

  const handleSaveUpdateCheck = async () => {
    setSavingUpdateCheck(true);
    try {
      await updateConfig.mutateAsync({
        key: 'app_update_check',
        value: { enabled: updateCheckEnabled, minutes: updateCheckEnabled ? updateCheckMinutes : 0 },
        description: 'Configuración del chequeo automático de actualizaciones de la aplicación',
      });
      toast.success('Configuración de actualizaciones guardada');
    } catch {
      toast.error('Error al guardar la configuración');
    } finally {
      setSavingUpdateCheck(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Sign Out */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Monitor className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle>Cerrar sesión en todos los dispositivos</CardTitle>
              <CardDescription>
                Invalida todas las sesiones activas de tu cuenta en cualquier navegador o dispositivo
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <div className="flex-1">
              <p className="text-sm font-medium">¿Sospecha de acceso no autorizado?</p>
              <p className="text-xs text-muted-foreground mt-1">
                Esta acción cerrará la sesión en todos los dispositivos, incluyendo este. Deberás iniciar sesión de nuevo.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={signingOutAll}>
                  {signingOutAll ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4 mr-2" />
                  )}
                  Cerrar todas las sesiones
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden sm:max-w-lg">
                <AlertDialogHeader className="min-h-0 shrink overflow-y-auto pr-1">
                  <AlertDialogTitle>¿Cerrar sesión en todos los dispositivos?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se cerrarán todas las sesiones activas de tu cuenta. Tendrás que iniciar sesión nuevamente en cada dispositivo.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="shrink-0 flex-col-reverse gap-2 sm:flex-row sm:gap-0">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSignOutAll} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto">
                    Sí, cerrar todas
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Inactivity Timeout */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Timer className="h-5 w-5 text-warning" />
            </div>
            <div>
              <CardTitle>Timeout por inactividad</CardTitle>
              <CardDescription>
                Cierra la sesión automáticamente después de un periodo sin actividad del usuario
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border">
            <div className="min-w-0">
              <Label className="text-sm font-medium">Activar cierre automático por inactividad</Label>
              <p className="text-xs text-muted-foreground mt-1">
                El sistema detecta movimientos del ratón, teclado y scroll
              </p>
            </div>
            <Switch
              checked={inactivityEnabled}
              onCheckedChange={onInactivityEnabledChange}
            />
          </div>

          {inactivityEnabled && (
            <div className="p-4 rounded-lg border space-y-3">
              <Label>Tiempo de inactividad (minutos)</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Input
                  type="number"
                  min={1}
                  max={480}
                  value={inactivityMinutes}
                  onChange={(e) => onInactivityMinutesChange(Math.max(1, parseInt(e.target.value) || 15))}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  = {inactivityMinutes >= 60
                    ? `${Math.floor(inactivityMinutes / 60)}h ${inactivityMinutes % 60}min`
                    : `${inactivityMinutes} minutos`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Se mostrará una advertencia 1 minuto antes de cerrar la sesión. Recomendado: 15-60 minutos.
              </p>
            </div>
          )}

          <Button onClick={handleSaveTimeout} disabled={savingTimeout}>
            {savingTimeout ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar Configuración
          </Button>
        </CardContent>
      </Card>

      {/* Account Lockout */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle>Bloqueo de cuenta por intentos fallidos</CardTitle>
              <CardDescription>
                Bloquea temporalmente una cuenta después de múltiples intentos de inicio de sesión fallidos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border">
            <div className="min-w-0">
              <Label className="text-sm font-medium">Activar bloqueo de cuenta</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Protege contra ataques de fuerza bruta bloqueando temporalmente tras intentos fallidos
              </p>
            </div>
            <Switch
              checked={lockoutEnabled}
              onCheckedChange={onLockoutEnabledChange}
            />
          </div>

          {lockoutEnabled && (
            <div className="p-4 rounded-lg border space-y-4">
              <div className="space-y-2">
                <Label>Máximo de intentos fallidos</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <Input
                    type="number"
                    min={3}
                    max={20}
                    value={lockoutMaxAttempts}
                    onChange={(e) => onLockoutMaxAttemptsChange(Math.max(3, Math.min(20, parseInt(e.target.value) || 5)))}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">intentos antes de bloquear</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Duración del bloqueo (minutos)</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={lockoutMinutes}
                    onChange={(e) => onLockoutMinutesChange(Math.max(1, Math.min(120, parseInt(e.target.value) || 15)))}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    = {lockoutMinutes >= 60
                      ? `${Math.floor(lockoutMinutes / 60)}h ${lockoutMinutes % 60}min`
                      : `${lockoutMinutes} minutos`}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Después de {lockoutMaxAttempts} intentos fallidos, la cuenta se bloqueará por {lockoutMinutes} minutos. Recomendado: 5 intentos / 15 minutos.
              </p>
            </div>
          )}

          <Button onClick={handleSaveLockout} disabled={savingLockout}>
            {savingLockout ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar Configuración
          </Button>
        </CardContent>
      </Card>

      {/* App Update Check */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Chequeo automático de actualizaciones</CardTitle>
              <CardDescription>
                Revisa si hay una nueva versión publicada y avisa a los usuarios que tengan la app abierta
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border">
            <div className="min-w-0">
              <Label className="text-sm font-medium">Activar chequeo automático</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Al desactivarlo no se mostrará el aviso automático de actualización pendiente
              </p>
            </div>
            <Switch checked={updateCheckEnabled} onCheckedChange={onUpdateCheckEnabledChange} />
          </div>

          {updateCheckEnabled && (
            <div className="p-4 rounded-lg border space-y-3">
              <Label>Revisar cada (minutos)</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  value={updateCheckMinutes}
                  onChange={(e) => onUpdateCheckMinutesChange(Math.max(1, Math.min(1440, parseInt(e.target.value) || 5)))}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  = {updateCheckMinutes >= 60
                    ? `${Math.floor(updateCheckMinutes / 60)}h ${updateCheckMinutes % 60}min`
                    : `${updateCheckMinutes} minutos`}
                </span>
              </div>
            </div>
          )}

          <Button onClick={handleSaveUpdateCheck} disabled={savingUpdateCheck}>
            {savingUpdateCheck ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar Configuración
          </Button>
        </CardContent>
      </Card>

      {/* Session History */}
      <SessionHistory />
    </div>
  );
}
