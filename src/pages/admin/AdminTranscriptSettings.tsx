import AdminLayout from "@/components/AdminLayout";
import TranscriptSignatureSettings from "@/components/admin/TranscriptSignatureSettings";

const AdminTranscriptSettings = () => (
  <AdminLayout>
    <h1 className="font-display text-2xl font-bold text-foreground">Transcript Settings</h1>
    <p className="mt-1 text-sm text-muted-foreground">
      Manage the official signature and verification block printed on every transcript PDF.
    </p>
    <div className="mt-6">
      <TranscriptSignatureSettings />
    </div>
  </AdminLayout>
);

export default AdminTranscriptSettings;
