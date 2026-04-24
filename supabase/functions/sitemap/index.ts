import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://rankit.today";

const STATIC_URLS: Array<{ loc: string; changefreq: string; priority: string }> = [
  { loc: "/", changefreq: "hourly", priority: "1.0" },
  { loc: "/explore", changefreq: "daily", priority: "0.9" },
  { loc: "/community", changefreq: "daily", priority: "0.8" },
  { loc: "/battle", changefreq: "daily", priority: "0.8" },
  { loc: "/tournament", changefreq: "daily", priority: "0.8" },
  { loc: "/prediction", changefreq: "daily", priority: "0.7" },
  { loc: "/prediction-leaderboard", changefreq: "daily", priority: "0.6" },
  { loc: "/rising", changefreq: "daily", priority: "0.7" },
  { loc: "/monthly-top3", changefreq: "monthly", priority: "0.7" },
  { loc: "/hall-of-fame", changefreq: "weekly", priority: "0.7" },
  { loc: "/fans", changefreq: "daily", priority: "0.6" },
  { loc: "/compare", changefreq: "weekly", priority: "0.6" },
  { loc: "/seasons", changefreq: "monthly", priority: "0.5" },
  { loc: "/pricing", changefreq: "monthly", priority: "0.8" },
  { loc: "/support", changefreq: "monthly", priority: "0.4" },
];

const CATEGORIES = ["게임", "먹방", "뷰티", "음악", "운동", "여행", "테크", "아트", "교육", "댄스"];

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

// W3C Datetime (YYYY-MM-DD) — sitemap protocol standard for <lastmod>
const today = () => new Date().toISOString().split("T")[0];
const toDate = (v: string | null | undefined) => {
  if (!v) return today();
  const d = new Date(v);
  return isNaN(d.getTime()) ? today() : d.toISOString().split("T")[0];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: creators } = await supabase
      .from("creators")
      .select("id, name, last_stats_updated, created_at")
      .order("rank", { ascending: true })
      .limit(2000);

    const todayStr = today();
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">');

    for (const u of STATIC_URLS) {
      lines.push("  <url>");
      lines.push(`    <loc>${BASE_URL}${u.loc}</loc>`);
      lines.push(`    <lastmod>${todayStr}</lastmod>`);
      lines.push(`    <changefreq>${u.changefreq}</changefreq>`);
      lines.push(`    <priority>${u.priority}</priority>`);
      lines.push("  </url>");
    }

    for (const cat of CATEGORIES) {
      lines.push("  <url>");
      lines.push(`    <loc>${BASE_URL}/category/${encodeURIComponent(cat)}</loc>`);
      lines.push(`    <lastmod>${todayStr}</lastmod>`);
      lines.push("    <changefreq>daily</changefreq>");
      lines.push("    <priority>0.8</priority>");
      lines.push("  </url>");
    }

    for (const c of creators || []) {
      const lastmod = toDate(c.last_stats_updated || c.created_at);
      lines.push("  <url>");
      lines.push(`    <loc>${BASE_URL}/creator/${escapeXml(c.id)}</loc>`);
      lines.push(`    <lastmod>${lastmod}</lastmod>`);
      lines.push("    <changefreq>daily</changefreq>");
      lines.push("    <priority>0.7</priority>");
      lines.push("  </url>");
    }

    lines.push("</urlset>");

    return new Response(lines.join("\n"), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=UTF-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    return new Response(`Error: ${(err as Error).message}`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=UTF-8" },
    });
  }
});
