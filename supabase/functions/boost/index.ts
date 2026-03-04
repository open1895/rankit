import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { action, campaign_id, creator_id, action_type } = await req.json();

    if (action === "contribute") {
      if (!campaign_id || !action_type) return new Response(JSON.stringify({ error: "missing params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Determine points based on action
      const pointsMap: Record<string, number> = { vote: 1, share: 3, comment: 1 };
      const points = pointsMap[action_type] || 1;

      // Check campaign exists and is active
      const { data: campaign } = await adminClient.from("boost_campaigns").select("*").eq("id", campaign_id).single();
      if (!campaign || campaign.status !== "active") return new Response(JSON.stringify({ error: "campaign_not_active" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (new Date(campaign.ends_at).getTime() < Date.now()) return new Response(JSON.stringify({ error: "campaign_expired" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Insert contribution
      await adminClient.from("boost_contributions").insert({ campaign_id, user_id: user.id, action_type, points });

      // Update campaign points
      const newPoints = campaign.current_points + points;
      const updates: any = { current_points: newPoints };
      if (newPoints >= campaign.goal) {
        updates.status = "completed";
        updates.completed_at = new Date().toISOString();
      }
      await adminClient.from("boost_campaigns").update(updates).eq("id", campaign_id);

      return new Response(JSON.stringify({ success: true, current_points: newPoints, completed: newPoints >= campaign.goal }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
