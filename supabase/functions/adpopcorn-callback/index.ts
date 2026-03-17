import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Adpopcorn callback parameters:
// usertid  – user unique id (our auth user_id)
// reward   – reward amount (integer)
// hashkey  – HMAC verification hash
// udid     – unique device id (optional)
// adid     – ad id (optional)
// adname   – ad name (optional)
// campid   – campaign id (optional)

const DAILY_REWARD_CAP = 500; // Max tickets per user per day via adpopcorn

async function verifyHash(
  params: URLSearchParams,
  hashKey: string
): Promise<boolean> {
  const receivedHash = params.get("hashkey") || params.get("hash_key") || "";
  if (!receivedHash) return false;

  // Adpopcorn hash = SHA256(usertid + reward + hashKey)
  const usertid = params.get("usertid") || "";
  const reward = params.get("reward") || "";
  const raw = usertid + reward + hashKey;

  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const computedHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return computedHash.toLowerCase() === receivedHash.toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    const usertid = params.get("usertid");
    const rewardStr = params.get("reward");

    if (!usertid || !rewardStr) {
      return new Response(
        JSON.stringify({ error: "missing_params" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reward = parseInt(rewardStr, 10);
    if (isNaN(reward) || reward <= 0 || reward > 10000) {
      return new Response(
        JSON.stringify({ error: "invalid_reward" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FIX 1: Fail hard when ADPOPCORN_HASH_KEY is not set
    const adpopcornHashKey = Deno.env.get("ADPOPCORN_HASH_KEY");
    if (!adpopcornHashKey) {
      console.error("CRITICAL: ADPOPCORN_HASH_KEY not configured. Rejecting callback.");
      return new Response(
        JSON.stringify({ error: "server_misconfigured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const valid = await verifyHash(params, adpopcornHashKey);
    if (!valid) {
      console.error("Adpopcorn hash verification failed");
      return new Response(
        JSON.stringify({ error: "invalid_hash" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user exists
    const { data: profile } = await admin
      .from("profiles")
      .select("user_id")
      .eq("user_id", usertid)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "user_not_found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FIX 2: Deduplication via campid + adid
    const campid = params.get("campid") || "unknown";
    const adid = params.get("adid") || "";

    const { error: dedupError } = await admin
      .from("adpopcorn_callbacks")
      .insert({
        camp_id: campid,
        ad_id: adid,
        user_id: usertid,
        reward: reward,
      });

    if (dedupError) {
      // Unique constraint violation = duplicate callback
      if (dedupError.code === "23505") {
        console.warn(`Duplicate adpopcorn callback: campid=${campid}, adid=${adid}, user=${usertid}`);
        // Return success to adpopcorn so it doesn't retry
        return new Response("1", {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }
      console.error("Dedup insert error:", dedupError);
      return new Response(
        JSON.stringify({ error: "server_error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FIX 3: Daily reward cap per user
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: todayCallbacks } = await admin
      .from("adpopcorn_callbacks")
      .select("reward")
      .eq("user_id", usertid)
      .gte("created_at", todayStart.toISOString());

    const todayTotal = (todayCallbacks || []).reduce((sum, r) => sum + (r.reward || 0), 0);

    if (todayTotal > DAILY_REWARD_CAP) {
      console.warn(`Daily reward cap exceeded for user ${usertid}: ${todayTotal}/${DAILY_REWARD_CAP}`);
      // Return success to adpopcorn but don't grant tickets
      return new Response("1", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // Add tickets
    const { data: result } = await admin.rpc("add_tickets", {
      p_user_id: usertid,
      p_amount: reward,
      p_type: "adpopcorn",
      p_description: `애드팝콘 광고 보상 +${reward}`,
    });

    if (!result) {
      return new Response(
        JSON.stringify({ error: "ticket_add_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Adpopcorn reward: ${reward} tickets to user ${usertid} (campid=${campid})`);

    // Adpopcorn expects "1" as success response
    return new Response("1", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  } catch (err) {
    console.error("Adpopcorn callback error:", err);
    return new Response(
      JSON.stringify({ error: "server_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
