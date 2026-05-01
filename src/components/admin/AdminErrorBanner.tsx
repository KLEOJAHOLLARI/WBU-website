import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminErrorBannerProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

const messageOf = (err: unknown): string => {
  if (!err) return "Something went wrong.";
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return "Unknown error"; }
};

const AdminErrorBanner = ({ error, onRetry, title = "Couldn't load data" }: AdminErrorBannerProps) => {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-destructive/80 break-words">{messageOf(error)}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="border-destructive/30 text-destructive hover:bg-destructive/10">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
};

export default AdminErrorBanner;
