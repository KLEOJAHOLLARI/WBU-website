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
import Timetable from "./pages/Timetable";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPrograms from "./pages/admin/AdminPrograms";
import AdminNews from "./pages/admin/AdminNews";
import AdminApplications from "./pages/admin/AdminApplications";
import AdminContacts from "./pages/admin/AdminContacts";
import AdminProfessors from "./pages/admin/AdminProfessors";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminTimetable from "./pages/admin/AdminTimetable";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminAccounts from "./pages/admin/AdminAccounts";
import Faculty from "./pages/Faculty";
import NotFound from "./pages/NotFound";
import StudentLogin from "./pages/portal/StudentLogin";
import StudentRegister from "./pages/portal/StudentRegister";
import StudentDashboard from "./pages/portal/StudentDashboard";
import StudentApplications from "./pages/portal/StudentApplications";
import StudentDocuments from "./pages/portal/StudentDocuments";
import StudentMessages from "./pages/portal/StudentMessages";
import StudentTimetable from "./pages/portal/StudentTimetable";
import StudentCourses from "./pages/portal/StudentCourses";
import StudentRegistration from "./pages/portal/StudentRegistration";
import StudentCourseDetail from "./pages/portal/StudentCourseDetail";
import ProfessorDashboard from "./pages/professor/ProfessorDashboard";
import ProfessorCourses from "./pages/professor/ProfessorCourses";
import ProfessorCourseDetail from "./pages/professor/ProfessorCourseDetail";
import ProfessorAnnouncements from "./pages/professor/ProfessorAnnouncements";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminAdvisors from "./pages/admin/AdminAdvisors";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminTranscripts from "./pages/admin/AdminTranscripts";
import AdminTranscriptSettings from "./pages/admin/AdminTranscriptSettings";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminGraduation from "./pages/admin/AdminGraduation";
import AdminSemesters from "./pages/admin/AdminSemesters";
import StudentProfile from "./pages/portal/StudentProfile";
import ProfessorProfile from "./pages/professor/ProfessorProfile";
import StudentTranscript from "./pages/portal/StudentTranscript";
import ProfessorAdvisor from "./pages/professor/ProfessorAdvisor";
import ProfessorTranscripts from "./pages/professor/ProfessorTranscripts";
import ChangePassword from "./pages/portal/ChangePassword";
import StudentQuiz from "./pages/portal/StudentQuiz";
import StudentExamSchedule from "./pages/portal/StudentExamSchedule";

import FacultyProfile from "./pages/FacultyProfile";
import AdminTuition from "./pages/admin/AdminTuition";
import StudentTuition from "./pages/portal/StudentTuition";
import StudentTuitionEstimate from "./pages/portal/StudentTuitionEstimate";
import LateFeeReceipt from "./pages/portal/LateFeeReceipt";
import AdminExamSchedule from "./pages/admin/AdminExamSchedule";
import ProfessorExamSchedule from "./pages/professor/ProfessorExamSchedule";
import ExamDetail from "./pages/portal/ExamDetail";
import AdminPromoBanners from "./pages/admin/AdminPromoBanners";
import Scholarships from "./pages/Scholarships";
import AdminScholarshipDocs from "./pages/admin/AdminScholarshipDocs";
import AdminCommunication from "./pages/admin/AdminCommunication";
import StudentDigitalIDCard from "./pages/portal/StudentDigitalIDCard";
import AdminDigitalIDCards from "./pages/admin/AdminDigitalIDCards";
import ProfessorDigitalIDCard from "./pages/professor/ProfessorDigitalIDCard";

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
            <Route path="/scholarships" element={<Scholarships />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:id" element={<NewsDetail />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faculty" element={<Faculty />} />
            <Route path="/faculty/:id" element={<FacultyProfile />} />
            <Route path="/professors/:id" element={<FacultyProfile />} />
            <Route path="/timetable" element={<Timetable />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/programs" element={<AdminPrograms />} />
            <Route path="/admin/news" element={<AdminNews />} />
            <Route path="/admin/applications" element={<AdminApplications />} />
            <Route path="/admin/contacts" element={<AdminContacts />} />
            <Route path="/admin/professors" element={<AdminProfessors />} />
            <Route path="/admin/students" element={<AdminStudents />} />
            <Route path="/admin/timetable" element={<AdminTimetable />} />
            <Route path="/admin/courses" element={<AdminCourses />} />
            <Route path="/admin/accounts" element={<AdminAccounts />} />
            <Route path="/admin/announcements" element={<AdminAnnouncements />} />
            <Route path="/admin/communication" element={<AdminCommunication />} />
            <Route path="/admin/advisors" element={<AdminAdvisors />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
            <Route path="/admin/transcripts" element={<AdminTranscripts />} />
            <Route path="/admin/transcripts/settings" element={<AdminTranscriptSettings />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/graduation" element={<AdminGraduation />} />
            <Route path="/admin/semesters" element={<AdminSemesters />} />
            <Route path="/admin/tuition" element={<AdminTuition />} />
            <Route path="/admin/exams" element={<AdminExamSchedule />} />
            <Route path="/admin/promo-banners" element={<AdminPromoBanners />} />
            <Route path="/admin/scholarship-docs" element={<AdminScholarshipDocs />} />
            <Route path="/admin/id-cards" element={<AdminDigitalIDCards />} />
            <Route path="/portal/login" element={<StudentLogin />} />
            <Route path="/portal/register" element={<StudentRegister />} />
            <Route path="/portal" element={<StudentDashboard />} />
            <Route path="/portal/applications" element={<StudentApplications />} />
            <Route path="/portal/documents" element={<StudentDocuments />} />
            <Route path="/portal/messages" element={<StudentMessages />} />
            <Route path="/portal/timetable" element={<StudentTimetable />} />
            <Route path="/portal/courses" element={<StudentCourses />} />
            <Route path="/portal/registration" element={<StudentRegistration />} />
            <Route path="/portal/courses/:id" element={<StudentCourseDetail />} />
            <Route path="/portal/profile" element={<StudentProfile />} />
            <Route path="/portal/transcript" element={<StudentTranscript />} />
            <Route path="/portal/id-card" element={<StudentDigitalIDCard />} />
            <Route path="/portal/change-password" element={<ChangePassword />} />
            <Route path="/portal/exams" element={<StudentExamSchedule />} />
            <Route path="/portal/exams/:id" element={<ExamDetail />} />
            <Route path="/portal/tuition" element={<StudentTuition />} />
            <Route path="/portal/tuition/estimate" element={<StudentTuitionEstimate />} />
            <Route path="/portal/tuition/late-fee/:lateFeeId/receipt" element={<LateFeeReceipt />} />
            <Route path="/portal/quiz/:quizId" element={<StudentQuiz />} />
            <Route path="/professor" element={<ProfessorDashboard />} />
            <Route path="/professor/courses" element={<ProfessorCourses />} />
            <Route path="/professor/courses/:id" element={<ProfessorCourseDetail />} />
            <Route path="/professor/announcements" element={<ProfessorAnnouncements />} />
            <Route path="/professor/advisor" element={<ProfessorAdvisor />} />
            <Route path="/professor/transcripts" element={<ProfessorTranscripts />} />
            <Route path="/professor/exams" element={<ProfessorExamSchedule />} />
            <Route path="/professor/profile" element={<ProfessorProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
