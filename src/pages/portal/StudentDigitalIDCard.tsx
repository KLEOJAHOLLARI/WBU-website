import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StudentLayout from "@/components/StudentLayout";
import { DigitalIDCard } from "@/components/portal/DigitalIDCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCw, Download, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";

const StudentDigitalIDCard = () => {
  const { user, profile } = useAuth();
  const [flipped, setFlipped] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: card, isLoading } = useQuery({
    queryKey: ["student-id-card", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_id_cards")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: fullProfile } = useQuery({
    queryKey: ["student-full-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, program, student_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const handleDownload = async () => {
    const el = document.getElementById("id-card-capture");
    if (!el) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(el, { backgroundColor: null, scale: 3 });
      const link = document.createElement("a");
      link.download = `wbu-id-card-${fullProfile?.student_id || "card"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Saved", description: "Card image downloaded." });
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </StudentLayout>
    );
  }

  if (!card) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-md text-center">
          <Card>
            <CardContent className="space-y-3 p-8">
              <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="font-display text-lg font-semibold">No Card Issued</h2>
              <p className="text-sm text-muted-foreground">
                Your digital ID card will be available once your account is approved and a student ID is assigned.
              </p>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Digital Student ID</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tap card to flip • Save for offline access</p>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2">
          {card.status === "active" ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">
              <ShieldCheck className="mr-1 h-3 w-3" /> Active
            </Badge>
          ) : (
            <Badge variant="destructive" className="uppercase">
              {card.status}
            </Badge>
          )}
        </div>

        {/* Card */}
        <div
          id="id-card-capture"
          onClick={() => setFlipped(f => !f)}
          className="cursor-pointer select-none"
          role="button"
          aria-label="Flip card"
        >
          <DigitalIDCard
            data={{
              fullName: profile?.full_name || "Student",
              program: profile?.program || null,
              studentId: profile?.student_id || null,
              avatarUrl: profile?.avatar_url || null,
              issueDate: card.issue_date,
              status: card.status,
              verificationToken: card.verification_token,
            }}
            flipped={flipped}
          />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => setFlipped(f => !f)}>
            <RotateCw className="mr-2 h-4 w-4" /> Flip
          </Button>
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">How to use</p>
            <p>Show the QR code at entry gates, the library, or to staff for verification. Your card updates automatically when your profile changes.</p>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default StudentDigitalIDCard;
