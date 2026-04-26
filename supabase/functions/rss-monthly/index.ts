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
      .order("votes_count", { ascending: false })
      .limit(3);
    if (error) throw error;

    const now = new Date();
    const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

    const items = (creators || [])
      .map((c: any, idx: number) => {
        const rank = idx + 1;
        return buildItem({
          title: `🏆 ${rank}위 ${c.name} - ${(c.votes_count || 0).toLocaleString()}표`,
          link: `${SITE_URL}/creator/${c.id}`,
          description: `${monthLabel} 월간 ${rank}위! ${c.name}이(가) ${(c.votes_count || 0).toLocaleString()}표를 받았습니다. 카테고리: ${c.category || "기타"}. 구독자: ${(c.subscriber_count || 0).toLocaleString()}명`,
          pubDate: c.last_stats_updated || c.created_at,
          guid: `${SITE_URL}/creator/${c.id}#monthly-${rank}`,
        });
      })
      .join("\n");

    const xml = buildRss(
      {
        title: "Rankit 월간 TOP 3",
        link: `${SITE_URL}/monthly-top3`,
        description: "이번 달 가장 많은 표를 받은 크리에이터 TOP 3",
        feedUrl: `${SITE_URL}/rss-monthly`,
      },
      items
    );

    return new Response(xml, { headers: rssHeaders, status: 200 });
  } catch (err: any) {
    return errorResponse(err?.message || "RSS generation failed");
  }
});
