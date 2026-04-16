import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 1000000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const portoneApiSecret = Deno.env.get("PORTONE_API_SECRET")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. 인증 확인 (로그인 필수)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "로그인이 필요합니다." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "유효하지 않은 사용자입니다." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. 요청 파싱 & 검증
    const { paymentId, orderId, creatorId, amount, message, isMessagePublic } = await req.json();

    if (!paymentId || !orderId || !creatorId || !amount) {
      return new Response(JSON.stringify({ error: "필수 정보가 누락되었습니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof amount !== "number" || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      return new Response(JSON.stringify({ error: `후원 금액은 ${MIN_AMOUNT.toLocaleString()}원 이상 ${MAX_AMOUNT.toLocaleString()}원 이하여야 합니다.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (message && typeof message === "string" && message.length > 100) {
      return new Response(JSON.stringify({ error: "응원 메시지는 100자 이하여야 합니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. 크리에이터 존재 + 인증(claimed) 여부 확인
    const { data: creator, error: creatorError } = await supabaseAdmin
      .from("creators")
      .select("id, user_id, claimed, name")
      .eq("id", creatorId)
      .maybeSingle();

    if (creatorError || !creator) {
      return new Response(JSON.stringify({ error: "크리에이터를 찾을 수 없습니다." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!creator.claimed || !creator.user_id) {
      return new Response(JSON.stringify({ error: "인증된 크리에이터에게만 후원할 수 있습니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (creator.user_id === user.id) {
      return new Response(JSON.stringify({ error: "본인에게는 후원할 수 없습니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. 포트원 API v2로 결제 검증
    const portoneRes = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: `PortOne ${portoneApiSecret}` } },
    );

    if (!portoneRes.ok) {
      const errText = await portoneRes.text();
      console.error("PortOne API error:", errText);
      return new Response(JSON.stringify({ error: "결제 검증에 실패했습니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await portoneRes.json();

    if (payment.status !== "PAID") {
      return new Response(JSON.stringify({ error: "결제가 완료되지 않았습니다.", status: payment.status }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. 금액 위변조 검증
    const paidAmount = payment.amount?.total ?? payment.totalAmount ?? 0;
    if (paidAmount !== amount) {
      console.error(`금액 위변조 감지: expected=${amount}, paid=${paidAmount}`);
      return new Response(JSON.stringify({ error: "결제 금액이 일치하지 않습니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. 후원자 닉네임 조회
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const donorNickname = profile?.display_name || "익명";

    // 7. 후원 확정 처리 (원자적 트랜잭션)
    const { data: donationId, error: confirmError } = await supabaseAdmin.rpc("confirm_donation", {
      p_donor_id: user.id,
      p_creator_id: creatorId,
      p_donor_nickname: donorNickname,
      p_order_id: orderId,
      p_payment_id: paymentId,
      p_amount: paidAmount,
      p_message: message || null,
      p_is_message_public: isMessagePublic !== false,
    });

    if (confirmError) {
      console.error("confirm_donation error:", confirmError);
      return new Response(JSON.stringify({ error: "후원 처리 중 오류가 발생했습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      donationId,
      amount: paidAmount,
      platformFee: Math.floor(paidAmount * 0.1),
      netAmount: paidAmount - Math.floor(paidAmount * 0.1),
      creatorName: creator.name,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "서버 오류가 발생했습니다." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
