import AdminLayout from "@/components/AdminLayout";
import ProfileSettings from "@/components/ProfileSettings";

const AdminProfile = () => (
  <AdminLayout>
    <h1 className="font-display text-2xl font-bold text-foreground">My Profile</h1>
    <p className="mt-1 text-sm text-muted-foreground">Manage your account settings</p>
    <div className="mt-6">
      <ProfileSettings />
    </div>
  </AdminLayout>
);

export default AdminProfile;
