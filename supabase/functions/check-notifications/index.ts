import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_LIMIT = 3; // max non-critical notifications per user per day
const CRITICAL_TYPES = ["rank_top1", "rank_top3", "rank_top10", "battle_result"];

interface NotifPayload {
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: only allow CRON_SECRET or service role
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret || cronSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const pendingNotifs: NotifPayload[] = [];

    // ── 1. Rank change detection ──
    await detectRankChanges(supabase, pendingNotifs);

    // ── 2. Battle events ──
    await detectBattleEvents(supabase, pendingNotifs);

    // ── 3. Fan activity milestones ──
    await detectVoteMilestones(supabase, pendingNotifs);

    // ── 4. Close competitor alerts ──
    await detectCloseCompetitors(supabase, pendingNotifs);

    // ── 5. Apply throttling & insert ──
    const inserted = await insertWithThrottle(supabase, pendingNotifs);

    return new Response(
      JSON.stringify({ success: true, generated: pendingNotifs.length, inserted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-notifications error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Rank change detection ──
async function detectRankChanges(supabase: any, notifs: NotifPayload[]) {
  // Get creators with user_id (claimed profiles only)
  const { data: creators } = await supabase
    .from("creators")
    .select("id, name, rank, votes_count, user_id")
    .not("user_id", "is", null);

  if (!creators || creators.length === 0) return;

  for (const creator of creators) {
    // Get previous rank from rank_history (most recent before today)
    const { data: history } = await supabase
      .from("rank_history")
      .select("rank")
      .eq("creator_id", creator.id)
      .lt("recorded_at", new Date(Date.now() - 3600000).toISOString()) // at least 1hr ago
      .order("recorded_at", { ascending: false })
      .limit(1);

    if (!history || history.length === 0) continue;

    const prevRank = history[0].rank;
    const currentRank = creator.rank;
    const diff = prevRank - currentRank; // positive = rank improved

    // Top 1
    if (currentRank === 1 && prevRank !== 1) {
      notifs.push({
        user_id: creator.user_id,
        type: "rank_top1",
        title: "🏆 1위 달성!",
        message: `${creator.name}님이 Rankit 전체 1위를 달성했습니다!`,
        link: `/creator/${creator.id}`,
      });
    }
    // Top 3
    else if (currentRank <= 3 && prevRank > 3) {
      notifs.push({
        user_id: creator.user_id,
        type: "rank_top3",
        title: "🥇 Top 3 진입!",
        message: `${creator.name}님이 ${currentRank}위로 Top 3에 진입했습니다!`,
        link: `/creator/${creator.id}`,
      });
    }
    // Top 10
    else if (currentRank <= 10 && prevRank > 10) {
      notifs.push({
        user_id: creator.user_id,
        type: "rank_top10",
        title: "🔥 Top 10 진입!",
        message: `${creator.name}님이 ${currentRank}위로 Top 10에 진입했습니다!`,
        link: `/creator/${creator.id}`,
      });
    }
    // Rank up +3 or more
    else if (diff >= 3) {
      notifs.push({
        user_id: creator.user_id,
        type: "rank_up",
        title: "📈 순위 급상승!",
        message: `${creator.name}님의 순위가 ${diff}단계 상승하여 ${currentRank}위입니다!`,
        link: `/creator/${creator.id}`,
      });
    }
    // Rank down -3 or more
    else if (diff <= -3) {
      notifs.push({
        user_id: creator.user_id,
        type: "rank_down",
        title: "📉 순위 변동 알림",
        message: `${creator.name}님의 순위가 ${Math.abs(diff)}단계 하락하여 ${currentRank}위입니다. 팬들의 응원이 필요해요!`,
        link: `/creator/${creator.id}`,
      });
    }
  }
}

// ── Battle events ──
async function detectBattleEvents(supabase: any, notifs: NotifPayload[]) {
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

  // Battles that just started (created in last hour)
  const { data: newBattles } = await supabase
    .from("battles")
    .select("id, creator_a_id, creator_b_id, category, creators!battles_creator_a_id_fkey(name, user_id), creators!battles_creator_b_id_fkey(name, user_id)")
    .eq("status", "active")
    .gte("created_at", oneHourAgo);

  if (newBattles) {
    for (const battle of newBattles) {
      const creatorA = battle["creators!battles_creator_a_id_fkey"];
      const creatorB = battle["creators!battles_creator_b_id_fkey"];
      
      if (creatorA?.user_id) {
        notifs.push({
          user_id: creatorA.user_id,
          type: "battle_start",
          title: "⚔️ 새 배틀 시작!",
          message: `${creatorA.name} vs ${creatorB?.name || "상대"} 배틀이 시작되었습니다!`,
          link: `/battle`,
        });
      }
      if (creatorB?.user_id) {
        notifs.push({
          user_id: creatorB.user_id,
          type: "battle_start",
          title: "⚔️ 새 배틀 시작!",
          message: `${creatorA?.name || "상대"} vs ${creatorB.name} 배틀이 시작되었습니다!`,
          link: `/battle`,
        });
      }
    }
  }

  // Battles that just completed (status changed to completed recently)
  const { data: completedBattles } = await supabase
    .from("battles")
    .select("id, creator_a_id, creator_b_id, winner_id, votes_a, votes_b, creators!battles_creator_a_id_fkey(name, user_id), creators!battles_creator_b_id_fkey(name, user_id), creators!battles_winner_id_fkey(name)")
    .eq("status", "completed")
    .not("winner_id", "is", null)
    .lte("ends_at", now)
    .gte("ends_at", oneHourAgo);

  if (completedBattles) {
    for (const battle of completedBattles) {
      const creatorA = battle["creators!battles_creator_a_id_fkey"];
      const creatorB = battle["creators!battles_creator_b_id_fkey"];
      const winnerName = battle["creators!battles_winner_id_fkey"]?.name || "승자";

      for (const creator of [creatorA, creatorB]) {
        if (creator?.user_id) {
          const isWinner = (creator === creatorA && battle.winner_id === battle.creator_a_id) ||
                          (creator === creatorB && battle.winner_id === battle.creator_b_id);
          notifs.push({
            user_id: creator.user_id,
            type: "battle_result",
            title: isWinner ? "🎉 배틀 승리!" : "😢 배틀 종료",
            message: isWinner
              ? `${creator.name}님이 배틀에서 승리했습니다! 축하합니다!`
              : `배틀이 종료되었습니다. ${winnerName}님이 승리했습니다.`,
            link: `/battle`,
          });
        }
      }
    }
  }
}

// ── Vote milestones ──
async function detectVoteMilestones(supabase: any, notifs: NotifPayload[]) {
  const milestones = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

  const { data: creators } = await supabase
    .from("creators")
    .select("id, name, votes_count, user_id")
    .not("user_id", "is", null);

  if (!creators) return;

  for (const creator of creators) {
    for (const milestone of milestones) {
      if (creator.votes_count >= milestone && creator.votes_count < milestone + 10) {
        // Check if we already sent this milestone notification
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", creator.user_id)
          .eq("type", "milestone")
          .like("message", `%${milestone}표%`)
          .limit(1);

        if (!existing || existing.length === 0) {
          notifs.push({
            user_id: creator.user_id,
            type: "milestone",
            title: "🎯 투표 마일스톤 달성!",
            message: `${creator.name}님이 누적 ${milestone}표를 돌파했습니다! 🎉`,
            link: `/creator/${creator.id}`,
          });
        }
        break; // only one milestone at a time
      }
    }
  }
}

// ── Close competitor detection ──
async function detectCloseCompetitors(supabase: any, notifs: NotifPayload[]) {
  const { data: creators } = await supabase
    .from("creators")
    .select("id, name, rank, votes_count, user_id")
    .not("user_id", "is", null)
    .order("rank", { ascending: true });

  if (!creators || creators.length < 2) return;

  // Get all creators sorted by rank for comparison
  const { data: allCreators } = await supabase
    .from("creators")
    .select("id, name, rank, votes_count")
    .order("rank", { ascending: true });

  if (!allCreators) return;

  for (const creator of creators) {
    // Find the creator just above in rank
    const aboveCreator = allCreators.find((c: any) => c.rank === creator.rank - 1);
    if (aboveCreator) {
      const voteDiff = aboveCreator.votes_count - creator.votes_count;
      if (voteDiff >= 0 && voteDiff <= 5) {
        notifs.push({
          user_id: creator.user_id,
          type: "close_competitor",
          title: "🔥 역전 가능!",
          message: `${creator.name}님과 ${aboveCreator.name}님의 차이가 ${voteDiff}표! 역전 기회입니다!`,
          link: `/creator/${creator.id}`,
        });
      }
    }
  }
}

// ── Throttle & insert ──
async function insertWithThrottle(supabase: any, notifs: NotifPayload[]): Promise<number> {
  if (notifs.length === 0) return 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Group by user
  const byUser = new Map<string, NotifPayload[]>();
  for (const n of notifs) {
    const arr = byUser.get(n.user_id) || [];
    arr.push(n);
    byUser.set(n.user_id, arr);
  }

  let insertCount = 0;

  for (const [userId, userNotifs] of byUser) {
    // Count today's non-critical notifications
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", todayStart.toISOString())
      .not("type", "in", `(${CRITICAL_TYPES.join(",")})`);

    let todayCount = count || 0;

    for (const notif of userNotifs) {
      const isCritical = CRITICAL_TYPES.includes(notif.type);

      // Skip if daily limit reached for non-critical
      if (!isCritical && todayCount >= DAILY_LIMIT) {
        continue;
      }

      // Check duplicate (same type + message within 24h)
      const { data: dup } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", notif.type)
        .gte("created_at", new Date(Date.now() - 86400000).toISOString())
        .eq("message", notif.message)
        .limit(1);

      if (dup && dup.length > 0) continue;

      const { error } = await supabase.from("notifications").insert({
        user_id: notif.user_id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        link: notif.link || null,
      });

      if (!error) {
        insertCount++;
        if (!isCritical) todayCount++;
      }
    }
  }

  return insertCount;
}
