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

// Combo bonus tiers
function getComboBonus(combo: number): number {
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  if (combo >= 3) return 1;
  return 0;
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

    const { creator_id, referral_code, use_super } = await req.json();
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
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartIso = todayStart.toISOString();

    let alreadyVoted = false;

    if (userId) {
      const { data: existingVotes } = await supabase
        .from("votes")
        .select("id")
        .eq("creator_id", creator_id)
        .eq("user_id", userId)
        .gte("created_at", todayStartIso)
        .limit(1);
      alreadyVoted = !!(existingVotes && existingVotes.length > 0);
    } else {
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

    // ── Combo detection (authenticated users only) ──
    let comboCount = 1;
    let comboBonus = 0;

    if (userId) {
      const { data: lastVotes } = await supabase
        .from("votes")
        .select("created_at, combo_count")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (lastVotes && lastVotes.length > 0) {
        const lastVoteTime = new Date(lastVotes[0].created_at).getTime();
        const now = Date.now();
        const diffMinutes = (now - lastVoteTime) / (1000 * 60);

        if (diffMinutes <= 10) {
          comboCount = (lastVotes[0].combo_count || 1) + 1;
        }
      }

      comboBonus = getComboBonus(comboCount);
    }

    // ── Super vote handling ──
    let voteWeight = 1;
    let usedSuper = false;

    if (userId && use_super === true) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("super_votes")
        .eq("user_id", userId)
        .single();

      if (profile && profile.super_votes > 0) {
        voteWeight = 3;
        usedSuper = true;
        await supabase
          .from("profiles")
          .update({ super_votes: profile.super_votes - 1 })
          .eq("user_id", userId);
      }
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
          combo_count: comboCount,
          is_super: usedSuper,
          vote_weight: voteWeight,
        });

      if (!error) {
        insertError = null;
        break;
      }

      if (error.code === "40P01" && attempt < 2) {
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

    // ── Grant combo bonus tickets ──
    if (userId && comboBonus > 0) {
      await supabase.rpc("add_tickets", {
        p_user_id: userId,
        p_amount: comboBonus,
        p_type: "combo_bonus",
        p_description: `🔥 ${comboCount}콤보 보너스 티켓`,
      });
    }

    // ── Grant +1 RP for vote participation (daily cap: 50 RP) ──
    let rpEarned = 0;
    if (userId) {
      try {
        const todayRpStart = new Date();
        todayRpStart.setHours(0, 0, 0, 0);
        const { data: todayTx } = await supabase
          .from("point_transactions")
          .select("amount")
          .eq("user_id", userId)
          .in("type", ["vote_reward", "tournament_reward"])
          .gte("created_at", todayRpStart.toISOString());

        const todayEarned = (todayTx || []).reduce((sum: number, t: any) => sum + (t.amount > 0 ? t.amount : 0), 0);

        if (todayEarned < 50) {
          const rpAmount = 1;
          // Ensure user_points row exists
          const { data: existingPts } = await supabase
            .from("user_points")
            .select("id, balance, total_earned")
            .eq("user_id", userId)
            .maybeSingle();

          if (!existingPts) {
            await supabase.from("user_points").insert({ user_id: userId, balance: rpAmount, total_earned: rpAmount });
          } else {
            await supabase
              .from("user_points")
              .update({
                balance: existingPts.balance + rpAmount,
                total_earned: existingPts.total_earned + rpAmount,
              })
              .eq("user_id", userId);
          }

          await supabase.from("point_transactions").insert({
            user_id: userId,
            amount: rpAmount,
            type: "vote_reward",
            description: "투표 참여 보상 +1 RP",
          });
          rpEarned = rpAmount;
        }
      } catch (e) { console.error("RP reward error:", e); }
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
            await supabase.from("boost_contributions").insert({ campaign_id: camp.id, user_id: userId, action_type: "vote", points: voteWeight });
            const newPts = camp.current_points + voteWeight;
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
        combo_count: comboCount,
        combo_bonus: comboBonus,
        vote_weight: voteWeight,
        used_super: usedSuper,
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
