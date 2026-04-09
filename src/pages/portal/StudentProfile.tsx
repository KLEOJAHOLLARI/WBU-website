import StudentLayout from "@/components/StudentLayout";
import ProfileSettings from "@/components/ProfileSettings";

const StudentProfile = () => (
  <StudentLayout>
    <h1 className="font-display text-2xl font-bold text-foreground">My Profile</h1>
    <p className="mt-1 text-sm text-muted-foreground">Manage your account settings</p>
    <div className="mt-6">
      <ProfileSettings />
    </div>
  </StudentLayout>
);

export default StudentProfile;
