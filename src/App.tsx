import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
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
import Complaints from "./pages/Complaints";
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
import RouteGuard from "./components/RouteGuard";
import SmartWBU from "./pages/SmartWBU";
import StudentLogin from "./pages/portal/StudentLogin";
import StudentRegister from "./pages/portal/StudentRegister";
import StudentDashboard from "./pages/portal/StudentDashboard";
import StudentApplications from "./pages/portal/StudentApplications";
import StudentDocuments from "./pages/portal/StudentDocuments";
import StudentMessages from "./pages/portal/StudentMessages";
import StudentNotifications from "./pages/portal/StudentNotifications";
import StudentTimetable from "./pages/portal/StudentTimetable";
import StudentCourses from "./pages/portal/StudentCourses";
import StudentRegistration from "./pages/portal/StudentRegistration";
import StudentRetake from "./pages/portal/StudentRetake";
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
import AdminRetakeSettings from "./pages/admin/AdminRetakeSettings";
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
import AdminHeroMedia from "./pages/admin/AdminHeroMedia";
import AdminHomepageModal from "./pages/admin/AdminHomepageModal";
import Scholarships from "./pages/Scholarships";
import AdminScholarshipDocs from "./pages/admin/AdminScholarshipDocs";
import AdminCommunication from "./pages/admin/AdminCommunication";
import StudentDigitalIDCard from "./pages/portal/StudentDigitalIDCard";
import AdminDigitalIDCards from "./pages/admin/AdminDigitalIDCards";
import ProfessorDigitalIDCard from "./pages/professor/ProfessorDigitalIDCard";
import AdminAccessLogs from "./pages/admin/AdminAccessLogs";
import AdminGateActivity from "./pages/admin/AdminGateActivity";
import StudentAccessHistory from "./pages/portal/StudentAccessHistory";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminDocumentTemplates from "./pages/admin/AdminDocumentTemplates";
import AdminCalendar from "./pages/admin/AdminCalendar";
import AdminRooms from "./pages/admin/AdminRooms";
import AdminComplaints from "./pages/admin/AdminComplaints";
import AdminPushNotifications from "./pages/admin/AdminPushNotifications";
import AdminStaffPerformance from "./pages/admin/AdminStaffPerformance";
import ProfessorPerformance from "./pages/professor/ProfessorPerformance";
import StudentFeedback from "./pages/portal/StudentFeedback";
import AdminDeansList from "./pages/admin/AdminDeansList";
import DeansList from "./pages/DeansList";
import DeansListPreview from "./pages/DeansListPreview";
import AIAssistant from "./components/AIAssistant";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
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
            <Route path="/complaints" element={<Complaints />} />
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
            <Route path="/admin/retake-settings" element={<AdminRetakeSettings />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/graduation" element={<AdminGraduation />} />
            <Route path="/admin/semesters" element={<AdminSemesters />} />
            <Route path="/admin/tuition" element={<AdminTuition />} />
            <Route path="/admin/exams" element={<AdminExamSchedule />} />
            <Route path="/admin/promo-banners" element={<AdminPromoBanners />} />
            <Route path="/admin/hero-media" element={<AdminHeroMedia />} />
            <Route path="/admin/homepage-modal" element={<AdminHomepageModal />} />
            <Route path="/admin/scholarship-docs" element={<AdminScholarshipDocs />} />
            <Route path="/admin/id-cards" element={<AdminDigitalIDCards />} />
            <Route path="/admin/access-logs" element={<AdminAccessLogs />} />
            <Route path="/admin/gate-activity" element={<AdminGateActivity />} />
            <Route path="/admin/documents" element={<AdminDocuments />} />
            <Route path="/admin/document-templates" element={<AdminDocumentTemplates />} />
            <Route path="/admin/calendar" element={<AdminCalendar />} />
            <Route path="/admin/rooms" element={<AdminRooms />} />
            <Route path="/admin/complaints" element={<AdminComplaints />} />
            <Route path="/admin/push-notifications" element={<AdminPushNotifications />} />
            <Route path="/admin/staff-performance" element={<AdminStaffPerformance />} />
            <Route path="/admin/deans-list" element={<AdminDeansList />} />
            <Route path="/deans-list" element={<DeansList />} />
            <Route path="/deans-list/preview" element={<DeansListPreview />} />
            <Route path="/presidents-honor-list" element={<DeansList />} />
            <Route path="/presidents-honor-list/preview" element={<DeansListPreview />} />
            <Route path="/smartwbu" element={<SmartWBU />} />
            <Route path="/portal/login" element={<StudentLogin />} />
            <Route path="/portal/register" element={<StudentRegister />} />
            <Route path="/portal" element={<RouteGuard requireRole="student"><StudentDashboard /></RouteGuard>} />
            <Route path="/portal/applications" element={<RouteGuard requireRole="student"><StudentApplications /></RouteGuard>} />
            <Route path="/portal/documents" element={<RouteGuard requireRole="student"><StudentDocuments /></RouteGuard>} />
            <Route path="/portal/messages" element={<RouteGuard requireRole="student"><StudentMessages /></RouteGuard>} />
            <Route path="/portal/notifications" element={<RouteGuard requireRole="student"><StudentNotifications /></RouteGuard>} />
            <Route path="/portal/timetable" element={<RouteGuard requireRole="student"><StudentTimetable /></RouteGuard>} />
            <Route path="/portal/courses" element={<RouteGuard requireRole="student"><StudentCourses /></RouteGuard>} />
            <Route path="/portal/registration" element={<RouteGuard requireRole="student"><StudentRegistration /></RouteGuard>} />
            <Route path="/portal/retake" element={<RouteGuard requireRole="student"><StudentRetake /></RouteGuard>} />
            <Route path="/portal/courses/:id" element={<RouteGuard requireRole="student"><StudentCourseDetail /></RouteGuard>} />
            <Route path="/portal/profile" element={<RouteGuard requireRole="student"><StudentProfile /></RouteGuard>} />
            <Route path="/portal/transcript" element={<RouteGuard requireRole="student"><StudentTranscript /></RouteGuard>} />
            <Route path="/portal/id-card" element={<RouteGuard requireRole="student"><StudentDigitalIDCard /></RouteGuard>} />
            <Route path="/portal/access-history" element={<RouteGuard requireRole="student"><StudentAccessHistory /></RouteGuard>} />
            <Route path="/portal/change-password" element={<RouteGuard requireRole="student"><ChangePassword /></RouteGuard>} />
            <Route path="/portal/exams" element={<RouteGuard requireRole="student"><StudentExamSchedule /></RouteGuard>} />
            <Route path="/portal/exams/:id" element={<RouteGuard requireRole="student"><ExamDetail /></RouteGuard>} />
            <Route path="/portal/tuition" element={<RouteGuard requireRole="student"><StudentTuition /></RouteGuard>} />
            <Route path="/portal/tuition/estimate" element={<RouteGuard requireRole="student"><StudentTuitionEstimate /></RouteGuard>} />
            <Route path="/portal/tuition/late-fee/:lateFeeId/receipt" element={<RouteGuard requireRole="student"><LateFeeReceipt /></RouteGuard>} />
            <Route path="/portal/quiz/:quizId" element={<RouteGuard requireRole="student"><StudentQuiz /></RouteGuard>} />
            <Route path="/professor" element={<RouteGuard requireRole="professor"><ProfessorDashboard /></RouteGuard>} />
            <Route path="/professor/courses" element={<RouteGuard requireRole="professor"><ProfessorCourses /></RouteGuard>} />
            <Route path="/professor/courses/:id" element={<RouteGuard requireRole="professor"><ProfessorCourseDetail /></RouteGuard>} />
            <Route path="/professor/announcements" element={<RouteGuard requireRole="professor"><ProfessorAnnouncements /></RouteGuard>} />
            <Route path="/professor/advisor" element={<RouteGuard requireRole="professor"><ProfessorAdvisor /></RouteGuard>} />
            <Route path="/professor/transcripts" element={<RouteGuard requireRole="professor"><ProfessorTranscripts /></RouteGuard>} />
            <Route path="/professor/exams" element={<RouteGuard requireRole="professor"><ProfessorExamSchedule /></RouteGuard>} />
            <Route path="/professor/profile" element={<RouteGuard requireRole="professor"><ProfessorProfile /></RouteGuard>} />
            <Route path="/professor/id-card" element={<RouteGuard requireRole="professor"><ProfessorDigitalIDCard /></RouteGuard>} />
            <Route path="/professor/performance" element={<RouteGuard requireRole="professor"><ProfessorPerformance /></RouteGuard>} />
            <Route path="/portal/feedback" element={<RouteGuard requireRole="student"><StudentFeedback /></RouteGuard>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIAssistant />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
