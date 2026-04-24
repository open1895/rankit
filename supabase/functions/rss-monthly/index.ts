import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildItem, buildRss, corsHeaders, errorResponse, rssHeaders, SITE_URL } from "../_shared/rss.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Use top 3 by votes_count as monthly TOP 3
    const { data: creators, error } = await supabase
      .from("creators")
      .select("id, name, category, votes_count, rank, last_stats_updated, created_at")
      .order("votes_count", { ascending: false })
      .limit(3);
    if (error) throw error;

    const items = (creators || [])
      .map((c: any, idx: number) => {
        const rank = idx + 1;
        return buildItem({
          title: `🏆 이번 달 ${rank}위 - ${c.name}`,
          link: `${SITE_URL}/monthly-top3`,
          description: `${c.name}이(가) 이번 달 ${rank}위를 기록했습니다. 투표수: ${c.votes_count}표. 카테고리: ${c.category || "기타"}`,
          pubDate: c.last_stats_updated || c.created_at,
          guid: `${SITE_URL}/monthly-top3#${c.id}`,
        });
      })
      .join("\n");

    const xml = buildRss(
      {
        title: "Rankit 월간 TOP 3",
        link: `${SITE_URL}/monthly-top3`,
        description: "이번 달 가장 많은 사랑을 받은 크리에이터",
        feedUrl: `${SITE_URL}/rss-monthly`,
      },
      items
    );

    return new Response(xml, { headers: rssHeaders, status: 200 });
  } catch (err: any) {
    return errorResponse(err?.message || "RSS generation failed");
  }
});
