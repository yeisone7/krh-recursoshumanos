import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserCompany {
  id: string;
  name: string;
  nit: string;
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
  hasRole: (role: AppRole) => boolean;
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

  const fetchUserData = async (userId: string) => {
    // Fetch user roles
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
        setCurrentCompanyId(userCompanies[0].id);
      }
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer data fetching with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setRoles([]);
          setCompanies([]);
          setCurrentCompanyId(null);
        }
      }
    );

    // THEN check for existing session
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

  const hasRole = (role: AppRole): boolean => roles.includes(role);
  const isAdmin = hasRole('admin');
  const isRRHH = hasRole('rrhh');
  const isAuditor = hasRole('auditor');
  const isPsicologo = hasRole('psicologo');

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
        hasRole,
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
