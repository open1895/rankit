import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { creator_id } = await req.json();
    if (!creator_id) throw new Error("creator_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch creator data
    const { data: creator } = await supabase
      .from("creators")
      .select("*")
      .eq("id", creator_id)
      .single();

    if (!creator) throw new Error("Creator not found");

    // Fetch daily votes (last 14 days)
    const { data: dailyVotes } = await supabase.rpc("get_creator_daily_votes", {
      p_creator_id: creator_id,
      p_days: 14,
    });

    // Fetch hourly votes
    const { data: hourlyVotes } = await supabase.rpc("get_creator_hourly_votes", {
      p_creator_id: creator_id,
    });

    // Fetch rank history
    const { data: rankHistory } = await supabase
      .from("rank_history")
      .select("rank, votes_count, recorded_at")
      .eq("creator_id", creator_id)
      .order("recorded_at", { ascending: false })
      .limit(30);

    // Fetch recent comments count
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const { count: recentComments } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creator_id)
      .gte("created_at", sevenDaysAgo);

    const { count: prevComments } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creator_id)
      .gte("created_at", fourteenDaysAgo)
      .lt("created_at", sevenDaysAgo);

    // Fetch same-category creators for comparison
    const { data: categoryCreators } = await supabase
      .from("creators")
      .select("id, votes_count, rank, rankit_score")
      .eq("category", creator.category)
      .order("rankit_score", { ascending: false })
      .limit(20);

    // Build context for AI
    const recentVotes7d = (dailyVotes || []).slice(-7);
    const prevVotes7d = (dailyVotes || []).slice(0, 7);
    const totalRecent = recentVotes7d.reduce((s: number, v: any) => s + Number(v.vote_count), 0);
    const totalPrev = prevVotes7d.reduce((s: number, v: any) => s + Number(v.vote_count), 0);

    const peakHour = (hourlyVotes || []).reduce(
      (best: any, h: any) => (Number(h.today_count) > (best?.today_count || 0) ? h : best),
      null
    );

    const categoryRank = (categoryCreators || []).findIndex((c: any) => c.id === creator_id) + 1;
    const categoryTotal = (categoryCreators || []).length;

    const prompt = `You are a Korean-language data analyst for a creator ranking platform called Rankit.
Analyze the following creator data and generate exactly 4 short insight cards in Korean.

Creator: ${creator.name}
Category: ${creator.category}
Current Rank: #${creator.rank}
Total Votes: ${creator.votes_count}
Rankit Score: ${creator.rankit_score}

Vote trend (last 7 days total): ${totalRecent} votes
Vote trend (previous 7 days total): ${totalPrev} votes
Vote growth rate: ${totalPrev > 0 ? Math.round(((totalRecent - totalPrev) / totalPrev) * 100) : "N/A"}%

Peak voting hour (today): ${peakHour ? `${peakHour.vote_hour}:00` : "unknown"}
Fan comments (last 7 days): ${recentComments || 0}
Fan comments (prev 7 days): ${prevComments || 0}

Category position: ${categoryRank}/${categoryTotal} in "${creator.category}"

Rank history (recent): ${(rankHistory || []).slice(0, 5).map((r: any) => `#${r.rank}`).join(" → ")}

Return ONLY a valid JSON array with exactly 4 objects. Each object has:
- "icon": one of "trending_up", "clock", "users", "zap"
- "title": short title (max 15 chars)
- "description": one sentence insight in Korean (max 60 chars)
- "type": one of "positive", "neutral", "warning"

Focus on actionable, specific insights using actual numbers. Do NOT use generic statements.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        tools: [
          {
            type: "function",
            function: {
              name: "return_insights",
              description: "Return creator growth insights as structured data",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        icon: { type: "string", enum: ["trending_up", "clock", "users", "zap"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        type: { type: "string", enum: ["positive", "neutral", "warning"] },
                      },
                      required: ["icon", "title", "description", "type"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["insights"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_insights" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let insights = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      insights = parsed.insights || [];
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("creator-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
