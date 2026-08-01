import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_announcements",
  title: "List announcements",
  description: "List the most recent WBU announcements visible to the signed-in user.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("announcements")
      .select("title, content, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const announcements = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(announcements, null, 2) }],
      structuredContent: { announcements },
    };
  },
});
