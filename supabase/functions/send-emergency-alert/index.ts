import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Payload {
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  audience_role: "all" | "user" | "professor";
  audience_program?: string | null;
  channels: string[]; // 'in_app' | 'email' | 'sms'
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (!roles?.some((r: any) => r.role === "admin")) {
      return json({ error: "forbidden" }, 403);
    }

    const body = (await req.json()) as Payload;
    if (!body.title?.trim() || !body.message?.trim()) {
      return json({ error: "title and message required" }, 400);
    }
    const channels = body.channels?.length ? body.channels : ["in_app"];
    const severity = body.severity ?? "info";
    const audience_role = body.audience_role ?? "all";

    // 1) Insert alert row
    const { data: alert, error: alertErr } = await admin
      .from("emergency_alerts")
      .insert({
        title: body.title,
        message: body.message,
        severity,
        audience_role,
        audience_program: body.audience_program ?? null,
        channels,
        sent_by: user.id,
      })
      .select()
      .single();
    if (alertErr) return json({ error: alertErr.message }, 500);

    // 2) Fetch recipient profiles
    let profQuery = admin.from("profiles").select("user_id, full_name, email, phone, program");
    if (body.audience_program) profQuery = profQuery.eq("program", body.audience_program);
    const { data: profiles } = await profQuery;

    let recipients = profiles ?? [];
    if (audience_role !== "all") {
      const { data: roleRows } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", audience_role);
      const allowed = new Set((roleRows ?? []).map((r: any) => r.user_id));
      recipients = recipients.filter((p: any) => allowed.has(p.user_id));
    }

    const stats: Record<string, any> = { total: recipients.length, in_app: 0, email: 0, sms: 0, errors: [] };

    // 3) In-app push notifications
    if (channels.includes("in_app")) {
      const prefix = severity === "critical" ? "🚨 EMERGENCY: " : severity === "warning" ? "⚠️ ALERT: " : "ℹ️ NOTICE: ";
      const { error: pushErr } = await admin.from("push_notifications").insert({
        title: `${prefix}${body.title}`,
        body: body.message,
        link: "/portal/alerts",
        audience_role: audience_role === "all" ? "user" : audience_role,
        audience_program: body.audience_program ?? null,
        sent_by: user.id,
      });
      if (pushErr) stats.errors.push(`in_app: ${pushErr.message}`);
      else stats.in_app = recipients.length;

      // Also push to professors when audience is 'all'
      if (audience_role === "all") {
        await admin.from("push_notifications").insert({
          title: `${prefix}${body.title}`,
          body: body.message,
          link: "/professor/alerts",
          audience_role: "professor",
          audience_program: body.audience_program ?? null,
          sent_by: user.id,
        });
      }
    }

    // 4) Email via Resend if configured
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (channels.includes("email")) {
      if (!resendKey) {
        stats.errors.push("email: RESEND_API_KEY not configured");
      } else {
        const emails = recipients.map((r: any) => r.email).filter(Boolean);
        const color = severity === "critical" ? "#dc2626" : severity === "warning" ? "#d97706" : "#0ea5e9";
        const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto">
          <div style="background:${color};color:white;padding:16px 20px;border-radius:8px 8px 0 0">
            <h2 style="margin:0">${escapeHtml(body.title)}</h2>
            <div style="opacity:.9;font-size:12px;text-transform:uppercase;letter-spacing:.05em">${severity} alert</div>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:0;padding:20px;border-radius:0 0 8px 8px;background:#fff">
            <p style="white-space:pre-wrap;color:#111827;font-size:15px;line-height:1.5">${escapeHtml(body.message)}</p>
            <p style="color:#6b7280;font-size:12px;margin-top:24px">This is an official campus alert from Western Balkans University.</p>
          </div>
        </div>`;

        let sent = 0;
        // Send in batches of 50 via Resend batch API
        for (let i = 0; i < emails.length; i += 50) {
          const batch = emails.slice(i, i + 50).map((to: string) => ({
            from: "WBU Alerts <onboarding@resend.dev>",
            to: [to],
            subject: `[${severity.toUpperCase()}] ${body.title}`,
            html,
          }));
          try {
            const resp = await fetch("https://api.resend.com/emails/batch", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
              body: JSON.stringify(batch),
            });
            if (resp.ok) sent += batch.length;
            else stats.errors.push(`email batch: ${await resp.text()}`);
          } catch (e: any) {
            stats.errors.push(`email: ${e.message}`);
          }
        }
        stats.email = sent;
      }
    }

    // 5) SMS via Twilio if configured
    const twSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twFrom = Deno.env.get("TWILIO_FROM_NUMBER");
    if (channels.includes("sms")) {
      if (!twSid || !twToken || !twFrom) {
        stats.errors.push("sms: Twilio secrets not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)");
      } else {
        const phones = recipients.map((r: any) => r.phone).filter(Boolean);
        const smsText = `[${severity.toUpperCase()}] ${body.title}\n${body.message}`.slice(0, 1500);
        const auth = btoa(`${twSid}:${twToken}`);
        let sent = 0;
        for (const to of phones) {
          try {
            const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twSid}/Messages.json`, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${auth}` },
              body: new URLSearchParams({ To: to, From: twFrom, Body: smsText }),
            });
            if (resp.ok) sent++;
            else stats.errors.push(`sms ${to}: ${resp.status}`);
          } catch (e: any) {
            stats.errors.push(`sms ${to}: ${e.message}`);
          }
        }
        stats.sms = sent;
      }
    }

    await admin.from("emergency_alerts").update({ delivery_stats: stats }).eq("id", alert.id);

    return json({ ok: true, alert_id: alert.id, stats });
  } catch (e: any) {
    return json({ error: e.message ?? "unknown" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
