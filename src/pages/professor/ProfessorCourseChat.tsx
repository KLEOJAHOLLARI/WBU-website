import ProfessorLayout from "@/components/ProfessorLayout";
import { CourseDiscussions } from "@/components/CourseDiscussions";

const ProfessorCourseChat = () => (
  <ProfessorLayout>
    <CourseDiscussions role="professor" />
  </ProfessorLayout>
);

export default ProfessorCourseChat;
