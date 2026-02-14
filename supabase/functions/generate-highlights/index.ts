import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    // Get all creators
    const { data: creators } = await supabase.from("creators").select("*").order("rank", { ascending: true }).limit(20);
    if (!creators || creators.length === 0) {
      return new Response(JSON.stringify({ message: "No creators found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const highlights = [];

    for (const creator of creators) {
      // Get rank history from a week ago
      const { data: oldHistory } = await supabase
        .from("rank_history")
        .select("rank, votes_count")
        .eq("creator_id", creator.id)
        .lte("recorded_at", weekAgo)
        .order("recorded_at", { ascending: false })
        .limit(1);

      const oldRank = oldHistory?.[0]?.rank ?? creator.rank;
      const oldVotes = oldHistory?.[0]?.votes_count ?? creator.votes_count;
      const rankChange = oldRank - creator.rank; // positive = improved
      const voteIncrease = creator.votes_count - oldVotes;

      // Find top fan
      const { data: comments } = await supabase
        .from("comments")
        .select("nickname, vote_count")
        .eq("creator_id", creator.id)
        .gte("created_at", weekAgo);

      const fanMap = new Map<string, number>();
      (comments || []).forEach((c) => {
        fanMap.set(c.nickname, (fanMap.get(c.nickname) || 0) + c.vote_count);
      });

      let topFan: string | null = null;
      let topScore = 0;
      fanMap.forEach((score, nickname) => {
        if (score > topScore) {
          topScore = score;
          topFan = nickname;
        }
      });

      // Generate highlight text
      const parts: string[] = [];
      if (rankChange > 0) parts.push(`순위 ${rankChange}단계 상승 🔥`);
      else if (rankChange < 0) parts.push(`순위 ${Math.abs(rankChange)}단계 하락`);
      if (voteIncrease > 0) parts.push(`${voteIncrease}표 획득`);
      if (topFan) parts.push(`MVP 팬: ${topFan}`);

      const highlightText = parts.length > 0 ? parts.join(" · ") : "이번 주 활동 기록 없음";

      highlights.push({
        creator_id: creator.id,
        week_start: weekStart,
        rank_change: rankChange,
        vote_increase: voteIncrease,
        top_fan_nickname: topFan,
        highlight_text: highlightText,
      });
    }

    // Delete old highlights for this week and insert new ones
    await supabase.from("weekly_highlights").delete().eq("week_start", weekStart);
    await supabase.from("weekly_highlights").insert(highlights);

    return new Response(JSON.stringify({ success: true, count: highlights.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Highlights error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate highlights" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
