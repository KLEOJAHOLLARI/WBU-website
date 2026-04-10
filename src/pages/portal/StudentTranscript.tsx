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

interface TranscriptRow {
  courseName: string;
  courseCode: string;
  semester: number;
  year: number;
  ects: number;
  grade: number | null; // weighted percentage 0-100
  status: "Passed" | "Failed" | "In Progress";
}

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

const StudentTranscript = () => {
  const { user, profile } = useAuth();
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch program from profiles table
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

  // Fetch enrollments with courses, grades, and grade_components
  const { data: transcriptData, isLoading } = useQuery({
    queryKey: ["student-transcript", user?.id],
    queryFn: async () => {
      // Get enrollments with course data
      const { data: enrollments, error: enrollErr } = await supabase
        .from("enrollments")
        .select("id, course_id, courses(id, name, code, semester, year, ects)")
        .eq("user_id", user!.id);

      if (enrollErr) throw enrollErr;
      if (!enrollments || enrollments.length === 0) return [];

      const enrollmentIds = enrollments.map((e) => e.id);

      // Get all grades for these enrollments
      const { data: grades, error: gradeErr } = await supabase
        .from("grades")
        .select("enrollment_id, grade_component_id, score, max_score, instance_number")
        .in("enrollment_id", enrollmentIds);

      if (gradeErr) throw gradeErr;

      // Get all grade components for the courses
      const courseIds = enrollments.map((e) => e.course_id);
      const { data: components, error: compErr } = await supabase
        .from("grade_components")
        .select("id, course_id, name, weight, count")
        .in("course_id", courseIds);

      if (compErr) throw compErr;

      // Build transcript rows
      const rows: TranscriptRow[] = enrollments.map((enrollment) => {
        const course = enrollment.courses as any;
        const courseComponents = (components || []).filter((c) => c.course_id === course.id);
        const enrollmentGrades = (grades || []).filter((g) => g.enrollment_id === enrollment.id);

        let weightedTotal: number | null = null;

        if (courseComponents.length > 0 && enrollmentGrades.length > 0) {
          // Calculate weighted average
          let totalWeight = 0;
          let weightedSum = 0;
          let hasAnyGrade = false;

          for (const comp of courseComponents) {
            const compGrades = enrollmentGrades.filter(
              (g) => g.grade_component_id === comp.id && g.score !== null
            );
            if (compGrades.length > 0) {
              hasAnyGrade = true;
              const avgScore =
                compGrades.reduce((sum, g) => sum + (g.score! / g.max_score) * 100, 0) /
                compGrades.length;
              weightedSum += avgScore * Number(comp.weight);
              totalWeight += Number(comp.weight);
            }
          }

          if (hasAnyGrade && totalWeight > 0) {
            weightedTotal = weightedSum / totalWeight;
          }
        }

        const status: TranscriptRow["status"] =
          weightedTotal === null
            ? "In Progress"
            : weightedTotal >= 50
            ? "Passed"
            : "Failed";

        return {
          courseName: course.name,
          courseCode: course.code || "",
          semester: course.semester,
          year: course.year,
          ects: course.ects ?? 6,
          grade: weightedTotal !== null ? Math.round(weightedTotal * 100) / 100 : null,
          status,
        };
      });

      return rows;
    },
    enabled: !!user,
  });

  const rows = transcriptData || [];

  // Unique semesters/years for filters
  const semesters = useMemo(() => [...new Set(rows.map((r) => r.semester))].sort(), [rows]);
  const years = useMemo(() => [...new Set(rows.map((r) => r.year))].sort(), [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (semesterFilter !== "all" && r.semester !== Number(semesterFilter)) return false;
      if (yearFilter !== "all" && r.year !== Number(yearFilter)) return false;
      return true;
    });
  }, [rows, semesterFilter, yearFilter]);

  // Summary calculations (on ALL rows, not filtered)
  const summary = useMemo(() => {
    const graded = rows.filter((r) => r.grade !== null);
    const passed = graded.filter((r) => r.status === "Passed");

    const totalECTS = passed.reduce((sum, r) => sum + r.ects, 0);
    const totalCredits = rows.reduce((sum, r) => sum + r.ects, 0);

    let cgpa = 0;
    let weightedAvg = 0;

    if (graded.length > 0) {
      const totalEctsGraded = graded.reduce((sum, r) => sum + r.ects, 0);
      if (totalEctsGraded > 0) {
        cgpa =
          graded.reduce((sum, r) => sum + gradeToGPA(r.grade!) * r.ects, 0) / totalEctsGraded;
        weightedAvg =
          graded.reduce((sum, r) => sum + r.grade! * r.ects, 0) / totalEctsGraded;
      }
    }

    return {
      totalECTS,
      totalInstitutionalCredits: totalCredits,
      totalTransferCredits: 0, // No transfer credit data in schema
      cgpa: Math.round(cgpa * 100) / 100,
      weightedAvg: Math.round(weightedAvg * 100) / 100,
      totalCourses: rows.length,
      passedCourses: passed.length,
    };
  }, [rows]);

  // PDF download
  const handleDownloadPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Academic Transcript", pageW / 2, 20, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Western Balkan University", pageW / 2, 28, { align: "center" });

    // Student info
    doc.setFontSize(10);
    const infoY = 40;
    doc.text(`Student: ${profile?.full_name || "N/A"}`, 14, infoY);
    doc.text(`Email: ${profile?.email || "N/A"}`, 14, infoY + 6);
    doc.text(`Program: ${studentProgram || "N/A"}`, 14, infoY + 12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageW - 14, infoY, { align: "right" });

    // Table
    const tableData = filteredRows.map((r) => [
      r.courseName,
      r.courseCode,
      r.grade !== null ? `${r.grade.toFixed(1)}% (${gradeToLetter(r.grade)})` : "—",
      r.ects.toString(),
      `Y${r.year}/S${r.semester}`,
      r.status,
    ]);

    autoTable(doc, {
      startY: infoY + 20,
      head: [["Course", "Code", "Grade", "ECTS", "Semester", "Status"]],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 138] },
    });

    // Summary
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

    doc.save(`transcript_${profile?.full_name?.replace(/\s+/g, "_") || "student"}.pdf`);
  };

  const statusBadge = (status: TranscriptRow["status"]) => {
    switch (status) {
      case "Passed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">Passed</Badge>;
      case "Failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">In Progress</Badge>;
    }
  };

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
          <Button onClick={handleDownloadPDF} disabled={isLoading || rows.length === 0} className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total ECTS</p>
                {isLoading ? <Skeleton className="h-6 w-10" /> : <p className="text-lg font-bold text-foreground">{summary.totalECTS}</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Institutional Credits</p>
                {isLoading ? <Skeleton className="h-6 w-10" /> : <p className="text-lg font-bold text-foreground">{summary.totalInstitutionalCredits}</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-orange-500/10 p-2">
                <Award className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transfer Credits</p>
                {isLoading ? <Skeleton className="h-6 w-10" /> : <p className="text-lg font-bold text-foreground">{summary.totalTransferCredits}</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-green-500/10 p-2">
                <GraduationCap className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CGPA</p>
                {isLoading ? <Skeleton className="h-6 w-10" /> : <p className="text-lg font-bold text-foreground">{summary.cgpa.toFixed(2)}</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-purple-500/10 p-2">
                <Award className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Weighted Avg</p>
                {isLoading ? <Skeleton className="h-6 w-10" /> : <p className="text-lg font-bold text-foreground">{summary.weightedAvg.toFixed(1)}%</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={semesterFilter} onValueChange={setSemesterFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Semesters</SelectItem>
              {semesters.map((s) => (
                <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Transcript Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Course Records</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="mb-2 h-8 w-8" />
                <p>No course records found.</p>
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
                            {row.grade.toFixed(1)}%{" "}
                            <span className="text-xs text-muted-foreground">({gradeToLetter(row.grade)})</span>
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
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default StudentTranscript;
