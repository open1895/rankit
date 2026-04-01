import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TARGET_CATEGORIES = ["게임", "먹방", "뷰티", "운동", "음악"];
const CREATORS_PER_TOURNAMENT = 8;
const PREDICTIONS_PER_CATEGORY = 2;
const MAX_RECENT_APPEARANCES = 3; // skip if appeared in last 3 tournaments

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: CRON_SECRET or service role key
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const isAuthed =
      authHeader === `Bearer ${serviceKey}` ||
      authHeader === `Bearer ${cronSecret}`;

    // Dry run mode for unauthenticated requests
    const dryRun = !isAuthed;

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Get recent tournament creator appearances (last 4 weeks)
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentTournaments } = await supabase
      .from("tournaments")
      .select("id")
      .gte("created_at", fourWeeksAgo);

    const recentTournamentIds = (recentTournaments || []).map(t => t.id);

    const appearanceCount = new Map<string, number>();
    if (recentTournamentIds.length > 0) {
      const { data: recentMatches } = await supabase
        .from("tournament_matches")
        .select("creator_a_id, creator_b_id")
        .in("tournament_id", recentTournamentIds);

      for (const m of (recentMatches || [])) {
        appearanceCount.set(m.creator_a_id, (appearanceCount.get(m.creator_a_id) || 0) + 1);
        appearanceCount.set(m.creator_b_id, (appearanceCount.get(m.creator_b_id) || 0) + 1);
      }
    }

    // 2. Get recent 7-day vote counts per creator
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentVotes } = await supabase
      .from("votes")
      .select("creator_id")
      .gte("created_at", sevenDaysAgo);

    const recentVoteCount = new Map<string, number>();
    for (const v of (recentVotes || [])) {
      recentVoteCount.set(v.creator_id, (recentVoteCount.get(v.creator_id) || 0) + 1);
    }

    // 3. Get all creators with engagement data
    const { data: allCreators } = await supabase
      .from("creators")
      .select("id, name, category, rankit_score, votes_count, rank, avatar_url")
      .order("rankit_score", { ascending: false });

    if (!allCreators || allCreators.length === 0) {
      return new Response(JSON.stringify({ error: "No creators found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    const generatedPredictions: any[] = [];

    for (const category of TARGET_CATEGORIES) {
      const categoryCreators = allCreators
        .filter(c => c.category === category)
        .filter(c => {
          const recent7d = recentVoteCount.get(c.id) || 0;
          // Exclude: zero recent votes, too many appearances
          if (recent7d === 0) return false;
          if ((appearanceCount.get(c.id) || 0) >= MAX_RECENT_APPEARANCES) return false;
          // Exclude: weak profile (no avatar, low score)
          if (!c.avatar_url || c.avatar_url === "") return false;
          return true;
        });

      if (categoryCreators.length < CREATORS_PER_TOURNAMENT) {
        results.push({ category, skipped: true, reason: `Only ${categoryCreators.length} eligible creators (need ${CREATORS_PER_TOURNAMENT})` });
        continue;
      }

      // Score creators for selection
      const scored = categoryCreators.map(c => {
        const recent7d = recentVoteCount.get(c.id) || 0;
        const appearances = appearanceCount.get(c.id) || 0;
        const freshBonus = appearances === 0 ? 20 : (3 - appearances) * 5;

        const engagementScore =
          (c.rankit_score || 0) * 0.3 +
          recent7d * 2 +
          (c.votes_count || 0) * 0.01 +
          Math.max(0, freshBonus);

        return { ...c, engagementScore, recent7d };
      });

      // Sort by engagement score and pick top 8
      scored.sort((a, b) => b.engagementScore - a.engagementScore);
      const selected = scored.slice(0, CREATORS_PER_TOURNAMENT);

      // Create balanced matches: 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5
      const matches: { a: typeof selected[0]; b: typeof selected[0]; order: number }[] = [];
      const half = selected.length / 2;
      for (let i = 0; i < half; i++) {
        matches.push({
          a: selected[i],
          b: selected[selected.length - 1 - i],
          order: i,
        });
      }

      const weekLabel = getWeekLabel();
      const title = `${weekLabel} ${category} 토너먼트`;

      if (!dryRun) {
        // Create tournament as draft (is_active = false)
        const { data: tournament, error: tErr } = await supabase
          .from("tournaments")
          .insert({
            title,
            description: `${category} 카테고리 주간 자동 생성 토너먼트`,
            is_active: false, // Draft! Admin must approve
            round: 8,
          })
          .select("id")
          .single();

        if (tErr) {
          results.push({ category, error: tErr.message });
          continue;
        }

        // Insert quarterfinal matches
        const matchInserts = matches.map(m => ({
          tournament_id: tournament.id,
          round: 8,
          match_order: m.order,
          creator_a_id: m.a.id,
          creator_b_id: m.b.id,
        }));

        const { error: mErr } = await supabase.from("tournament_matches").insert(matchInserts);
        if (mErr) {
          results.push({ category, error: mErr.message });
          continue;
        }

        // Generate prediction events for this category
        const predictions = [];

        // Prediction 1: Category weekly #1 (top 2 creators in category)
        if (selected.length >= 2) {
          const betDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
          const { data: predEvent } = await supabase
            .from("prediction_events")
            .insert({
              title: `${weekLabel} ${category} 주간 1위 예측`,
              description: `이번 주 ${category} 카테고리에서 더 많은 득표를 받을 크리에이터는?`,
              creator_a_id: selected[0].id,
              creator_b_id: selected[1].id,
              bet_deadline: betDeadline.toISOString(),
              status: "open",
            })
            .select("id")
            .single();
          if (predEvent) predictions.push(predEvent.id);
        }

        // Prediction 2: First match winner prediction
        if (matches.length >= 1) {
          const betDeadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
          const { data: predEvent } = await supabase
            .from("prediction_events")
            .insert({
              title: `${matches[0].a.name} vs ${matches[0].b.name} 승자 예측`,
              description: `${category} 토너먼트 8강 첫 매치! 누가 이길까요?`,
              creator_a_id: matches[0].a.id,
              creator_b_id: matches[0].b.id,
              bet_deadline: betDeadline.toISOString(),
              status: "open",
            })
            .select("id")
            .single();
          if (predEvent) predictions.push(predEvent.id);
        }

        generatedPredictions.push({ category, prediction_ids: predictions });

        results.push({
          category,
          tournament_id: tournament.id,
          creators: selected.map(c => c.name),
          matches: matches.map(m => `${m.a.name} vs ${m.b.name}`),
          predictions: predictions.length,
          status: "draft",
        });
      } else {
        // Dry run - just show what would be generated
        results.push({
          category,
          dryRun: true,
          creators: selected.map(c => ({ name: c.name, score: c.engagementScore.toFixed(1), recent7d: c.recent7d })),
          matches: matches.map(m => `${m.a.name} vs ${m.b.name}`),
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      dryRun,
      generated: results.filter(r => !r.skipped && !r.error).length,
      skipped: results.filter(r => r.skipped).length,
      results,
      predictions: generatedPredictions,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: true, message: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getWeekLabel(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekNum = Math.ceil(day / 7);
  return `${month}월 ${weekNum}주차`;
}
