import { useState } from 'react';
import { Shield, LogOut, Timer, Loader2, Save, Monitor, Lock, RefreshCw, AlertTriangle, CheckCircle2, History, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';

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
    <div className="space-y-8">
      {/* Cierre Global de Sesiones */}
      <Card className="rounded-[2.5rem] bg-white border border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-red-50/20 border-b border-red-50 p-8 sm:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-white border border-red-100 flex items-center justify-center text-red-600 shadow-xl shadow-red-100">
                <Monitor className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-black uppercase tracking-tight text-red-900">Perímetro de Sesión</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-red-400">Control maestro de accesos activos</CardDescription>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={signingOutAll}
                  className="h-14 px-10 rounded-2xl bg-red-600 text-white hover:bg-red-700 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-200 transition-all active:scale-95 w-full md:w-auto"
                >
                  {signingOutAll ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <LogOut className="w-4 h-4 mr-3 stroke-[2.5]" />}
                  PURGAR TODAS LAS SESIONES
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[3rem] border-none bg-white p-10 shadow-2xl">
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="h-20 w-20 rounded-[2rem] bg-red-50 text-red-600 flex items-center justify-center shadow-xl shadow-red-100">
                    <AlertTriangle className="w-10 h-10 stroke-[2.5]" />
                  </div>
                  <div className="space-y-3">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-slate-900">¿Cerrar Sesiones Globales?</AlertDialogTitle>
                      <AlertDialogDescription className="text-[11px] font-black uppercase tracking-widest text-slate-400 leading-relaxed max-w-sm">
                        Se invalidarán todos los tokens de acceso activos en cualquier navegador o dispositivo vinculado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                  </div>
                </div>
                <AlertDialogFooter className="mt-10 flex flex-col sm:flex-row gap-4">
                  <AlertDialogCancel className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-black uppercase text-[10px] tracking-widest flex-1 hover:bg-slate-100">CANCELAR</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSignOutAll} className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 font-black uppercase tracking-widest text-[10px] flex-1 shadow-xl shadow-red-200">CONFIRMAR PURGA</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="p-10">
          <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 flex items-start gap-8 group transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-100/50">
            <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-red-500 group-hover:border-red-100 transition-all duration-500 shadow-sm">
              <Shield className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Protección de Cuenta Maestro</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-2xl">
                Ante cualquier sospecha de vulneración, utiliza el cierre global para desconectar inmediatamente todos los puntos de acceso. Tendrás que autenticarte de nuevo para recuperar el control.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeout por Inactividad */}
      <Card className="rounded-[2.5rem] bg-white border border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center text-primary shadow-xl shadow-slate-200">
                <Timer className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Timeout Automático</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expiración de sesión por tiempo muerto</CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner w-full sm:w-auto justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Auto-Finalización</span>
                <Switch 
                  checked={inactivityEnabled} 
                  onCheckedChange={onInactivityEnabledChange} 
                  className="data-[state=checked]:bg-primary" 
                />
              </div>
              <Button 
                onClick={handleSaveTimeout} 
                disabled={savingTimeout || !inactivityEnabled}
                className="h-12 px-10 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 w-full sm:w-auto active:scale-95 transition-all"
              >
                {savingTimeout ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <Save className="w-4 h-4 mr-3" />}
                SINCRONIZAR TIMEOUT
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-10">
          <div className={cn(
            "transition-all duration-700",
            !inactivityEnabled && "opacity-30 pointer-events-none grayscale scale-[0.98]"
          )}>
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="space-y-4 p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 shadow-inner">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ventana de Inactividad (Minutos)</Label>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <Input
                    type="number"
                    min={1}
                    max={480}
                    value={inactivityMinutes}
                    onChange={(e) => onInactivityMinutesChange(Math.max(1, parseInt(e.target.value) || 15))}
                    className="h-16 w-full sm:w-32 rounded-2xl bg-white border-none font-black text-lg text-slate-900 text-center shadow-sm focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="h-16 px-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xs uppercase tracking-widest shadow-2xl flex-1 whitespace-nowrap">
                    {inactivityMinutes >= 60
                      ? `${Math.floor(inactivityMinutes / 60)} HORAS Y ${inactivityMinutes % 60} MIN`
                      : `${inactivityMinutes} MINUTOS CRONOMETRADOS`}
                  </div>
                </div>
              </div>
              
              <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 flex items-start gap-6">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Protocolo de Advertencia</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                    El sistema disparará un HUD visual 60 segundos antes del cierre forzoso, permitiendo al operador extender su nexo con la plataforma.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bloqueo por Intentos Fallidos */}
      <Card className="rounded-[2.5rem] bg-white border border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center text-primary shadow-xl shadow-slate-200">
                <Lock className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Blindaje de Acceso</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mecanismo de defensa ante ataques de fuerza bruta</CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner w-full sm:w-auto justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Protección Activa</span>
                <Switch 
                  checked={lockoutEnabled} 
                  onCheckedChange={onLockoutEnabledChange} 
                  className="data-[state=checked]:bg-primary" 
                />
              </div>
              <Button 
                onClick={handleSaveLockout} 
                disabled={savingLockout || !lockoutEnabled}
                className="h-12 px-10 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 w-full sm:w-auto active:scale-95 transition-all"
              >
                {savingLockout ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <Check className="w-4 h-4 mr-3" />}
                FIJAR BLINDAJE
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-10">
          <div className={cn(
            "grid gap-8 md:grid-cols-2 transition-all duration-700",
            !lockoutEnabled && "opacity-30 pointer-events-none grayscale scale-[0.98]"
          )}>
            <div className="p-10 rounded-[2.5rem] bg-white border border-slate-100 space-y-6 group hover:border-primary/20 transition-all duration-500 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="space-y-0.5">
                  <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Umbral de Colisión</h5>
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Intentos fallidos permitidos</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <Input
                  type="number"
                  min={3}
                  max={20}
                  value={lockoutMaxAttempts}
                  onChange={(e) => onLockoutMaxAttemptsChange(Math.max(3, Math.min(20, parseInt(e.target.value) || 5)))}
                  className="h-16 w-32 rounded-2xl bg-slate-50 border-none font-black text-lg text-slate-900 text-center shadow-inner focus:ring-2 focus:ring-primary/20"
                />
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-tight block">INTENTOS</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">REGLA DE BLOQUEO</span>
                </div>
              </div>
            </div>

            <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white space-y-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <Timer className="w-32 h-32" />
              </div>
              <div className="flex items-center gap-4 relative">
                <div className="h-10 w-10 rounded-xl bg-white/10 text-primary flex items-center justify-center">
                  <Timer className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="space-y-0.5">
                  <h5 className="text-[11px] font-black uppercase tracking-widest">Penalización Temporal</h5>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Duración del aislamiento</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-6 relative">
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={lockoutMinutes}
                  onChange={(e) => onLockoutMinutesChange(Math.max(1, Math.min(120, parseInt(e.target.value) || 15)))}
                  className="h-16 w-full sm:w-32 rounded-2xl bg-white/5 border-white/10 text-white font-black text-lg text-center shadow-inner focus:ring-2 focus:ring-primary/40"
                />
                <div className="h-16 px-8 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[10px] uppercase tracking-widest flex-1 shadow-lg">
                  {lockoutMinutes >= 60
                    ? `${Math.floor(lockoutMinutes / 60)}H Y ${lockoutMinutes % 60}MIN`
                    : `${lockoutMinutes} MINUTOS DE SUSPENSIÓN`}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ciclo de Actualización */}
      <Card className="rounded-[2.5rem] bg-white border border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center text-primary shadow-xl shadow-slate-200">
                <RefreshCw className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Ciclo de Sincronización</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gestión de versiones y parches en caliente</CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner w-full sm:w-auto justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hot-Reloading</span>
                <Switch 
                  checked={updateCheckEnabled} 
                  onCheckedChange={onUpdateCheckEnabledChange} 
                  className="data-[state=checked]:bg-primary" 
                />
              </div>
              <Button 
                onClick={handleSaveUpdateCheck} 
                disabled={savingUpdateCheck || !updateCheckEnabled}
                className="h-12 px-10 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 w-full sm:w-auto active:scale-95 transition-all"
              >
                {savingUpdateCheck ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <Save className="w-4 h-4 mr-3" />}
                CONFIRMAR CICLO
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-10">
          <div className={cn(
            "transition-all duration-700",
            !updateCheckEnabled && "opacity-30 pointer-events-none grayscale scale-[0.98]"
          )}>
            <div className="p-10 rounded-[3rem] bg-slate-50 border border-slate-100 flex flex-col lg:flex-row items-center gap-12 shadow-inner">
              <div className="space-y-4 w-full lg:w-max shrink-0">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Frecuencia de Heartbeat</Label>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    value={updateCheckMinutes}
                    onChange={(e) => onUpdateCheckMinutesChange(Math.max(1, Math.min(1440, parseInt(e.target.value) || 5)))}
                    className="h-16 w-full sm:w-32 rounded-2xl bg-white border-none font-black text-lg text-slate-900 text-center shadow-sm focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="h-16 px-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-[11px] uppercase tracking-widest shadow-2xl flex-1 lg:flex-none">
                    CADA {updateCheckMinutes >= 60
                      ? `${Math.floor(updateCheckMinutes / 60)}H Y ${updateCheckMinutes % 60}MIN`
                      : `${updateCheckMinutes} MINUTOS`}
                  </div>
                </div>
              </div>
              <div className="flex-1 p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm relative group">
                <div className="flex items-center gap-4 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <h5 className="text-sm font-black uppercase tracking-widest text-slate-900">Sincronización Silenciosa</h5>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                  El motor de verificación orquestará descargas automáticas de metadatos del servidor. Si se detecta un parche crítico, se notificará al operador para un refresco seguro sin pérdida de datos.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historial de Sesiones */}
      <div className="pt-4">
        <SessionHistory />
      </div>
    </div>
  );
}
