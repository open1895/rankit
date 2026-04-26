import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildItem, buildRss, corsHeaders, errorResponse, rssHeaders, SITE_URL } from "../_shared/rss.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: battles, error } = await supabase
      .from("battles")
      .select(`
        id, votes_a, votes_b, winner_id, ends_at, created_at,
        creator_a:creator_a_id ( id, name ),
        creator_b:creator_b_id ( id, name ),
        winner:winner_id ( id, name )
      `)
      .eq("status", "completed")
      .order("ends_at", { ascending: false })
      .limit(20);
    if (error) throw error;

    const items = (battles || [])
      .map((b: any) => {
        const aName = b.creator_a?.name || "?";
        const bName = b.creator_b?.name || "?";
        const winnerName = b.winner?.name || "무승부";
        const total = (b.votes_a || 0) + (b.votes_b || 0);
        const winnerVotes = b.winner_id === b.creator_a?.id ? b.votes_a : b.votes_b;
        const winRate = total > 0 ? Math.round((winnerVotes / total) * 100) : 50;
        return buildItem({
          title: `⚔️ ${aName} vs ${bName} - ${winnerName} 승리!`,
          link: `${SITE_URL}/battle`,
          description: `${aName} ${(b.votes_a || 0).toLocaleString()}표 vs ${bName} ${(b.votes_b || 0).toLocaleString()}표. 최종 승자: ${winnerName} (득표율 ${winRate}%)`,
          pubDate: b.ends_at || b.created_at,
          guid: `${SITE_URL}/battle#${b.id}`,
        });
      })
      .join("\n");

    const xml = buildRss(
      {
        title: "Rankit 배틀 결과",
        link: `${SITE_URL}/battle`,
        description: "크리에이터 1v1 배틀 최신 결과",
        feedUrl: `${SITE_URL}/rss-battle`,
      },
      items
    );

    return new Response(xml, { headers: rssHeaders, status: 200 });
  } catch (err: any) {
    return errorResponse(err?.message || "RSS generation failed");
  }
});
