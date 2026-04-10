import { useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Search, Filter, RotateCcw, CheckSquare, Square, UserCog, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const emptyCourse = { name: "", code: "", program: "", semester: 1, year: 1, professor_id: "", is_shared: false, shared_programs: [] as string[] };

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

  // Bulk selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkProfessorId, setBulkProfessorId] = useState("");
  const [showBulkReassign, setShowBulkReassign] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

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
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCourses = filteredCourses.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  const startItem = filteredCourses.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, filteredCourses.length);

  // Reset page when filters change
  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Selection helpers — operate on current page
  const allPageSelected = paginatedCourses.length > 0 && paginatedCourses.every(c => selected.has(c.id));
  const someSelected = selected.size > 0;

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        paginatedCourses.forEach(c => next.delete(c.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        paginatedCourses.forEach(c => next.add(c.id));
        return next;
      });
    }
  };

  const clearSelection = () => {
    setSelected(new Set());
    setShowBulkReassign(false);
    setBulkProfessorId("");
  };

  // Bulk mutations
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase.from("courses").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: `${selected.size} course(s) deleted` });
      clearSelection();
    },
    onError: (e: any) => toast({ title: "Error deleting courses", description: e.message, variant: "destructive" }),
  });

  const bulkReassignMutation = useMutation({
    mutationFn: async ({ ids, professorId }: { ids: string[]; professorId: string | null }) => {
      for (const id of ids) {
        const { error } = await supabase.from("courses").update({ professor_id: professorId }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      const profName = bulkProfessorId ? getProfName(bulkProfessorId) : "None";
      toast({ title: `${selected.size} course(s) reassigned to ${profName}` });
      clearSelection();
    },
    onError: (e: any) => toast({ title: "Error reassigning", description: e.message, variant: "destructive" }),
  });

  const handleBulkDelete = () => {
    if (!confirm(`Delete ${selected.size} course(s)? This cannot be undone.`)) return;
    bulkDeleteMutation.mutate([...selected]);
  };

  const handleBulkReassign = () => {
    bulkReassignMutation.mutate({
      ids: [...selected],
      professorId: bulkProfessorId || null,
    });
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
        is_shared: !!form.is_shared,
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
  const isBulkBusy = bulkDeleteMutation.isPending || bulkReassignMutation.isPending;

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
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!editing?.is_shared} onChange={(e) => setEditing({ ...editing, is_shared: e.target.checked })} className="h-4 w-4 rounded border-input accent-primary" />
                <span className="text-sm text-foreground">Shared / Common Course</span>
              </label>
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
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
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
          <select value={filterFaculty} onChange={(e) => { setFilterFaculty(e.target.value); setFilterProgram(""); setCurrentPage(1); }} className={selectCls}>
            <option value="">All Faculties</option>
            {faculties.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={filterProgram} onChange={(e) => { setFilterProgram(e.target.value); setCurrentPage(1); }} className={selectCls}>
            <option value="">All Programs</option>
            {programsByFaculty.map(p => <option key={p.slug} value={p.slug}>{p.title}</option>)}
          </select>
          <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setCurrentPage(1); }} className={selectCls}>
            <option value="">All Years</option>
            {uniqueYears.map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
          <select value={filterSemester} onChange={(e) => { setFilterSemester(e.target.value); setCurrentPage(1); }} className={selectCls}>
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

      {/* Bulk Actions Bar */}
      {someSelected && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{selected.size} course(s) selected</span>
            <button onClick={clearSelection} className="text-xs text-muted-foreground hover:text-foreground underline ml-1">
              Clear
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowBulkReassign(!showBulkReassign)}
              disabled={isBulkBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
            >
              <UserCog className="h-3.5 w-3.5" /> Reassign Professor
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Bulk Reassign Panel */}
      {showBulkReassign && someSelected && (
        <div className="mt-2 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Assign professor to {selected.size} course(s)</label>
            <select value={bulkProfessorId} onChange={(e) => setBulkProfessorId(e.target.value)} className={`${selectCls} w-full`}>
              <option value="">No Professor (unassign)</option>
              {profProfiles.map(p => <option key={p.user_id} value={p.user_id}>{p.full_name} ({p.email})</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBulkReassign}
              disabled={bulkReassignMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {bulkReassignMutation.isPending ? "Saving..." : "Apply"}
            </button>
            <button
              onClick={() => { setShowBulkReassign(false); setBulkProfessorId(""); }}
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="mt-4 overflow-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary">
            <tr>
              <th className="w-10 px-3 py-3">
                <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground">
                  {allPageSelected && paginatedCourses.length > 0
                    ? <CheckSquare className="h-4 w-4 text-primary" />
                    : <Square className="h-4 w-4" />}
                </button>
              </th>
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
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : paginatedCourses.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                {hasFilters ? "No courses match your filters." : "No courses yet."}
              </td></tr>
            ) : paginatedCourses.map((c) => (
              <tr key={c.id} className={`border-b border-border last:border-0 transition-colors ${selected.has(c.id) ? "bg-primary/5" : "hover:bg-secondary/50"}`}>
                <td className="w-10 px-3 py-3">
                  <button onClick={() => toggleSelect(c.id)} className="text-muted-foreground hover:text-foreground">
                    {selected.has(c.id)
                      ? <CheckSquare className="h-4 w-4 text-primary" />
                      : <Square className="h-4 w-4" />}
                  </button>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.code || "—"}</td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {c.name}
                  {c.is_shared && <Badge className="ml-2 bg-amber-500/15 text-amber-600 border-amber-500/25 hover:bg-amber-500/15 text-[10px]">Shared</Badge>}
                </td>
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

      {/* Pagination */}
      {filteredCourses.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{startItem}–{endItem} of {filteredCourses.length}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {[10, 15, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(1)} disabled={safeCurrentPage <= 1} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40">
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage <= 1} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm text-foreground">
              Page {safeCurrentPage} of {totalPages}
            </span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage >= totalPages} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage >= totalPages} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40">
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCourses;
