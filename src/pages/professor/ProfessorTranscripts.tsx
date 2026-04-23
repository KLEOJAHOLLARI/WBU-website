import { useState, useMemo } from "react";
import ProfessorLayout from "@/components/ProfessorLayout";
import { useAuth } from "@/hooks/useAuth";
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
import {
  buildTranscriptRows,
  computeTranscriptSummary,
  gradeToAlbanian,
  gradeToGPA,
  gradeToLetter,
  type TranscriptRow,
} from "@/lib/transcript";
import type { GradeDisplayMode } from "@/lib/grading";
import { downloadTranscriptPdf } from "@/lib/transcriptPdf";
import GradeDisplayToggle from "@/components/GradeDisplayToggle";

const ProfessorTranscripts = () => {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [displayMode, setDisplayMode] = useState<GradeDisplayMode>("full");

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["prof-transcript-students", user?.id],
    queryFn: async () => {
      const { data: courses } = await supabase.from("courses").select("id").eq("professor_id", user!.id);
      if (!courses?.length) return [];
      const courseIds = courses.map((c) => c.id);
      const { data: enrollments } = await supabase.from("enrollments").select("user_id").in("course_id", courseIds);
      if (!enrollments?.length) return [];
      const userIds = [...new Set(enrollments.map((e) => e.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, program")
        .in("user_id", userIds)
        .order("full_name");
      return profiles || [];
    },
    enabled: !!user,
  });

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const q = searchTerm.toLowerCase();
    return students.filter((s) => s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
  }, [students, searchTerm]);

  const selectedStudent = students.find((s) => s.user_id === selectedUserId);

  const { data: transcriptRows = [], isLoading: loadingTranscript } = useQuery({
    queryKey: ["prof-student-transcript", selectedUserId, user?.id],
    queryFn: async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, course_id, courses(id, name, code, semester, year, ects, professor_id)")
        .eq("user_id", selectedUserId!);
      if (!enrollments?.length) return [];

      // Only professor's courses
      const myEnrollments = enrollments.filter((e: any) => e.courses?.professor_id === user!.id);
      if (!myEnrollments.length) return [];

      const enrollmentIds = myEnrollments.map((e) => e.id);
      const courseIds = myEnrollments.map((e) => e.course_id);

      const [{ data: grades }, { data: components }] = await Promise.all([
        supabase.from("grades").select("enrollment_id, grade_component_id, score, max_score").in("enrollment_id", enrollmentIds),
        supabase.from("grade_components").select("id, course_id, weight, count").in("course_id", courseIds),
      ]);

      return buildTranscriptRows(myEnrollments as any, grades || [], components || []);
    },
    enabled: !!selectedUserId && !!user,
    refetchOnWindowFocus: true,
  });

  const semesters = useMemo(() => [...new Set(transcriptRows.map((r) => r.semester))].sort(), [transcriptRows]);
  const years = useMemo(() => [...new Set(transcriptRows.map((r) => r.year))].sort(), [transcriptRows]);

  const filteredRows = useMemo(() => {
    return transcriptRows.filter((r) => {
      if (semesterFilter !== "all" && r.semester !== Number(semesterFilter)) return false;
      if (yearFilter !== "all" && r.year !== Number(yearFilter)) return false;
      return true;
    });
  }, [transcriptRows, semesterFilter, yearFilter]);

  const completedRows = useMemo(() => filteredRows.filter((r) => r.isComplete), [filteredRows]);
  const inProgressRows = useMemo(() => filteredRows.filter((r) => !r.isComplete), [filteredRows]);
  const summary = useMemo(() => computeTranscriptSummary(transcriptRows), [transcriptRows]);

  const handleDownloadPDF = async () => {
    if (!selectedStudent) return;
    await downloadTranscriptPdf({
      student: {
        full_name: selectedStudent.full_name,
        email: selectedStudent.email,
        program: selectedStudent.program,
      },
      rows: filteredRows,
      summary,
      displayMode,
    });
  };

  const renderGrade = (grade: number) => {
    const alb = gradeToAlbanian(grade);
    const letter = gradeToLetter(grade);
    if (displayMode === "percent") return <span className="font-semibold">{grade.toFixed(1)}%</span>;
    if (displayMode === "albanian") return <span className="font-semibold">{alb}</span>;
    return (
      <span className="font-semibold">
        {grade.toFixed(1)}% <span className="text-xs text-muted-foreground">→ {alb} ({letter})</span>
      </span>
    );
  };

  const statusBadge = (status: TranscriptRow["status"]) => {
    switch (status) {
      case "Passed": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Passed</Badge>;
      case "Failed": return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="secondary">In Progress</Badge>;
    }
  };

  const renderTable = (rows: TranscriptRow[]) => (
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
        {rows.map((row) => (
          <TableRow key={row.enrollmentId}>
            <TableCell className="font-medium">
              {row.courseName}
              <span className="block text-xs text-muted-foreground sm:hidden">{row.courseCode} · Y{row.year}/S{row.semester}</span>
            </TableCell>
            <TableCell className="hidden sm:table-cell text-muted-foreground">{row.courseCode}</TableCell>
            <TableCell>
              {row.grade !== null ? (
                <span className="font-semibold">{row.grade.toFixed(1)}% <span className="text-xs text-muted-foreground">→ {gradeToAlbanian(row.grade)} ({gradeToLetter(row.grade)})</span></span>
              ) : <span className="text-muted-foreground">—</span>}
            </TableCell>
            <TableCell className="text-center">{row.ects}</TableCell>
            <TableCell className="hidden sm:table-cell">Y{row.year} / S{row.semester}</TableCell>
            <TableCell>{statusBadge(row.status)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <ProfessorLayout>
      <h1 className="font-display text-2xl font-bold text-foreground">Student Transcripts</h1>
      <p className="text-sm text-muted-foreground">View transcripts for students enrolled in your courses</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
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
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedUserId === s.user_id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary"}`}
                >
                  <p className="text-sm font-medium text-foreground truncate">{s.full_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.program || "No program"}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-5">
          {!selectedUserId ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
              <User className="mb-2 h-8 w-8" />
              <p>Select a student to view their transcript</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selectedStudent?.full_name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedStudent?.email} · {selectedStudent?.program || "No program"}</p>
                </div>
                <Button onClick={handleDownloadPDF} disabled={loadingTranscript || transcriptRows.length === 0} size="sm" className="gap-2">
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
              </div>

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

              {loadingTranscript ? (
                <Card><CardContent className="space-y-3 p-6">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
              ) : filteredRows.length === 0 ? (
                <Card><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="mb-2 h-8 w-8" /><p>No course records found.</p>
                </CardContent></Card>
              ) : (
                <>
                  {completedRows.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-green-600" /> Completed Courses
                          <Badge variant="secondary" className="ml-1">{completedRows.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">{renderTable(completedRows)}</CardContent>
                    </Card>
                  )}
                  {inProgressRows.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-blue-600" /> In Progress
                          <Badge variant="secondary" className="ml-1">{inProgressRows.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">{renderTable(inProgressRows)}</CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </ProfessorLayout>
  );
};

export default ProfessorTranscripts;
