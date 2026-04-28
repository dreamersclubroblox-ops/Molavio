// Creates the admin2013 account if it doesn't exist and grants admin role.
// Public function (no JWT) — but it only does this for the hardcoded admin user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "admin2013@bouncytools.local";
const ADMIN_PASSWORD = "milan201317";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    // Find existing user
    const { data: list, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) throw listErr;
    let user = list.users.find((u) => u.email === ADMIN_EMAIL);

    if (!user) {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: "admin2013" },
      });
      if (cErr) throw cErr;
      user = created.user!;
    } else {
      // Reset password to known value (in case it changed)
      await admin.auth.admin.updateUserById(user.id, { password: ADMIN_PASSWORD, email_confirm: true });
    }

    // Ensure admin role
    const { data: existing } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!existing) {
      await admin.from("user_roles").insert({ user_id: user.id, role: "admin" });
    }

    return new Response(
      JSON.stringify({ ok: true, email: ADMIN_EMAIL, message: "Admin klaar. Log in met gebruikersnaam admin2013 en wachtwoord milan201317." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("bootstrap-admin error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
