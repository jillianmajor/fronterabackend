import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SiteAssignment {
  work_site_id?: string;
  facility_name?: string;
  city?: string;
  state?: string;
  client_name?: string;
  is_primary?: boolean;
  weekly_schedule?: { day: string; start: string; end: string }[];
}

interface ProviderInput {
  full_name: string;
  email: string;
  phone?: string;
  specialty?: string;
  state?: string;
  employment_type?: "W2" | "1099";
  schedule_type?: "set" | "prn";
  company?: "Frontera" | "4tress";
  region?: string;
  work_schedule?: string;
  provider_id_external?: string;
  recruiter_id?: string | null;
  liaison_id?: string | null;
  recruiter_name?: string;
  recruiter_email?: string;
  recruiter_phone?: string;
  liaison_name?: string;
  liaison_email?: string;
  liaison_phone?: string;
  work_site_assignments?: SiteAssignment[];
}

const tempPassword = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"[b % 54])
    .join("") + "!9";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Verify caller is admin or internal_staff
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "internal_staff");
    if (!allowed) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const providers: ProviderInput[] = Array.isArray(body.providers) ? body.providers : [body];

    const admin = createClient(url, serviceKey);
    const results: { email: string; status: string; user_id?: string; error?: string; temp_password?: string }[] = [];

    for (const p of providers) {
      if (!p.email || !p.full_name) {
        results.push({ email: p.email || "", status: "skipped", error: "Missing email or name" });
        continue;
      }
      const tmp = tempPassword();
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: p.email,
        password: tmp,
        email_confirm: true,
        user_metadata: { full_name: p.full_name },
      });
      if (createErr || !created.user) {
        results.push({ email: p.email, status: "failed", error: createErr?.message });
        continue;
      }
      const userId = created.user.id;

      // Update profile (handle_new_user trigger inserted basic row)
      await admin.from("profiles").update({
        full_name: p.full_name,
        phone: p.phone || null,
        specialty: p.specialty || null,
        state: p.state || null,
        employment_type: p.employment_type || null,
        company: p.company === "4tress" ? "4tress" : "Frontera",
        region: p.region || null,
        work_schedule: p.work_schedule || null,
        schedule_type: p.schedule_type || "set",
        provider_id: p.provider_id_external || null,
        recruiter_id: p.recruiter_id || null,
        liaison_id: p.liaison_id || null,
        recruiter_name: p.recruiter_name || null,
        recruiter_email: p.recruiter_email || null,
        recruiter_phone: p.recruiter_phone || null,
        liaison_name: p.liaison_name || null,
        liaison_email: p.liaison_email || null,
        liaison_phone: p.liaison_phone || null,
        portal_type: "provider",
      }).eq("user_id", userId);

      // Assign role
      await admin.from("user_roles").insert({ user_id: userId, role: "provider_user" });

      // Work sites
      let primarySiteId: string | null = null;
      for (const s of p.work_site_assignments || []) {
        let siteId = s.work_site_id;
        if (!siteId && s.facility_name) {
          // create or find a site
          const { data: existing } = await admin.from("work_sites")
            .select("id").eq("facility_name", s.facility_name).maybeSingle();
          if (existing) {
            siteId = existing.id;
          } else {
            const { data: ns } = await admin.from("work_sites").insert({
              facility_name: s.facility_name, city: s.city || null, state: s.state || null,
              client_name: s.client_name || "Optum",
            }).select("id").single();
            siteId = ns?.id;
          }
        }
        if (siteId) {
          await admin.from("provider_work_sites").insert({
            provider_id: userId, work_site_id: siteId,
            is_primary: !!s.is_primary,
            weekly_schedule: s.weekly_schedule || [],
          });
          if (s.is_primary) primarySiteId = siteId;
        }
      }
      if (primarySiteId) {
        await admin.from("profiles").update({ primary_facility_id: primarySiteId }).eq("user_id", userId);
      }

      // Generate password recovery link so the provider sets their own password
      const { data: link } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: p.email,
      });

      // Queue invitation email (delivery not yet wired)
      await admin.from("scheduled_emails").insert({
        recipient_email: p.email,
        recipient_user_id: userId,
        template_name: "provider-invite",
        template_data: {
          full_name: p.full_name,
          temp_password: tmp,
          recovery_link: link?.properties?.action_link || null,
        },
        send_at: new Date().toISOString(),
      });

      results.push({ email: p.email, status: "created", user_id: userId, temp_password: tmp });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
