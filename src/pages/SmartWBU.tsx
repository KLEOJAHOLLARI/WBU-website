import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const SmartWBU = () => {
  const { user, isAdmin, isProfessor, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) {
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (isProfessor) return <Navigate to="/professor" replace />;
    return <Navigate to="/portal" replace />;
  }

  return <Navigate to="/portal/login" replace />;
};

export default SmartWBU;
