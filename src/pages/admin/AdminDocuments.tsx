import { useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Download, Trash2, Search, Sparkles, FileSignature, Award, Mail } from "lucide-react";
import { TEMPLATES, getTemplate, generateDocumentBlob, DOC_TYPE_LABEL, applyOverride, type DocumentType } from "@/lib/documentTemplates";

const TYPE_ICON: Record<DocumentType, any> = {
  certificate: Award,
  letter: Mail,
  contract: FileSignature,
  acceptance_letter: Sparkles,
};

const AdminDocuments = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"generate" | "history">("generate");
  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState<string>("");
  const [templateKey, setTemplateKey] = useState<string>(TEMPLATES[0].key);
  const [vars, setVars] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewRef, setPreviewRef] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  // Students
  const { data: students = [] } = useQuery({
    queryKey: ["admin-doc-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, program, student_id, personal_id")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Generated history
  const { data: generated = [] } = useQuery({
    queryKey: ["admin-generated-documents", filterType],
    queryFn: async () => {
      let q = supabase.from("generated_documents").select("*").order("created_at", { ascending: false });
      if (filterType !== "all") q = q.eq("document_type", filterType);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // Template overrides (admin-customized fields)
  const { data: overrides = [] } = useQuery({
    queryKey: ["doc-template-overrides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_template_overrides").select("*");
      if (error) throw error;
      return data as any[];
    },
  });

  const overrideFor = (key: string) => overrides.find(o => o.template_key === key);
  const template = useMemo(() => applyOverride(getTemplate(templateKey)!, overrideFor(templateKey) as any), [templateKey, overrides]);
  const student = students.find(s => s.user_id === studentId);

  // Auto-fill from student when student/template changes
  const onSelectStudent = (uid: string) => {
    setStudentId(uid);
    const s = students.find(x => x.user_id === uid);
    if (!s) return;
    const next: Record<string, string> = { ...vars };
    template.variables.forEach(v => {
      if (v.source === "student") {
        if (v.key === "full_name") next.full_name = s.full_name || "";
        else if (v.key === "program") next.program = s.program || "";
        else if (v.key === "student_id") next.student_id = s.student_id || "";
        else if (v.key === "personal_id") next.personal_id = s.personal_id || "";
        else if (v.key === "email") next.email = s.email || "";
      }
      if (!(v.key in next) && v.defaultValue) next[v.key] = v.defaultValue;
    });
    setVars(next);
  };

  const onSelectTemplate = (key: string) => {
    setTemplateKey(key);
    const tpl = applyOverride(getTemplate(key)!, overrideFor(key) as any);
    const next: Record<string, string> = {};
    tpl.variables.forEach(v => {
      if (v.defaultValue) next[v.key] = v.defaultValue;
    });
    if (student) {
      tpl.variables.forEach(v => {
        if (v.source === "student") {
          if (v.key === "full_name") next.full_name = student.full_name || "";
          else if (v.key === "program") next.program = student.program || "";
          else if (v.key === "student_id") next.student_id = student.student_id || "";
          else if (v.key === "personal_id") next.personal_id = student.personal_id || "";
          else if (v.key === "email") next.email = student.email || "";
        }
      });
    }
    setVars(next);
  };

  const handlePreview = async () => {
    if (!student) return toast({ title: "Select a student first", variant: "destructive" });
    const missing = template.variables.find(v => v.required && !vars[v.key]);
    if (missing) return toast({ title: `Missing required: ${missing.label}`, variant: "destructive" });
    setGenerating(true);
    try {
      const ref = `DOC-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
      const blob = await generateDocumentBlob(template, vars, ref);
      const url = URL.createObjectURL(blob);
      setPreviewBlob(blob);
      setPreviewRef(ref);
      setPreviewUrl(url);
    } catch (e: any) {
      toast({ title: "Preview failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!previewBlob || !student || !user) throw new Error("Nothing to save");
      const filename = `${template.key}_${previewRef}.pdf`;
      const filePath = `${student.user_id}/${filename}`;
      const { error: upErr } = await supabase.storage
        .from("generated-documents")
        .upload(filePath, previewBlob, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;
      const title = `${template.name} — ${student.full_name}`;
      const { error: insErr } = await supabase.from("generated_documents").insert({
        user_id: student.user_id,
        document_type: template.type,
        template_key: template.key,
        title,
        reference_code: previewRef,
        variables: vars,
        file_path: filePath,
        generated_by: user.id,
      });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      toast({ title: "Document saved to student record" });
      qc.invalidateQueries({ queryKey: ["admin-generated-documents"] });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPreviewBlob(null);
      setPreviewRef("");
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const downloadGenerated = async (file_path: string, title: string) => {
    const { data, error } = await supabase.storage.from("generated-documents").createSignedUrl(file_path, 60);
    if (error) return toast({ title: "Download failed", description: error.message, variant: "destructive" });
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = `${title}.pdf`;
    a.click();
  };

  const deleteMutation = useMutation({
    mutationFn: async (doc: { id: string; file_path: string }) => {
      await supabase.storage.from("generated-documents").remove([doc.file_path]);
      const { error } = await supabase.from("generated_documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Document deleted" });
      qc.invalidateQueries({ queryKey: ["admin-generated-documents"] });
    },
  });

  const filteredStudents = students.filter(s =>
    !search ||
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHistory = generated.filter(d =>
    !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.reference_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Document Generator</h1>
            <p className="text-sm text-muted-foreground mt-1">Generate certificates, letters, contracts, and acceptance letters.</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="history">History ({generated.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: template picker + student */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="p-4">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Template</Label>
                  <div className="mt-3 space-y-2">
                    {TEMPLATES.map(t => {
                      const Icon = TYPE_ICON[t.type];
                      const active = templateKey === t.key;
                      return (
                        <button
                          key={t.key}
                          onClick={() => onSelectTemplate(t.key)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Icon className={`h-4 w-4 mt-0.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-foreground">{t.name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                              <Badge variant="outline" className="mt-1 text-[10px]">{DOC_TYPE_LABEL[t.type]}</Badge>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* Middle: student picker + variables */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="p-4">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Recipient (Student)</Label>
                  <div className="mt-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search students by name, email, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                    </div>
                    <Select value={studentId} onValueChange={onSelectStudent}>
                      <SelectTrigger className="mt-3"><SelectValue placeholder="Select a student..." /></SelectTrigger>
                      <SelectContent>
                        {filteredStudents.slice(0, 200).map(s => (
                          <SelectItem key={s.user_id} value={s.user_id}>
                            {s.full_name} {s.student_id ? `· ${s.student_id}` : ""} {s.program ? `· ${s.program}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Card>

                <Card className="p-4">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Document Variables</Label>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {template.variables.map(v => (
                      <div key={v.key} className={v.type === "textarea" ? "md:col-span-2" : ""}>
                        <Label className="text-xs text-foreground">
                          {v.label}{v.required && <span className="text-destructive ml-0.5">*</span>}
                          {v.source === "student" && <span className="ml-1.5 text-[10px] text-primary">(auto)</span>}
                        </Label>
                        {v.type === "textarea" ? (
                          <Textarea
                            rows={4}
                            value={vars[v.key] || ""}
                            onChange={(e) => setVars(p => ({ ...p, [v.key]: e.target.value }))}
                            className="mt-1"
                          />
                        ) : (
                          <Input
                            type={v.type === "date" ? "date" : "text"}
                            value={vars[v.key] || ""}
                            onChange={(e) => setVars(p => ({ ...p, [v.key]: e.target.value }))}
                            className="mt-1"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button onClick={handlePreview} disabled={generating}>
                      <FileText className="h-4 w-4 mr-2" />
                      {generating ? "Generating..." : "Preview"}
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6 space-y-4">
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by title or reference..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="letter">Letter</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="acceptance_letter">Acceptance Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="divide-y divide-border">
                {filteredHistory.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">No documents generated yet.</div>
                )}
                {filteredHistory.map(d => {
                  const Icon = TYPE_ICON[d.document_type as DocumentType] || FileText;
                  return (
                    <div key={d.id} className="p-4 flex items-center gap-4 hover:bg-muted/40">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{d.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-[10px]">{DOC_TYPE_LABEL[d.document_type as DocumentType]}</Badge>
                          <span>Ref: {d.reference_code}</span>
                          <span>· {new Date(d.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => downloadGenerated(d.file_path, d.title)}>
                        <Download className="h-4 w-4 mr-1.5" /> Download
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this document?")) deleteMutation.mutate({ id: d.id, file_path: d.file_path }); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preview dialog */}
        <Dialog open={!!previewUrl} onOpenChange={(o) => { if (!o) { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPreviewBlob(null); } }}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Preview — {template.name}</DialogTitle>
            </DialogHeader>
            {previewUrl && (
              <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg border border-border bg-white" title="Document preview" />
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => {
                if (!previewUrl) return;
                const a = document.createElement("a");
                a.href = previewUrl;
                a.download = `${template.key}_${previewRef}.pdf`;
                a.click();
              }}>
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save to Student Record"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminDocuments;
