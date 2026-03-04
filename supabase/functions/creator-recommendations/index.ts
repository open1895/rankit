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
    const { user_id, creator_id, mode } = await req.json();
    // mode: "user" (personalized), "similar" (similar to a creator), "popular" (fallback)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all creators for reference
    const { data: allCreators } = await supabase
      .from("creators")
      .select("id, name, avatar_url, category, rank, votes_count, rankit_score")
      .order("rankit_score", { ascending: false })
      .limit(100);

    if (!allCreators || allCreators.length === 0) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let contextPrompt = "";

    if (mode === "similar" && creator_id) {
      // Find similar creators based on the current creator
      const currentCreator = allCreators.find((c: any) => c.id === creator_id);
      if (!currentCreator) throw new Error("Creator not found");

      // Get fans who voted for this creator
      const { data: voters } = await supabase
        .from("votes")
        .select("voter_ip")
        .eq("creator_id", creator_id)
        .order("created_at", { ascending: false })
        .limit(200);

      const voterIps = [...new Set((voters || []).map((v: any) => v.voter_ip))].slice(0, 50);

      // Find what else those fans voted for
      let coVotedCreators: Record<string, number> = {};
      if (voterIps.length > 0) {
        const { data: coVotes } = await supabase
          .from("votes")
          .select("creator_id")
          .in("voter_ip", voterIps)
          .neq("creator_id", creator_id)
          .limit(500);

        (coVotes || []).forEach((v: any) => {
          coVotedCreators[v.creator_id] = (coVotedCreators[v.creator_id] || 0) + 1;
        });
      }

      const topCoVoted = Object.entries(coVotedCreators)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, count]) => {
          const cr = allCreators.find((c: any) => c.id === id);
          return cr ? `${cr.name}(${cr.category}, #${cr.rank}, co-votes: ${count})` : null;
        })
        .filter(Boolean);

      contextPrompt = `Current creator: ${currentCreator.name} (Category: ${currentCreator.category}, Rank: #${currentCreator.rank})
Creators that fans of ${currentCreator.name} also voted for: ${topCoVoted.join(", ") || "No co-vote data"}
Same category creators: ${allCreators.filter((c: any) => c.category === currentCreator.category && c.id !== creator_id).slice(0, 10).map((c: any) => `${c.name}(#${c.rank})`).join(", ")}`;

    } else if (mode === "user" && user_id) {
      // Personalized recommendations based on user activity
      const { data: userVotes } = await supabase
        .from("votes")
        .select("creator_id")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(50);

      const votedIds = [...new Set((userVotes || []).map((v: any) => v.creator_id))];
      const votedCreators = votedIds
        .map((id) => allCreators.find((c: any) => c.id === id))
        .filter(Boolean);

      // Get user's comment activity
      const { data: userComments } = await supabase
        .from("comments")
        .select("creator_id")
        .limit(30);

      const commentedIds = [...new Set((userComments || []).map((c: any) => c.creator_id))];

      // Categories the user engages with
      const categories = [...new Set(votedCreators.map((c: any) => c.category))];

      contextPrompt = `User voted for: ${votedCreators.slice(0, 10).map((c: any) => `${c.name}(${c.category})`).join(", ") || "No votes yet"}
User's preferred categories: ${categories.join(", ") || "Unknown"}
User commented on ${commentedIds.length} creators
Already voted creator IDs (exclude these): ${votedIds.join(", ")}`;

    } else {
      // Popular/trending fallback
      contextPrompt = `No user context available. Recommend trending and popular creators.
Top creators by score: ${allCreators.slice(0, 15).map((c: any) => `${c.name}(${c.category}, #${c.rank})`).join(", ")}`;
    }

    const allCreatorsList = allCreators
      .map((c: any) => `ID:${c.id}|${c.name}|${c.category}|#${c.rank}|${c.votes_count}votes`)
      .join("\n");

    const prompt = `You are a recommendation engine for a Korean creator ranking platform.
Based on the context below, select exactly 8 creator IDs that would be the best recommendations.

Context:
${contextPrompt}

Available creators:
${allCreatorsList}

Rules:
- Pick diverse categories when possible
- Prioritize creators that share audience overlap
- For "similar" mode, exclude the current creator
- For "user" mode, exclude creators the user already voted for
- Mix popular and rising creators

Return ONLY the selected creator IDs.`;

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
              name: "return_recommendations",
              description: "Return recommended creator IDs",
              parameters: {
                type: "object",
                properties: {
                  creator_ids: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of recommended creator UUIDs",
                  },
                  reason: {
                    type: "string",
                    description: "Brief Korean explanation of why these were recommended",
                  },
                },
                required: ["creator_ids", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_recommendations" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let recommendedIds: string[] = [];
    let reason = "";

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      recommendedIds = parsed.creator_ids || [];
      reason = parsed.reason || "";
    }

    // Map IDs back to creator data
    const recommendations = recommendedIds
      .map((id: string) => allCreators.find((c: any) => c.id === id))
      .filter(Boolean)
      .slice(0, 8);

    return new Response(JSON.stringify({ recommendations, reason }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("creator-recommendations error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
