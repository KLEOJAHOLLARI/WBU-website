import { useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Download, FileText, GraduationCap, Award, BookOpen, Search, User } from "lucide-react";

const gradeToLetter = (grade: number): string => {
  if (grade >= 90) return "A";
  if (grade >= 80) return "B";
  if (grade >= 70) return "C";
  if (grade >= 60) return "D";
  return "F";
};

const gradeToGPA = (grade: number): number => {
  if (grade >= 90) return 4.0;
  if (grade >= 80) return 3.0;
  if (grade >= 70) return 2.0;
  if (grade >= 60) return 1.0;
  return 0.0;
};

interface TranscriptRow {
  courseName: string;
  courseCode: string;
  semester: number;
  year: number;
  ects: number;
  grade: number | null;
  status: "Passed" | "Failed" | "In Progress";
}

const AdminTranscripts = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");

  // Fetch all students
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["admin-transcript-students"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "user");
      if (!roles || roles.length === 0) return [];
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, program")
        .in("user_id", userIds)
        .order("full_name");
      return profiles || [];
    },
  });

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const q = searchTerm.toLowerCase();
    return students.filter(
      (s) => s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    );
  }, [students, searchTerm]);

  const selectedStudent = students.find((s) => s.user_id === selectedUserId);

  // Fetch transcript data for selected student
  const { data: transcriptData, isLoading: loadingTranscript } = useQuery({
    queryKey: ["admin-student-transcript", selectedUserId],
    queryFn: async () => {
      const { data: enrollments, error: enrollErr } = await supabase
        .from("enrollments")
        .select("id, course_id, courses(id, name, code, semester, year, ects)")
        .eq("user_id", selectedUserId!);
      if (enrollErr) throw enrollErr;
      if (!enrollments || enrollments.length === 0) return [];

      const enrollmentIds = enrollments.map((e) => e.id);
      const courseIds = enrollments.map((e) => e.course_id);

      const [{ data: grades }, { data: components }] = await Promise.all([
        supabase.from("grades").select("enrollment_id, grade_component_id, score, max_score").in("enrollment_id", enrollmentIds),
        supabase.from("grade_components").select("id, course_id, weight, count").in("course_id", courseIds),
      ]);

      return enrollments.map((enrollment) => {
        const course = enrollment.courses as any;
        const courseComponents = (components || []).filter((c) => c.course_id === course.id);
        const enrollmentGrades = (grades || []).filter((g) => g.enrollment_id === enrollment.id);

        let weightedTotal: number | null = null;
        if (courseComponents.length > 0 && enrollmentGrades.length > 0) {
          let totalWeight = 0, weightedSum = 0, hasAny = false;
          for (const comp of courseComponents) {
            const cg = enrollmentGrades.filter((g) => g.grade_component_id === comp.id && g.score !== null);
            if (cg.length > 0) {
              hasAny = true;
              const avg = cg.reduce((s, g) => s + (g.score! / g.max_score) * 100, 0) / cg.length;
              weightedSum += avg * Number(comp.weight);
              totalWeight += Number(comp.weight);
            }
          }
          if (hasAny && totalWeight > 0) weightedTotal = weightedSum / totalWeight;
        }

        const status: TranscriptRow["status"] =
          weightedTotal === null ? "In Progress" : weightedTotal >= 50 ? "Passed" : "Failed";

        return {
          courseName: course.name,
          courseCode: course.code || "",
          semester: course.semester,
          year: course.year,
          ects: course.ects ?? 6,
          grade: weightedTotal !== null ? Math.round(weightedTotal * 100) / 100 : null,
          status,
        } as TranscriptRow;
      });
    },
    enabled: !!selectedUserId,
  });

  const rows = transcriptData || [];
  const semesters = useMemo(() => [...new Set(rows.map((r) => r.semester))].sort(), [rows]);
  const years = useMemo(() => [...new Set(rows.map((r) => r.year))].sort(), [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (semesterFilter !== "all" && r.semester !== Number(semesterFilter)) return false;
      if (yearFilter !== "all" && r.year !== Number(yearFilter)) return false;
      return true;
    });
  }, [rows, semesterFilter, yearFilter]);

  const summary = useMemo(() => {
    const graded = rows.filter((r) => r.grade !== null);
    const passed = graded.filter((r) => r.status === "Passed");
    const totalECTS = passed.reduce((s, r) => s + r.ects, 0);
    const totalCredits = rows.reduce((s, r) => s + r.ects, 0);
    let cgpa = 0, weightedAvg = 0;
    if (graded.length > 0) {
      const totalEctsGraded = graded.reduce((s, r) => s + r.ects, 0);
      if (totalEctsGraded > 0) {
        cgpa = graded.reduce((s, r) => s + gradeToGPA(r.grade!) * r.ects, 0) / totalEctsGraded;
        weightedAvg = graded.reduce((s, r) => s + r.grade! * r.ects, 0) / totalEctsGraded;
      }
    }
    return {
      totalECTS,
      totalInstitutionalCredits: totalCredits,
      cgpa: Math.round(cgpa * 100) / 100,
      weightedAvg: Math.round(weightedAvg * 100) / 100,
      totalCourses: rows.length,
      passedCourses: passed.length,
    };
  }, [rows]);

  const handleDownloadPDF = async () => {
    if (!selectedStudent) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Academic Transcript", pageW / 2, 20, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Western Balkan University", pageW / 2, 28, { align: "center" });

    doc.setFontSize(10);
    const infoY = 40;
    doc.text(`Student: ${selectedStudent.full_name || "N/A"}`, 14, infoY);
    doc.text(`Email: ${selectedStudent.email || "N/A"}`, 14, infoY + 6);
    doc.text(`Program: ${selectedStudent.program || "N/A"}`, 14, infoY + 12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageW - 14, infoY, { align: "right" });

    const tableData = filteredRows.map((r) => [
      r.courseName, r.courseCode,
      r.grade !== null ? `${r.grade.toFixed(1)}% (${gradeToLetter(r.grade)})` : "—",
      r.ects.toString(), `Y${r.year}/S${r.semester}`, r.status,
    ]);

    autoTable(doc, {
      startY: infoY + 20,
      head: [["Course", "Code", "Grade", "ECTS", "Semester", "Status"]],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 138] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 14, finalY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Total ECTS Earned: ${summary.totalECTS}`, 14, finalY + 8);
    doc.text(`Total Institutional Credits: ${summary.totalInstitutionalCredits}`, 14, finalY + 14);
    doc.text(`CGPA: ${summary.cgpa.toFixed(2)} / 4.00`, 14, finalY + 20);
    doc.text(`Weighted Average: ${summary.weightedAvg.toFixed(2)}%`, 14, finalY + 26);

    doc.save(`transcript_${selectedStudent.full_name?.replace(/\s+/g, "_") || "student"}.pdf`);
  };

  const statusBadge = (status: TranscriptRow["status"]) => {
    switch (status) {
      case "Passed": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">Passed</Badge>;
      case "Failed": return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="secondary">In Progress</Badge>;
    }
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Student Transcripts</h1>
      <p className="text-sm text-muted-foreground">View and download any student's academic transcript</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-4">
        {/* Student list sidebar */}
        <div className="lg:col-span-1">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-[65vh] space-y-1 overflow-auto">
            {loadingStudents ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : filteredStudents.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No students found</p>
            ) : (
              filteredStudents.map((s) => (
                <button
                  key={s.user_id}
                  onClick={() => { setSelectedUserId(s.user_id); setSemesterFilter("all"); setYearFilter("all"); }}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedUserId === s.user_id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-secondary"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground truncate">{s.full_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.program || "No program"}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Transcript view */}
        <div className="lg:col-span-3 space-y-5">
          {!selectedUserId ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
              <User className="mb-2 h-8 w-8" />
              <p>Select a student to view their transcript</p>
            </div>
          ) : (
            <>
              {/* Student header */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selectedStudent?.full_name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedStudent?.email} · {selectedStudent?.program || "No program"}</p>
                </div>
                <Button onClick={handleDownloadPDF} disabled={loadingTranscript || rows.length === 0} size="sm" className="gap-2">
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card><CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-primary/10 p-2"><BookOpen className="h-4 w-4 text-primary" /></div>
                  <div><p className="text-xs text-muted-foreground">ECTS Earned</p>
                    {loadingTranscript ? <Skeleton className="h-6 w-10" /> : <p className="text-lg font-bold text-foreground">{summary.totalECTS}</p>}
                  </div>
                </CardContent></Card>
                <Card><CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-blue-500/10 p-2"><FileText className="h-4 w-4 text-blue-500" /></div>
                  <div><p className="text-xs text-muted-foreground">Total Credits</p>
                    {loadingTranscript ? <Skeleton className="h-6 w-10" /> : <p className="text-lg font-bold text-foreground">{summary.totalInstitutionalCredits}</p>}
                  </div>
                </CardContent></Card>
                <Card><CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-green-500/10 p-2"><GraduationCap className="h-4 w-4 text-green-500" /></div>
                  <div><p className="text-xs text-muted-foreground">CGPA</p>
                    {loadingTranscript ? <Skeleton className="h-6 w-10" /> : <p className="text-lg font-bold text-foreground">{summary.cgpa.toFixed(2)}</p>}
                  </div>
                </CardContent></Card>
                <Card><CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-purple-500/10 p-2"><Award className="h-4 w-4 text-purple-500" /></div>
                  <div><p className="text-xs text-muted-foreground">Weighted Avg</p>
                    {loadingTranscript ? <Skeleton className="h-6 w-10" /> : <p className="text-lg font-bold text-foreground">{summary.weightedAvg.toFixed(1)}%</p>}
                  </div>
                </CardContent></Card>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="w-[130px]"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map((y) => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Semester" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {semesters.map((s) => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Course Records</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {loadingTranscript ? (
                    <div className="space-y-3 p-6">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                  ) : filteredRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <FileText className="mb-2 h-8 w-8" /><p>No course records found.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Course</TableHead>
                          <TableHead className="hidden sm:table-cell">Code</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead className="text-center">ECTS</TableHead>
                          <TableHead className="hidden sm:table-cell">Semester</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {row.courseName}
                              <span className="block text-xs text-muted-foreground sm:hidden">
                                {row.courseCode} · Y{row.year}/S{row.semester}
                              </span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground">{row.courseCode}</TableCell>
                            <TableCell>
                              {row.grade !== null ? (
                                <span className="font-semibold">
                                  {row.grade.toFixed(1)}% <span className="text-xs text-muted-foreground">({gradeToLetter(row.grade)})</span>
                                </span>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-center">{row.ects}</TableCell>
                            <TableCell className="hidden sm:table-cell">Y{row.year} / S{row.semester}</TableCell>
                            <TableCell>{statusBadge(row.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTranscripts;
