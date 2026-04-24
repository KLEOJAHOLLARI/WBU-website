import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, UserPlus, Shield, GraduationCap } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TabType = "professors" | "students" | "create";

type ProfileRow = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  program: string | null;
  current_year: number;
  current_semester: number;
  account_status: string;
  has_scholarship: boolean;
  scholarship_percentage: number;
  student_id: string | null;
  created_at: string;
};

type EditForm = {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  program: string;
  current_year: number;
  current_semester: number;
  account_status: string;
  has_scholarship: boolean;
  scholarship_percentage: number;
};

const AdminAccounts = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabType>("professors");
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", phone: "", role: "professor" as string });
  const [deleteTarget, setDeleteTarget] = useState<{ user_id: string; name: string } | null>(null);
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

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
      return data as ProfileRow[];
    },
  });

  const getRoles = (userId: string) => allRoles.filter(r => r.user_id === userId).map(r => r.role);

  const professorProfiles = profiles.filter(p => getRoles(p.user_id).includes("professor"));
  const studentProfiles = profiles.filter(p => {
    const roles = getRoles(p.user_id);
    return roles.includes("user") || roles.length === 0;
  });

  const programOptions = Array.from(new Set(studentProfiles.map(p => p.program).filter(Boolean) as string[])).sort();
  const statusOptions = Array.from(new Set(profiles.map(p => p.account_status).filter(Boolean))).sort();

  const applyFilters = (list: ProfileRow[], includeStudentFilters: boolean) => {
    const q = search.trim().toLowerCase();
    return list.filter(p => {
      if (q) {
        const hay = `${p.full_name || ""} ${p.email || ""} ${p.phone || ""} ${p.program || ""} ${p.student_id || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (includeStudentFilters && programFilter !== "all" && (p.program || "") !== programFilter) return false;
      if (statusFilter !== "all" && p.account_status !== statusFilter) return false;
      return true;
    });
  };

  const filteredProfessors = applyFilters(professorProfiles, false);
  const filteredStudents = applyFilters(studentProfiles, true);

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId },
      });
      if (res.error) throw new Error(res.error.message || "Failed to delete user");
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-all-roles"] });
      toast({ title: "User deleted successfully" });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "Error deleting user", description: err.message, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.full_name) return;
    setCreating(true);
    try {
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

  const openEdit = (p: ProfileRow) => {
    setEditing({
      user_id: p.user_id,
      full_name: p.full_name || "",
      email: p.email || "",
      phone: p.phone || "",
      program: p.program || "",
      current_year: p.current_year ?? 1,
      current_semester: p.current_semester ?? 1,
      account_status: p.account_status || "pending",
      has_scholarship: !!p.has_scholarship,
      scholarship_percentage: p.scholarship_percentage ?? 0,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editing.full_name,
          email: editing.email,
          phone: editing.phone || null,
          program: editing.program || null,
          current_year: Number(editing.current_year) || 1,
          current_semester: Number(editing.current_semester) || 1,
          account_status: editing.account_status,
          has_scholarship: editing.has_scholarship,
          scholarship_percentage: Number(editing.scholarship_percentage) || 0,
        })
        .eq("user_id", editing.user_id);
      if (error) throw error;
      toast({ title: "Account updated" });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-all-profiles"] });
    } catch (err: any) {
      toast({ title: "Error updating account", description: err.message, variant: "destructive" });
    }
    setSavingEdit(false);
  };

  const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const tabCls = (t: TabType) => `px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`;

  const isStudentTab = tab === "students";

  const renderList = (list: ProfileRow[], roleLabel: string) => (
    <div className="mt-4 overflow-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-secondary">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-foreground">Email</th>
            <th className="px-4 py-3 text-left font-medium text-foreground">Phone</th>
            {isStudentTab && <th className="px-4 py-3 text-left font-medium text-foreground">Program</th>}
            {isStudentTab && <th className="px-4 py-3 text-left font-medium text-foreground">Year/Sem</th>}
            {isStudentTab && <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>}
            <th className="px-4 py-3 text-left font-medium text-foreground">Roles</th>
            <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan={isStudentTab ? 8 : 5} className="px-4 py-8 text-center text-muted-foreground">No {roleLabel}s yet.</td></tr>
          ) : list.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium text-foreground">{p.full_name || "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
              <td className="px-4 py-3 text-muted-foreground">{p.phone || "—"}</td>
              {isStudentTab && <td className="px-4 py-3 text-muted-foreground">{p.program || "—"}</td>}
              {isStudentTab && <td className="px-4 py-3 text-muted-foreground">Y{p.current_year}/S{p.current_semester}</td>}
              {isStudentTab && (
                <td className="px-4 py-3">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground capitalize">{p.account_status}</span>
                </td>
              )}
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {getRoles(p.user_id).map(r => (
                    <span key={r} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{r}</span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Edit user"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ user_id: p.user_id, name: p.full_name || p.email })}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete user"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
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
          <p className="text-sm text-muted-foreground">Create, edit and manage professor & student accounts</p>
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

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>Update profile information for this user.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-foreground">Full Name</label>
                <input value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
                <input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Phone</label>
                <input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Program (slug)</label>
                <input value={editing.program} onChange={(e) => setEditing({ ...editing, program: e.target.value })} className={inputCls} placeholder="e.g. computer-science" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Account Status</label>
                <select value={editing.account_status} onChange={(e) => setEditing({ ...editing, account_status: e.target.value })} className={inputCls}>
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Current Year</label>
                <input type="number" min={1} max={6} value={editing.current_year} onChange={(e) => setEditing({ ...editing, current_year: Number(e.target.value) })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Current Semester</label>
                <input type="number" min={1} max={2} value={editing.current_semester} onChange={(e) => setEditing({ ...editing, current_semester: Number(e.target.value) })} className={inputCls} />
              </div>
              <div className="flex items-center gap-2">
                <input id="has_scholarship" type="checkbox" checked={editing.has_scholarship} onChange={(e) => setEditing({ ...editing, has_scholarship: e.target.checked })} className="h-4 w-4" />
                <label htmlFor="has_scholarship" className="text-sm font-medium text-foreground">Has Scholarship</label>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Scholarship %</label>
                <input type="number" min={0} max={100} value={editing.scholarship_percentage} onChange={(e) => setEditing({ ...editing, scholarship_percentage: Number(e.target.value) })} className={inputCls} />
              </div>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => setEditing(null)} disabled={savingEdit} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">Cancel</button>
            <button onClick={saveEdit} disabled={savingEdit} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{savingEdit ? "Saving..." : "Save changes"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteTarget?.name}</strong>? This will remove their account, profile, enrollments, and all related data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.user_id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminAccounts;
