/**
 * AiAccessManager.tsx
 * Panel de gestión de acceso al AI Data Assistant por usuario.
 * Visible solo para administradores desde Seguridad → Acceso IA.
 */
import { useState } from 'react';
import { Bot, Search, Loader2, Check, X, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToggleDataAssistantPermission } from '@/hooks/useDataAssistant';
import { useToast } from '@/hooks/use-toast';

interface UserWithPref {
  id: string;
  email: string;
  full_name: string | null;
  ai_data_assistant_enabled: boolean;
  is_super_admin: boolean;
  is_current_user: boolean;
}

function useCompanyUsersWithAIPrefs() {
  const { currentCompanyId, user: currentUser } = useAuth();

  return useQuery({
    queryKey: ['users-ai-prefs', currentCompanyId, currentUser?.id],
    enabled: !!currentCompanyId && !!currentUser?.id,
    queryFn: async (): Promise<UserWithPref[]> => {
      // 1. Obtener IDs de usuarios: asignados a la empresa + super admins
      const [{ data: assignments }, { data: superAdmins }] = await Promise.all([
        supabase.from('user_company_assignments' as never).select('user_id').eq('company_id', currentCompanyId!),
        supabase.from('super_admins' as never).select('user_id'),
      ]);

      const assignedIds = (assignments as { user_id: string }[] || []).map(a => a.user_id);
      const superAdminIds = (superAdmins as { user_id: string }[] || []).map(a => a.user_id);
      
      // Unión de IDs (Set para evitar duplicados)
      const allUserIds = Array.from(new Set([...assignedIds, ...superAdminIds, currentUser!.id]));

      // 2. Obtener perfiles
      const { data: profiles } = await supabase
        .from('user_profiles' as never)
        .select('id, full_name, display_name')
        .in('id', allUserIds);

      // 3. Obtener preferencias de IA
      const { data: prefs } = await supabase
        .from('user_preferences' as never)
        .select('user_id, ai_data_assistant_enabled')
        .in('user_id', allUserIds);

      const prefsMap = new Map(
        ((prefs ?? []) as { user_id: string; ai_data_assistant_enabled: boolean }[])
          .map(p => [p.user_id, p.ai_data_assistant_enabled])
      );

      const superAdminsSet = new Set(superAdminIds);

      return ((profiles ?? []) as {
        id: string; full_name?: string | null; display_name?: string | null
      }[]).map(p => {
        const isCurrent = p.id === currentUser!.id;
        return {
          id: p.id,
          // Solo podemos ver el email real del usuario actual por seguridad de Supabase Auth
          email: isCurrent ? currentUser!.email || 'Tu correo' : 'Usuario del sistema',
          full_name: p.full_name ?? p.display_name ?? (isCurrent ? 'Tú' : null),
          ai_data_assistant_enabled: prefsMap.get(p.id) ?? false,
          is_super_admin: superAdminsSet.has(p.id),
          is_current_user: isCurrent,
        };
      });
    },
  });
}

export function AiAccessManager() {
  const [search, setSearch] = useState('');
  const { data: users = [], isLoading, refetch } = useCompanyUsersWithAIPrefs();
  const togglePerm = useToggleDataAssistantPermission();
  const { toast } = useToast();

  const filtered = users.filter(u =>
    (u.full_name ?? u.id).toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const enabledCount = users.filter(u => u.ai_data_assistant_enabled).length;

  const handleToggle = async (userId: string, enabled: boolean) => {
    try {
      await togglePerm.mutateAsync({ userId, enabled });
      await refetch();
      toast({
        title: enabled ? 'Acceso habilitado' : 'Acceso deshabilitado',
        description: `El Asistente de Datos IA fue ${enabled ? 'activado' : 'desactivado'} para el usuario.`,
      });
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el permiso.', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Acceso al Asistente de Datos IA</CardTitle>
            <CardDescription>
              Activa o desactiva el módulo de análisis con IA por usuario.
              {' '}
              <Badge variant="secondary" className="ml-1">
                {enabledCount} / {users.length} habilitados
              </Badge>
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o correo…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No se encontraron usuarios.
          </p>
        ) : (
          <div className="space-y-1">
            {filtered.sort((a, b) => (a.is_current_user ? -1 : b.is_current_user ? 1 : 0)).map(user => (
              <div
                key={user.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors
                  ${user.is_current_user ? 'border border-border ' : 'hover:bg-background'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold
                    ${user.is_current_user ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                    {(user.full_name ?? 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {user.full_name ?? 'Usuario sin nombre'}
                      </p>
                      {user.is_current_user && (
                        <Badge variant="outline" className="text-[9px] h-3.5 px-1 bg-primary/10 text-primary border-primary/20">
                          Tú
                        </Badge>
                      )}
                      {user.is_super_admin && (
                        <Shield className="w-3 h-3 text-amber-500" title="Super Admin" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                        {user.email}
                      </span>
                      <span className="text-muted-foreground/30 text-[10px]">•</span>
                      {user.ai_data_assistant_enabled ? (
                        <span className="text-[10px] text-primary font-medium flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> Activo
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <X className="w-2.5 h-2.5" /> Inactivo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={user.ai_data_assistant_enabled}
                    onCheckedChange={enabled => handleToggle(user.id, enabled)}
                    disabled={togglePerm.isPending}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/60 pt-1 border-t mt-2 pt-2">
          <Shield className="w-3 h-3 inline mr-1 text-amber-500" />
          Nota: Los Super Administradores tienen acceso al asistente por defecto, pero se recomienda habilitar el switch para consistencia.
        </p>
      </CardContent>
    </Card>
  );
}
