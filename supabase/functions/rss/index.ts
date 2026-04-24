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

    const { data: creators, error } = await supabase
      .from("creators")
      .select("id, name, category, votes_count, rank, rankit_score, last_stats_updated, created_at")
      .order("rank", { ascending: true })
      .limit(10);

    if (error) throw error;

    const siteUrl = "https://www.rankit.today";
    const lastBuildDate = toRfc822(new Date());

    const items = (creators || [])
      .map((c: any) => {
        const link = `${siteUrl}/creator/${c.id}`;
        const pubDateRaw = c.last_stats_updated || c.created_at || new Date().toISOString();
        const pubDate = toRfc822(new Date(pubDateRaw));
        const title = `${c.rank}위 ${c.name} - ${c.votes_count}표`;
        const description = `${c.name}이(가) 현재 ${c.rank}위입니다.\n누적 투표수: ${c.votes_count}표\n카테고리: ${c.category || "기타"}\n랭킷 스코어: ${c.rankit_score}`;

        return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid>${escapeXml(link)}</guid>
    </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Rankit - 크리에이터 영향력 랭킹</title>
    <link>${siteUrl}</link>
    <description>팬 투표로 결정되는 실시간 크리에이터 영향력 순위</description>
    <language>ko</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
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
