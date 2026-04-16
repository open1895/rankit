// Edge function: dynamic SVG badge for creator widget
// GET /widget/creator/:id/badge.svg?theme=dark|light|purple
// Routed via App.tsx proxy: actually called as functions/v1/creator-badge?id=...&theme=...
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "public, max-age=300, s-maxage=300",
};

const themes = {
  dark:   { bg: "#0f172a", border: "#334155", text: "#f1f5f9", sub: "#94a3b8", accent: "#a78bfa" },
  light:  { bg: "#ffffff", border: "#e2e8f0", text: "#0f172a", sub: "#64748b", accent: "#7c3aed" },
  purple: { bg: "#4c1d95", border: "#a78bfa", text: "#ffffff", sub: "#ddd6fe", accent: "#fbbf24" },
};

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const themeKey = (url.searchParams.get("theme") || "dark") as keyof typeof themes;
    const t = themes[themeKey] || themes.dark;

    if (!id) return new Response("Missing id", { status: 400, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: creator } = await supabase
      .from("creators")
      .select("name,rank,votes_count,category")
      .eq("id", id)
      .single();

    if (!creator) {
      const fallback = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="40"><rect width="220" height="40" fill="#888"/><text x="110" y="25" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="12">크리에이터를 찾을 수 없음</text></svg>`;
      return new Response(fallback, { headers: { ...corsHeaders, "Content-Type": "image/svg+xml" } });
    }

    const name = escapeXml(creator.name.length > 14 ? creator.name.slice(0, 14) + "…" : creator.name);
    const rank = creator.rank;
    const votes = (creator.votes_count || 0).toLocaleString();
    const rankColor = rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : t.accent;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="56" viewBox="0 0 240 56">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.bg}"/>
      <stop offset="100%" stop-color="${t.bg}" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect width="240" height="56" rx="10" fill="url(#bg)" stroke="${t.border}"/>
  <text x="14" y="22" font-family="-apple-system, 'Pretendard', sans-serif" font-size="11" font-weight="600" fill="${t.sub}">RANK IT</text>
  <text x="14" y="42" font-family="-apple-system, 'Pretendard', sans-serif" font-size="14" font-weight="800" fill="${t.text}">${name}</text>
  <text x="226" y="22" text-anchor="end" font-family="-apple-system, 'Pretendard', sans-serif" font-size="20" font-weight="900" fill="${rankColor}">${rank}위</text>
  <text x="226" y="42" text-anchor="end" font-family="-apple-system, 'Pretendard', sans-serif" font-size="11" font-weight="700" fill="${t.accent}">♥ ${votes}</text>
</svg>`;

    return new Response(svg, {
      headers: { ...corsHeaders, "Content-Type": "image/svg+xml; charset=utf-8" },
    });
  } catch (err) {
    console.error(err);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
