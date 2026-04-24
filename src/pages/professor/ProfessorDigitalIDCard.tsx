import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ProfessorLayout from "@/components/ProfessorLayout";
import { ProfessorIDCard } from "@/components/professor/ProfessorIDCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCw, Download, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";

const ProfessorDigitalIDCard = () => {
  const { user, profile } = useAuth();
  const [flipped, setFlipped] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: card, isLoading } = useQuery({
    queryKey: ["professor-id-card", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("professor_id_cards")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Match auth profile (full_name) with professors directory record (title/department/photo) by name
  const { data: prof } = useQuery({
    queryKey: ["professor-directory", profile?.full_name],
    queryFn: async () => {
      if (!profile?.full_name) return null;
      const { data } = await supabase
        .from("professors")
        .select("name, title, department, photo_url")
        .ilike("name", profile.full_name)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.full_name,
  });

  const handleDownload = async () => {
    const el = document.getElementById("prof-id-card-capture");
    if (!el) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(el, { backgroundColor: null, scale: 3 });
      const link = document.createElement("a");
      link.download = `wbu-faculty-card-${user?.id?.slice(0, 8) || "card"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Saved", description: "Faculty card downloaded." });
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <ProfessorLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </ProfessorLayout>
    );
  }

  if (!card) {
    return (
      <ProfessorLayout>
        <div className="mx-auto max-w-md text-center">
          <Card>
            <CardContent className="space-y-3 p-8">
              <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="font-display text-lg font-semibold">No Card Issued</h2>
              <p className="text-sm text-muted-foreground">
                Your faculty ID card has not been issued yet. Contact administration.
              </p>
            </CardContent>
          </Card>
        </div>
      </ProfessorLayout>
    );
  }

  const facultyId = `WBU-FAC-${user?.id?.slice(0, 8).toUpperCase()}`;

  return (
    <ProfessorLayout>
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Faculty ID Card</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tap card to flip • Save for offline access</p>
        </div>

        <div className="flex items-center justify-center gap-2">
          {card.status === "active" ? (
            <Badge className="bg-primary hover:bg-primary text-primary-foreground">
              <ShieldCheck className="mr-1 h-3 w-3" /> Active
            </Badge>
          ) : (
            <Badge variant="destructive" className="uppercase">
              {card.status}
            </Badge>
          )}
        </div>

        <div
          id="prof-id-card-capture"
          onClick={() => setFlipped(f => !f)}
          className="cursor-pointer select-none"
          role="button"
          aria-label="Flip card"
        >
          <ProfessorIDCard
            data={{
              fullName: profile?.full_name || "Professor",
              title: prof?.title || null,
              department: prof?.department || null,
              facultyId,
              avatarUrl: prof?.photo_url || profile?.avatar_url || null,
              issueDate: card.issue_date,
              status: card.status,
              verificationToken: card.verification_token,
            }}
            flipped={flipped}
          />
        </div>

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
            <p>Present the QR code at faculty entry, library, or for student verification. Card details sync from your faculty profile.</p>
          </CardContent>
        </Card>
      </div>
    </ProfessorLayout>
  );
};

export default ProfessorDigitalIDCard;
