import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildItem, buildRss, corsHeaders, errorResponse, rssHeaders, SITE_URL } from "../_shared/rss.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return errorResponse("Query parameter 'id' is required", 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: creator, error } = await supabase
      .from("creators")
      .select("id, name, category, votes_count, rank, subscriber_count, rankit_score, last_stats_updated, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!creator) return errorResponse("Creator not found", 404);

    // Recent rank history snapshots
    const { data: history } = await supabase
      .from("rank_history")
      .select("rank, votes_count, recorded_at")
      .eq("creator_id", id)
      .order("recorded_at", { ascending: false })
      .limit(10);

    const link = `${SITE_URL}/creator/${creator.id}`;

    const historyItems = (history || []).map((h: any) =>
      buildItem({
        title: `${creator.name} ${h.rank}위 달성! 누적 ${h.votes_count}표`,
        link,
        description: `현재 순위: ${h.rank}위\n누적 투표: ${h.votes_count}표\n구독자: ${creator.subscriber_count?.toLocaleString() || 0}명\n카테고리: ${creator.category || "기타"}\n랭킷 스코어: ${Number(creator.rankit_score).toFixed(1)}`,
        pubDate: h.recorded_at,
        guid: `${link}#${h.recorded_at}`,
      })
    );

    // Always include current state as first item
    const currentItem = buildItem({
      title: `${creator.name} 현재 ${creator.rank}위 - 누적 ${creator.votes_count}표`,
      link,
      description: `현재 순위: ${creator.rank}위\n누적 투표: ${creator.votes_count}표\n구독자: ${creator.subscriber_count?.toLocaleString() || 0}명\n카테고리: ${creator.category || "기타"}\n랭킷 스코어: ${Number(creator.rankit_score).toFixed(1)}`,
      pubDate: creator.last_stats_updated || creator.created_at,
      guid: `${link}#current`,
    });

    const items = [currentItem, ...historyItems].join("\n");

    const xml = buildRss(
      {
        title: `${creator.name} - Rankit 크리에이터 페이지`,
        link,
        description: `${creator.name}의 현재 순위와 팬 활동 현황`,
      },
      items
    );

    return new Response(xml, { headers: rssHeaders, status: 200 });
  } catch (err: any) {
    return errorResponse(err?.message || "RSS generation failed");
  }
});
