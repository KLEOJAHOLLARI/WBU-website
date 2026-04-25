import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut, History } from "lucide-react";

export default function StudentAccessHistory() {
  const { user } = useAuth();

  const { data: logs = [] } = useQuery({
    queryKey: ["my-access-logs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_logs")
        .select("*")
        .eq("user_id", user!.id)
        .order("scanned_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const lastIn = logs.find((l: any) => l.action === "check_in" && l.status === "success");
  const lastOut = logs.find((l: any) => l.action === "check_out" && l.status === "success");

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">My Access History</h1>
          <p className="text-sm text-muted-foreground">Your campus check-in and check-out activity.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <LogIn className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Check-in</p>
                <p className="text-sm font-medium">{lastIn ? new Date(lastIn.scanned_at).toLocaleString() : "—"}</p>
                {lastIn && <p className="text-xs text-muted-foreground">{lastIn.gate_name}</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Check-out</p>
                <p className="text-sm font-medium">{lastOut ? new Date(lastOut.scanned_at).toLocaleString() : "—"}</p>
                {lastOut && <p className="text-xs text-muted-foreground">{lastOut.gate_name}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {logs.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No scans yet.</p>}
            {logs.map((l: any) => {
              const isIn = l.action === "check_in";
              return (
                <div key={l.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isIn ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                      {isIn ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{isIn ? "Check In" : "Check Out"} · <span className="text-muted-foreground">{l.gate_name}</span></p>
                      <p className="text-xs text-muted-foreground">{new Date(l.scanned_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">{l.card_type}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
