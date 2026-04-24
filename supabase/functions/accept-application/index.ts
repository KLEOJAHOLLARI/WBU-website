import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateEmail(fullName: string): string {
  const parts = fullName.toLowerCase().trim().split(/\s+/);
  const firstName = parts[0].replace(/[^a-z]/g, "");
  const lastName = parts.length > 1 ? parts[parts.length - 1].replace(/[^a-z]/g, "") : firstName;
  return `${firstName}.${lastName}@wbu.edu.al`;
}

function generatePassword(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0];
  const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  return `${capitalized}123!`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin");
    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { application_id } = await req.json();
    if (!application_id) {
      return new Response(JSON.stringify({ error: "Missing application_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch application
    const { data: app, error: appError } = await adminClient
      .from("applications")
      .select("*")
      .eq("id", application_id)
      .single();
    if (appError || !app) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update application status
    await adminClient.from("applications").update({ status: "accepted" }).eq("id", application_id);

    // Check if student already has an account (by personal email)
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, user_id, account_status")
      .eq("email", app.email)
      .maybeSingle();

    if (existingProfile) {
      // Just update existing profile
      const updateData: Record<string, any> = {
        account_status: "approved",
        program: app.program,
        must_change_password: true,
      };
      if (app.gender) updateData.gender = app.gender;
      if (app.birthplace) updateData.birthplace = app.birthplace;
      if (app.personal_id) updateData.personal_id = app.personal_id;

      await adminClient.from("profiles").update(updateData).eq("id", existingProfile.id);

      return new Response(JSON.stringify({
        message: "Existing account activated",
        account_existed: true,
        user_id: existingProfile.user_id,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate unique university email
    let uniEmail = generateEmail(app.full_name);
    let counter = 0;
    while (true) {
      const candidate = counter === 0 ? uniEmail : uniEmail.replace("@", `${counter}@`);
      const { data: existing } = await adminClient
        .from("profiles")
        .select("id")
        .or(`email.eq.${candidate}`)
        .maybeSingle();

      // Also check auth users
      const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 1 });
      // Use a targeted approach - try to find by email
      const { data: existingAuth } = await adminClient.rpc("has_role", { _user_id: "00000000-0000-0000-0000-000000000000", _role: "admin" });
      
      if (!existing) {
        uniEmail = candidate;
        break;
      }
      counter++;
    }

    // Generate password
    const password = generatePassword(app.full_name);

    // Create auth user with university email
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: uniEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: app.full_name },
    });

    if (createError) {
      // If email already exists in auth, try with counter
      if (createError.message.includes("already") && counter < 20) {
        counter++;
        const retryEmail = generateEmail(app.full_name).replace("@", `${counter}@`);
        const { data: retryUser, error: retryError } = await adminClient.auth.admin.createUser({
          email: retryEmail,
          password,
          email_confirm: true,
          user_metadata: { full_name: app.full_name },
        });
        if (retryError) {
          return new Response(JSON.stringify({ error: retryError.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        uniEmail = retryEmail;
        // Use retryUser below
        const userId = retryUser.user.id;
        
        // Create profile
        await adminClient.from("profiles").insert({
          user_id: userId,
          full_name: app.full_name,
          email: uniEmail,
          phone: app.phone || null,
          program: app.program,
          account_status: "approved",
          must_change_password: true,
          gender: app.gender || null,
          birthplace: app.birthplace || null,
          personal_id: app.personal_id || null,
        });

        // Assign student role
        await adminClient.from("user_roles").insert({ user_id: userId, role: "user" });

        // Link application to user
        await adminClient.from("applications").update({ user_id: userId }).eq("id", application_id);

        return new Response(JSON.stringify({
          message: "Student account created successfully",
          account_existed: false,
          user_id: userId,
          generated_email: uniEmail,
          generated_password: password,
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // Create profile
    await adminClient.from("profiles").insert({
      user_id: userId,
      full_name: app.full_name,
      email: uniEmail,
      phone: app.phone || null,
      program: app.program,
      account_status: "approved",
      must_change_password: true,
      gender: app.gender || null,
      birthplace: app.birthplace || null,
      personal_id: app.personal_id || null,
    });

    // Assign student role
    await adminClient.from("user_roles").insert({ user_id: userId, role: "user" });

    // Link application to user
    await adminClient.from("applications").update({ user_id: userId }).eq("id", application_id);

    return new Response(JSON.stringify({
      message: "Student account created successfully",
      account_existed: false,
      user_id: userId,
      generated_email: uniEmail,
      generated_password: password,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
