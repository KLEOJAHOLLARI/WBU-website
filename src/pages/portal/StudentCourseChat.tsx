import StudentLayout from "@/components/StudentLayout";
import { CourseDiscussions } from "@/components/CourseDiscussions";

const StudentCourseChat = () => (
  <StudentLayout>
    <CourseDiscussions role="student" />
  </StudentLayout>
);

export default StudentCourseChat;
