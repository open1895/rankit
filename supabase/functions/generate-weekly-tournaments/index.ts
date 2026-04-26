import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TARGET_CATEGORIES = ["게임", "먹방", "메이크업", "운동", "음악", "코미디", "여행", "테크", "교육", "댄스", "룩북", "요리", "반려동물", "주식", "V-Tuber", "자동차", "과학기술"];
const CREATORS_PER_TOURNAMENT = 8;
const MAX_RECENT_APPEARANCES = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const isAuthed =
      authHeader === `Bearer ${serviceKey}` ||
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      body?.cron === true;

    const dryRun = !isAuthed;
    // Optional: only generate for specific category
    const targetCategory = body?.category;
    const categories = targetCategory ? [targetCategory] : TARGET_CATEGORIES;

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Get recent tournament creator appearances (last 4 weeks)
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentTournaments } = await supabase
      .from("tournaments")
      .select("id")
      .gte("created_at", fourWeeksAgo);

    const recentTournamentIds = (recentTournaments || []).map((t: any) => t.id);
    const appearanceCount = new Map<string, number>();

    if (recentTournamentIds.length > 0) {
      const { data: recentParticipants } = await supabase
        .from("tournament_participants")
        .select("creator_id")
        .in("tournament_id", recentTournamentIds);

      for (const p of (recentParticipants || [])) {
        appearanceCount.set(p.creator_id, (appearanceCount.get(p.creator_id) || 0) + 1);
      }

      // Fallback: also check matches for backwards compatibility
      if ((recentParticipants || []).length === 0) {
        const { data: recentMatches } = await supabase
          .from("tournament_matches")
          .select("creator_a_id, creator_b_id")
          .in("tournament_id", recentTournamentIds);
        for (const m of (recentMatches || [])) {
          appearanceCount.set(m.creator_a_id, (appearanceCount.get(m.creator_a_id) || 0) + 1);
          appearanceCount.set(m.creator_b_id, (appearanceCount.get(m.creator_b_id) || 0) + 1);
        }
      }
    }

    // 2. Get recent 7-day vote counts per creator
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentVotes } = await supabase
      .from("votes")
      .select("creator_id, created_at")
      .gte("created_at", fourteenDaysAgo);

    const recentVoteCount = new Map<string, number>();
    const prevWeekVoteCount = new Map<string, number>();
    const sevenDaysAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const v of (recentVotes || [])) {
      const voteDate = new Date(v.created_at);
      if (voteDate >= sevenDaysAgoDate) {
        recentVoteCount.set(v.creator_id, (recentVoteCount.get(v.creator_id) || 0) + 1);
      } else {
        prevWeekVoteCount.set(v.creator_id, (prevWeekVoteCount.get(v.creator_id) || 0) + 1);
      }
    }

    // 3. Get fan engagement (comments in last 7 days)
    const { data: recentComments } = await supabase
      .from("comments")
      .select("creator_id")
      .gte("created_at", sevenDaysAgo);

    const commentCount = new Map<string, number>();
    for (const c of (recentComments || [])) {
      commentCount.set(c.creator_id, (commentCount.get(c.creator_id) || 0) + 1);
    }

    // 4. Get all creators
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

    // Get next season number
    const { data: maxSeason } = await supabase
      .from("tournaments")
      .select("season_number")
      .order("season_number", { ascending: false })
      .limit(1);
    const nextSeasonBase = ((maxSeason?.[0]?.season_number) || 0) + 1;

    const results: any[] = [];
    let seasonOffset = 0;

    for (const category of categories) {
      const categoryCreators = allCreators
        .filter((c: any) => c.category === category)
        .filter((c: any) => {
          const recent7d = recentVoteCount.get(c.id) || 0;
          // Allow creators with at least some engagement or decent score
          if (recent7d === 0 && (c.rankit_score || 0) < 5) return false;
          if ((appearanceCount.get(c.id) || 0) >= MAX_RECENT_APPEARANCES) return false;
          if (!c.avatar_url || c.avatar_url === "") return false;
          return true;
        });

      if (categoryCreators.length < CREATORS_PER_TOURNAMENT) {
        results.push({ category, skipped: true, reason: `Only ${categoryCreators.length} eligible creators (need ${CREATORS_PER_TOURNAMENT})` });
        continue;
      }

      // Score creators using the new formula
      const scored = categoryCreators.map((c: any) => {
        const recent7d = recentVoteCount.get(c.id) || 0;
        const prevWeek = prevWeekVoteCount.get(c.id) || 0;
        const growthRate = prevWeek > 0 ? (recent7d - prevWeek) / prevWeek : (recent7d > 0 ? 1 : 0);
        const fanEngagement = commentCount.get(c.id) || 0;
        const appearances = appearanceCount.get(c.id) || 0;
        const freshBonus = appearances === 0 ? 1 : Math.max(0, (MAX_RECENT_APPEARANCES - appearances) / MAX_RECENT_APPEARANCES);

        const selectionScore =
          (recent7d * 0.35) +
          (growthRate * 20 * 0.20) +
          ((c.rankit_score || 0) * 0.20) +
          (fanEngagement * 0.15) +
          (freshBonus * 10 * 0.10);

        return { ...c, selectionScore, recent7d, growthRate };
      });

      scored.sort((a: any, b: any) => b.selectionScore - a.selectionScore);
      const selected = scored.slice(0, CREATORS_PER_TOURNAMENT);

      // Create balanced matches: seed1 vs seed8, seed2 vs seed7, etc.
      const matches: { a: any; b: any; order: number }[] = [];
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
      const seasonNumber = nextSeasonBase + seasonOffset;
      seasonOffset++;

      if (!dryRun) {
        const now = new Date();
        const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Create tournament with new schema
        const { data: tournament, error: tErr } = await supabase
          .from("tournaments")
          .insert({
            title,
            description: `${category} 카테고리 주간 자동 생성 토너먼트`,
            is_active: true,
            status: "active",
            category,
            season_number: seasonNumber,
            current_round: "quarterfinal",
            round: 8,
            start_at: now.toISOString(),
            end_at: endDate.toISOString(),
          })
          .select("id")
          .single();

        if (tErr) {
          results.push({ category, error: tErr.message });
          continue;
        }

        // Log creation
        await supabase.from("tournament_logs").insert({
          tournament_id: tournament.id,
          log_type: "created",
          message: `토너먼트 자동 생성: ${title} (${CREATORS_PER_TOURNAMENT}명 참가)`,
        });

        // Insert participants with seeds
        const participantInserts = selected.map((c: any, idx: number) => ({
          tournament_id: tournament.id,
          creator_id: c.id,
          seed: idx + 1,
          selection_score: c.selectionScore,
        }));

        const { error: pErr } = await supabase.from("tournament_participants").insert(participantInserts);
        if (pErr) {
          await supabase.from("tournament_logs").insert({
            tournament_id: tournament.id,
            log_type: "error",
            message: `참가자 등록 실패: ${pErr.message}`,
          });
        }

        // Insert quarterfinal matches
        const matchStart = now;
        const matchEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

        const matchInserts = matches.map((m) => ({
          tournament_id: tournament.id,
          round: 8,
          match_order: m.order,
          creator_a_id: m.a.id,
          creator_b_id: m.b.id,
          status: "active",
          start_at: matchStart.toISOString(),
          end_at: matchEnd.toISOString(),
        }));

        const { error: mErr } = await supabase.from("tournament_matches").insert(matchInserts);
        if (mErr) {
          // Rollback: set to draft if matches fail
          await supabase.from("tournaments").update({ status: "draft", is_active: false }).eq("id", tournament.id);
          await supabase.from("tournament_logs").insert({
            tournament_id: tournament.id,
            log_type: "error",
            message: `매치 생성 실패, draft로 전환: ${mErr.message}`,
          });
          results.push({ category, error: mErr.message });
          continue;
        }

        // Log successful activation
        await supabase.from("tournament_logs").insert({
          tournament_id: tournament.id,
          log_type: "activated",
          message: `8명 참가자 + 4개 8강 매치 생성 완료. 토너먼트 활성화됨.`,
        });

        results.push({
          category,
          tournament_id: tournament.id,
          season_number: seasonNumber,
          creators: selected.map((c: any) => c.name),
          matches: matches.map((m) => `${m.a.name} vs ${m.b.name}`),
          status: "active",
        });
      } else {
        results.push({
          category,
          dryRun: true,
          creators: selected.map((c: any) => ({
            name: c.name,
            score: c.selectionScore.toFixed(1),
            recent7d: c.recent7d,
          })),
          matches: matches.map((m) => `${m.a.name} vs ${m.b.name}`),
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      dryRun,
      generated: results.filter((r) => !r.skipped && !r.error).length,
      skipped: results.filter((r) => r.skipped).length,
      results,
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
