import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Find due pending announcements
    const nowIso = new Date().toISOString();
    const { data: due, error: dueErr } = await admin
      .from("scheduled_announcements")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", nowIso)
      .limit(50);

    if (dueErr) throw dueErr;

    const results: Array<{ id: string; recipients: number; status: string }> = [];

    for (const ann of due || []) {
      try {
        // Resolve recipients by programs
        let query = admin.from("profiles").select("user_id").eq("account_status", "approved");
        const programs: string[] = (ann as any).target_programs || [];
        if (programs.length > 0) {
          query = query.in("program", programs);
        }
        const { data: recips, error: rErr } = await query;
        if (rErr) throw rErr;

        const rows = (recips || []).map((r: any) => ({
          user_id: r.user_id,
          subject: (ann as any).subject,
          body: (ann as any).body,
          sent_by_admin: true,
          is_read: false,
        }));

        if (rows.length > 0) {
          // Insert in chunks of 500
          for (let i = 0; i < rows.length; i += 500) {
            const chunk = rows.slice(i, i + 500);
            const { error: insErr } = await admin.from("student_messages").insert(chunk);
            if (insErr) throw insErr;
          }
        }

        await admin
          .from("scheduled_announcements")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            recipient_count: rows.length,
            error_message: null,
          })
          .eq("id", (ann as any).id);

        results.push({ id: (ann as any).id, recipients: rows.length, status: "sent" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await admin
          .from("scheduled_announcements")
          .update({ status: "failed", error_message: msg })
          .eq("id", (ann as any).id);
        results.push({ id: (ann as any).id, recipients: 0, status: "failed" });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
