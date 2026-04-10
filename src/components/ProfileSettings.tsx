import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Camera, Save, KeyRound, Mail } from "lucide-react";

const ProfileSettings = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (profile && !initialized) {
    setFullName(profile.full_name || "");
    setPhone(profile.phone || "");
    setPendingEmail("");
    setInitialized(true);
  }

  const updateProfile = useMutation({
    mutationFn: async () => {
      const updates: { full_name: string; phone: string | null; pending_email?: string; email?: string } = {
        full_name: fullName,
        phone: phone || null,
      };
      if (pendingEmail && pendingEmail !== profile?.email) {
        if (isAdmin) {
          // Admin: update email directly, no approval needed
          updates.email = pendingEmail;
        } else {
          updates.pending_email = pendingEmail;
        }
      }
      const { error } = await supabase.from("profiles").update(updates).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      toast({ title: "Profile updated!" });
      if (pendingEmail && pendingEmail !== profile?.email && !isAdmin) {
        toast({ title: "Email change request submitted for admin approval", description: "Your email will be updated once an admin approves it." });
      }
      setPendingEmail("");
    },
    onError: () => toast({ title: "Error updating profile", variant: "destructive" }),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully!" });
      setOldPassword("");
      setNewPassword("");
    },
    onError: (e: any) => toast({ title: e.message || "Error changing password", variant: "destructive" }),
  });

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      toast({ title: "Photo updated!" });
    },
    onError: () => toast({ title: "Error uploading photo", variant: "destructive" }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadPhoto.mutate(file);
  };

  if (isLoading) return <p className="text-muted-foreground">Loading profile...</p>;

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-border bg-secondary">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                {(profile?.full_name || "U")[0].toUpperCase()}
              </div>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:text-primary"
          >
            <Camera className="h-4 w-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
        <div>
          <p className="font-display text-lg font-semibold text-foreground">{profile?.full_name || "User"}</p>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
          {profile?.pending_email && (
            <p className="mt-1 text-xs text-warning">Pending email change: {profile.pending_email}</p>
          )}
        </div>
      </div>

      {/* Personal Information (read-only) */}
      {(profile?.gender || profile?.birthplace || profile?.personal_id || profile?.student_id || profile?.student_exam_code) && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Personal Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {profile?.gender && (
              <div>
                <p className="text-xs text-muted-foreground">Gender</p>
                <p className="font-medium text-foreground">{profile.gender}</p>
              </div>
            )}
            {profile?.birthplace && (
              <div>
                <p className="text-xs text-muted-foreground">Birthplace</p>
                <p className="font-medium text-foreground">{profile.birthplace}</p>
              </div>
            )}
            {profile?.personal_id && (
              <div>
                <p className="text-xs text-muted-foreground">Personal ID</p>
                <p className="font-medium text-foreground">{profile.personal_id}</p>
              </div>
            )}
            {profile?.student_id && (
              <div>
                <p className="text-xs text-muted-foreground">Student ID</p>
                <p className="font-medium text-foreground">{profile.student_id}</p>
              </div>
            )}
            {profile?.student_exam_code && (
              <div>
                <p className="text-xs text-muted-foreground">Exam Code</p>
                <p className="font-medium text-foreground">{profile.student_exam_code}</p>
              </div>
            )}
            {profile?.program && (
              <div>
                <p className="text-xs text-muted-foreground">Program</p>
                <p className="font-medium text-foreground">{profile.program}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Info */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Profile Information</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {isAdmin ? "Email Address" : "Request Email Change"}</span>
            </label>
            <input
              value={pendingEmail}
              onChange={(e) => setPendingEmail(e.target.value)}
              placeholder={profile?.email || "New email address"}
              type="email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {!isAdmin && <p className="mt-1 text-xs text-muted-foreground">Email changes require admin approval</p>}
          </div>
          <button
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <KeyRound className="h-5 w-5" /> Change Password
        </h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => changePassword.mutate()}
            disabled={changePassword.isPending || newPassword.length < 6}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {changePassword.isPending ? "Changing..." : "Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
