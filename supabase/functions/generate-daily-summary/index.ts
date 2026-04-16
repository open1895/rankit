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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // KST yesterday boundaries
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const yKst = new Date(kstNow);
    yKst.setUTCDate(yKst.getUTCDate() - 1);
    yKst.setUTCHours(0, 0, 0, 0);
    const startKstUtc = new Date(yKst.getTime() - 9 * 60 * 60 * 1000);
    const endKstUtc = new Date(startKstUtc.getTime() + 24 * 60 * 60 * 1000);

    // Find users who voted in last 14 days (their "supported creators")
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentVotes } = await supabase
      .from("votes")
      .select("user_id, creator_id")
      .not("user_id", "is", null)
      .gte("created_at", fourteenDaysAgo)
      .limit(10000);

    // Build user → top creator map
    const userCreatorCount = new Map<string, Map<string, number>>();
    (recentVotes || []).forEach((v: any) => {
      if (!v.user_id) return;
      let m = userCreatorCount.get(v.user_id);
      if (!m) { m = new Map(); userCreatorCount.set(v.user_id, m); }
      m.set(v.creator_id, (m.get(v.creator_id) || 0) + 1);
    });

    // Get rank history snapshots near yesterday start and yesterday end (KST)
    const { data: histStart } = await supabase
      .from("rank_history")
      .select("creator_id, rank, recorded_at")
      .gte("recorded_at", new Date(startKstUtc.getTime() - 12 * 60 * 60 * 1000).toISOString())
      .lte("recorded_at", startKstUtc.toISOString())
      .order("recorded_at", { ascending: false })
      .limit(5000);

    const { data: histEnd } = await supabase
      .from("rank_history")
      .select("creator_id, rank, recorded_at")
      .gte("recorded_at", endKstUtc.toISOString())
      .lte("recorded_at", new Date(endKstUtc.getTime() + 12 * 60 * 60 * 1000).toISOString())
      .order("recorded_at", { ascending: true })
      .limit(5000);

    const startRankMap = new Map<string, number>();
    (histStart || []).forEach((h: any) => {
      if (!startRankMap.has(h.creator_id)) startRankMap.set(h.creator_id, h.rank);
    });
    const endRankMap = new Map<string, number>();
    (histEnd || []).forEach((h: any) => {
      if (!endRankMap.has(h.creator_id)) endRankMap.set(h.creator_id, h.rank);
    });

    // Get creator names
    const { data: creators } = await supabase
      .from("creators")
      .select("id, name, rank");
    const creatorMap = new Map<string, { name: string; rank: number }>();
    (creators || []).forEach((c: any) => creatorMap.set(c.id, { name: c.name, rank: c.rank }));

    // Build personalized notifications
    const notifications: any[] = [];
    const todayStr = kstNow.toISOString().slice(0, 10);

    for (const [userId, cMap] of userCreatorCount.entries()) {
      // Get user's top supported creator
      let topCreator: string | null = null;
      let topCount = 0;
      for (const [cid, cnt] of cMap.entries()) {
        if (cnt > topCount) { topCount = cnt; topCreator = cid; }
      }
      if (!topCreator) continue;

      const creator = creatorMap.get(topCreator);
      if (!creator) continue;

      const startRank = startRankMap.get(topCreator);
      const endRank = endRankMap.get(topCreator) || creator.rank;

      let title = "📊 어제의 응원 결과";
      let message = "";
      if (startRank && endRank && startRank !== endRank) {
        if (endRank < startRank) {
          message = `어제 ${creator.name}이(가) ${startRank}위 → ${endRank}위로 올라섰어요! 🎉`;
        } else {
          message = `어제 ${creator.name}이(가) ${startRank}위 → ${endRank}위로 변동했어요.`;
        }
      } else {
        message = `어제 ${creator.name}의 순위는 ${endRank || creator.rank}위였어요.`;
      }

      notifications.push({
        user_id: userId,
        type: "daily_summary",
        title,
        message,
        link: `/creator/${topCreator}`,
      });
    }

    // Insert in chunks
    let inserted = 0;
    for (let i = 0; i < notifications.length; i += 500) {
      const chunk = notifications.slice(i, i + 500);
      const { error } = await supabase.from("notifications").insert(chunk);
      if (!error) inserted += chunk.length;
    }

    return new Response(
      JSON.stringify({ success: true, summary_date: todayStr, notifications_sent: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-daily-summary error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
