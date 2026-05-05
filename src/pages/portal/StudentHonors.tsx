import { useQuery } from "@tanstack/react-query";
import StudentLayout from "@/components/StudentLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Download, Award, Loader2 } from "lucide-react";
import { downloadDeansListCertificate } from "@/lib/deansListCertificate";

const StudentHonors = () => {
  const { profile } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ["my-honors"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_honors");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-7 w-7 text-amber-500" /> Honors / Dean's List
          </h1>
          <p className="text-muted-foreground mt-1">Recognition of your top academic achievements.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : data.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">
            <Award className="h-10 w-10 mx-auto mb-3 opacity-40" />
            You have not been included on a Dean's List yet. Keep up the great work!
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.map((h: any) => (
              <Card key={h.entry_id} className="overflow-hidden border-amber-300/40">
                <div className="h-2 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600" />
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><Award className="h-5 w-5 text-amber-600" /> Dean's List</span>
                    <Badge variant={h.is_published ? "default" : "secondary"}>{h.is_published ? "Published" : "Pending"}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline gap-3">
                    <div className="text-4xl font-bold text-amber-600">#{h.rank}</div>
                    <div className="text-sm text-muted-foreground">in {h.program || "your program"}</div>
                  </div>
                  <div className="text-sm">
                    <div><strong>Semester:</strong> {h.semester_name}</div>
                    <div><strong>GPA:</strong> {Number(h.gpa_albanian).toFixed(2)} (10) • {Number(h.gpa_4).toFixed(2)} (4.0)</div>
                    <div className="text-xs text-muted-foreground mt-1">Certificate ID: {h.certificate_code}</div>
                  </div>
                  <Button
                    onClick={() => downloadDeansListCertificate({
                      fullName: profile?.full_name || "",
                      program: h.program,
                      semesterName: h.semester_name,
                      gpaAlbanian: Number(h.gpa_albanian),
                      gpa4: Number(h.gpa_4),
                      rank: h.rank,
                      certificateCode: h.certificate_code,
                    })}
                  >
                    <Download className="h-4 w-4 mr-2" /> Download Certificate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentHonors;
