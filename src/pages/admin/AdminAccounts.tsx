import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, UserPlus, Shield, BookOpen, GraduationCap } from "lucide-react";

type TabType = "professors" | "students" | "create";

const AdminAccounts = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabType>("professors");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", phone: "", role: "professor" as string });

  // Fetch all profiles with roles
  const { data: allRoles = [] } = useQuery({
    queryKey: ["admin-all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getRoles = (userId: string) => allRoles.filter(r => r.user_id === userId).map(r => r.role);

  const professorProfiles = profiles.filter(p => getRoles(p.user_id).includes("professor"));
  const studentProfiles = profiles.filter(p => {
    const roles = getRoles(p.user_id);
    return roles.includes("user") || roles.length === 0;
  });

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.full_name) return;
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-create-user", {
        body: { email: form.email, password: form.password, full_name: form.full_name, phone: form.phone, role: form.role },
      });
      if (res.error) throw new Error(res.error.message || "Failed to create user");
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: `${form.role === "professor" ? "Professor" : "Student"} account created!` });
      setForm({ email: "", password: "", full_name: "", phone: "", role: form.role });
      qc.invalidateQueries({ queryKey: ["admin-all-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-all-roles"] });
    } catch (err: any) {
      toast({ title: "Error creating account", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const tabCls = (t: TabType) => `px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`;

  const renderList = (list: typeof profiles, roleLabel: string) => (
    <div className="mt-4 overflow-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-secondary">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-foreground">Email</th>
            <th className="px-4 py-3 text-left font-medium text-foreground">Phone</th>
            <th className="px-4 py-3 text-left font-medium text-foreground">Roles</th>
            <th className="px-4 py-3 text-left font-medium text-foreground">Joined</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No {roleLabel}s yet.</td></tr>
          ) : list.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium text-foreground">{p.full_name || "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
              <td className="px-4 py-3 text-muted-foreground">{p.phone || "—"}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {getRoles(p.user_id).map(r => (
                    <span key={r} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{r}</span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Account Management</h1>
          <p className="text-sm text-muted-foreground">Create and manage professor & student accounts</p>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <button onClick={() => setTab("professors")} className={tabCls("professors")}>
          <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> Professors ({professorProfiles.length})</span>
        </button>
        <button onClick={() => setTab("students")} className={tabCls("students")}>
          <span className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Students ({studentProfiles.length})</span>
        </button>
        <button onClick={() => setTab("create")} className={tabCls("create")}>
          <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Create Account</span>
        </button>
      </div>

      {tab === "professors" && (
        <div>
          <h2 className="mt-4 font-display text-lg font-semibold text-foreground">Professor Accounts</h2>
          {isLoading ? <p className="mt-4 text-muted-foreground">Loading...</p> : renderList(professorProfiles, "professor")}
        </div>
      )}

      {tab === "students" && (
        <div>
          <h2 className="mt-4 font-display text-lg font-semibold text-foreground">Student Accounts</h2>
          {isLoading ? <p className="mt-4 text-muted-foreground">Loading...</p> : renderList(studentProfiles, "student")}
        </div>
      )}

      {tab === "create" && (
        <div className="mt-4 max-w-lg rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Create New Account</h2>
          <form onSubmit={createUser} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
                <option value="professor">Professor</option>
                <option value="user">Student</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Full Name</label>
              <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputCls} placeholder="Dr. John Smith" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="john@university.edu" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Password</label>
              <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} placeholder="Min 6 characters" minLength={6} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Phone (optional)</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="+355 ..." />
            </div>
            <button type="submit" disabled={creating} className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              <UserPlus className="h-4 w-4" />
              {creating ? "Creating..." : "Create Account"}
            </button>
          </form>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAccounts;
