import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BOOST_CONFIG = {
  5: { rpCost: 50 },
  10: { rpCost: 100 },
} as Record<number, { rpCost: number }>;

const DAILY_LIMIT = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { creator_id, multiplier, context } = await req.json();

    // Validate input
    if (!creator_id || !multiplier) {
      return new Response(JSON.stringify({ error: "missing_params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const config = BOOST_CONFIG[multiplier];
    if (!config) {
      return new Response(JSON.stringify({ error: "invalid_multiplier", message: "x5 또는 x10만 가능합니다." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const validContext = context === "battle" ? "battle" : "ranking";

    // Check daily limit (KST timezone)
    const todayStart = new Date();
    todayStart.setHours(todayStart.getHours() + 9); // KST offset
    const kstDate = todayStart.toISOString().slice(0, 10);
    const { count: todayCount } = await adminClient
      .from("boost_usages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", `${kstDate}T00:00:00+09:00`)
      .lt("created_at", `${kstDate}T00:00:00+09:00`);

    // Better approach: count today's usages
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const kstTodayStr = kstNow.toISOString().slice(0, 10);
    const dayStartUTC = new Date(`${kstTodayStr}T00:00:00+09:00`).toISOString();
    const dayEndUTC = new Date(`${kstTodayStr}T23:59:59+09:00`).toISOString();

    const { count: usageCount } = await adminClient
      .from("boost_usages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", dayStartUTC)
      .lte("created_at", dayEndUTC);

    if ((usageCount ?? 0) >= DAILY_LIMIT) {
      return new Response(JSON.stringify({ error: "daily_limit", message: `하루 ${DAILY_LIMIT}회 제한에 도달했습니다.`, remaining: 0 }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check RP balance
    const { data: pointsData } = await adminClient
      .from("user_points")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    const currentBalance = pointsData?.balance ?? 0;
    if (currentBalance < config.rpCost) {
      return new Response(JSON.stringify({ error: "insufficient_rp", message: `RP가 부족합니다. (필요: ${config.rpCost} RP, 보유: ${currentBalance} RP)` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Deduct RP
    await adminClient
      .from("user_points")
      .update({ balance: currentBalance - config.rpCost })
      .eq("user_id", user.id);

    // Record RP transaction
    await adminClient.from("point_transactions").insert({
      user_id: user.id,
      amount: -config.rpCost,
      type: "boost",
      description: `🚀 부스트 x${multiplier} 사용 (${validContext})`,
    });

    // Add votes to creator
    const { data: creator } = await adminClient
      .from("creators")
      .select("votes_count")
      .eq("id", creator_id)
      .single();

    if (!creator) {
      return new Response(JSON.stringify({ error: "creator_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await adminClient
      .from("creators")
      .update({ votes_count: creator.votes_count + multiplier })
      .eq("id", creator_id);

    // Record boost usage
    await adminClient.from("boost_usages").insert({
      user_id: user.id,
      creator_id,
      multiplier,
      rp_cost: config.rpCost,
      votes_added: multiplier,
      context: validContext,
    });

    // Send notification
    await adminClient.from("notifications").insert({
      user_id: user.id,
      type: "boost",
      title: "🚀 부스트 사용 완료!",
      message: `x${multiplier} 부스트로 ${multiplier}표가 반영되었습니다!`,
      link: validContext === "battle" ? "/battle" : "/",
    });

    const remaining = DAILY_LIMIT - ((usageCount ?? 0) + 1);

    return new Response(JSON.stringify({
      success: true,
      votes_added: multiplier,
      rp_spent: config.rpCost,
      new_balance: currentBalance - config.rpCost,
      remaining_boosts: remaining,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
