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

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate user
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
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "인증에 실패했습니다." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const { action, event_id, predicted_creator_id, amount } = await req.json();

    if (action === "place_bet") {
      // Validate inputs
      if (!event_id || !predicted_creator_id || !amount) {
        return new Response(JSON.stringify({ error: "필수 값이 누락되었습니다." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (amount < 1 || amount > 10) {
        return new Response(JSON.stringify({ error: "베팅은 1~10 투표권까지 가능합니다." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check event exists and is open
      const { data: event } = await supabase
        .from("prediction_events")
        .select("*")
        .eq("id", event_id)
        .single();

      if (!event) {
        return new Response(JSON.stringify({ error: "예측 이벤트를 찾을 수 없습니다." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (event.status !== "open") {
        return new Response(JSON.stringify({ error: "이미 마감된 예측입니다." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(event.bet_deadline) < new Date()) {
        return new Response(JSON.stringify({ error: "베팅 마감 시간이 지났습니다." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate predicted_creator_id is one of the two creators
      if (predicted_creator_id !== event.creator_a_id && predicted_creator_id !== event.creator_b_id) {
        return new Response(JSON.stringify({ error: "잘못된 크리에이터 선택입니다." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already bet on this event
      const { data: existingBet } = await supabase
        .from("prediction_bets")
        .select("id")
        .eq("event_id", event_id)
        .eq("user_id", userId)
        .limit(1);

      if (existingBet && existingBet.length > 0) {
        return new Response(JSON.stringify({ error: "이미 이 예측에 참여하셨습니다." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert bet
      const { error: betError } = await supabase
        .from("prediction_bets")
        .insert({
          event_id,
          user_id: userId,
          predicted_creator_id,
          amount,
        });

      if (betError) {
        console.error("Bet insert error:", betError);
        return new Response(JSON.stringify({ error: "베팅 처리 중 오류가 발생했습니다." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update total pool
      await supabase
        .from("prediction_events")
        .update({ total_pool: event.total_pool + amount })
        .eq("id", event_id);

      return new Response(JSON.stringify({ success: true, message: "예측 완료! 결과를 기대하세요 🎯" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "알 수 없는 요청입니다." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Prediction error:", err);
    return new Response(JSON.stringify({ error: "요청을 처리할 수 없습니다." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
