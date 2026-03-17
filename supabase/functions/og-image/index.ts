import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const creatorId = url.searchParams.get("creator_id");

    if (!creatorId) {
      return new Response("Missing creator_id", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: creator, error } = await supabase
      .from("creators")
      .select("name, rank, votes_count, category, avatar_url, rankit_score")
      .eq("id", creatorId)
      .single();

    if (error || !creator) {
      return new Response("Creator not found", { status: 404, headers: corsHeaders });
    }

    const W = 1200;
    const H = 630;

    // Generate SVG-based OG image
    const rankEmoji = creator.rank === 1 ? "👑" : creator.rank === 2 ? "🥈" : creator.rank === 3 ? "🥉" : "🏆";
    const scoreFormatted = Number(creator.rankit_score || 0) >= 10000 
      ? `${(Number(creator.rankit_score) / 10000).toFixed(1)}만`
      : Number(creator.rankit_score || 0).toLocaleString();

    const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="50%" style="stop-color:#1a1040"/>
      <stop offset="100%" style="stop-color:#0a1525"/>
    </linearGradient>
    <linearGradient id="purple" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#a855f7"/>
      <stop offset="100%" style="stop-color:#7c3aed"/>
    </linearGradient>
    <linearGradient id="cyan" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#06b6d4"/>
      <stop offset="100%" style="stop-color:#0891b2"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  
  <!-- Decorative circles -->
  <circle cx="100" cy="100" r="200" fill="#a855f7" opacity="0.08"/>
  <circle cx="1100" cy="530" r="250" fill="#06b6d4" opacity="0.06"/>
  
  <!-- Top bar -->
  <rect x="40" y="40" width="180" height="36" rx="18" fill="#a855f720" stroke="#a855f740" stroke-width="1"/>
  <text x="130" y="64" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#a855f7" text-anchor="middle" font-weight="700">RANKIT</text>

  <!-- Rank badge -->
  <rect x="40" y="120" width="160" height="80" rx="16" fill="url(#purple)"/>
  <text x="120" y="155" font-family="system-ui, sans-serif" font-size="16" fill="white" text-anchor="middle" font-weight="600">현재 순위</text>
  <text x="120" y="185" font-family="system-ui, sans-serif" font-size="32" fill="white" text-anchor="middle" font-weight="900">${rankEmoji} ${creator.rank}위</text>

  <!-- Creator name -->
  <text x="240" y="160" font-family="system-ui, sans-serif" font-size="52" fill="white" font-weight="900">${xmlEscape(creator.name)}</text>
  <text x="240" y="195" font-family="system-ui, sans-serif" font-size="20" fill="#94a3b8">${xmlEscape(creator.category || "크리에이터")}</text>

  <!-- Stats cards -->
  <rect x="40" y="250" width="340" height="100" rx="16" fill="#ffffff08" stroke="#ffffff10" stroke-width="1"/>
  <text x="210" y="290" font-family="system-ui, sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle">누적 득표수</text>
  <text x="210" y="330" font-family="system-ui, sans-serif" font-size="36" fill="#06b6d4" text-anchor="middle" font-weight="900">${(creator.votes_count || 0).toLocaleString()}표</text>

  <rect x="420" y="250" width="340" height="100" rx="16" fill="#ffffff08" stroke="#ffffff10" stroke-width="1"/>
  <text x="590" y="290" font-family="system-ui, sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle">Rankit 스코어</text>
  <text x="590" y="330" font-family="system-ui, sans-serif" font-size="36" fill="#a855f7" text-anchor="middle" font-weight="900">${scoreFormatted}</text>

  <rect x="800" y="250" width="360" height="100" rx="16" fill="#ffffff08" stroke="#ffffff10" stroke-width="1"/>
  <text x="980" y="290" font-family="system-ui, sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle">카테고리</text>
  <text x="980" y="330" font-family="system-ui, sans-serif" font-size="28" fill="white" text-anchor="middle" font-weight="700">${creator.category || "종합"}</text>

  <!-- CTA -->
  <rect x="40" y="400" width="1120" height="70" rx="16" fill="url(#purple)" opacity="0.9"/>
  <text x="600" y="443" font-family="system-ui, sans-serif" font-size="22" fill="white" text-anchor="middle" font-weight="700">🗳️ 지금 투표하고 순위를 바꿔보세요! → rankit.today</text>

  <!-- Footer -->
  <text x="40" y="560" font-family="system-ui, sans-serif" font-size="14" fill="#64748b">rankit.today</text>
  <text x="1160" y="560" font-family="system-ui, sans-serif" font-size="14" fill="#64748b" text-anchor="end">팬 활동 기반 크리에이터 영향력 랭킹</text>

  <!-- Bottom accent line -->
  <rect x="0" y="620" width="${W}" height="10" fill="url(#purple)"/>
</svg>`;

    // Return SVG as image
    return new Response(svg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (err) {
    console.error("OG image error:", err);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
