import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Admin auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { season_id } = await req.json();

    if (!season_id) {
      return new Response(
        JSON.stringify({ error: "season_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get season info
    const { data: season, error: seasonError } = await supabaseAdmin
      .from("seasons")
      .select("*")
      .eq("id", season_id)
      .single();

    if (seasonError || !season) {
      return new Response(
        JSON.stringify({ error: "Season not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ====== 1. Creator Awards: TOP 10 by votes_count ======
    const { data: topCreators } = await supabaseAdmin
      .from("creators")
      .select("id, name, votes_count")
      .order("votes_count", { ascending: false })
      .limit(10);

    const creatorAwards: {
      season_id: string;
      creator_id: string;
      award_type: string;
      award_key: string;
      award_label: string;
      season_number: number;
    }[] = [];

    if (topCreators) {
      for (let i = 0; i < topCreators.length; i++) {
        const creator = topCreators[i];
        const rank = i + 1;

        let awards: { type: string; key: string; label: string }[] = [];

        if (rank === 1) {
          awards = [
            { type: "frame", key: "champion_frame", label: "챔피언 프레임" },
            { type: "badge", key: "champion_badge", label: "챔피언 뱃지" },
            { type: "title", key: "champion_title", label: "시즌 챔피언" },
          ];
        } else if (rank === 2) {
          awards = [
            { type: "frame", key: "runner_up_frame", label: "준우승 프레임" },
            { type: "badge", key: "runner_up_badge", label: "준우승 뱃지" },
            { type: "title", key: "runner_up_title", label: "시즌 준우승" },
          ];
        } else if (rank === 3) {
          awards = [
            { type: "frame", key: "top3_frame", label: "3위 프레임" },
            { type: "badge", key: "top3_badge", label: "3위 뱃지" },
          ];
        } else {
          // rank 4-10
          awards = [
            { type: "badge", key: "top10_badge", label: "TOP 10 뱃지" },
            { type: "title", key: "top10_title", label: `시즌 TOP ${rank}` },
          ];
        }

        for (const award of awards) {
          creatorAwards.push({
            season_id,
            creator_id: creator.id,
            award_type: award.type,
            award_key: award.key,
            award_label: award.label,
            season_number: season.season_number,
          });
        }
      }
    }

    // ====== 2. Fan Awards: TOP 50 by activity (votes + posts + comments) ======
    // Get vote counts per user
    const { data: fanVotes } = await supabaseAdmin
      .from("votes")
      .select("user_id")
      .not("user_id", "is", null);

    // Get comment counts per user (board_post_comments has user_id)
    const { data: fanComments } = await supabaseAdmin
      .from("board_post_comments")
      .select("user_id")
      .not("user_id", "is", null);

    // Get post counts per user (board_posts has user_id)
    const { data: fanPosts } = await supabaseAdmin
      .from("board_posts")
      .select("user_id")
      .not("user_id", "is", null);

    // Aggregate fan scores
    const fanScores: Record<string, number> = {};

    if (fanVotes) {
      for (const v of fanVotes) {
        if (v.user_id) {
          fanScores[v.user_id] = (fanScores[v.user_id] || 0) + 3;
        }
      }
    }
    if (fanPosts) {
      for (const p of fanPosts) {
        if (p.user_id) {
          fanScores[p.user_id] = (fanScores[p.user_id] || 0) + 5;
        }
      }
    }
    if (fanComments) {
      for (const c of fanComments) {
        if (c.user_id) {
          fanScores[c.user_id] = (fanScores[c.user_id] || 0) + 1;
        }
      }
    }

    // Sort and pick top 50
    const sortedFans = Object.entries(fanScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);

    const fanAwardRows: typeof creatorAwards = [];

    for (let i = 0; i < sortedFans.length; i++) {
      const [fanUserId] = sortedFans[i];
      const rank = i + 1;

      let awards: { type: string; key: string; label: string }[] = [];

      if (rank === 1) {
        awards = [
          { type: "frame", key: "mvp_fan_frame", label: "골드 프레임" },
          { type: "title", key: "mvp_fan_title", label: "MVP 팬" },
          { type: "badge", key: "mvp_fan_badge", label: "MVP 팬 뱃지" },
        ];
      } else if (rank <= 10) {
        awards = [
          { type: "frame", key: "top10_fan_frame", label: "실버 프레임" },
          { type: "badge", key: "top10_fan_badge", label: "TOP 10 팬 뱃지" },
        ];
      } else {
        // rank 11-50
        awards = [
          { type: "badge", key: "top50_fan_badge", label: "브론즈 뱃지" },
          { type: "title", key: "top50_fan_title", label: "TOP 50 팬" },
        ];
      }

      for (const award of awards) {
        fanAwardRows.push({
          season_id,
          creator_id: null as any,
          award_type: award.type,
          award_key: award.key,
          award_label: award.label,
          season_number: season.season_number,
          user_id: fanUserId,
        } as any);
      }
    }

    // ====== 3. Insert all awards (upsert to avoid duplicates) ======
    const allAwards = [...creatorAwards, ...fanAwardRows];

    let insertedCount = 0;
    let skippedCount = 0;

    for (const award of allAwards) {
      const { error: insertError } = await supabaseAdmin
        .from("season_awards")
        .upsert(award, { onConflict: "season_id,user_id,creator_id,award_key", ignoreDuplicates: true });

      if (insertError) {
        skippedCount++;
      } else {
        insertedCount++;
      }
    }

    // ====== 4. Send notifications to awarded fans ======
    const notifiedFanIds = new Set<string>();
    for (const [fanUserId, score] of sortedFans) {
      if (!notifiedFanIds.has(fanUserId)) {
        notifiedFanIds.add(fanUserId);
        const rank = sortedFans.findIndex(([id]) => id === fanUserId) + 1;
        let tierLabel = "TOP 50 팬";
        if (rank === 1) tierLabel = "MVP 팬 🏆";
        else if (rank <= 10) tierLabel = "TOP 10 팬 ⭐";

        await supabaseAdmin.from("notifications").insert({
          user_id: fanUserId,
          type: "season_reward",
          title: "🎉 시즌 보상 지급!",
          message: `시즌 ${season.season_number}에서 ${tierLabel}으로 선정되었습니다! 뱃지와 칭호가 지급되었어요.`,
          link: "/my",
        });
      }
    }

    // ====== 5. Deactivate the season ======
    await supabaseAdmin
      .from("seasons")
      .update({ is_active: false })
      .eq("id", season_id);

    return new Response(
      JSON.stringify({
        success: true,
        season_number: season.season_number,
        creator_awards: creatorAwards.length,
        fan_awards: fanAwardRows.length,
        total_inserted: insertedCount,
        total_skipped: skippedCount,
        fans_notified: notifiedFanIds.size,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
