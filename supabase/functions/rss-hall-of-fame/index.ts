import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildItem, buildRss, corsHeaders, errorResponse, rssHeaders, SITE_URL } from "../_shared/rss.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: rows, error } = await supabase
      .from("hall_of_fame")
      .select(`
        id, creator_id, final_rank, final_votes, period_label, period_end, created_at,
        creators:creator_id ( name, category )
      `)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;

    const items = (rows || [])
      .map((r: any) => {
        const name = r.creators?.name || "Unknown";
        return buildItem({
          title: `👑 ${r.period_label} ${r.final_rank}위 - ${name}`,
          link: `${SITE_URL}/hall-of-fame`,
          description: `${name}이(가) ${r.period_label} ${r.final_rank}위를 달성했습니다! 최종 투표: ${r.final_votes}표`,
          pubDate: r.created_at || r.period_end,
          guid: `${SITE_URL}/hall-of-fame#${r.id}`,
        });
      })
      .join("\n");

    const xml = buildRss(
      {
        title: "Rankit 명예의 전당",
        link: `${SITE_URL}/hall-of-fame`,
        description: "역대 시즌 우승 크리에이터 기록",
        feedUrl: `${SITE_URL}/rss-hall-of-fame`,
      },
      items
    );

    return new Response(xml, { headers: rssHeaders, status: 200 });
  } catch (err: any) {
    return errorResponse(err?.message || "RSS generation failed");
  }
});
