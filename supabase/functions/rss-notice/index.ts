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
      .select("id, title, content, author, created_at")
      .eq("is_active", true)
      .eq("category", "공지")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;

    const items = (posts || [])
      .map((p: any) => {
        const snippet = (p.content || "").replace(/\s+/g, " ").slice(0, 200);
        return buildItem({
          title: `📢 ${p.title}`,
          link: `${SITE_URL}/community`,
          description: snippet,
          pubDate: p.created_at,
          guid: `${SITE_URL}/community#${p.id}`,
        });
      })
      .join("\n");

    const xml = buildRss(
      {
        title: "Rankit 공지사항",
        link: `${SITE_URL}/community`,
        description: "Rankit 서비스 공지 및 이벤트 안내",
      },
      items
    );

    return new Response(xml, { headers: rssHeaders, status: 200 });
  } catch (err: any) {
    return errorResponse(err?.message || "RSS generation failed");
  }
});
