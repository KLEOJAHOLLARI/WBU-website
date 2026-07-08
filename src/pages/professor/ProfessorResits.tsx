import { useState } from "react";
import ProfessorLayout from "@/components/ProfessorLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";

const ProfessorResits = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [drafts, setDrafts] = useState<Record<string, { grade: string; date: string }>>({});

  const { data: courses = [] } = useQuery({
    queryKey: ["prof-courses-for-resits", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, name, code")
        .eq("professor_id", user!.id)
        .order("name");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["course-resits", selectedCourse],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_course_resits", {
        _course_id: selectedCourse,
      });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!selectedCourse,
  });

  const submit = useMutation({
    mutationFn: async ({ id, grade, date }: { id: string; grade: number; date?: string }) => {
      const { data, error } = await supabase.rpc("submit_resit_grade", {
        _resit_id: id,
        _grade: grade,
        _exam_date: date || null,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (res) => {
      if (res?.capped) {
        toast({
          title: "Grade capped at 8",
          description: "According to university regulations, the maximum resit grade is 8.",
        });
      } else {
        toast({ title: "Resit grade saved" });
      }
      qc.invalidateQueries({ queryKey: ["course-resits", selectedCourse] });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (id: string) => {
    const d = drafts[id];
    const g = Number(d?.grade);
    if (!g || g < 4 || g > 8) {
      toast({
        title: "Invalid grade",
        description: "Resit grade must be between 4 and 8.",
        variant: "destructive",
      });
      return;
    }
    submit.mutate({ id, grade: g, date: d?.date });
  };

  return (
    <ProfessorLayout>
      <div className="flex items-center gap-3">
        <RefreshCw className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl font-bold">Resit Exams</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter resit grades for registered students. Grades are validated 4–8; the higher of the
        original and resit grade is kept.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Select Course</CardTitle>
          <CardDescription>Choose one of your courses to view resit registrations.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Choose a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCourse && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Registered Students</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-muted-foreground">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No students registered.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">Student</th>
                      <th className="px-4 py-2.5 text-left font-medium">Original</th>
                      <th className="px-4 py-2.5 text-left font-medium">Resit Grade (4–8)</th>
                      <th className="px-4 py-2.5 text-left font-medium">Exam Date</th>
                      <th className="px-4 py-2.5 text-left font-medium">Final</th>
                      <th className="px-4 py-2.5 text-left font-medium">Status</th>
                      <th className="px-4 py-2.5 text-right font-medium">Save</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any) => {
                      const d = drafts[r.resit_id] || {
                        grade: r.resit_grade?.toString() ?? "",
                        date: r.exam_date ?? "",
                      };
                      return (
                        <tr key={r.resit_id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2">
                            <p className="font-medium">{r.full_name}</p>
                            <p className="text-xs text-muted-foreground">{r.student_id}</p>
                          </td>
                          <td className="px-4 py-2">{r.original_grade}</td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              min={4}
                              max={8}
                              className="w-24"
                              value={d.grade}
                              onChange={(e) =>
                                setDrafts((p) => ({
                                  ...p,
                                  [r.resit_id]: { ...d, grade: e.target.value },
                                }))
                              }
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="date"
                              className="w-40"
                              value={d.date}
                              onChange={(e) =>
                                setDrafts((p) => ({
                                  ...p,
                                  [r.resit_id]: { ...d, date: e.target.value },
                                }))
                              }
                            />
                          </td>
                          <td className="px-4 py-2 font-semibold">{r.final_grade ?? "—"}</td>
                          <td className="px-4 py-2">
                            <Badge variant={r.status === "graded" ? "default" : "secondary"}>
                              {r.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button size="sm" onClick={() => handleSubmit(r.resit_id)}>
                              Save
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </ProfessorLayout>
  );
};

export default ProfessorResits;
