import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AdminProfile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  adminProfile: AdminProfile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isClient: boolean;
  assignedCampaignIds: string[];
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [assignedCampaignIds, setAssignedCampaignIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // In-flight promise tracker to deduplicate concurrent profile requests
  const inFlightCheckRef = useRef<Promise<boolean> | null>(null);

  const fetchAdminProfile = useCallback(async (authUser: User | null): Promise<boolean> => {
    if (!authUser) {
      setAdminProfile(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setIsClient(false);
      setAssignedCampaignIds([]);
      return false;
    }

    if (inFlightCheckRef.current) {
      return inFlightCheckRef.current;
    }

    const checkPromise = (async () => {
      try {
        // 1. Fetch profile from admin_profiles
        const { data, error } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();

        if (data && !error) {
          const profile = data as AdminProfile;
          setAdminProfile(profile);
          setIsAdmin(true);
          setIsSuperAdmin(profile.role === 'super_admin');
          setIsClient(profile.role === 'client');

          // If client role, fetch their assigned campaigns
          if (profile.role === 'client') {
            const { data: assignments } = await supabase
              .from('campaign_user_assignments')
              .select('campaign_id')
              .eq('user_id', authUser.id);

            setAssignedCampaignIds(
              (assignments || []).map((a: { campaign_id: string }) => a.campaign_id)
            );
          } else {
            setAssignedCampaignIds([]);
          }

          return true;
        }

        // 2. Fallback check is_admin_or_client RPC
        const { data: hasAccess } = await supabase.rpc('is_admin_or_client');
        if (hasAccess) {
          setIsAdmin(true);
          const { data: isSuper } = await supabase.rpc('is_super_admin');
          setIsSuperAdmin(Boolean(isSuper));
          setIsClient(!isSuper);
          return true;
        }

        setAdminProfile(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsClient(false);
        setAssignedCampaignIds([]);
        return false;
      } catch (err) {
        console.error('Error fetching admin permissions:', err);
        setAdminProfile(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsClient(false);
        setAssignedCampaignIds([]);
        return false;
      } finally {
        inFlightCheckRef.current = null;
      }
    })();

    inFlightCheckRef.current = checkPromise;
    return checkPromise;
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await fetchAdminProfile(currentSession.user);
      }
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

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
        setIsSuperAdmin(false);
        setIsClient(false);
        setAssignedCampaignIds([]);
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
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        return { error };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        const hasAccess = await fetchAdminProfile(data.user);
        setLoading(false);

        if (!hasAccess) {
          return { error: new Error('Your account does not have access to the Admin Portal.') };
        }
      }

      setLoading(false);
      return { error: null };
    } catch (err: any) {
      setLoading(false);
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setAdminProfile(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setIsClient(false);
    setAssignedCampaignIds([]);
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
        isSuperAdmin,
        isClient,
        assignedCampaignIds,
        loading,
        signInWithPassword,
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
