import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_courses",
  title: "List my courses",
  description:
    "List the courses the signed-in student is currently enrolled in, with code, name, ECTS, year and semester.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("enrollments")
      .select("courses(code, name, ects, year, semester)")
      .eq("user_id", ctx.getUserId());
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const courses = (data ?? []).map((row: any) => row.courses).filter(Boolean);
    return {
      content: [{ type: "text", text: JSON.stringify(courses, null, 2) }],
      structuredContent: { courses },
    };
  },
});
