import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hash IP for privacy
async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + "_rankit_salt_2025");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Try to get authenticated user
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (userData?.user) {
        userId = userData.user.id;
      }
    }

    const { creator_id, referral_code } = await req.json();
    if (!creator_id) {
      return new Response(JSON.stringify({ error: "creator_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get and hash the client IP
    const rawIp = getClientIp(req);
    const hashedIp = await hashIp(rawIp);

    // Check if already voted today (per creator)
    // For authenticated users: check by user_id
    // For anonymous users: check by hashed IP
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartIso = todayStart.toISOString();

    let alreadyVoted = false;

    if (userId) {
      // Logged in user: check by user_id
      const { data: existingVotes } = await supabase
        .from("votes")
        .select("id")
        .eq("creator_id", creator_id)
        .eq("user_id", userId)
        .gte("created_at", todayStartIso)
        .limit(1);
      alreadyVoted = !!(existingVotes && existingVotes.length > 0);
    } else {
      // Anonymous user: check by hashed IP
      const { data: existingVotes } = await supabase
        .from("votes")
        .select("id")
        .eq("creator_id", creator_id)
        .eq("voter_ip", hashedIp)
        .is("user_id", null)
        .gte("created_at", todayStartIso)
        .limit(1);
      alreadyVoted = !!(existingVotes && existingVotes.length > 0);
    }

    if (alreadyVoted) {
      return new Response(
        JSON.stringify({
          error: "already_voted",
          message: "오늘 이미 이 크리에이터에게 투표하셨습니다. 내일 다시 투표할 수 있습니다.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert vote with retry for deadlock
    let insertError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase
        .from("votes")
        .insert({
          creator_id,
          user_id: userId,
          voter_ip: userId ? userId : hashedIp,
        });

      if (!error) {
        insertError = null;
        break;
      }

      if (error.code === "40P01" && attempt < 2) {
        // Deadlock - wait and retry
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        insertError = error;
        continue;
      }

      insertError = error;
      break;
    }

    if (insertError) {
      console.error("Vote insert error:", insertError);
      return new Response(JSON.stringify({ error: "투표 처리 중 오류가 발생했습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-contribute to active boost campaign
    if (userId) {
      try {
        const { data: activeCampaigns } = await supabase
          .from("boost_campaigns")
          .select("id, current_points, goal, ends_at, status")
          .eq("creator_id", creator_id)
          .eq("status", "active")
          .limit(1);
        if (activeCampaigns && activeCampaigns.length > 0) {
          const camp = activeCampaigns[0];
          if (new Date(camp.ends_at).getTime() > Date.now()) {
            await supabase.from("boost_contributions").insert({ campaign_id: camp.id, user_id: userId, action_type: "vote", points: 1 });
            const newPts = camp.current_points + 1;
            const updates: any = { current_points: newPts };
            if (newPts >= camp.goal) { updates.status = "completed"; updates.completed_at = new Date().toISOString(); }
            await supabase.from("boost_campaigns").update(updates).eq("id", camp.id);
          }
        }
      } catch (e) { console.error("Boost contribution error:", e); }
    }

    // Handle referral bonus (only for logged-in users)
    let referralBonus = false;
    if (userId && referral_code && typeof referral_code === "string" && referral_code.length >= 6) {
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

    return new Response(
      JSON.stringify({
        success: true,
        referral_bonus: referralBonus,
        is_anonymous: !userId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Vote unexpected error:", err);
    return new Response(JSON.stringify({ error: "요청을 처리할 수 없습니다." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
