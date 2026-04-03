export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  category: "News" | "Event" | "Announcement";
  image: string;
}

export const newsArticles: NewsArticle[] = [
  {
    id: "international-research-conference-2026",
    title: "University Hosts International Research Conference 2026",
    excerpt: "Over 500 scholars from 30 countries gathered to present groundbreaking research across multiple disciplines.",
    content: "The 12th Annual International Research Conference brought together leading academics, researchers, and industry professionals from around the world. The three-day event featured keynote speeches, panel discussions, and poster presentations covering topics from renewable energy to public health innovation. This year's theme, \"Bridging Knowledge for a Sustainable Future,\" highlighted the university's commitment to interdisciplinary collaboration and global impact.",
    date: "2026-03-28",
    category: "Event",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
  },
  {
    id: "new-engineering-lab",
    title: "State-of-the-Art Engineering Laboratory Opens",
    excerpt: "A €2.5 million investment brings cutting-edge facilities for robotics, AI, and advanced materials research.",
    content: "The new Advanced Engineering Laboratory was officially inaugurated this week, marking a significant milestone in the university's infrastructure development. The 2,000 square meter facility houses advanced robotics workstations, AI computing clusters, and materials testing equipment. Students and researchers will have access to industry-standard tools that bridge the gap between academic study and professional practice.",
    date: "2026-03-15",
    category: "News",
    image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80",
  },
  {
    id: "spring-admissions-open",
    title: "Spring 2026 Admissions Now Open",
    excerpt: "Applications are being accepted for all undergraduate and graduate programs with early decision deadlines in April.",
    content: "Prospective students are invited to apply for the Spring 2026 semester across all faculties. The admissions office is offering virtual campus tours, online information sessions, and one-on-one consultations with academic advisors. Scholarships are available for outstanding applicants, including merit-based awards covering up to 100% of tuition fees. Early decision applicants will receive priority housing and course registration benefits.",
    date: "2026-03-01",
    category: "Announcement",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
  },
  {
    id: "student-innovation-award",
    title: "Students Win National Innovation Competition",
    excerpt: "A team of engineering students took first place with their sustainable water purification system.",
    content: "A team of four undergraduate students from the Faculty of Engineering won the National Innovation Competition with their solar-powered water purification device. The portable system can produce up to 500 liters of clean drinking water per day using only sunlight, making it ideal for remote communities. The team received a €50,000 grant to further develop their prototype and prepare it for commercial production.",
    date: "2026-02-20",
    category: "News",
    image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80",
  },
  {
    id: "alumni-networking-gala",
    title: "Annual Alumni Networking Gala",
    excerpt: "Join hundreds of alumni for an evening of connection, mentorship, and celebration at the Grand Hall.",
    content: "The Alumni Association invites all graduates to the Annual Networking Gala on April 15th at the University Grand Hall. This prestigious event brings together successful alumni from diverse fields to share experiences, offer mentorship to current students, and celebrate the university community. The evening will feature keynote remarks from distinguished alumna Dr. Elena Marku, CEO of TechBridge Innovations, followed by dinner and live music.",
    date: "2026-02-10",
    category: "Event",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80",
  },
];
