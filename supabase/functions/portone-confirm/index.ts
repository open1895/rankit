import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// 번들 가격표 – 클라이언트와 동일해야 위변조 검증 가능
const BUNDLE_PRICES: Record<number, number> = {
  10: 1100,
  50: 4900,
  100: 8900,
  500: 39000,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const portoneApiSecret = Deno.env.get("PORTONE_API_SECRET")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. 인증 확인
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "인증이 필요합니다." }), {
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

    // 2. 요청 파싱 & 기본 검증
    const { paymentId, orderId, ticketAmount } = await req.json();

    if (!paymentId || !orderId || !ticketAmount || typeof ticketAmount !== "number" || ticketAmount <= 0) {
      return new Response(JSON.stringify({ error: "잘못된 요청입니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 번들 유효성 확인
    const expectedPrice = BUNDLE_PRICES[ticketAmount];
    if (!expectedPrice) {
      return new Response(JSON.stringify({ error: "유효하지 않은 티켓 수량입니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. 포트원 API v2로 결제 검증
    const portoneRes = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: `PortOne ${portoneApiSecret}` } },
    );

    if (!portoneRes.ok) {
      const errText = await portoneRes.text();
      console.error("PortOne API error:", errText);
      // 실패 기록
      await recordFailed(supabaseAdmin, user.id, orderId, paymentId, 0, ticketAmount, "포트원 API 검증 실패");
      return new Response(JSON.stringify({ error: "결제 검증에 실패했습니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await portoneRes.json();

    // 4. 결제 상태 검증
    if (payment.status !== "PAID") {
      await recordFailed(supabaseAdmin, user.id, orderId, paymentId, 0, ticketAmount, `결제 미완료: ${payment.status}`);
      return new Response(JSON.stringify({ error: "결제가 완료되지 않았습니다.", status: payment.status }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. 금액 위변조 검증
    const paidAmount = payment.amount?.total ?? payment.totalAmount ?? 0;
    if (paidAmount !== expectedPrice) {
      console.error(`금액 위변조 감지: expected=${expectedPrice}, paid=${paidAmount}`);
      await recordFailed(supabaseAdmin, user.id, orderId, paymentId, paidAmount, ticketAmount, "금액 위변조 감지");
      return new Response(JSON.stringify({ error: "결제 금액이 일치하지 않습니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. 결제 확정 → 티켓 지급 (원자적 트랜잭션)
    const { error: confirmError } = await supabaseAdmin.rpc("confirm_payment", {
      p_user_id: user.id,
      p_order_id: orderId,
      p_payment_id: paymentId,
      p_amount: paidAmount,
      p_ticket_amount: ticketAmount,
    });

    if (confirmError) {
      console.error("confirm_payment error:", confirmError);
      return new Response(JSON.stringify({ error: "결제 확인 처리 중 오류가 발생했습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, ticketAmount, paidAmount }), {
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

/** 실패 내역을 payment_history에 기록 */
async function recordFailed(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  orderId: string,
  paymentId: string,
  amount: number,
  ticketAmount: number,
  reason: string,
) {
  try {
    await supabase.from("payment_history").insert({
      user_id: userId,
      order_id: orderId,
      payment_id: paymentId,
      amount,
      ticket_amount: ticketAmount,
      status: "failed",
    });
    console.error(`Payment failed [${orderId}]: ${reason}`);
  } catch (e) {
    console.error("Failed to record failure:", e);
  }
}
