import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { creator_id, referral_code } = await req.json();
    if (!creator_id) {
      return new Response(JSON.stringify({ error: "creator_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const voterIp = await hashIp(rawIp);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if this IP already voted for this creator in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: existingVotes, error: checkError } = await supabase
      .from("votes")
      .select("id")
      .eq("creator_id", creator_id)
      .eq("voter_ip", voterIp)
      .gte("created_at", twentyFourHoursAgo)
      .limit(1);

    if (checkError) {
      console.error("Vote check error:", checkError);
      return new Response(JSON.stringify({ error: "투표 처리 중 오류가 발생했습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingVotes && existingVotes.length > 0) {
      return new Response(
        JSON.stringify({ error: "already_voted", message: "이미 이 크리에이터에게 투표하셨습니다. 24시간 후 다시 투표할 수 있습니다." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert vote
    const { error: insertError } = await supabase
      .from("votes")
      .insert({ creator_id, voter_ip: voterIp });

    if (insertError) {
      console.error("Vote insert error:", insertError);
      return new Response(JSON.stringify({ error: "투표 처리 중 오류가 발생했습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle referral bonus
    let referralBonus = false;
    if (referral_code && typeof referral_code === "string" && referral_code.length >= 6) {
      // Check if this IP already used this referral code
      const { data: existingUse } = await supabase
        .from("referral_uses")
        .select("id")
        .eq("referral_code", referral_code)
        .eq("used_by_ip", voterIp)
        .limit(1);

      if (!existingUse || existingUse.length === 0) {
        // Check if referral code exists
        const { data: codeData } = await supabase
          .from("referral_codes")
          .select("id, bonus_votes_earned")
          .eq("code", referral_code)
          .limit(1);

        if (codeData && codeData.length > 0) {
          // Record the referral use
          await supabase.from("referral_uses").insert({
            referral_code,
            used_by_ip: voterIp,
          });

          // Increment bonus votes for referrer
          await supabase
            .from("referral_codes")
            .update({ bonus_votes_earned: codeData[0].bonus_votes_earned + 3 })
            .eq("id", codeData[0].id);

          referralBonus = true;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, referral_bonus: referralBonus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Vote unexpected error:", err);
    return new Response(JSON.stringify({ error: "요청을 처리할 수 없습니다." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
