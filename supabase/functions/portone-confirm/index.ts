import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.3/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "인증이 필요합니다." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const portoneApiSecret = Deno.env.get("PORTONE_API_SECRET")!;

    // Verify user
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

    const { paymentId, orderId, ticketAmount } = await req.json();

    if (!paymentId || !orderId || !ticketAmount || typeof ticketAmount !== "number" || ticketAmount <= 0) {
      return new Response(JSON.stringify({ error: "잘못된 요청입니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment with PortOne API v2
    const portoneRes = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      headers: {
        Authorization: `PortOne ${portoneApiSecret}`,
      },
    });

    if (!portoneRes.ok) {
      const errText = await portoneRes.text();
      console.error("PortOne API error:", errText);
      return new Response(JSON.stringify({ error: "결제 검증에 실패했습니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await portoneRes.json();

    // Verify payment status
    if (payment.status !== "PAID") {
      return new Response(JSON.stringify({ error: "결제가 완료되지 않았습니다.", status: payment.status }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify order ID matches
    if (payment.orderName && payment.customData) {
      // Additional verification can be done here
    }

    const paidAmount = payment.amount?.total ?? payment.totalAmount ?? 0;

    // Use service role to confirm payment
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: confirmed, error: confirmError } = await supabaseAdmin.rpc("confirm_payment", {
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
