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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "인증에 실패했습니다." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { action, creator_id, amount, event_id, predicted_creator_id } = await req.json();

    // === DAILY CHECK-IN ===
    if (action === "daily_checkin") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tickets, daily_ticket_claimed_at")
        .eq("user_id", userId)
        .single();

      if (!profile) {
        return new Response(JSON.stringify({ error: "프로필을 찾을 수 없습니다." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check 24h cooldown
      if (profile.daily_ticket_claimed_at) {
        const lastClaimed = new Date(profile.daily_ticket_claimed_at).getTime();
        const now = Date.now();
        if (now - lastClaimed < 24 * 60 * 60 * 1000) {
          return new Response(JSON.stringify({ error: "already_claimed", tickets: profile.tickets }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Grant 10 tickets
      await supabase.rpc("add_tickets", {
        p_user_id: userId,
        p_amount: 10,
        p_type: "daily_checkin",
        p_description: "오늘의 활동 지원금",
      });

      await supabase
        .from("profiles")
        .update({ daily_ticket_claimed_at: new Date().toISOString() })
        .eq("user_id", userId);

      const { data: updated } = await supabase
        .from("profiles")
        .select("tickets")
        .eq("user_id", userId)
        .single();

      return new Response(JSON.stringify({ success: true, tickets: updated?.tickets ?? 0, granted: 10 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === FIRE VOTE (5 tickets -> 5 votes) ===
    if (action === "fire_vote") {
      if (!creator_id) {
        return new Response(JSON.stringify({ error: "creator_id가 필요합니다." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Deduct 5 tickets
      const { data: deducted } = await supabase.rpc("deduct_tickets", {
        p_user_id: userId,
        p_amount: 5,
      });

      if (!deducted) {
        return new Response(JSON.stringify({ error: "티켓이 부족합니다. (필요: 5장)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update description for the transaction
      await supabase
        .from("ticket_transactions")
        .update({ description: `🔥 불꽃 투표 사용` })
        .eq("user_id", userId)
        .eq("type", "spend")
        .eq("amount", -5)
        .order("created_at", { ascending: false })
        .limit(1);

      // Insert 5 votes
      const votes = Array.from({ length: 5 }, () => ({
        creator_id,
        user_id: userId,
        voter_ip: userId,
      }));

      await supabase.from("votes").insert(votes);

      const { data: profile } = await supabase
        .from("profiles")
        .select("tickets")
        .eq("user_id", userId)
        .single();

      return new Response(JSON.stringify({ success: true, tickets: profile?.tickets ?? 0, votes_added: 5 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ANONYMOUS POST (2 tickets) ===
    if (action === "anonymous_post") {
      const { data: deducted } = await supabase.rpc("deduct_tickets", {
        p_user_id: userId,
        p_amount: 2,
      });

      if (!deducted) {
        return new Response(JSON.stringify({ error: "티켓이 부족합니다. (필요: 2장)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("ticket_transactions")
        .update({ description: "🕶️ 익명 게시글 작성" })
        .eq("user_id", userId)
        .eq("type", "spend")
        .eq("amount", -2)
        .order("created_at", { ascending: false })
        .limit(1);

      const { data: profile } = await supabase
        .from("profiles")
        .select("tickets")
        .eq("user_id", userId)
        .single();

      return new Response(JSON.stringify({ success: true, tickets: profile?.tickets ?? 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === HIGHLIGHT CHEER (3 tickets) ===
    if (action === "highlight_cheer") {
      const { data: deducted } = await supabase.rpc("deduct_tickets", {
        p_user_id: userId,
        p_amount: 3,
      });

      if (!deducted) {
        return new Response(JSON.stringify({ error: "티켓이 부족합니다. (필요: 3장)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("ticket_transactions")
        .update({ description: "✨ 응원톡 강조 효과" })
        .eq("user_id", userId)
        .eq("type", "spend")
        .eq("amount", -3)
        .order("created_at", { ascending: false })
        .limit(1);

      const { data: profile } = await supabase
        .from("profiles")
        .select("tickets")
        .eq("user_id", userId)
        .single();

      return new Response(JSON.stringify({ success: true, tickets: profile?.tickets ?? 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === GET BALANCE ===
    if (action === "get_balance") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tickets")
        .eq("user_id", userId)
        .single();

      return new Response(JSON.stringify({ tickets: profile?.tickets ?? 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === GET HISTORY ===
    if (action === "get_history") {
      const { data: transactions } = await supabase
        .from("ticket_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      const { data: profile } = await supabase
        .from("profiles")
        .select("tickets")
        .eq("user_id", userId)
        .single();

      return new Response(JSON.stringify({ tickets: profile?.tickets ?? 0, transactions: transactions || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "알 수 없는 액션입니다." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Tickets error:", err);
    return new Response(JSON.stringify({ error: "요청을 처리할 수 없습니다." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
