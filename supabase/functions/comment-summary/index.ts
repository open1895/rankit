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

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch recent comments (last 3 days, up to 50)
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    const { data: comments } = await supabase
      .from("comments")
      .select("message, nickname, creator_id, creators(name)")
      .gte("created_at", threeDaysAgo)
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch recent board posts (last 3 days)
    const { data: boardPosts } = await supabase
      .from("board_posts")
      .select("title, content, category")
      .eq("is_active", true)
      .gte("created_at", threeDaysAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    const commentTexts = (comments || []).map(
      (c: any) => `[${c.creators?.name || "unknown"}] ${c.nickname}: ${c.message}`
    );
    const boardTexts = (boardPosts || []).map(
      (p: any) => `[${p.category}] ${p.title}: ${p.content?.slice(0, 100)}`
    );

    if (commentTexts.length === 0 && boardTexts.length === 0) {
      return new Response(
        JSON.stringify({
          summary: {
            sentiment: "neutral",
            headline: "아직 분석할 댓글이 충분하지 않습니다.",
            points: ["최근 3일간 활동 데이터가 부족합니다."],
            topTopic: null,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are a Korean community analyst for a creator ranking platform called Rankit.
Analyze these recent fan comments and community posts, then summarize the overall community mood and discussions.

Fan comments (last 3 days):
${commentTexts.slice(0, 30).join("\n")}

Community board posts (last 3 days):
${boardTexts.slice(0, 15).join("\n")}

Total comments: ${commentTexts.length}, Total board posts: ${boardTexts.length}`;

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
              name: "return_summary",
              description: "Return community comment summary",
              parameters: {
                type: "object",
                properties: {
                  sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                  headline: { type: "string", description: "One-line Korean summary, max 40 chars" },
                  points: {
                    type: "array",
                    items: { type: "string" },
                    description: "3 Korean bullet points, each max 50 chars",
                  },
                  topTopic: { type: "string", description: "Top discussion topic in Korean, max 20 chars, or null" },
                },
                required: ["sentiment", "headline", "points"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_summary" } },
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
    let summary = { sentiment: "neutral", headline: "요약을 생성할 수 없습니다.", points: [], topTopic: null };

    if (toolCall?.function?.arguments) {
      summary = JSON.parse(toolCall.function.arguments);
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("comment-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
