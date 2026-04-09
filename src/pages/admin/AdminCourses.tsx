import { useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Search, Filter, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const emptyCourse = { name: "", code: "", program: "", semester: 1, year: 1, professor_id: "" };

const AdminCourses = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [filterProgram, setFilterProgram] = useState("");
  const [filterFaculty, setFilterFaculty] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSemester, setFilterSemester] = useState("");

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("program").order("year").order("semester");
      if (error) throw error;
      return data;
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["admin-programs-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("slug, title, faculty").order("title");
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
      const userIds = roles.map(r => r.user_id);
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds).order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  // Derived data
  const faculties = useMemo(() => {
    const set = new Set(programs.map(p => p.faculty).filter(Boolean));
    return [...set].sort();
  }, [programs]);

  const programsByFaculty = useMemo(() => {
    if (!filterFaculty) return programs;
    return programs.filter(p => p.faculty === filterFaculty);
  }, [programs, filterFaculty]);

  const uniqueYears = useMemo(() => {
    const set = new Set(courses.map(c => c.year));
    return [...set].sort((a, b) => a - b);
  }, [courses]);

  const uniqueSemesters = useMemo(() => {
    const set = new Set(courses.map(c => c.semester));
    return [...set].sort((a, b) => a - b);
  }, [courses]);

  const getProgramFaculty = (programSlug: string) => {
    return programs.find(p => p.slug === programSlug)?.faculty || "";
  };

  const getProgramTitle = (programSlug: string) => {
    return programs.find(p => p.slug === programSlug)?.title || programSlug;
  };

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q)) return false;
      }
      if (filterProgram && c.program !== filterProgram) return false;
      if (filterFaculty && getProgramFaculty(c.program) !== filterFaculty) return false;
      if (filterYear && c.year !== parseInt(filterYear)) return false;
      if (filterSemester && c.semester !== parseInt(filterSemester)) return false;
      return true;
    });
  }, [courses, search, filterProgram, filterFaculty, filterYear, filterSemester, programs]);

  const hasFilters = search || filterProgram || filterFaculty || filterYear || filterSemester;

  const clearFilters = () => {
    setSearch("");
    setFilterProgram("");
    setFilterFaculty("");
    setFilterYear("");
    setFilterSemester("");
  };

  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        name: form.name,
        code: form.code || "",
        program: form.program,
        semester: parseInt(form.semester) || 1,
        year: parseInt(form.year) || 1,
        professor_id: form.professor_id || null,
      };
      if (form.id) {
        const { error } = await supabase.from("courses").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      setShowForm(false);
      setEditing(null);
      toast({ title: "Course saved!" });
    },
    onError: (e: any) => toast({ title: "Error saving course", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Course deleted" });
    },
  });

  const openEdit = (c: any) => { setEditing({ ...c }); setShowForm(true); };
  const openNew = () => { setEditing({ ...emptyCourse }); setShowForm(true); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); saveMutation.mutate(editing); };

  const getProfName = (profId: string | null) => {
    if (!profId) return "—";
    const prof = profProfiles.find(p => p.user_id === profId);
    return prof?.full_name || profId.slice(0, 8);
  };

  const inputCls = "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const selectCls = "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring h-9";

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Courses</h1>
          <p className="text-sm text-muted-foreground">Manage courses and assign professors</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Course
        </button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">{editing?.id ? "Edit" : "New"} Course</h2>
            <button onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input required placeholder="Course Name" value={editing?.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputCls} />
              <input placeholder="Course Code (e.g. CS101)" value={editing?.code || ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} className={inputCls} />
              <select required value={editing?.program || ""} onChange={(e) => setEditing({ ...editing, program: e.target.value })} className={inputCls}>
                <option value="">Select Program</option>
                {programs.map(p => <option key={p.slug} value={p.slug}>{p.title}</option>)}
              </select>
              <select value={editing?.professor_id || ""} onChange={(e) => setEditing({ ...editing, professor_id: e.target.value })} className={inputCls}>
                <option value="">No Professor Assigned</option>
                {profProfiles.map(p => <option key={p.user_id} value={p.user_id}>{p.full_name} ({p.email})</option>)}
              </select>
              <input type="number" min={1} placeholder="Year" value={editing?.year ?? 1} onChange={(e) => setEditing({ ...editing, year: e.target.value })} className={inputCls} />
              <input type="number" min={1} placeholder="Semester" value={editing?.semester ?? 1} onChange={(e) => setEditing({ ...editing, semester: e.target.value })} className={inputCls} />
            </div>
            <button type="submit" disabled={saveMutation.isPending} className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {saveMutation.isPending ? "Saving..." : "Save Course"}
            </button>
          </form>
        </div>
      )}

      {/* Search & Filters */}
      <div className="mt-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls} w-full pl-9`}
            />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              <RotateCcw className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={filterFaculty} onChange={(e) => { setFilterFaculty(e.target.value); setFilterProgram(""); }} className={selectCls}>
            <option value="">All Faculties</option>
            {faculties.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} className={selectCls}>
            <option value="">All Programs</option>
            {programsByFaculty.map(p => <option key={p.slug} value={p.slug}>{p.title}</option>)}
          </select>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={selectCls}>
            <option value="">All Years</option>
            {uniqueYears.map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
          <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className={selectCls}>
            <option value="">All Semesters</option>
            {uniqueSemesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>

        {/* Results summary */}
        {hasFilters && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Showing {filteredCourses.length} of {courses.length} courses</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground">Code</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Faculty</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Program</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Y/S</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Professor</th>
              <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : filteredCourses.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                {hasFilters ? "No courses match your filters." : "No courses yet."}
              </td></tr>
            ) : filteredCourses.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.code || "—"}</td>
                <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs font-normal">{getProgramFaculty(c.program) || "—"}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{getProgramTitle(c.program)}</td>
                <td className="px-4 py-3 text-muted-foreground">Y{c.year}/S{c.semester}</td>
                <td className="px-4 py-3 text-muted-foreground">{getProfName(c.professor_id)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(c)} className="mr-2 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm("Delete this course?")) deleteMutation.mutate(c.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminCourses;
