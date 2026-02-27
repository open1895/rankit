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

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

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

    // Hash key verification
    const adpopcornHashKey = Deno.env.get("ADPOPCORN_HASH_KEY");
    if (adpopcornHashKey) {
      const valid = await verifyHash(params, adpopcornHashKey);
      if (!valid) {
        console.error("Adpopcorn hash verification failed");
        return new Response(
          JSON.stringify({ error: "invalid_hash" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.warn("ADPOPCORN_HASH_KEY not set — skipping hash verification (TEST MODE)");
    }

    // Add tickets to user
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

    console.log(`Adpopcorn reward: ${reward} tickets to user ${usertid}`);

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
