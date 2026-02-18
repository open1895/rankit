import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "인증이 필요합니다." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "인증에 실패했습니다." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    // Ensure user_points row exists
    const { data: existing } = await supabaseAdmin
      .from("user_points")
      .select("id, balance, total_earned")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from("user_points").insert({ user_id: user.id, balance: 0, total_earned: 0 });
    }

    if (action === "earn_ad_reward") {
      // Rate limit: max 5 ad rewards per day
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count } = await supabaseAdmin
        .from("point_transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("type", "ad_reward")
        .gte("created_at", todayStart.toISOString());

      if ((count || 0) >= 5) {
        return new Response(
          JSON.stringify({ error: "오늘의 광고 보상 횟수를 초과했습니다. (최대 5회)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const amount = 50;

      await supabaseAdmin
        .from("user_points")
        .update({
          balance: (existing?.balance || 0) + amount,
          total_earned: (existing?.total_earned || 0) + amount,
        })
        .eq("user_id", user.id);

      await supabaseAdmin.from("point_transactions").insert({
        user_id: user.id,
        amount,
        type: "ad_reward",
        description: "광고 시청 보상 +50 RP",
      });

      return new Response(
        JSON.stringify({ success: true, earned: amount, balance: (existing?.balance || 0) + amount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "purchase") {
      const { item_id } = params;
      if (!item_id) {
        return new Response(JSON.stringify({ error: "상품 ID가 필요합니다." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: item } = await supabaseAdmin
        .from("shop_items")
        .select("*")
        .eq("id", item_id)
        .eq("is_active", true)
        .single();

      if (!item) {
        return new Response(JSON.stringify({ error: "상품을 찾을 수 없습니다." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const currentBalance = existing?.balance || 0;
      if (currentBalance < item.price) {
        return new Response(
          JSON.stringify({ error: "포인트가 부족합니다.", required: item.price, current: currentBalance }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check stock
      if (item.stock !== null && item.stock <= 0) {
        return new Response(JSON.stringify({ error: "품절된 상품입니다." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Deduct points
      await supabaseAdmin
        .from("user_points")
        .update({ balance: currentBalance - item.price })
        .eq("user_id", user.id);

      // Record transaction
      await supabaseAdmin.from("point_transactions").insert({
        user_id: user.id,
        amount: -item.price,
        type: "purchase",
        description: `${item.name} 구매`,
      });

      // Record purchase
      await supabaseAdmin.from("point_purchases").insert({
        user_id: user.id,
        item_id: item.id,
        price_paid: item.price,
      });

      // Decrease stock if applicable
      if (item.stock !== null) {
        await supabaseAdmin
          .from("shop_items")
          .update({ stock: item.stock - 1 })
          .eq("id", item.id);
      }

      return new Response(
        JSON.stringify({ success: true, balance: currentBalance - item.price, item_name: item.name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "request_settlement") {
      const { creator_id, amount: requestedAmount, bank_info } = params;

      if (!creator_id || !requestedAmount || !bank_info) {
        return new Response(JSON.stringify({ error: "필수 정보가 누락되었습니다." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify creator ownership
      const { data: creator } = await supabaseAdmin
        .from("creators")
        .select("id, user_id")
        .eq("id", creator_id)
        .single();

      if (!creator || creator.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "본인의 크리에이터 프로필만 정산 신청할 수 있습니다." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check earnings
      const { data: earnings } = await supabaseAdmin
        .from("creator_earnings")
        .select("*")
        .eq("creator_id", creator_id)
        .maybeSingle();

      const pending = earnings?.pending_amount || 0;
      if (pending < 10000 || requestedAmount > pending) {
        return new Response(
          JSON.stringify({ error: "정산 가능 금액이 부족합니다. (최소 10,000원)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create settlement request
      await supabaseAdmin.from("settlement_requests").insert({
        creator_id,
        amount: requestedAmount,
        bank_info,
      });

      // Update pending amount
      await supabaseAdmin
        .from("creator_earnings")
        .update({ pending_amount: pending - requestedAmount })
        .eq("creator_id", creator_id);

      return new Response(
        JSON.stringify({ success: true, message: "정산 신청이 접수되었습니다." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "알 수 없는 액션입니다." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
