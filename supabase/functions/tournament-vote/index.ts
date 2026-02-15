import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "로그인이 필요합니다." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "인증에 실패했습니다." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { match_id, voted_creator_id } = await req.json();
    if (!match_id || !voted_creator_id) {
      return new Response(JSON.stringify({ error: "match_id and voted_creator_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check match exists and is not completed
    const { data: match, error: matchErr } = await supabase
      .from("tournament_matches")
      .select("*")
      .eq("id", match_id)
      .single();

    if (matchErr || !match) {
      return new Response(JSON.stringify({ error: "매치를 찾을 수 없습니다." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (match.is_completed) {
      return new Response(JSON.stringify({ error: "이미 종료된 매치입니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (voted_creator_id !== match.creator_a_id && voted_creator_id !== match.creator_b_id) {
      return new Response(JSON.stringify({ error: "유효하지 않은 크리에이터입니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check duplicate vote by user_id
    const { data: existing } = await supabase
      .from("tournament_votes")
      .select("id")
      .eq("match_id", match_id)
      .eq("user_id", userId)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "이미 이 매치에 투표하셨습니다." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert vote
    await supabase.from("tournament_votes").insert({
      match_id,
      voted_creator_id,
      voter_ip: userId,
      user_id: userId,
    });

    // Update match vote counts
    const field = voted_creator_id === match.creator_a_id ? "votes_a" : "votes_b";
    await supabase
      .from("tournament_matches")
      .update({ [field]: match[field] + 1 })
      .eq("id", match_id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Tournament vote error:", err);
    return new Response(JSON.stringify({ error: "요청을 처리할 수 없습니다." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
