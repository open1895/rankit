import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function escapeXml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc822(date: Date): string {
  return date.toUTCString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: rows, error } = await supabase
      .from("hall_of_fame")
      .select(`
        id,
        creator_id,
        final_rank,
        final_votes,
        period_label,
        period_type,
        period_end,
        created_at,
        creators:creator_id ( name, category, rankit_score )
      `)
      .order("period_end", { ascending: false })
      .order("final_rank", { ascending: true })
      .limit(30);

    if (error) throw error;

    const siteUrl = "https://www.rankit.today";
    const lastBuildDate = toRfc822(new Date());

    const items = (rows || [])
      .map((r: any) => {
        const creator = r.creators || {};
        const link = `${siteUrl}/creator/${r.creator_id}`;
        const pubDateRaw = r.created_at || r.period_end || new Date().toISOString();
        const pubDate = toRfc822(new Date(pubDateRaw));
        const title = `[${r.period_label}] ${r.final_rank}위 ${creator.name || "Unknown"} - ${r.final_votes}표`;
        const description = `${r.period_label} 시즌 ${r.final_rank}위에 ${creator.name || "Unknown"}이(가) 등극했습니다.\n최종 투표수: ${r.final_votes}표\n카테고리: ${creator.category || "기타"}\n랭킷 스코어: ${creator.rankit_score ?? 0}`;

        return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid>${escapeXml(`${link}#${r.id}`)}</guid>
    </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Rankit 명예의 전당 - 시즌 우승자</title>
    <link>${siteUrl}/hall-of-fame</link>
    <description>역대 시즌별 명예의 전당에 등극한 크리에이터들의 기록</description>
    <language>ko</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=600",
      },
      status: 200,
    });
  } catch (err: any) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<error>${escapeXml(err?.message || "RSS generation failed")}</error>`,
      {
        headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" },
        status: 500,
      }
    );
  }
});
