import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  full_name: string;
  avatar_url: string | null;
  email: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isProfessor: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  /** Wait until the current auth state (including roles) has fully resolved. */
  waitForRoles: () => Promise<{ isAdmin: boolean; isProfessor: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProfessor, setIsProfessor] = useState(false);
  const [loading, setLoading] = useState(true);

  // Ref to track the latest role-resolution promise
  const rolePromiseRef = useRef<Promise<{ isAdmin: boolean; isProfessor: boolean }> | null>(null);
  const roleResolveRef = useRef<((v: { isAdmin: boolean; isProfessor: boolean }) => void) | null>(null);

  const checkRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) return { isAdmin: false, isProfessor: false };
    const roles = (data || []).map((r) => r.role);
    return { isAdmin: roles.includes("admin"), isProfessor: roles.includes("professor") };
  };

  const syncAuthState = useCallback(async (nextSession: Session | null) => {
    // Create a new role promise before we start resolving
    let resolveRoles: (v: { isAdmin: boolean; isProfessor: boolean }) => void;
    rolePromiseRef.current = new Promise((res) => { resolveRoles = res; });
    roleResolveRef.current = resolveRoles!;

    setLoading(true);
    setSession(nextSession);

    const nextUser = nextSession?.user ?? null;
    setUser(nextUser);

    if (!nextUser) {
      setIsAdmin(false);
      setIsProfessor(false);
      setProfile(null);
      setLoading(false);
      resolveRoles!({ isAdmin: false, isProfessor: false });
      return;
    }

    // Fetch roles and profile in parallel
    const [result, profileResult] = await Promise.all([
      checkRoles(nextUser.id),
      supabase
        .from("profiles")
        .select("full_name, avatar_url, email")
        .eq("user_id", nextUser.id)
        .maybeSingle(),
    ]);

    setIsAdmin(result.isAdmin);
    setIsProfessor(result.isProfessor);
    setProfile(profileResult.data ? {
      full_name: profileResult.data.full_name,
      avatar_url: profileResult.data.avatar_url,
      email: profileResult.data.email,
    } : null);
    setLoading(false);
    resolveRoles!(result);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        void syncAuthState(nextSession);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      void syncAuthState(session);
    });

    return () => subscription.unsubscribe();
  }, [syncAuthState]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsProfessor(false);
    setProfile(null);
  };

  const waitForRoles = useCallback(async () => {
    if (rolePromiseRef.current) {
      return rolePromiseRef.current;
    }
    return { isAdmin, isProfessor };
  }, [isAdmin, isProfessor]);

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, isProfessor, loading, signIn, signOut, waitForRoles }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
