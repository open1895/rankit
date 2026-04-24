import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildItem, buildRss, corsHeaders, errorResponse, rssHeaders, SITE_URL } from "../_shared/rss.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: posts, error } = await supabase
      .from("board_posts")
      .select("id, title, content, author, likes, category, created_at")
      .eq("is_active", true)
      .order("likes", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;

    const items = (posts || [])
      .map((p: any) => {
        const snippet = (p.content || "").replace(/\s+/g, " ").slice(0, 100);
        return buildItem({
          title: `${p.title} - ${p.author}`,
          link: `${SITE_URL}/community`,
          description: `${snippet}${(p.content || "").length > 100 ? "..." : ""}`,
          pubDate: p.created_at,
          guid: `${SITE_URL}/community#${p.id}`,
        });
      })
      .join("\n");

    const xml = buildRss(
      {
        title: "Rankit 커뮤니티 인기 게시글",
        link: `${SITE_URL}/community`,
        description: "랭킷 팬들의 인기 게시글 모음",
        feedUrl: `${SITE_URL}/rss-community`,
      },
      items
    );

    return new Response(xml, { headers: rssHeaders, status: 200 });
  } catch (err: any) {
    return errorResponse(err?.message || "RSS generation failed");
  }
});
