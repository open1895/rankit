import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildItem, buildRss, corsHeaders, errorResponse, rssHeaders, SITE_URL } from "../_shared/rss.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const cat = url.searchParams.get("cat");
    if (!cat) return errorResponse("Query parameter 'cat' is required", 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: creators, error } = await supabase
      .from("creators")
      .select("id, name, category, votes_count, rank, subscriber_count, last_stats_updated, created_at")
      .ilike("category", `%${cat}%`)
      .order("rank", { ascending: true })
      .limit(10);
    if (error) throw error;

    const items = (creators || [])
      .map((c: any) =>
        buildItem({
          title: `${c.rank}위 ${c.name} - ${c.category || cat} 크리에이터`,
          link: `${SITE_URL}/creator/${c.id}`,
          description: `${c.name}. 구독자 ${c.subscriber_count?.toLocaleString() || 0}명. 투표수 ${c.votes_count}표`,
          pubDate: c.last_stats_updated || c.created_at,
        })
      )
      .join("\n");

    const xml = buildRss(
      {
        title: `Rankit ${cat} 크리에이터 랭킹`,
        link: `${SITE_URL}/category/${encodeURIComponent(cat)}`,
        description: `${cat} 분야 크리에이터 영향력 순위`,
        feedUrl: `${SITE_URL}/rss-category?cat=${encodeURIComponent(cat)}`,
      },
      items
    );

    return new Response(xml, { headers: rssHeaders, status: 200 });
  } catch (err: any) {
    return errorResponse(err?.message || "RSS generation failed");
  }
});
