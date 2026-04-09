import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, Trash2, Plus } from "lucide-react";

const AdminAdvisors = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedAdvisor, setSelectedAdvisor] = useState("");

  const { data: programs = [] } = useQuery({
    queryKey: ["admin-programs-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("slug, title").order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: profProfiles = [] } = useQuery({
    queryKey: ["admin-prof-profiles"],
    queryFn: async () => {
      const { data: roles, error: roleError } = await supabase.from("user_roles").select("user_id").eq("role", "professor");
      if (roleError) throw roleError;
      if (!roles || roles.length === 0) return [];
      const userIds = roles.map((r) => r.user_id);
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds).order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: advisors = [], isLoading } = useQuery({
    queryKey: ["admin-advisors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("program_advisors").select("*").order("program");
      if (error) throw error;
      return data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ program, advisor_id }: { program: string; advisor_id: string }) => {
      // Upsert - one advisor per program
      const existing = advisors.find((a) => a.program === program);
      if (existing) {
        const { error } = await supabase.from("program_advisors").update({ advisor_id }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("program_advisors").insert({ program, advisor_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-advisors"] });
      setSelectedProgram("");
      setSelectedAdvisor("");
      toast({ title: "Advisor assigned!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("program_advisors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-advisors"] });
      toast({ title: "Advisor removed" });
    },
  });

  const getProfName = (uid: string) => {
    const p = profProfiles.find((pr) => pr.user_id === uid);
    return p?.full_name || uid.slice(0, 8);
  };

  const getProgramTitle = (slug: string) => {
    const p = programs.find((pr) => pr.slug === slug);
    return p?.title || slug;
  };

  const inputCls = "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Academic Advisors</h1>
          <p className="text-sm text-muted-foreground">Assign professors as academic advisors per program</p>
        </div>
      </div>

      {/* Assign form */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Assign Advisor</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs text-muted-foreground">Program</label>
            <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)} className={inputCls + " w-full"}>
              <option value="">Select Program</option>
              {programs.map((p) => (
                <option key={p.slug} value={p.slug}>{p.title}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs text-muted-foreground">Professor (Advisor)</label>
            <select value={selectedAdvisor} onChange={(e) => setSelectedAdvisor(e.target.value)} className={inputCls + " w-full"}>
              <option value="">Select Professor</option>
              {profProfiles.map((p) => (
                <option key={p.user_id} value={p.user_id}>{p.full_name} ({p.email})</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              if (selectedProgram && selectedAdvisor) {
                assignMutation.mutate({ program: selectedProgram, advisor_id: selectedAdvisor });
              }
            }}
            disabled={!selectedProgram || !selectedAdvisor || assignMutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Assign
          </button>
        </div>
      </div>

      {/* Current advisors */}
      <div className="mt-6 overflow-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground">Program</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Academic Advisor</th>
              <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : advisors.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No advisors assigned yet.</td></tr>
            ) : advisors.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{getProgramTitle(a.program)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-primary" />
                    {getProfName(a.advisor_id)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => { if (confirm("Remove this advisor?")) removeMutation.mutate(a.id); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminAdvisors;
