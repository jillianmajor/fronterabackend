import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "admin" | "internal_staff" | "client_user" | "provider_user";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  states_licensed: string | null;
  facility_name: string | null;
  facility_location: string | null;
  portal_type: string | null;
  employment_type?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isInternalStaff: boolean;
  isClient: boolean;
  isProvider: boolean;
  portalType: string | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  /** When set, profile/roles are already loaded — skip full-page loading on TOKEN_REFRESHED. */
  const hydratedUserIdRef = useRef<string | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data as Profile | null);
  };

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles((data || []).map((r: { role: AppRole }) => r.role));
  };

  const loadUserData = async (userId: string, blockUi = true) => {
    if (blockUi) {
      setLoading(true);
    }
    await Promise.all([fetchProfile(userId), fetchRoles(userId)]);
    hydratedUserIdRef.current = userId;
    if (blockUi) {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserData(user.id);
    }
  };

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // TOKEN_REFRESHED on tab focus must not unmount portal pages (e.g. half-filled forms).
          const blockUi = hydratedUserIdRef.current !== session.user.id;
          setTimeout(() => {
            void loadUserData(session.user.id, blockUi);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          hydratedUserIdRef.current = null;
          setLoading(false);
        }
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        void loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Log failed attempt
      try {
        await supabase.rpc("log_audit", {
          _user_id: null,
          _action: "login_failed" as any,
          _resource_type: "auth",
          _resource_id: null,
          _details: { email },
        });
      } catch {
        // best effort audit logging
      }
      return { error: error as Error | null };
    }

    if (data.session?.user) {
      setSession(data.session);
      setUser(data.session.user);
      await loadUserData(data.session.user.id);
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, string>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: metadata,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    hydratedUserIdRef.current = null;
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        signIn,
        signUp,
        signOut,
        hasRole,
        isAdmin: hasRole("admin"),
        isInternalStaff: hasRole("internal_staff"),
        isClient: hasRole("client_user"),
        isProvider: hasRole("provider_user"),
        portalType: profile?.portal_type ?? null,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
