import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface TimetableEntry {
  id: string;
  program: string;
  year: number;
  semester: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  course_name: string;
  professor_name: string;
  room: string;
}

const emptyForm = {
  program: "",
  year: 1,
  semester: 1,
  day_of_week: "Monday",
  start_time: "09:00",
  end_time: "10:30",
  course_name: "",
  professor_name: "",
  room: "",
};

const AdminTimetable = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["admin-timetable"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_entries")
        .select("*")
        .order("program")
        .order("year")
        .order("semester")
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data as TimetableEntry[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("timetable_entries").update(form).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("timetable_entries").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-timetable"] });
      toast({ title: editingId ? "Entry updated" : "Entry created" });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: () => toast({ title: "Error saving entry", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("timetable_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-timetable"] });
      toast({ title: "Entry deleted" });
    },
  });

  const openEdit = (entry: TimetableEntry) => {
    setForm({
      program: entry.program,
      year: entry.year,
      semester: entry.semester,
      day_of_week: entry.day_of_week,
      start_time: entry.start_time,
      end_time: entry.end_time,
      course_name: entry.course_name,
      professor_name: entry.professor_name,
      room: entry.room,
    });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  const parseExcelAndUpload = async (file: File) => {
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        toast({ title: "Empty spreadsheet", variant: "destructive" });
        setUploading(false);
        return;
      }

      const normalize = (key: string) => key.toLowerCase().replace(/[\s_-]+/g, "");
      const findCol = (row: any, candidates: string[]) => {
        for (const k of Object.keys(row)) {
          if (candidates.includes(normalize(k))) return row[k];
        }
        return "";
      };

      const entries = rows.map((row) => ({
        program: String(findCol(row, ["program"]) || ""),
        year: parseInt(findCol(row, ["year"]) || "1") || 1,
        semester: parseInt(findCol(row, ["semester"]) || "1") || 1,
        day_of_week: String(findCol(row, ["day", "dayofweek"]) || "Monday"),
        start_time: String(findCol(row, ["starttime", "start"]) || "09:00"),
        end_time: String(findCol(row, ["endtime", "end"]) || "10:30"),
        course_name: String(findCol(row, ["course", "coursename", "subject"]) || ""),
        professor_name: String(findCol(row, ["professor", "professorname", "teacher", "instructor"]) || ""),
        room: String(findCol(row, ["room", "classroom", "hall"]) || ""),
      })).filter((e) => e.course_name && e.program);

      if (entries.length === 0) {
        toast({ title: "No valid rows found", description: "Ensure columns: program, course, day, start_time, end_time", variant: "destructive" });
        setUploading(false);
        return;
      }

      const { error } = await supabase.from("timetable_entries").insert(entries);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-timetable"] });
      toast({ title: `${entries.length} entries imported from Excel!` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseExcelAndUpload(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseExcelAndUpload(file);
    e.target.value = "";
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Timetable</h1>
          <p className="text-sm text-muted-foreground">Manage class schedules</p>
        </div>
        <div className="flex gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
            <Upload className="h-4 w-4" /> Import Excel
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
          </label>
          <button
            onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Add Entry
          </button>
        </div>
      </div>

      {/* Drag-and-drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <FileSpreadsheet className={`mb-2 h-8 w-8 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
        <p className="text-sm text-muted-foreground">
          {uploading ? "Importing..." : "Drag & drop an Excel file here to bulk-import timetable entries"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Required columns: program, course, day, start_time, end_time. Optional: professor, room, year, semester
        </p>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {editingId ? "Edit Entry" : "New Entry"}
            </h2>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Program</label>
              <input required value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} className={inputClass} placeholder="e.g. Computer Science" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Year</label>
              <select value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} className={inputClass}>
                {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Semester</label>
              <select value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })} className={inputClass}>
                {[1, 2].map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Day</label>
              <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })} className={inputClass}>
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Start Time</label>
              <input required type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">End Time</label>
              <input required type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Course</label>
              <input required value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} className={inputClass} placeholder="e.g. Data Structures" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Professor</label>
              <input value={form.professor_name} onChange={(e) => setForm({ ...form, professor_name: e.target.value })} className={inputClass} placeholder="e.g. Dr. Smith" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Room</label>
              <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className={inputClass} placeholder="e.g. A-201" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <button type="submit" disabled={saveMutation.isPending} className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 overflow-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-foreground">Program</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Yr/Sem</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Day</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Time</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Course</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Professor</th>
              <th className="px-4 py-3 text-left font-medium text-foreground">Room</th>
              <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No timetable entries yet</td></tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{e.program}</td>
                  <td className="px-4 py-3 text-muted-foreground">Y{e.year}/S{e.semester}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.day_of_week}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.start_time}–{e.end_time}</td>
                  <td className="px-4 py-3 text-foreground">{e.course_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.professor_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.room}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(e)} className="mr-2 rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(e.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminTimetable;
