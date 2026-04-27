// AI Assistant chat - role-aware, streaming, with live-data tool calling.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

type Role = "guest" | "student" | "professor" | "admin" | "advisor";

interface ChatBody {
  messages: { role: "user" | "assistant"; content: string }[];
  context?: { path?: string; language?: "en" | "sq" };
}

const KNOWLEDGE = `
WBU University System modules:
- Public site: /, /about, /programs, /admissions, /scholarships, /news, /faculty, /timetable, /contact
- Student portal (/portal): dashboard, courses, registration, transcript, exams, tuition, documents, messages, id-card, access-history, profile
- Professor portal (/professor): dashboard, courses, announcements, advisor, transcripts, exams, profile, id-card
- Admin portal (/admin): students, professors, applications, courses, programs, timetable, semesters, tuition, exams, transcripts, analytics, graduation, documents, document-templates, communication, announcements, advisors, contacts, news, scholarship-docs, promo-banners, id-cards, access-logs, gate-activity, accounts
GPA scale: 0–10 (Albanian system) shown alongside ECTS credits.
Attendance threshold: configurable; below it blocks final exam access.
Scholarship: percentage discount applied to tuition; risk if GPA / attendance drops.
Course registration: students request enrollment; advisor/admin approves.
Documents: students request from /portal/documents; admin generates PDFs from templates.
Languages: English & Albanian (i18n).
`.trim();

function systemPrompt(role: Role, language: "en" | "sq", path?: string, profile?: any) {
  const lang = language === "sq" ? "Albanian (Shqip)" : "English";
  const roleBlocks: Record<Role, string> = {
    student:
      "You help STUDENTS with: their courses, GPA explanation, attendance rules, scholarship status, tuition, exam schedule, transcript, course registration, deadlines, study tips. Use tools to fetch the student's own data when asked.",
    professor:
      "You help PROFESSORS with: entering grades, attendance, student performance summaries, course management, generating quiz/assignment ideas, writing announcements, dashboard features.",
    admin:
      "You help ADMINS with: managing students/professors, generating reports, admissions, timetable, document generator, finance, troubleshooting, navigation. You can fetch counts (pending applications, students, etc.).",
    advisor:
      "You help ADVISORS with: approving registrations, student academic progress, missing credits, graduation checks, enrollment guidance.",
    guest:
      "You help VISITORS interested in WBU: programs, admissions, scholarships, faculty, contact. Encourage signing in for personalized help.",
  };

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  return [
    `You are **WBU Assistant**, the official AI helper for West Balkan University.`,
    `Tone: warm, professional, concise. Sound like a knowledgeable human advisor — not a robot.`,
    `Reply strictly in ${lang}. Today is ${dateStr}.`,
    `Current user role: **${role.toUpperCase()}**.`,
    profile?.full_name
      ? `User: ${profile.full_name}${profile.program ? ` — ${profile.program}` : ""}${profile.current_year ? `, year ${profile.current_year}` : ""}.`
      : "",
    path ? `Current page: \`${path}\`. Tailor suggestions to this context when useful.` : "",
    roleBlocks[role],
    "",
    "## Style rules",
    "- Default to ≤6 short sentences. Use bullet lists for steps or comparisons.",
    "- Use **bold** for key terms, `code` for UI labels, and emojis sparingly (max 1 per reply).",
    "- For navigation, output a single markdown link like [Open my courses](/portal/courses). Do not invent URLs not in the knowledge base.",
    "- When a tool returns numbers, restate them clearly (e.g. `Outstanding: 240 EUR`).",
    "- If you don't know, say so and suggest where to look — never fabricate grades, prices, or policies.",
    "- If the user asks something outside university scope, politely redirect.",
    "",
    "## Permissions",
    "Never reveal data outside the user's role. Students see only their own data. Professors only their courses. Admins all.",
    "",
    "## Knowledge base",
    KNOWLEDGE,
  ]
    .filter(Boolean)
    .join("\n");
}

// Tool definitions (only added when role matches)
function toolsFor(role: Role) {
  const tools: any[] = [];
  if (role === "student") {
    tools.push(
      {
        type: "function",
        function: {
          name: "get_my_profile_summary",
          description: "Get the signed-in student's profile: program, year, semester, scholarship, attendance hours.",
          parameters: { type: "object", properties: {}, additionalProperties: false },
        },
      },
      {
        type: "function",
        function: {
          name: "get_my_enrollments",
          description: "List the student's current course enrollments with course names and codes.",
          parameters: { type: "object", properties: {}, additionalProperties: false },
        },
      },
      {
        type: "function",
        function: {
          name: "get_my_tuition_summary",
          description: "Summarise the student's tuition charges: total, paid, outstanding.",
          parameters: { type: "object", properties: {}, additionalProperties: false },
        },
      },
    );
  }
  if (role === "professor") {
    tools.push({
      type: "function",
      function: {
        name: "get_my_courses",
        description: "List courses assigned to the signed-in professor with student counts.",
        parameters: { type: "object", properties: {}, additionalProperties: false },
      },
    });
  }
  if (role === "admin") {
    tools.push({
      type: "function",
      function: {
        name: "get_admin_overview",
        description: "Counts: pending applications, total students, total professors, courses, current semester.",
        parameters: { type: "object", properties: {}, additionalProperties: false },
      },
    });
  }
  if (role === "advisor") {
    tools.push({
      type: "function",
      function: {
        name: "get_pending_enrollment_requests",
        description: "List pending enrollment requests for the advisor's programs.",
        parameters: { type: "object", properties: {}, additionalProperties: false },
      },
    });
  }
  return tools;
}

async function runTool(name: string, userId: string, admin: any) {
  try {
    if (name === "get_my_profile_summary") {
      const { data } = await admin
        .from("profiles")
        .select(
          "full_name, program, current_year, current_semester, has_scholarship, scholarship_percentage, completed_open_lecture_hours, required_open_lecture_hours",
        )
        .eq("user_id", userId)
        .maybeSingle();
      return data ?? { error: "no profile" };
    }
    if (name === "get_my_enrollments") {
      const { data } = await admin
        .from("enrollments")
        .select("courses(name, code, ects, semester, year)")
        .eq("user_id", userId);
      return (data ?? []).map((r: any) => r.courses).filter(Boolean);
    }
    if (name === "get_my_tuition_summary") {
      const { data: charges } = await admin
        .from("tuition_charges")
        .select("amount, status, currency, due_date")
        .eq("user_id", userId);
      const total = (charges ?? []).reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      const unpaid = (charges ?? [])
        .filter((c: any) => c.status !== "paid" && c.status !== "waived")
        .reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      return { currency: charges?.[0]?.currency ?? "EUR", total, outstanding: unpaid, charges };
    }
    if (name === "get_my_courses") {
      const { data: courses } = await admin
        .from("courses")
        .select("id, name, code, semester, year")
        .eq("professor_id", userId);
      const ids = (courses ?? []).map((c: any) => c.id);
      let counts: Record<string, number> = {};
      if (ids.length) {
        const { data: en } = await admin.from("enrollments").select("course_id").in("course_id", ids);
        for (const e of en ?? []) counts[e.course_id] = (counts[e.course_id] ?? 0) + 1;
      }
      return (courses ?? []).map((c: any) => ({ ...c, student_count: counts[c.id] ?? 0 }));
    }
    if (name === "get_admin_overview") {
      const [apps, students, profs, courses, sem] = await Promise.all([
        admin.from("applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        admin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "user"),
        admin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "professor"),
        admin.from("courses").select("id", { count: "exact", head: true }),
        admin.from("academic_semesters").select("name, year, semester").eq("is_current", true).maybeSingle(),
      ]);
      return {
        pending_applications: apps.count ?? 0,
        students: students.count ?? 0,
        professors: profs.count ?? 0,
        courses: courses.count ?? 0,
        current_semester: sem.data ?? null,
      };
    }
    if (name === "get_pending_enrollment_requests") {
      const { data: progs } = await admin.from("program_advisors").select("program").eq("advisor_id", userId);
      const programs = (progs ?? []).map((p: any) => p.program);
      if (!programs.length) return [];
      const { data: courses } = await admin.from("courses").select("id, name, program").in("program", programs);
      const courseIds = (courses ?? []).map((c: any) => c.id);
      const { data: reqs } = await admin
        .from("enrollment_requests")
        .select("id, user_id, course_id, status, created_at")
        .in("course_id", courseIds)
        .eq("status", "pending");
      return reqs ?? [];
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  return { error: "unknown_tool" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = (await req.json()) as ChatBody;
    const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    const path = body.context?.path;
    const language = body.context?.language ?? "en";

    // Identify the user (optional). Use anon client with the user's JWT.
    let role: Role = "guest";
    let userId: string | null = null;
    let profile: any = null;
    const auth = req.headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: auth } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (u?.user) {
        userId = u.user.id;
        const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
        const set = new Set((roles ?? []).map((r: any) => r.role));
        if (set.has("admin")) role = "admin";
        else if (set.has("professor")) role = "professor";
        else role = "student";
        const { data: prof } = await admin
          .from("profiles")
          .select("full_name, program, current_year, current_semester")
          .eq("user_id", userId)
          .maybeSingle();
        profile = prof;
        // Treat professors who are listed as program_advisors as advisor for this conversation
        if (role === "professor") {
          const { count } = await admin
            .from("program_advisors")
            .select("id", { count: "exact", head: true })
            .eq("advisor_id", userId);
          if ((count ?? 0) > 0) role = "advisor";
        }
      }
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const tools = userId ? toolsFor(role) : [];

    // First pass: allow tool calls (non-streaming if tools present, then stream final answer)
    const baseMessages: any[] = [
      { role: "system", content: systemPrompt(role, language, path, profile) },
      ...messages,
    ];

    if (tools.length) {
      const first = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-5-mini",
          messages: baseMessages,
          tools,
          tool_choice: "auto",
        }),
      });
      if (!first.ok) {
        const t = await first.text();
        if (first.status === 429)
          return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        if (first.status === 402)
          return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Lovable Workspace usage." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        console.error("AI first pass error", first.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const firstJson = await first.json();
      const msg = firstJson.choices?.[0]?.message;
      const toolCalls = msg?.tool_calls ?? [];
      if (toolCalls.length && userId) {
        baseMessages.push(msg);
        for (const tc of toolCalls) {
          const result = await runTool(tc.function?.name, userId, admin);
          baseMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result).slice(0, 4000),
          });
        }
      } else if (msg?.content) {
        // Model answered directly. Wrap as a fake stream for client uniformity.
        const enc = new TextEncoder();
        const stream = new ReadableStream({
          start(c) {
            c.enqueue(
              enc.encode(
                `data: ${JSON.stringify({ choices: [{ delta: { content: msg.content } }] })}\n\n`,
              ),
            );
            c.enqueue(enc.encode("data: [DONE]\n\n"));
            c.close();
          },
        });
        return new Response(stream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
    }

    // Final streaming pass
    const final = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: baseMessages,
        stream: true,
      }),
    });
    if (!final.ok) {
      if (final.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (final.status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Lovable Workspace usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      const t = await final.text();
      console.error("AI final stream error", final.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(final.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
