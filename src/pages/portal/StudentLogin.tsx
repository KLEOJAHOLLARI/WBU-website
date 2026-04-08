import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const StudentLogin = () => {
  const { user, isAdmin, isProfessor, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  if (user && isProfessor) return <Navigate to="/professor" replace />;
  if (user && isAdmin) return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/portal" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError("Invalid credentials. Please try again.");
      setSubmitting(false);
      return;
    }

    // Check account status
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: profile } = await supabase.from("profiles").select("account_status").eq("user_id", currentUser.id).maybeSingle();
      if (profile && profile.account_status !== "approved") {
        await supabase.auth.signOut();
        if (profile.account_status === "pending") {
          setError("Your account is pending admin approval. Please wait.");
        } else {
          setError("Your account has been rejected. Please contact administration.");
        }
        setSubmitting(false);
        return;
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-6 text-center">
          <GraduationCap className="mx-auto mb-2 h-10 w-10 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">Student Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your student account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="student@example.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Password</label>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="••••••••" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-60">
            <LogIn className="h-4 w-4" />
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/portal/register" className="font-medium text-primary hover:underline">Register here</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default StudentLogin;
