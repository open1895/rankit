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

    // ─── Get fan level multiplier ─────────────────────────────────
    let rpMultiplier = 1.0;
    let fanLevel = 1;
    try {
      const { data: levelData } = await supabaseAdmin.rpc("get_fan_level_multiplier", { p_user_id: user.id });
      if (levelData && levelData.length > 0) {
        rpMultiplier = Number(levelData[0].rp_multiplier) || 1.0;
        fanLevel = levelData[0].fan_level || 1;
      }
    } catch (e) { console.error("Fan level check error:", e); }

    // ─── Helper: add RP + record transaction + send notification ───
    async function grantRP(baseAmount: number, type: string, description: string, notifTitle?: string, applyMultiplier = true) {
      const amount = applyMultiplier ? Math.round(baseAmount * rpMultiplier) : baseAmount;
      const bonusText = applyMultiplier && rpMultiplier > 1 ? ` (Lv${fanLevel} ${rpMultiplier}x)` : "";
      const currentBalance = existing?.balance || 0;
      const currentEarned = existing?.total_earned || 0;

      await supabaseAdmin
        .from("user_points")
        .update({
          balance: currentBalance + amount,
          total_earned: currentEarned + amount,
        })
        .eq("user_id", user!.id);

      await supabaseAdmin.from("point_transactions").insert({
        user_id: user!.id,
        amount,
        type,
        description: description + bonusText,
      });

      // Send notification
      if (notifTitle) {
        await supabaseAdmin.from("notifications").insert({
          user_id: user!.id,
          type: "reward",
          title: notifTitle + bonusText,
          message: description + bonusText,
          link: "/my",
        });
      }

      return currentBalance + amount;
    }

    // ─── DAILY LOGIN STREAK ───────────────────────────────────────
    if (action === "claim_login_streak") {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("login_streak, last_login_date, last_streak_claimed_at")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        return new Response(JSON.stringify({ error: "프로필을 찾을 수 없습니다." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Already claimed today?
      if (profile.last_login_date === today) {
        return new Response(
          JSON.stringify({ error: "오늘 이미 출석 보상을 받았습니다.", streak: profile.login_streak }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate streak
      let newStreak = 1;
      if (profile.last_login_date) {
        const lastDate = new Date(profile.last_login_date);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          newStreak = (profile.login_streak || 0) + 1;
        }
        // If diffDays > 1, streak resets to 1
      }

      // Streak bonus: 1일=2RP, 3일=5RP, 7일=10RP, 14일=20RP, 30일=50RP
      let rpBonus = 2;
      let streakLabel = "";
      if (newStreak >= 30) { rpBonus = 50; streakLabel = "🏆 30일 연속 출석!"; }
      else if (newStreak >= 14) { rpBonus = 20; streakLabel = "🔥 14일 연속 출석!"; }
      else if (newStreak >= 7) { rpBonus = 10; streakLabel = "⚡ 7일 연속 출석!"; }
      else if (newStreak >= 3) { rpBonus = 5; streakLabel = "✨ 3일 연속 출석!"; }
      else { rpBonus = 2; streakLabel = "📅 출석 체크!"; }

      // Update profile
      await supabaseAdmin
        .from("profiles")
        .update({
          login_streak: newStreak,
          last_login_date: today,
          last_streak_claimed_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      const newBalance = await grantRP(
        rpBonus,
        "login_streak",
        `${streakLabel} 출석 보상 +${rpBonus} RP (${newStreak}일차)`,
        `${streakLabel} +${rpBonus} RP`
      );

      return new Response(
        JSON.stringify({
          success: true,
          streak: newStreak,
          rp_earned: rpBonus,
          balance: newBalance,
          streak_label: streakLabel,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── SNS SHARE REWARD (+3 RP, max 3/day) ─────────────────────
    if (action === "share_reward") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count } = await supabaseAdmin
        .from("point_transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("type", "share_reward")
        .gte("created_at", todayStart.toISOString());

      if ((count || 0) >= 3) {
        return new Response(
          JSON.stringify({ error: "오늘의 공유 보상 횟수를 초과했습니다. (최대 3회)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const rpAmount = 3;
      const shareCount = (count || 0) + 1;
      const newBalance = await grantRP(
        rpAmount,
        "share_reward",
        `SNS 공유 보상 +${rpAmount} RP (${shareCount}/3)`,
        `📢 공유 보상 +${rpAmount} RP`
      );

      return new Response(
        JSON.stringify({
          success: true,
          earned: rpAmount,
          balance: newBalance,
          shares_today: shareCount,
          shares_remaining: 3 - shareCount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── AD REWARD ────────────────────────────────────────────────
    if (action === "earn_ad_reward") {
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
      const newBalance = await grantRP(amount, "ad_reward", "광고 시청 보상 +50 RP", "🎬 광고 보상 +50 RP");

      return new Response(
        JSON.stringify({ success: true, earned: amount, balance: newBalance }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── PURCHASE ─────────────────────────────────────────────────
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

      if (item.stock !== null && item.stock <= 0) {
        return new Response(JSON.stringify({ error: "품절된 상품입니다." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin
        .from("user_points")
        .update({ balance: currentBalance - item.price })
        .eq("user_id", user.id);

      await supabaseAdmin.from("point_transactions").insert({
        user_id: user.id,
        amount: -item.price,
        type: "purchase",
        description: `${item.name} 구매`,
      });

      await supabaseAdmin.from("point_purchases").insert({
        user_id: user.id,
        item_id: item.id,
        price_paid: item.price,
      });

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

    // ─── SETTLEMENT REQUEST ──────────────────────────────────────
    if (action === "request_settlement") {
      const { creator_id, amount: requestedAmount, bank_info } = params;

      if (!creator_id || !requestedAmount || !bank_info) {
        return new Response(JSON.stringify({ error: "필수 정보가 누락되었습니다." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (typeof bank_info !== 'string') {
        return new Response(JSON.stringify({ error: "은행 정보가 올바르지 않습니다." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const sanitizedBankInfo = bank_info.trim();
      if (sanitizedBankInfo.length < 5 || sanitizedBankInfo.length > 500) {
        return new Response(JSON.stringify({ error: "은행 정보는 5~500자 사이여야 합니다." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const bankInfoPattern = /^[가-힣a-zA-Z0-9\s\-()]+$/;
      if (!bankInfoPattern.test(sanitizedBankInfo)) {
        return new Response(JSON.stringify({ error: "은행 정보에 허용되지 않는 문자가 포함되어 있습니다." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      await supabaseAdmin.from("settlement_requests").insert({
        creator_id,
        amount: requestedAmount,
        bank_info: sanitizedBankInfo,
      });

      await supabaseAdmin
        .from("creator_earnings")
        .update({ pending_amount: pending - requestedAmount })
        .eq("creator_id", creator_id);

      return new Response(
        JSON.stringify({ success: true, message: "정산 신청이 접수되었습니다." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── CONVERT RP TO TICKETS (10 RP = 1 Ticket) ────────────────
    if (action === "convert_to_ticket") {
      const { amount: ticketCount } = params;
      const count = Math.floor(Number(ticketCount) || 1);

      if (count < 1 || count > 100) {
        return new Response(JSON.stringify({ error: "1~100장까지 전환 가능합니다." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rpCost = count * 10;
      const currentBalance = existing?.balance || 0;

      if (currentBalance < rpCost) {
        return new Response(
          JSON.stringify({ error: `RP가 부족합니다. (필요: ${rpCost} RP, 보유: ${currentBalance} RP)` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin
        .from("user_points")
        .update({ balance: currentBalance - rpCost })
        .eq("user_id", user.id);

      await supabaseAdmin.from("point_transactions").insert({
        user_id: user.id,
        amount: -rpCost,
        type: "ticket_convert",
        description: `티켓 ${count}장 전환 (-${rpCost} RP)`,
      });

      await supabaseAdmin.rpc("add_tickets", {
        p_user_id: user.id,
        p_amount: count,
        p_type: "rp_convert",
        p_description: `RP 전환 티켓 +${count}`,
      });

      return new Response(
        JSON.stringify({
          success: true,
          tickets_gained: count,
          rp_spent: rpCost,
          new_balance: currentBalance - rpCost,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "알 수 없는 액션입니다." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
