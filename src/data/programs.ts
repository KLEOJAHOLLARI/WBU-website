export interface Program {
  id: string;
  title: string;
  faculty: string;
  degree: string;
  duration: string;
  description: string;
  overview: string;
  careers: string[];
  courses: string[];
}

export const faculties = [
  "Faculty of Engineering",
  "Faculty of Economics",
  "Faculty of Law",
  "Faculty of Medicine",
  "Faculty of Arts & Sciences",
] as const;

export const degrees = ["Bachelor", "Master", "PhD"] as const;

export const programs: Program[] = [
  {
    id: "computer-science",
    title: "Computer Science",
    faculty: "Faculty of Engineering",
    degree: "Bachelor",
    duration: "3 years",
    description: "Build the future with algorithms, software engineering, and cutting-edge technology.",
    overview: "Our Computer Science program equips students with a deep understanding of computational theory, software development, and modern technologies. From artificial intelligence to cybersecurity, graduates emerge ready to tackle the challenges of the digital age.",
    careers: ["Software Engineer", "Data Scientist", "Systems Architect", "AI Researcher"],
    courses: ["Data Structures & Algorithms", "Machine Learning", "Database Systems", "Operating Systems", "Web Development", "Cybersecurity"],
  },
  {
    id: "civil-engineering",
    title: "Civil Engineering",
    faculty: "Faculty of Engineering",
    degree: "Bachelor",
    duration: "4 years",
    description: "Design and build infrastructure that shapes communities and withstands the test of time.",
    overview: "The Civil Engineering program prepares students to design, construct, and maintain the physical infrastructure of society. Students learn structural analysis, environmental engineering, and project management through hands-on lab work and real-world projects.",
    careers: ["Structural Engineer", "Project Manager", "Urban Planner", "Environmental Consultant"],
    courses: ["Structural Analysis", "Fluid Mechanics", "Geotechnical Engineering", "Construction Management", "Environmental Engineering", "Transportation Systems"],
  },
  {
    id: "business-administration",
    title: "Business Administration",
    faculty: "Faculty of Economics",
    degree: "Bachelor",
    duration: "3 years",
    description: "Develop leadership skills and business acumen to thrive in the global economy.",
    overview: "Our Business Administration program provides a comprehensive education in management, finance, marketing, and entrepreneurship. Students develop critical thinking and leadership skills essential for success in today's competitive business environment.",
    careers: ["Business Analyst", "Marketing Manager", "Financial Advisor", "Entrepreneur"],
    courses: ["Principles of Management", "Financial Accounting", "Marketing Strategy", "Business Law", "Organizational Behavior", "Strategic Planning"],
  },
  {
    id: "international-law",
    title: "International Law",
    faculty: "Faculty of Law",
    degree: "Master",
    duration: "2 years",
    description: "Navigate the complexities of international legal systems and human rights frameworks.",
    overview: "The International Law master's program offers advanced study in international treaties, human rights law, and cross-border dispute resolution. Students engage with real case studies and moot court competitions to hone their advocacy skills.",
    careers: ["International Lawyer", "Diplomat", "Legal Consultant", "Human Rights Advocate"],
    courses: ["International Public Law", "Human Rights Law", "Trade & Investment Law", "Conflict Resolution", "Maritime Law", "International Criminal Law"],
  },
  {
    id: "general-medicine",
    title: "General Medicine",
    faculty: "Faculty of Medicine",
    degree: "Bachelor",
    duration: "6 years",
    description: "Train to become a compassionate, skilled physician ready to serve communities.",
    overview: "Our six-year General Medicine program combines rigorous academic study with extensive clinical training. Students rotate through hospitals and clinics, gaining hands-on experience in diagnosis, treatment, and patient care across all medical specialties.",
    careers: ["General Practitioner", "Surgeon", "Medical Researcher", "Public Health Officer"],
    courses: ["Human Anatomy", "Biochemistry", "Pathology", "Pharmacology", "Clinical Medicine", "Medical Ethics"],
  },
  {
    id: "psychology",
    title: "Psychology",
    faculty: "Faculty of Arts & Sciences",
    degree: "Bachelor",
    duration: "3 years",
    description: "Understand human behavior and mental processes to make a difference in people's lives.",
    overview: "The Psychology program explores the science of mind and behavior. Students study cognitive, developmental, and clinical psychology, gaining research skills and practical experience through internships in counseling and community settings.",
    careers: ["Clinical Psychologist", "Counselor", "HR Specialist", "Research Analyst"],
    courses: ["Introduction to Psychology", "Cognitive Psychology", "Developmental Psychology", "Abnormal Psychology", "Research Methods", "Neuropsychology"],
  },
  {
    id: "data-science",
    title: "Data Science & Analytics",
    faculty: "Faculty of Engineering",
    degree: "Master",
    duration: "2 years",
    description: "Harness the power of data to drive innovation and informed decision-making.",
    overview: "This interdisciplinary master's program blends statistics, computer science, and domain expertise. Students work with big data tools, machine learning frameworks, and visualization techniques to extract actionable insights from complex datasets.",
    careers: ["Data Scientist", "ML Engineer", "Business Intelligence Analyst", "Quantitative Analyst"],
    courses: ["Statistical Learning", "Big Data Technologies", "Deep Learning", "Data Visualization", "Natural Language Processing", "Ethics in AI"],
  },
  {
    id: "architecture",
    title: "Architecture",
    faculty: "Faculty of Engineering",
    degree: "Bachelor",
    duration: "5 years",
    description: "Blend art and engineering to design spaces that inspire and function beautifully.",
    overview: "Our Architecture program nurtures creative thinkers who can design sustainable, aesthetically compelling structures. Students learn architectural theory, digital modeling, and urban design, completing studio projects that address real community needs.",
    careers: ["Architect", "Urban Designer", "Interior Designer", "Sustainability Consultant"],
    courses: ["Architectural Design Studio", "Building Technology", "History of Architecture", "Digital Modeling", "Sustainable Design", "Urban Planning"],
  },
];
