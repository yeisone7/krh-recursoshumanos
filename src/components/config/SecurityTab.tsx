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
      {/* Global Sign Out */}
      <Card className="rounded-[2.5rem] bg-background border border-border/40 overflow-hidden">
        <CardHeader className="bg-destructive/5 border-b border-destructive/10 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white border border-destructive/20 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight text-destructive">Seguridad de Sesiones</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest text-destructive/60">Control de acceso multi-dispositivo</CardDescription>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={signingOutAll}
                  className="h-11 px-8 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase tracking-widest text-[10px]"
                >
                  {signingOutAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                  CERRAR TODAS LAS SESIONES
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[2rem] border-slate-200">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-black uppercase tracking-tight">¿Cerrar todas las sesiones?</AlertDialogTitle>
                  <AlertDialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-400 leading-relaxed">
                    Se invalidarán todos los accesos activos. Tendrás que autenticarte de nuevo en cada navegador o dispositivo vinculado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl font-black uppercase tracking-widest text-[10px]">CANCELAR</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSignOutAll} className="rounded-xl bg-red-600 font-black uppercase tracking-widest text-[10px]">CONFIRMAR CIERRE GLOBAL</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="p-6 rounded-[2rem] bg-destructive/5 border border-destructive/10 flex items-start gap-6">
            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-destructive mb-1">Protección de Cuenta</p>
              <p className="text-[10px] font-bold text-destructive/70 uppercase tracking-tight leading-relaxed">
                Si sospechas de actividad inusual, utiliza el botón de cierre global para desconectar inmediatamente todos los puntos de acceso a tu perfil.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inactivity Timeout */}
      <Card className="rounded-[2.5rem] bg-background border border-border/40 overflow-hidden">
        <CardHeader className="bg-background border-b border-slate-100 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
                <Timer className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight">Timeout Automático</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">Finalización de sesión por inactividad</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</span>
                <Switch checked={inactivityEnabled} onCheckedChange={onInactivityEnabledChange} className="data-[state=checked]:bg-primary" />
              </div>
              <Button 
                onClick={handleSaveTimeout} 
                disabled={savingTimeout || !inactivityEnabled}
                className="h-11 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover font-black uppercase tracking-widest text-[10px]"
              >
                {savingTimeout ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                GUARDAR AJUSTES
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {inactivityEnabled && (
            <div className="p-6 rounded-[2rem] bg-background border border-slate-100 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center gap-8">
                <div className="space-y-2 flex-1">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tiempo de Espera (Minutos)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min={1}
                      max={480}
                      value={inactivityMinutes}
                      onChange={(e) => onInactivityMinutesChange(Math.max(1, parseInt(e.target.value) || 15))}
                      className="h-12 w-32 rounded-xl bg-white border-slate-200 font-black text-xs text-slate-900 text-center"
                    />
                    <div className="h-12 px-6 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[10px] uppercase tracking-widest">
                      {inactivityMinutes >= 60
                        ? `${Math.floor(inactivityMinutes / 60)}H ${inactivityMinutes % 60}MIN`
                        : `${inactivityMinutes} MINUTOS`}
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-warning/5 border border-warning/10 flex items-center gap-4 flex-1">
                  <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center">
                    <Timer className="w-4 h-4 text-warning" />
                  </div>
                  <p className="text-[9px] font-bold text-warning/80 uppercase tracking-tight leading-relaxed">
                    Se mostrará una advertencia visual 60 segundos antes del cierre automático.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Lockout */}
      <Card className="rounded-[2.5rem] bg-background border border-border/40 overflow-hidden">
        <CardHeader className="bg-background border-b border-slate-100 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight">Protección de Acceso</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">Bloqueo preventivo por intentos fallidos</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Protección</span>
                <Switch checked={lockoutEnabled} onCheckedChange={onLockoutEnabledChange} className="data-[state=checked]:bg-primary" />
              </div>
              <Button 
                onClick={handleSaveLockout} 
                disabled={savingLockout || !lockoutEnabled}
                className="h-11 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover font-black uppercase tracking-widest text-[10px]"
              >
                {savingLockout ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                APLICAR REGLAS
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {lockoutEnabled && (
            <div className="grid gap-8 md:grid-cols-2">
              <div className="p-6 rounded-[2rem] bg-background border border-slate-100 space-y-4 transition-all hover:bg-white">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Umbral de Intentos</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={3}
                    max={20}
                    value={lockoutMaxAttempts}
                    onChange={(e) => onLockoutMaxAttemptsChange(Math.max(3, Math.min(20, parseInt(e.target.value) || 5)))}
                    className="h-12 w-32 rounded-xl bg-white border-slate-200 font-black text-xs text-slate-900 text-center"
                  />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">INTENTOS FALLIDOS</span>
                </div>
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-900 text-white space-y-4 transition-all">
                <Label className="text-[10px] font-black text-primary uppercase tracking-widest px-1">Duración del Bloqueo</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={lockoutMinutes}
                    onChange={(e) => onLockoutMinutesChange(Math.max(1, Math.min(120, parseInt(e.target.value) || 15)))}
                    className="h-12 w-32 rounded-xl bg-white/10 border-white/10 text-white font-black text-xs text-center"
                  />
                  <div className="h-12 px-6 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[10px] uppercase tracking-widest">
                    {lockoutMinutes >= 60
                      ? `${Math.floor(lockoutMinutes / 60)}H ${lockoutMinutes % 60}MIN`
                      : `${lockoutMinutes} MINUTOS`}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* App Update Check */}
      <Card className="rounded-[2.5rem] bg-background border border-border/40 overflow-hidden">
        <CardHeader className="bg-background border-b border-slate-100 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight">Ciclo de Actualización</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">Verificación de nuevas versiones del software</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Auto-check</span>
                <Switch checked={updateCheckEnabled} onCheckedChange={onUpdateCheckEnabledChange} className="data-[state=checked]:bg-primary" />
              </div>
              <Button 
                onClick={handleSaveUpdateCheck} 
                disabled={savingUpdateCheck || !updateCheckEnabled}
                className="h-11 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover font-black uppercase tracking-widest text-[10px]"
              >
                {savingUpdateCheck ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                CONFIRMAR CICLO
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {updateCheckEnabled && (
            <div className="p-6 rounded-[2rem] bg-background border border-slate-100 flex flex-col md:flex-row items-center gap-8">
              <div className="space-y-2 flex-1">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Frecuencia de Chequeo (Minutos)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    value={updateCheckMinutes}
                    onChange={(e) => onUpdateCheckMinutesChange(Math.max(1, Math.min(1440, parseInt(e.target.value) || 5)))}
                    className="h-12 w-32 rounded-xl bg-white border-slate-200 font-black text-xs text-slate-900 text-center"
                  />
                  <div className="h-12 px-6 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[10px] uppercase tracking-widest">
                    CADA {updateCheckMinutes >= 60
                      ? `${Math.floor(updateCheckMinutes / 60)}H ${updateCheckMinutes % 60}MIN`
                      : `${updateCheckMinutes} MINUTOS`}
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-relaxed">
                  El sistema verificará silenciosamente la existencia de parches o nuevas funcionalidades en el servidor según este intervalo.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session History */}
      <SessionHistory />
    </div>
  );
}
