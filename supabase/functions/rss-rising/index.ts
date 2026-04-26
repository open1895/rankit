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
      .select("id, name, category, rank, rankit_score, last_stats_updated, created_at")
      .order("rankit_score", { ascending: false })
      .limit(10);
    if (error) throw error;

    const items = (creators || [])
      .map((c: any) =>
        buildItem({
          title: `🔥 급상승 ${c.name} - 스코어 ${Number(c.rankit_score || 0).toFixed(1)}`,
          link: `${SITE_URL}/creator/${c.id}`,
          description: `${c.name} 급상승 중! 현재 ${c.rank}위. 카테고리: ${c.category || "기타"}. 랭킷 스코어: ${Number(c.rankit_score || 0).toFixed(1)}`,
          pubDate: c.last_stats_updated || c.created_at,
          guid: `${SITE_URL}/creator/${c.id}#rising`,
        })
      )
      .join("\n");

    const xml = buildRss(
      {
        title: "Rankit 급상승 크리에이터",
        link: `${SITE_URL}/rising`,
        description: "이번 주 가장 빠르게 성장하는 크리에이터 TOP 10",
        feedUrl: `${SITE_URL}/rss-rising`,
      },
      items
    );

    return new Response(xml, { headers: rssHeaders, status: 200 });
  } catch (err: any) {
    return errorResponse(err?.message || "RSS generation failed");
  }
});
