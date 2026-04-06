import { useState } from "react";
import StudentLayout from "@/components/StudentLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, FileText, CheckCircle, Clock, XCircle } from "lucide-react";

const statusIcon = (status: string) => {
  switch (status) {
    case "approved": return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "rejected": return <XCircle className="h-4 w-4 text-destructive" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const StudentDocuments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["student-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_documents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: { id: string; file_path: string }) => {
      await supabase.storage.from("student-documents").remove([doc.file_path]);
      const { error } = await supabase.from("student_documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-documents"] });
      toast({ title: "Document deleted" });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("student-documents")
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("student_documents").insert({
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type || "other",
    });

    if (dbError) {
      toast({ title: "Error saving document record", variant: "destructive" });
    } else {
      toast({ title: "Document uploaded successfully!" });
      queryClient.invalidateQueries({ queryKey: ["student-documents"] });
    }
    setUploading(false);
    e.target.value = "";
  };

  return (
    <StudentLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My Documents</h1>
          <p className="text-sm text-muted-foreground">Upload and manage your required documents</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60">
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading..." : "Upload Document"}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
        </label>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : documents.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            No documents uploaded yet. Click "Upload Document" to get started.
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                  {doc.admin_note && (
                    <p className="mt-1 text-xs text-muted-foreground italic">Admin note: {doc.admin_note}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {statusIcon(doc.status)}
                  <span className="text-xs font-medium capitalize text-muted-foreground">{doc.status}</span>
                </div>
                <button
                  onClick={() => deleteMutation.mutate({ id: doc.id, file_path: doc.file_path })}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentDocuments;
