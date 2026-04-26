import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildItem, buildRss, corsHeaders, errorResponse, rssHeaders, SITE_URL } from "../_shared/rss.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: creators, error } = await supabase
      .from("creators")
      .select("id, name, category, votes_count, rank, subscriber_count, last_stats_updated, created_at")
      .order("rank", { ascending: true })
      .limit(10);
    if (error) throw error;

    const items = (creators || [])
      .map((c: any) =>
        buildItem({
          title: `${c.rank}위 ${c.name} - ${(c.votes_count || 0).toLocaleString()}표`,
          link: `${SITE_URL}/creator/${c.id}`,
          description: `${c.name}이 현재 ${c.rank}위입니다. 누적 투표수: ${(c.votes_count || 0).toLocaleString()}표. 카테고리: ${c.category || "기타"}. 구독자: ${(c.subscriber_count || 0).toLocaleString()}명`,
          pubDate: c.last_stats_updated || c.created_at,
          guid: `${SITE_URL}/creator/${c.id}`,
        })
      )
      .join("\n");

    const xml = buildRss(
      {
        title: "Rankit 크리에이터 영향력 랭킹 TOP 10",
        link: SITE_URL,
        description: "팬 투표로 결정되는 실시간 크리에이터 영향력 순위 TOP 10",
        feedUrl: `${SITE_URL}/rss`,
      },
      items
    );

    return new Response(xml, { headers: rssHeaders, status: 200 });
  } catch (err: any) {
    return errorResponse(err?.message || "RSS generation failed");
  }
});
