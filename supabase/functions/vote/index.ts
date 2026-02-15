import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "로그인이 필요합니다." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "인증에 실패했습니다." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { creator_id, referral_code } = await req.json();
    if (!creator_id) {
      return new Response(JSON.stringify({ error: "creator_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if user already voted for this creator in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: existingVotes, error: checkError } = await supabase
      .from("votes")
      .select("id")
      .eq("creator_id", creator_id)
      .eq("user_id", userId)
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

    // Insert vote with user_id
    const { error: insertError } = await supabase
      .from("votes")
      .insert({ creator_id, user_id: userId, voter_ip: userId });

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
      const { data: existingUse } = await supabase
        .from("referral_uses")
        .select("id")
        .eq("referral_code", referral_code)
        .eq("used_by_ip", userId)
        .limit(1);

      if (!existingUse || existingUse.length === 0) {
        const { data: codeData } = await supabase
          .from("referral_codes")
          .select("id, bonus_votes_earned")
          .eq("code", referral_code)
          .limit(1);

        if (codeData && codeData.length > 0) {
          await supabase.from("referral_uses").insert({
            referral_code,
            used_by_ip: userId,
          });

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
