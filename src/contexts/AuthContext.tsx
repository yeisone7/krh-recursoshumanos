import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logSession } from '@/lib/sessionLogger';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserCompany {
  id: string;
  name: string;
  nit: string;
}

interface PermissionEntry {
  module_code: string;
  action: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  companies: UserCompany[];
  currentCompanyId: string | null;
  setCurrentCompanyId: (id: string | null) => void;
  isLoading: boolean;
  isAdmin: boolean;
  isRRHH: boolean;
  isAuditor: boolean;
  isPsicologo: boolean;
  isSuperAdmin: boolean;
  hasRole: (role: AppRole) => boolean;
  // New permission system
  permissions: PermissionEntry[];
  permissionsLoaded: boolean;
  hasPermission: (moduleCode: string, action?: string) => boolean;
  canView: (moduleCode: string) => boolean;
  canCreate: (moduleCode: string) => boolean;
  canUpdate: (moduleCode: string) => boolean;
  canDelete: (moduleCode: string) => boolean;
  hasAnyRole: boolean;
  refreshPermissions: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [companies, setCompanies] = useState<UserCompany[]>([]);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [hasAnyRole, setHasAnyRole] = useState(true); // default true to avoid flash
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_permissions', { _user_id: userId });
      if (error) {
        console.error('Error fetching permissions:', error);
        setPermissions([]);
      } else {
        setPermissions((data || []) as PermissionEntry[]);
      }

      // Check if user has any custom role assigned
      const { data: userRoles } = await supabase
        .from('user_custom_roles')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      
      setHasAnyRole((userRoles && userRoles.length > 0) || false);
    } catch {
      setPermissions([]);
    } finally {
      setPermissionsLoaded(true);
    }
  };

  const fetchUserData = async (userId: string) => {
    // Fetch user roles (legacy)
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (rolesData) {
      setRoles(rolesData.map(r => r.role));
    }

    // Fetch user companies
    const { data: companiesData } = await supabase
      .from('user_company_assignments')
      .select('company_id, companies(id, name, nit)')
      .eq('user_id', userId);

    if (companiesData && companiesData.length > 0) {
      const userCompanies = companiesData
        .filter(c => c.companies)
        .map(c => ({
          id: c.companies!.id,
          name: c.companies!.name,
          nit: c.companies!.nit,
        }));
      setCompanies(userCompanies);
      if (!currentCompanyId && userCompanies.length > 0) {
        // Restore last selected company from localStorage
        const lastCompany = localStorage.getItem(`last_company_${userId}`);
        if (lastCompany && userCompanies.some(c => c.id === lastCompany)) {
          setCurrentCompanyId(lastCompany);
        } else if (userCompanies.length === 1) {
          setCurrentCompanyId(userCompanies[0].id);
        }
        // If multiple companies and no saved preference, leave null for CompanyGuard
      }
    }

    // Fetch dynamic permissions
    await fetchPermissions(userId);

    // Check super admin status
    const { data: saData } = await supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    setIsSuperAdmin(!!saData);

    // If super admin, fetch ALL companies
    if (saData) {
      const { data: allCompanies } = await supabase
        .from('companies')
        .select('id, name, nit')
        .order('name');
      if (allCompanies && allCompanies.length > 0) {
        setCompanies(allCompanies);
        if (!currentCompanyId) {
          setCurrentCompanyId(allCompanies[0].id);
        }
      }
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setRoles([]);
          setCompanies([]);
          setCurrentCompanyId(null);
          setPermissions([]);
          setPermissionsLoaded(false);
          setHasAnyRole(true);
          setIsSuperAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRoleFn = (role: AppRole): boolean => roles.includes(role);
  const isAdmin = hasRoleFn('admin');
  const isRRHH = hasRoleFn('rrhh');
  const isAuditor = hasRoleFn('auditor');
  const isPsicologo = hasRoleFn('psicologo');

  // New permission helpers
  const hasPermission = useCallback((moduleCode: string, action: string = 'view'): boolean => {
    // Legacy admin bypass
    if (isAdmin) return true;
    return permissions.some(p => p.module_code === moduleCode && p.action === action);
  }, [permissions, isAdmin]);

  const canView = useCallback((m: string) => hasPermission(m, 'view'), [hasPermission]);
  const canCreate = useCallback((m: string) => hasPermission(m, 'create'), [hasPermission]);
  const canUpdate = useCallback((m: string) => hasPermission(m, 'update'), [hasPermission]);
  const canDelete = useCallback((m: string) => hasPermission(m, 'delete'), [hasPermission]);

  const refreshPermissions = useCallback(() => {
    if (user) fetchPermissions(user.id);
  }, [user]);

  const signIn = async (email: string, password: string) => {
    try {
      // Check lockout config
      const { data: lockoutConfig } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'account_lockout')
        .maybeSingle();

      const lockout = lockoutConfig?.config_value as any;
      if (lockout?.enabled) {
        const { data: lockStatus } = await supabase.rpc('check_account_locked', {
          p_email: email,
          p_max_attempts: lockout.max_attempts || 5,
          p_lockout_minutes: lockout.lockout_minutes || 15,
        });

        const lockResult = lockStatus as unknown as { locked: boolean; remaining_minutes: number } | null;
        if (lockResult?.locked) {
          const mins = Math.ceil(lockResult.remaining_minutes || 0);
          return {
            error: new Error(
              `Cuenta bloqueada por demasiados intentos fallidos. Intenta de nuevo en ${mins} minuto${mins !== 1 ? 's' : ''}.`
            ),
          };
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      // Record the attempt
      await supabase.from('login_attempts').insert({
        email,
        success: !error,
        user_agent: navigator.userAgent,
      });

      if (!error && data.user) {
        logSession(data.user.id, data.user.email);
      }
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // If server-side logout fails (e.g. expired session), clear local state anyway
    }
    // Always clear local state regardless of server response
    setUser(null);
    setSession(null);
    setRoles([]);
    setCompanies([]);
    setCurrentCompanyId(null);
    setPermissions([]);
    setPermissionsLoaded(false);
    setHasAnyRole(true);
    setIsSuperAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        roles,
        companies,
        currentCompanyId,
        setCurrentCompanyId,
        isLoading,
        isAdmin,
        isRRHH,
        isAuditor,
        isPsicologo,
        isSuperAdmin,
        hasRole: hasRoleFn,
        permissions,
        permissionsLoaded,
        hasPermission,
        canView,
        canCreate,
        canUpdate,
        canDelete,
        hasAnyRole,
        refreshPermissions,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
