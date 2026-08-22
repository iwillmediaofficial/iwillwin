import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AdminProfile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  adminProfile: AdminProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const isCheckingRef = useRef(false);

  const fetchAdminProfile = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setAdminProfile(null);
      setIsAdmin(false);
      return false;
    }

    if (isCheckingRef.current) return false;
    isCheckingRef.current = true;

    try {
      // 1. Direct query from admin_profiles
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (data && !error) {
        setAdminProfile(data as AdminProfile);
        setIsAdmin(true);
        return true;
      }

      // 2. If table is empty or first user, check is_admin() RPC
      const { data: isAdm } = await supabase.rpc('is_admin');
      if (isAdm) {
        setIsAdmin(true);
        return true;
      }

      // 3. Fallback auto-link
      const { data: newProf, error: insErr } = await supabase
        .from('admin_profiles')
        .insert({
          auth_user_id: authUser.id,
          email: authUser.email || '',
          role: 'admin',
        })
        .select()
        .maybeSingle();

      if (newProf && !insErr) {
        setAdminProfile(newProf as AdminProfile);
        setIsAdmin(true);
        return true;
      } else {
        setIsAdmin(false);
        return false;
      }
    } catch (err) {
      console.error('Error verifying admin permissions:', err);
      setIsAdmin(false);
      return false;
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Initial session retrieval
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        fetchAdminProfile(currentSession.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      // Avoid refetching on simple token refresh if user is already established
      if (event === 'TOKEN_REFRESHED' && user?.id === newSession?.user?.id) {
        setSession(newSession);
        return;
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchAdminProfile(newSession.user);
      } else {
        setAdminProfile(null);
        setIsAdmin(false);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchAdminProfile, user?.id]);

  const signInWithPassword = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error };
      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchAdminProfile(data.user);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUpWithPassword = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) return { error };
      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchAdminProfile(data.user);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setAdminProfile(null);
    setIsAdmin(false);
  };

  const refreshAdminStatus = async () => {
    if (user) {
      await fetchAdminProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        adminProfile,
        isAdmin,
        loading,
        signInWithPassword,
        signUpWithPassword,
        signOut,
        refreshAdminStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
