import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_tuition_summary",
  title: "Get my tuition summary",
  description:
    "Summarise the signed-in student's tuition: total charged, outstanding balance, and individual charges.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("tuition_charges")
      .select("description, amount, currency, status, due_date")
      .eq("user_id", ctx.getUserId());
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const charges = data ?? [];
    const total = charges.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
    const outstanding = charges
      .filter((c: any) => c.status !== "paid" && c.status !== "waived")
      .reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
    const summary = {
      currency: (charges[0] as any)?.currency ?? "EUR",
      total,
      outstanding,
      charges,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
