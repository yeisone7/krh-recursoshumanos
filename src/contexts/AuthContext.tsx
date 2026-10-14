import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logSession } from '@/lib/sessionLogger';
import { confirmWorkspaceExit } from '@/lib/workspaceExit';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserCompany {
  id: string;
  name: string;
  nit: string;
  logo_url?: string;
  horizontal_logo_url?: string;
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
  setCurrentCompanyId: (id: string | null) => boolean;
  isLoading: boolean;
  mustChangePassword: boolean;
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
  canApprove: (moduleCode: string) => boolean;
  canExport: (moduleCode: string) => boolean;
  hasAnyRole: boolean;
  assignedCenterIds: string[];
  profile: { full_name: string | null; display_name: string | null; avatar_url: string | null } | null;
  refreshPermissions: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: Error | null; user?: User | null; session?: Session | null }>;
  signOut: (options?: { force?: boolean }) => Promise<void>;
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
  const [assignedCenterIds, setAssignedCenterIds] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; display_name: string | null; avatar_url: string | null } | null>(null);
  const userRef = React.useRef<User | null>(null);
  const authVersion = React.useRef(0);
  const currentCompanyIdRef = React.useRef<string | null>(null);

  // Sync ref with currentCompanyId state to prevent stale closures
  React.useEffect(() => {
    currentCompanyIdRef.current = currentCompanyId;
  }, [currentCompanyId]);

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

  const assertUserActive = async (userId: string) => {
    const { data, error } = await supabase.rpc('is_user_active', { _user_id: userId });
    if (error || data !== true) {
      throw new Error(error ? 'No fue posible verificar el estado de tu cuenta. Intenta de nuevo.' :
        'Tu cuenta está suspendida. Contacta al administrador.');
    }
  };

  const fetchUserData = async (userId: string, version: number) => {
    await assertUserActive(userId);
    if (version !== authVersion.current) return;
    // Execute all initial queries in parallel to drastically improve loading speed and avoid waterfalls
    const [
      rolesRes,
      assignmentsRes,
      saRes,
      profileRes,
      centerRes,
      permissionsRes,
      customRolesRes
    ] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('user_company_assignments').select('company_id, companies(id, name, nit, logo_url, horizontal_logo_url)').eq('user_id', userId),
      supabase.rpc('is_super_admin'),
      supabase.from('user_profiles').select('full_name, display_name, avatar_url').eq('id', userId).maybeSingle(),
      supabase.from('user_center_assignments').select('operation_center_id').eq('user_id', userId),
      supabase.rpc('get_user_permissions', { _user_id: userId }),
      supabase.from('user_custom_roles').select('id').eq('user_id', userId).limit(1)
    ]);

    if (version !== authVersion.current) return;

    // Process roles
    if (rolesRes.data) {
      setRoles(rolesRes.data.map(r => r.role));
    }

    // Process dynamic permissions
    if (permissionsRes.error) {
      console.error('Error fetching permissions:', permissionsRes.error);
      setPermissions([]);
    } else {
      setPermissions((permissionsRes.data || []) as PermissionEntry[]);
    }
    setPermissionsLoaded(true);

    const hasAnyCustomRole = (customRolesRes.data && customRolesRes.data.length > 0) || false;
    setHasAnyRole(hasAnyCustomRole);

    // Process super admin status
    if (saRes.error) {
      console.error('Error checking super admin status:', saRes.error);
    }
    const isSA = saRes.data === true;
    setIsSuperAdmin(isSA);

    // Process profile data
    if (profileRes.data) {
      setProfile(profileRes.data);
    }

    // Process center assignments
    if (centerRes.data) {
      setAssignedCenterIds(centerRes.data.map(c => c.operation_center_id));
    } else {
      setAssignedCenterIds([]);
    }

    // Process companies list atomically
    let finalCompanies: UserCompany[] = [];
    if (isSA) {
      // If super admin, fetch ALL companies
      const { data: allCompanies, error: allErr } = await supabase
        .from('companies')
        .select('id, name, nit, logo_url, horizontal_logo_url')
        .order('name');
      
      if (allErr) {
        console.error('Error fetching all companies for super admin:', allErr);
      } else if (allCompanies && allCompanies.length > 0) {
        finalCompanies = allCompanies.map(c => ({
          id: c.id,
          name: c.name,
          nit: c.nit,
          logo_url: c.logo_url || undefined,
          horizontal_logo_url: c.horizontal_logo_url || undefined
        }));
      }
    } else {
      // Regular user: use assignments
      if (assignmentsRes.data && assignmentsRes.data.length > 0) {
        finalCompanies = assignmentsRes.data
          .filter(c => c.companies)
          .map(c => ({
            id: c.companies!.id,
            name: c.companies!.name,
            nit: c.companies!.nit,
            logo_url: c.companies!.logo_url || undefined,
            horizontal_logo_url: (c.companies as any).horizontal_logo_url || undefined,
          }));
      }
    }

    if (version !== authVersion.current) return;
    setCompanies(finalCompanies);

    // Atomic selection of currentCompanyId to prevent visual glitching
    // We check currentCompanyIdRef.current to avoid any stale closure reads
    const existingCompanyId = currentCompanyIdRef.current;
    
    if (finalCompanies.length > 0) {
      const lastCompany = localStorage.getItem(`last_company_${userId}`);
      
      // If we already have a valid selected company in the final list, preserve it!
      if (existingCompanyId && finalCompanies.some(c => c.id === existingCompanyId)) {
        setCurrentCompanyId(existingCompanyId);
      } else if (lastCompany && finalCompanies.some(c => c.id === lastCompany)) {
        setCurrentCompanyId(lastCompany);
      } else if (finalCompanies.length === 1) {
        setCurrentCompanyId(finalCompanies[0].id);
      }
    }
  };

  useEffect(() => {
    let disposed = false;
    const clearAccess = () => {
      userRef.current = null;
      setUser(null);
      setSession(null);
      setRoles([]);
      setCompanies([]);
      setCurrentCompanyId(null);
      setPermissions([]);
      setPermissionsLoaded(false);
      setHasAnyRole(true);
      setAssignedCenterIds([]);
      setIsSuperAdmin(false);
      setProfile(null);
    };
    const acceptSession = async (nextSession: Session | null) => {
      if (disposed) return;
      const version = ++authVersion.current;
      const nextUser = nextSession?.user;
      if (!nextUser) {
        clearAccess();
        setIsLoading(false);
        return;
      }
      if (userRef.current?.id !== nextUser.id) {
        clearAccess();
        setIsLoading(true);
      }
      try {
        await fetchUserData(nextUser.id, version);
        if (disposed || version !== authVersion.current) return;
        userRef.current = nextUser;
        setSession(nextSession);
        setUser(nextUser);
      } catch {
        if (disposed || version !== authVersion.current) return;
        clearAccess();
        // Suspension is mandatory: never let unsaved-work prompts preserve access.
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      } finally {
        if (!disposed && version === authVersion.current) setIsLoading(false);
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        // Supabase queries must run outside the auth callback's internal lock.
        const eventVersion = ++authVersion.current;
        if (!nextSession) void acceptSession(null);
        else setTimeout(() => {
          if (authVersion.current === eventVersion) void acceptSession(nextSession);
        }, 0);
      }
    );

    const initialVersion = authVersion.current;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (authVersion.current === initialVersion) void acceptSession(session);
    }).catch(() => { if (authVersion.current === initialVersion) void acceptSession(null); });

    const recheckAccess = () => {
      const currentUser = userRef.current;
      const version = authVersion.current;
      if (currentUser) void assertUserActive(currentUser.id).catch(() => {
        if (!disposed && version === authVersion.current) {
          void acceptSession(null);
          void supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
        }
      });
    };
    const interval = window.setInterval(recheckAccess, 30_000);
    window.addEventListener('focus', recheckAccess);
    return () => {
      disposed = true;
      ++authVersion.current;
      subscription.unsubscribe();
      window.clearInterval(interval);
      window.removeEventListener('focus', recheckAccess);
    };
  }, []);

  const hasRoleFn = (role: AppRole): boolean => roles.includes(role);
  const isAdmin = hasRoleFn('admin');
  const isRRHH = hasRoleFn('rrhh');
  const isAuditor = hasRoleFn('auditor');
  const isPsicologo = hasRoleFn('psicologo');
  const mustChangePassword = user?.app_metadata?.force_password_change === true;

  // New permission helpers
  const hasPermission = useCallback((moduleCode: string, action: string = 'view'): boolean => {
    // Legacy admin and super-admin bypass
    if (isAdmin || isSuperAdmin) return true;
    return permissions.some(p => p.module_code === moduleCode && p.action === action);
  }, [permissions, isAdmin, isSuperAdmin]);

  const canView = useCallback((m: string) => hasPermission(m, 'view'), [hasPermission]);
  const canCreate = useCallback((m: string) => hasPermission(m, 'create'), [hasPermission]);
  const canUpdate = useCallback((m: string) => hasPermission(m, 'update'), [hasPermission]);
  const canDelete = useCallback((m: string) => hasPermission(m, 'delete'), [hasPermission]);
  const canApprove = useCallback((m: string) => hasPermission(m, 'approve'), [hasPermission]);
  const canExport = useCallback((m: string) => hasPermission(m, 'export'), [hasPermission]);

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

      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      let error: Error | null = authError;
      if (authError?.code === 'user_banned') error = new Error('Tu cuenta está suspendida. Contacta al administrador.');
      if (!error && data.user) {
        try {
          await assertUserActive(data.user.id);
        } catch (statusError) {
          error = statusError as Error;
          await signOut({ force: true });
        }
      }

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

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        emailRedirectTo: redirectUrl,
        data: metadata
      },
    });
    return { error, user: data.user, session: data.session };
  };

  const signOut = async (options?: { force?: boolean }) => {
    if (!options?.force && !confirmWorkspaceExit('logout')) return;
    ++authVersion.current;
    userRef.current = null;
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
    setAssignedCenterIds([]);
    setIsSuperAdmin(false);
    setProfile(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        roles,
        companies,
        currentCompanyId,
        setCurrentCompanyId: (id) => {
          if (id === currentCompanyId) return true;
          if (!confirmWorkspaceExit('company')) return false;
          setCurrentCompanyId(id);
          return true;
        },
        isLoading,
        mustChangePassword,
        isAdmin: roles.includes('admin') || isSuperAdmin,
        isRRHH: roles.includes('rrhh') || isSuperAdmin,
        isAuditor: roles.includes('auditor') || isSuperAdmin,
        isPsicologo: roles.includes('psicologo') || isSuperAdmin,
        isSuperAdmin,
        hasRole: (role: AppRole) => roles.includes(role) || isSuperAdmin,
        permissions,
        permissionsLoaded,
        hasPermission,
        canView,
        canCreate,
        canUpdate,
        canDelete,
        canApprove,
        canExport,
        hasAnyRole,
        assignedCenterIds,
        profile,
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

export function useOptionalAuth() {
  return useContext(AuthContext);
}
