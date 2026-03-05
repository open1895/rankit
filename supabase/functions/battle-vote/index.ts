import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
      return new Response(JSON.stringify({ error: true, message: "로그인이 필요합니다." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
    });

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    let userId: string | undefined;
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (!claimsError && claimsData?.claims?.sub) {
      userId = claimsData.claims.sub;
    } else {
      const { data: userData, error: userError } = await userClient.auth.getUser(token);
      if (!userError && userData?.user?.id) {
        userId = userData.user.id;
      }
    }

    if (!userId) {
      console.error("battle-vote auth failed", { claimsError: claimsError?.message });
      return new Response(JSON.stringify({ error: true, message: "인증에 실패했습니다." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { battle_id, creator_id } = await req.json();
    if (!battle_id || !creator_id) {
      return new Response(JSON.stringify({ error: true, message: "잘못된 요청입니다." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check battle exists and is active
    const { data: battle, error: battleErr } = await supabase
      .from("battles")
      .select("*")
      .eq("id", battle_id)
      .single();

    if (battleErr || !battle) {
      return new Response(JSON.stringify({ error: true, message: "배틀을 찾을 수 없습니다." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (battle.status !== "active" || new Date(battle.ends_at) < new Date()) {
      return new Response(JSON.stringify({ error: true, message: "이미 종료된 배틀입니다." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (creator_id !== battle.creator_a_id && creator_id !== battle.creator_b_id) {
      return new Response(JSON.stringify({ error: true, message: "유효하지 않은 크리에이터입니다." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already voted
    const { data: existingVote } = await supabase
      .from("battle_votes")
      .select("id")
      .eq("battle_id", battle_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingVote) {
      return new Response(JSON.stringify({ error: true, message: "이미 이 배틀에 투표했습니다." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct 1 ticket
    const { data: ticketOk } = await supabase.rpc("deduct_tickets", {
      p_user_id: userId,
      p_amount: 1,
    });

    if (!ticketOk) {
      return new Response(JSON.stringify({ error: true, message: "티켓이 부족합니다." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert vote
    await supabase.from("battle_votes").insert({
      battle_id,
      user_id: userId,
      voted_creator_id: creator_id,
    });

    // Update battle vote count
    const voteColumn = creator_id === battle.creator_a_id ? "votes_a" : "votes_b";
    await supabase
      .from("battles")
      .update({ [voteColumn]: battle[voteColumn] + 1 })
      .eq("id", battle_id);

    return new Response(JSON.stringify({ success: true, message: "투표 완료! 🎉" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: true, message: "서버 오류가 발생했습니다." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
