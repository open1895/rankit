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

    // Fetch all creators for normalization
    const { data: allCreators } = await supabase
      .from("creators")
      .select("id, subscriber_count, votes_count, youtube_subscribers, chzzk_followers, instagram_followers, tiktok_followers, category, rank, rankit_score");

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

    // Fetch recent comments & posts count
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();

    const [recentCommentsRes, prevCommentsRes, recentPostsRes, prevPostsRes] = await Promise.all([
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("creator_id", creator_id).gte("created_at", sevenDaysAgo),
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("creator_id", creator_id).gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("creator_id", creator_id).gte("created_at", sevenDaysAgo),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("creator_id", creator_id).gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo),
    ]);

    const recentComments = recentCommentsRes.count || 0;
    const prevComments = prevCommentsRes.count || 0;
    const recentPosts = recentPostsRes.count || 0;
    const prevPosts = prevPostsRes.count || 0;

    // ─── Calculate Influence Score ───
    const all = allCreators || [];
    const maxSubs = Math.max(1, ...all.map(c => (c.youtube_subscribers || 0) + (c.chzzk_followers || 0) + (c.instagram_followers || 0) + (c.tiktok_followers || 0)));
    const maxVotes = Math.max(1, ...all.map(c => c.votes_count || 0));

    const totalSubs = (creator.youtube_subscribers || 0) + (creator.chzzk_followers || 0) + (creator.instagram_followers || 0) + (creator.tiktok_followers || 0);
    const subsNorm = Math.min(100, (totalSubs / maxSubs) * 100);
    const votesNorm = Math.min(100, (creator.votes_count / maxVotes) * 100);

    // Community score: based on recent activity
    const communityActivity = recentComments + recentPosts * 2;
    const maxCommunity = Math.max(1, ...all.map(() => 50)); // estimate
    const communityNorm = Math.min(100, (communityActivity / 30) * 100);

    // Growth score: vote and activity growth
    const recentVotes7d = (dailyVotes || []).slice(-7);
    const prevVotes7d = (dailyVotes || []).slice(0, 7);
    const totalRecent = recentVotes7d.reduce((s: number, v: any) => s + Number(v.vote_count), 0);
    const totalPrev = prevVotes7d.reduce((s: number, v: any) => s + Number(v.vote_count), 0);
    const voteGrowthRate = totalPrev > 0 ? ((totalRecent - totalPrev) / totalPrev) * 100 : (totalRecent > 0 ? 100 : 0);
    const activityGrowthRate = prevComments > 0 ? ((recentComments - prevComments) / prevComments) * 100 : (recentComments > 0 ? 100 : 0);
    const growthNorm = Math.min(100, Math.max(0, 50 + (voteGrowthRate + activityGrowthRate) / 4));

    // Weighted influence score
    const influenceScore = Math.round(
      subsNorm * 0.4 + votesNorm * 0.3 + communityNorm * 0.2 + growthNorm * 0.1
    );

    const breakdown = {
      subscriber: Math.round(subsNorm),
      voting: Math.round(votesNorm),
      community: Math.round(communityNorm),
      growth: Math.round(growthNorm),
    };

    // Category ranking by influence
    const categoryCreators = all.filter(c => c.category === creator.category);
    const categoryRank = categoryCreators.filter(c => {
      const s = (c.youtube_subscribers || 0) + (c.chzzk_followers || 0) + (c.instagram_followers || 0) + (c.tiktok_followers || 0);
      const sN = Math.min(100, (s / maxSubs) * 100);
      const vN = Math.min(100, ((c.votes_count || 0) / maxVotes) * 100);
      const score = sN * 0.4 + vN * 0.3 + 50 * 0.2 + 50 * 0.1; // approximate for others
      return score > influenceScore;
    }).length + 1;
    const categoryTotal = categoryCreators.length;

    const peakHour = (hourlyVotes || []).reduce(
      (best: any, h: any) => (Number(h.today_count) > (best?.today_count || 0) ? h : best),
      null
    );

    // ─── AI Insights ───
    const prompt = `You are a Korean-language data analyst for a creator ranking platform called Rankit.
Analyze the following creator data and generate exactly 5 short insight cards in Korean.

Creator: ${creator.name}
Category: ${creator.category}
Current Rank: #${creator.rank}
Total Votes: ${creator.votes_count}
Influence Score: ${influenceScore}/100

Score Breakdown:
- Subscriber Score: ${breakdown.subscriber}/100 (weight: 40%)
- Voting Score: ${breakdown.voting}/100 (weight: 30%)
- Community Score: ${breakdown.community}/100 (weight: 20%)
- Growth Score: ${breakdown.growth}/100 (weight: 10%)

Vote trend (last 7 days): ${totalRecent} votes
Vote trend (previous 7 days): ${totalPrev} votes
Vote growth rate: ${Math.round(voteGrowthRate)}%

Peak voting hour (today): ${peakHour ? `${peakHour.vote_hour}:00` : "unknown"}
Fan comments (last 7 days): ${recentComments}
Fan comments (prev 7 days): ${prevComments}
Fan posts (last 7 days): ${recentPosts}

Category position: ${categoryRank}/${categoryTotal} in "${creator.category}"
Rank history (recent): ${(rankHistory || []).slice(0, 5).map((r: any) => `#${r.rank}`).join(" → ")}

Return ONLY a valid JSON array with exactly 5 objects. Each object has:
- "icon": one of "trending_up", "clock", "users", "zap", "star"
- "title": short title (max 15 chars)
- "description": one sentence insight in Korean (max 60 chars)
- "type": one of "positive", "neutral", "warning"

Focus on actionable, specific insights using actual numbers. Include insights about influence score changes, fan engagement comparisons, and growth predictions. Do NOT use generic statements.`;

    let insights: any[] = [];

    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "user", content: prompt }],
          tools: [
            {
              type: "function",
              function: {
                name: "return_insights",
                description: "Return creator influence insights as structured data",
                parameters: {
                  type: "object",
                  properties: {
                    insights: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          icon: { type: "string", enum: ["trending_up", "clock", "users", "zap", "star"] },
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

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          const parsed = JSON.parse(toolCall.function.arguments);
          insights = parsed.insights || [];
        }
      } else {
        const errText = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, errText);
      }
    } catch (aiErr) {
      console.error("AI call failed, using fallback insights:", aiErr);
    }

    // Fallback insights when AI is unavailable
    if (insights.length === 0) {
      const growthType = voteGrowthRate > 10 ? "positive" : voteGrowthRate < -10 ? "warning" : "neutral";
      insights = [
        { icon: "trending_up", title: "투표 추이", description: `최근 7일 ${totalRecent}표, 이전 대비 ${Math.round(voteGrowthRate)}% ${voteGrowthRate >= 0 ? '증가' : '감소'}`, type: growthType },
        { icon: "star", title: "영향력 점수", description: `현재 영향력 ${influenceScore}점 (구독 ${breakdown.subscriber}, 투표 ${breakdown.voting})`, type: influenceScore > 50 ? "positive" : "neutral" },
        { icon: "users", title: "카테고리 순위", description: `${creator.category} 분야 ${categoryRank}위 / ${categoryTotal}명`, type: categoryRank <= 3 ? "positive" : "neutral" },
        { icon: "zap", title: "커뮤니티 활동", description: `최근 7일 댓글 ${recentComments}개, 게시글 ${recentPosts}개`, type: recentComments > 5 ? "positive" : "neutral" },
        { icon: "clock", title: "피크 시간대", description: peakHour ? `오늘 투표가 가장 활발한 시간: ${peakHour.vote_hour}시` : "아직 오늘의 투표 데이터가 부족합니다", type: "neutral" },
      ];
    }

    return new Response(JSON.stringify({
      influenceScore,
      breakdown,
      categoryRank,
      categoryTotal,
      voteGrowthRate: Math.round(voteGrowthRate),
      communityGrowthRate: Math.round(activityGrowthRate),
      insights,
    }), {
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
