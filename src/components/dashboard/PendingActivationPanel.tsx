import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { UserPlus, ShieldAlert, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PendingUser {
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
}

function usePendingActivationUsers() {
  const { currentCompanyId, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['pending-activation-users', currentCompanyId],
    queryFn: async (): Promise<PendingUser[]> => {
      // Get all user IDs in this company
      const { data: companyUsers, error: cuErr } = await supabase
        .from('user_company_assignments')
        .select('user_id')
        .eq('company_id', currentCompanyId!);
      if (cuErr) throw cuErr;

      const userIds = companyUsers?.map(u => u.user_id) || [];
      if (userIds.length === 0) return [];

      // Get users that have custom roles assigned
      const { data: usersWithRoles, error: rwErr } = await supabase
        .from('user_custom_roles')
        .select('user_id')
        .in('user_id', userIds);
      if (rwErr) throw rwErr;

      const usersWithRolesSet = new Set(usersWithRoles?.map(u => u.user_id) || []);

      // Also check legacy roles
      const { data: legacyRoles, error: lrErr } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('user_id', userIds);
      if (lrErr) throw lrErr;

      legacyRoles?.forEach(r => usersWithRolesSet.add(r.user_id));

      // Filter to users without any role
      const pendingUserIds = userIds.filter(id => !usersWithRolesSet.has(id));
      if (pendingUserIds.length === 0) return [];

      // Get profile info
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', pendingUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      return pendingUserIds.map(uid => ({
        user_id: uid,
        email: '',
        full_name: profileMap.get(uid) || '',
        created_at: '',
      }));
    },
    enabled: !!currentCompanyId && isAdmin,
    staleTime: 60_000,
  });
}

export function PendingActivationPanel() {
  const { data: pendingUsers = [], isLoading } = usePendingActivationUsers();

  if (isLoading || pendingUsers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="border-amber-500/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-base">Usuarios Pendientes de Activación</CardTitle>
            </div>
            <Badge variant="outline" className="border-amber-500/50 text-amber-600">
              {pendingUsers.length}
            </Badge>
          </div>
          <CardDescription>
            Estos usuarios necesitan que se les asigne al menos un rol para acceder al sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className={pendingUsers.length > 4 ? 'h-[200px]' : ''}>
            <div className="space-y-2">
              {pendingUsers.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-background transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {user.full_name || 'Sin nombre'}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.user_id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Sin rol
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
