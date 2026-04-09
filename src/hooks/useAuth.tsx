import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isProfessor: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProfessor, setIsProfessor] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      setIsAdmin(false);
      setIsProfessor(false);
      return;
    }

    const roles = (data || []).map((r) => r.role);
    setIsAdmin(roles.includes("admin"));
    setIsProfessor(roles.includes("professor"));
  };

  const syncAuthState = async (nextSession: Session | null) => {
    setLoading(true);
    setSession(nextSession);

    const nextUser = nextSession?.user ?? null;
    setUser(nextUser);

    if (!nextUser) {
      setIsAdmin(false);
      setIsProfessor(false);
      setLoading(false);
      return;
    }

    await checkRoles(nextUser.id);
    setLoading(false);
  };

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
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsProfessor(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, isAdmin, isProfessor, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
