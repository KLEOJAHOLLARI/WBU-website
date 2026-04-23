import { useState, useMemo, useRef } from "react";
import StudentLayout from "@/components/StudentLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, GraduationCap, Award, BookOpen } from "lucide-react";
import {
  buildTranscriptRows,
  computeTranscriptSummary,
  gradeToLetter,
  gradeToAlbanian,
  type TranscriptRow,
} from "@/lib/transcript";
import { SCHOLARSHIP_GPA_THRESHOLD } from "@/lib/grading";
import { downloadTranscriptPdf } from "@/lib/transcriptPdf";

const StudentTranscript = () => {
  const { user, profile } = useAuth();
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: studentProgram } = useQuery({
    queryKey: ["student-program", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("program")
        .eq("user_id", user!.id)
        .single();
      return data?.program || null;
    },
    enabled: !!user,
  });

  const { data: transcriptRows = [], isLoading } = useQuery({
    queryKey: ["student-transcript", user?.id],
    queryFn: async () => {
      const { data: enrollments, error: enrollErr } = await supabase
        .from("enrollments")
        .select("id, course_id, courses(id, name, code, semester, year, ects)")
        .eq("user_id", user!.id);
      if (enrollErr) throw enrollErr;
      if (!enrollments?.length) return [];

      const enrollmentIds = enrollments.map((e) => e.id);
      const courseIds = enrollments.map((e) => e.course_id);

      const [{ data: grades }, { data: components }] = await Promise.all([
        supabase
          .from("grades")
          .select("enrollment_id, grade_component_id, score, max_score")
          .in("enrollment_id", enrollmentIds),
        supabase
          .from("grade_components")
          .select("id, course_id, weight, count")
          .in("course_id", courseIds),
      ]);

      return buildTranscriptRows(
        enrollments as any,
        grades || [],
        components || []
      );
    },
    enabled: !!user,
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
    await downloadTranscriptPdf({
      student: {
        full_name: profile?.full_name,
        email: profile?.email,
        program: studentProgram,
      },
      rows: filteredRows,
      summary,
    });
  };

  const statusBadge = (status: TranscriptRow["status"]) => {
    switch (status) {
      case "Passed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Passed</Badge>;
      case "Failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">In Progress</Badge>;
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
              <span className="block text-xs text-muted-foreground sm:hidden">
                {row.courseCode} · Y{row.year}/S{row.semester}
              </span>
            </TableCell>
            <TableCell className="hidden sm:table-cell text-muted-foreground">{row.courseCode}</TableCell>
            <TableCell>
              {row.grade !== null ? (
                <span className="font-semibold">
                  {row.grade.toFixed(1)}%{" "}
                  <span className="text-xs text-muted-foreground">
                    → {gradeToAlbanian(row.grade)}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
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
    <StudentLayout>
      <div className="space-y-6" ref={printRef}>
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Academic Transcript</h1>
            <p className="text-sm text-muted-foreground">
              {profile?.full_name} · {studentProgram || "No program assigned"}
            </p>
          </div>
          <Button onClick={handleDownloadPDF} disabled={isLoading || transcriptRows.length === 0} className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2"><BookOpen className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">ECTS Earned</p>
                {isLoading ? <Skeleton className="h-6 w-10" /> : <p className="text-lg font-bold text-foreground">{summary.totalECTS}</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-500/10 p-2"><FileText className="h-4 w-4 text-blue-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Institutional Credits</p>
                {isLoading ? <Skeleton className="h-6 w-10" /> : <p className="text-lg font-bold text-foreground">{summary.totalInstitutionalCredits}</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-orange-500/10 p-2"><Award className="h-4 w-4 text-orange-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Transfer Credits</p>
                {isLoading ? <Skeleton className="h-6 w-10" /> : <p className="text-lg font-bold text-foreground">{summary.totalTransferCredits}</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-green-500/10 p-2"><GraduationCap className="h-4 w-4 text-green-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">CGPA</p>
                {isLoading ? <Skeleton className="h-6 w-10" /> : <p className="text-lg font-bold text-foreground">{summary.cgpa.toFixed(2)}</p>}
                <p className="text-[10px] text-muted-foreground">Albanian: {summary.gpaAlbanian.toFixed(2)} / 10</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-purple-500/10 p-2"><Award className="h-4 w-4 text-purple-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Weighted Avg</p>
                {isLoading ? <Skeleton className="h-6 w-10" /> : <p className="text-lg font-bold text-foreground">{summary.weightedAvg.toFixed(1)}%</p>}
                {summary.gpaAlbanian > 0 && (
                  <p className={`text-[10px] ${summary.gpaAlbanian >= SCHOLARSHIP_GPA_THRESHOLD ? "text-emerald-600" : "text-destructive"}`}>
                    {summary.gpaAlbanian >= SCHOLARSHIP_GPA_THRESHOLD ? "Scholarship GPA met" : `Below ${SCHOLARSHIP_GPA_THRESHOLD} GPA`}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map((y) => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={semesterFilter} onValueChange={setSemesterFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Semester" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {semesters.map((s) => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </CardContent>
          </Card>
        ) : filteredRows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="mb-2 h-8 w-8" />
              <p>No course records found.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Completed Courses */}
            {completedRows.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-green-600" />
                    Completed Courses
                    <Badge variant="secondary" className="ml-1">{completedRows.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {renderTable(completedRows)}
                </CardContent>
              </Card>
            )}

            {/* In Progress Courses */}
            {inProgressRows.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    In Progress
                    <Badge variant="secondary" className="ml-1">{inProgressRows.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {renderTable(inProgressRows)}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentTranscript;
