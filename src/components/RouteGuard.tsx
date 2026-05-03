import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Loader2, Lock, ShieldAlert } from "lucide-react";

type Role = "student" | "professor";

interface Props {
  children: ReactNode;
  requireRole: Role;
}

const FriendlyBlock = ({
  icon,
  title,
  message,
  actions,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  actions: ReactNode;
}) => (
  <Layout>
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>
    </div>
  </Layout>
);

const RouteGuard = ({ children, requireRole }: Props) => {
  const { user, isProfessor, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    const loginPath = requireRole === "professor" ? "/portal/login" : "/portal/login";
    return (
      <FriendlyBlock
        icon={<Lock className="h-6 w-6" />}
        title="Sign in required"
        message={
          requireRole === "professor"
            ? "Please sign in with your professor account to access this page."
            : "Please sign in to your student account to access this page."
        }
        actions={
          <>
            <Link
              to={`${loginPath}?redirect=${encodeURIComponent(location.pathname)}`}
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </Link>
            <Link
              to="/"
              className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Go home
            </Link>
          </>
        }
      />
    );
  }

  // Role check (admins are allowed everywhere)
  const allowed =
    isAdmin ||
    (requireRole === "professor" ? isProfessor : !isProfessor);

  if (!allowed) {
    return (
      <FriendlyBlock
        icon={<ShieldAlert className="h-6 w-6" />}
        title="Access denied"
        message={
          requireRole === "professor"
            ? "This area is reserved for faculty members. Your account does not have professor access."
            : "This area is for students. Your account does not have student access."
        }
        actions={
          <>
            <Link
              to={isProfessor ? "/professor" : "/portal"}
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Go to my portal
            </Link>
            <Link
              to="/"
              className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Go home
            </Link>
          </>
        }
      />
    );
  }

  return <>{children}</>;
};

export default RouteGuard;
