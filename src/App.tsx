import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import About from "./pages/About";
import Programs from "./pages/Programs";
import ProgramDetail from "./pages/ProgramDetail";
import Admissions from "./pages/Admissions";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import Contact from "./pages/Contact";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPrograms from "./pages/admin/AdminPrograms";
import AdminNews from "./pages/admin/AdminNews";
import AdminApplications from "./pages/admin/AdminApplications";
import AdminContacts from "./pages/admin/AdminContacts";
import AdminProfessors from "./pages/admin/AdminProfessors";
import AdminStudents from "./pages/admin/AdminStudents";
import Faculty from "./pages/Faculty";
import NotFound from "./pages/NotFound";
import StudentLogin from "./pages/portal/StudentLogin";
import StudentRegister from "./pages/portal/StudentRegister";
import StudentDashboard from "./pages/portal/StudentDashboard";
import StudentApplications from "./pages/portal/StudentApplications";
import StudentDocuments from "./pages/portal/StudentDocuments";
import StudentMessages from "./pages/portal/StudentMessages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/programs/:id" element={<ProgramDetail />} />
            <Route path="/admissions" element={<Admissions />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:id" element={<NewsDetail />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faculty" element={<Faculty />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/programs" element={<AdminPrograms />} />
            <Route path="/admin/news" element={<AdminNews />} />
            <Route path="/admin/applications" element={<AdminApplications />} />
            <Route path="/admin/contacts" element={<AdminContacts />} />
            <Route path="/admin/professors" element={<AdminProfessors />} />
            <Route path="/admin/students" element={<AdminStudents />} />
            <Route path="/portal/login" element={<StudentLogin />} />
            <Route path="/portal/register" element={<StudentRegister />} />
            <Route path="/portal" element={<StudentDashboard />} />
            <Route path="/portal/applications" element={<StudentApplications />} />
            <Route path="/portal/documents" element={<StudentDocuments />} />
            <Route path="/portal/messages" element={<StudentMessages />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
