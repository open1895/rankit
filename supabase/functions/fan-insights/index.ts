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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { creator_id } = await req.json();
    if (!creator_id) throw new Error("creator_id is required");

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch creator
    const { data: creator } = await supabase
      .from("creators")
      .select("*")
      .eq("id", creator_id)
      .single();
    if (!creator) throw new Error("Creator not found");

    // Hourly votes
    const { data: hourlyVotes } = await supabase.rpc("get_creator_hourly_votes", {
      p_creator_id: creator_id,
    });

    // Daily votes (14 days)
    const { data: dailyVotes } = await supabase.rpc("get_creator_daily_votes", {
      p_creator_id: creator_id,
      p_days: 14,
    });

    // Fan comments (last 7 days vs prev 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();

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

    // Fan posts
    const { count: recentPosts } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creator_id)
      .gte("created_at", sevenDaysAgo);

    const { count: prevPosts } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creator_id)
      .gte("created_at", fourteenDaysAgo)
      .lt("created_at", sevenDaysAgo);

    // Category comparison
    const { data: categoryCreators } = await supabase
      .from("creators")
      .select("id, votes_count")
      .eq("category", creator.category);

    const categoryTotal = (categoryCreators || []).length;
    const creatorsWithLessActivity = (categoryCreators || []).filter(
      (c: any) => c.votes_count < creator.votes_count
    ).length;
    const activityPercentile = categoryTotal > 0
      ? Math.round((creatorsWithLessActivity / categoryTotal) * 100)
      : 50;

    // Peak hours
    const hourlyArr = (hourlyVotes || []) as any[];
    const peakHour = hourlyArr.reduce(
      (best: any, h: any) => (Number(h.vote_count) > (best?.vote_count || 0) ? h : best),
      null
    );

    // Daily pattern
    const dailyArr = (dailyVotes || []) as any[];
    const recent7 = dailyArr.slice(-7);
    const prev7 = dailyArr.slice(0, 7);
    const totalRecent = recent7.reduce((s: number, d: any) => s + Number(d.vote_count), 0);
    const totalPrev = prev7.reduce((s: number, d: any) => s + Number(d.vote_count), 0);
    const voteGrowth = totalPrev > 0 ? Math.round(((totalRecent - totalPrev) / totalPrev) * 100) : 0;

    // Find most active day of week
    const dayVotes: Record<number, number> = {};
    recent7.forEach((d: any) => {
      const dayOfWeek = new Date(d.vote_date).getDay();
      dayVotes[dayOfWeek] = (dayVotes[dayOfWeek] || 0) + Number(d.vote_count);
    });
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const bestDayEntry = Object.entries(dayVotes).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    const bestDay = bestDayEntry ? dayNames[Number(bestDayEntry[0])] : null;

    const prompt = `You are a Korean-language fan analytics expert for a creator platform called Rankit.
Analyze the following fan activity data for creator "${creator.name}" and generate exactly 5 actionable insight cards in Korean.

Data:
- Peak voting hour: ${peakHour ? `${peakHour.vote_hour}:00 (${peakHour.vote_count} votes total)` : "No data"}
- Most active fan day: ${bestDay ? `${bestDay}요일` : "No data"}
- Vote growth (week-over-week): ${voteGrowth}% (${totalRecent} this week vs ${totalPrev} last week)
- Fan comments this week: ${recentComments || 0} (last week: ${prevComments || 0})
- Fan posts this week: ${recentPosts || 0} (last week: ${prevPosts || 0})
- Community activity percentile vs same category: top ${100 - activityPercentile}% (better than ${activityPercentile}% of "${creator.category}" creators)
- Total votes: ${creator.votes_count}
- Current rank: #${creator.rank}

Rules:
- Each insight must reference SPECIFIC NUMBERS from the data
- Include actionable advice where relevant
- Use emoji in descriptions naturally
- Keep descriptions under 80 characters

Return exactly 5 insights.`;

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
              name: "return_fan_insights",
              description: "Return fan activity insights",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        icon: { type: "string", enum: ["clock", "calendar", "trending_up", "users", "zap"] },
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
        tool_choice: { type: "function", function: { name: "return_fan_insights" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let insights: any[] = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      insights = parsed.insights || [];
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fan-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
