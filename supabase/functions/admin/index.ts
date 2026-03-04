import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...body } = await req.json();

    // ─── All actions require JWT + admin role ──────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Verify admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), { status: 403, headers: corsHeaders });
    }

    // ─── LIST USERS ───────────────────────────────────────
    if (action === "list_users") {
      const { data: users, error } = await adminClient.auth.admin.listUsers({ perPage: 200 });
      if (error) throw error;

      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, display_name, avatar_url, created_at");

      const { data: roles } = await adminClient
        .from("user_roles")
        .select("user_id, role");

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));

      const merged = users.users.map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        display_name: profileMap.get(u.id)?.display_name || "",
        avatar_url: profileMap.get(u.id)?.avatar_url || "",
        role: roleMap.get(u.id) || "user",
      }));

      return new Response(JSON.stringify({ users: merged }), { headers: corsHeaders });
    }

    // ─── DELETE USER ──────────────────────────────────────
    if (action === "delete_user") {
      const { user_id } = body;
      if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: corsHeaders });
      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── SET ROLE ─────────────────────────────────────────
    if (action === "set_role") {
      const { user_id, role } = body;
      if (!user_id || !role) return new Response(JSON.stringify({ error: "user_id and role required" }), { status: 400, headers: corsHeaders });
      if (!["admin", "moderator"].includes(role)) return new Response(JSON.stringify({ error: "Invalid role" }), { status: 400, headers: corsHeaders });
      const { error } = await adminClient.from("user_roles").upsert({ user_id, role }, { onConflict: "user_id,role" });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── REMOVE ROLE ────────────────────────────────────
    if (action === "remove_role") {
      const { user_id, role } = body;
      if (!user_id || !role) return new Response(JSON.stringify({ error: "user_id and role required" }), { status: 400, headers: corsHeaders });
      const { error } = await adminClient.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── SET ADMIN (legacy) ──────────────────────────────
    if (action === "set_admin") {
      const { user_id, is_admin } = body;
      if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: corsHeaders });
      if (is_admin) {
        await adminClient.from("user_roles").upsert({ user_id, role: "admin" }, { onConflict: "user_id,role" });
      } else {
        await adminClient.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── UPDATE CREATOR ───────────────────────────────────
    if (action === "update_creator") {
      const { creator_id, ...updates } = body;
      if (!creator_id) return new Response(JSON.stringify({ error: "creator_id required" }), { status: 400, headers: corsHeaders });
      const { error } = await adminClient.from("creators").update(updates).eq("id", creator_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── DELETE CREATOR ───────────────────────────────────
    if (action === "delete_creator") {
      const { creator_id } = body;
      if (!creator_id) return new Response(JSON.stringify({ error: "creator_id required" }), { status: 400, headers: corsHeaders });
      const { error } = await adminClient.from("creators").delete().eq("id", creator_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── LIST CREATORS ────────────────────────────────────
    if (action === "list_creators") {
      const { data, error } = await adminClient
        .from("creators")
        .select("*")
        .order("rank", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ creators: data }), { headers: corsHeaders });
    }

    // ─── LIST NOMINATIONS ─────────────────────────────────
    if (action === "list_nominations") {
      const { data, error } = await adminClient
        .from("nominations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ nominations: data }), { headers: corsHeaders });
    }

    // ─── UPDATE NOMINATION STATUS ─────────────────────────
    if (action === "update_nomination") {
      const { nomination_id, status } = body;
      if (!nomination_id || !status) return new Response(JSON.stringify({ error: "nomination_id and status required" }), { status: 400, headers: corsHeaders });
      if (!["approved", "rejected"].includes(status)) return new Response(JSON.stringify({ error: "Invalid status" }), { status: 400, headers: corsHeaders });
      const { error } = await adminClient.from("nominations").update({ status }).eq("id", nomination_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── APPROVE NOMINATION ──────────────────────────────
    if (action === "approve_nomination") {
      const { nomination_id } = body;
      if (!nomination_id) return new Response(JSON.stringify({ error: "nomination_id required" }), { status: 400, headers: corsHeaders });

      const { data: nom, error: nomErr } = await adminClient
        .from("nominations")
        .select("*")
        .eq("id", nomination_id)
        .single();
      if (nomErr || !nom) return new Response(JSON.stringify({ error: "Nomination not found" }), { status: 404, headers: corsHeaders });

      let youtubeChannelId = "";
      const urlStr = nom.channel_url || "";
      const ytMatch = urlStr.match(/youtube\.com\/(channel\/|@|c\/)?([^\/\?\s]+)/);
      if (ytMatch) {
        const extracted = ytMatch[2];
        if (extracted.startsWith("UC")) {
          youtubeChannelId = extracted;
        }
      }

      const { data: newCreator, error: insertErr } = await adminClient
        .from("creators")
        .insert({
          name: nom.creator_name,
          channel_link: nom.channel_url,
          category: nom.category || "",
          youtube_channel_id: youtubeChannelId,
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      await adminClient.from("nominations").update({ status: "approved" }).eq("id", nomination_id);

      try {
        const statsUrl = `${supabaseUrl}/functions/v1/fetch-social-stats`;
        await fetch(statsUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
        });
      } catch (e) {
        console.error("Failed to trigger fetch-social-stats:", e);
      }

      return new Response(JSON.stringify({ success: true, creator_id: newCreator.id }), { headers: corsHeaders });
    }

    // ─── REJECT NOMINATION ────────────────────────────────
    if (action === "reject_nomination") {
      const { nomination_id } = body;
      if (!nomination_id) return new Response(JSON.stringify({ error: "nomination_id required" }), { status: 400, headers: corsHeaders });
      const { error } = await adminClient.from("nominations").delete().eq("id", nomination_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── LIST BOARD POSTS ────────────────────────────────
    if (action === "list_board_posts") {
      const { data, error } = await adminClient
        .from("board_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ posts: data }), { headers: corsHeaders });
    }

    // ─── CREATE BOARD POST ────────────────────────────────
    if (action === "create_board_post") {
      const { title, content, category, author } = body;
      if (!title) return new Response(JSON.stringify({ error: "title required" }), { status: 400, headers: corsHeaders });
      const { error } = await adminClient.from("board_posts").insert({
        title,
        content: content || "",
        category: category || "공지",
        author: author || "Rankit 운영팀",
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── UPDATE BOARD POST ────────────────────────────────
    if (action === "update_board_post") {
      const { post_id, ...updates } = body;
      if (!post_id) return new Response(JSON.stringify({ error: "post_id required" }), { status: 400, headers: corsHeaders });
      const { error } = await adminClient.from("board_posts").update(updates).eq("id", post_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── DELETE BOARD POST ────────────────────────────────
    if (action === "delete_board_post") {
      const { post_id } = body;
      if (!post_id) return new Response(JSON.stringify({ error: "post_id required" }), { status: 400, headers: corsHeaders });
      const { error } = await adminClient.from("board_posts").delete().eq("id", post_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── LIST PREDICTION EVENTS ──────────────────────────
    if (action === "list_prediction_events") {
      const { data, error } = await adminClient
        .from("prediction_events")
        .select(`
          *,
          creator_a:creators!prediction_events_creator_a_id_fkey(name, avatar_url),
          creator_b:creators!prediction_events_creator_b_id_fkey(name, avatar_url)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ events: data }), { headers: corsHeaders });
    }

    // ─── CREATE PREDICTION EVENT ─────────────────────────
    if (action === "create_prediction_event") {
      const { title, description, creator_a_id, creator_b_id, bet_deadline } = body;
      if (!title || !creator_a_id || !creator_b_id || !bet_deadline) {
        return new Response(JSON.stringify({ error: "title, creator_a_id, creator_b_id, bet_deadline required" }), { status: 400, headers: corsHeaders });
      }
      if (creator_a_id === creator_b_id) {
        return new Response(JSON.stringify({ error: "두 크리에이터가 같을 수 없습니다." }), { status: 400, headers: corsHeaders });
      }
      const { error } = await adminClient.from("prediction_events").insert({
        title,
        description: description || "",
        creator_a_id,
        creator_b_id,
        bet_deadline,
        status: "open",
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── RESOLVE PREDICTION EVENT (동적 역배당) ─────────
    if (action === "resolve_prediction_event") {
      const { event_id, winner_id } = body;
      if (!event_id || !winner_id) return new Response(JSON.stringify({ error: "event_id and winner_id required" }), { status: 400, headers: corsHeaders });

      // Get the event
      const { data: event, error: evErr } = await adminClient.from("prediction_events").select("*").eq("id", event_id).single();
      if (evErr || !event) return new Response(JSON.stringify({ error: "Event not found" }), { status: 404, headers: corsHeaders });
      if (event.status === "resolved") return new Response(JSON.stringify({ error: "Already resolved" }), { status: 400, headers: corsHeaders });

      // Mark winners/losers in bets
      await adminClient.from("prediction_bets").update({ is_winner: true }).eq("event_id", event_id).eq("predicted_creator_id", winner_id);
      await adminClient.from("prediction_bets").update({ is_winner: false }).eq("event_id", event_id).neq("predicted_creator_id", winner_id);

      // Fetch all bets to calculate dynamic odds
      const { data: allBets } = await adminClient.from("prediction_bets").select("*").eq("event_id", event_id);
      const totalPool = (allBets || []).reduce((s, b) => s + b.amount, 0);
      const winnerPool = (allBets || []).filter(b => b.predicted_creator_id === winner_id).reduce((s, b) => s + b.amount, 0);
      const loserPool = totalPool - winnerPool;

      // Dynamic multiplier: totalPool / winnerPool (underdog gets higher return)
      // Minimum 1.5x, cap at 10x
      const dynamicMultiplier = winnerPool > 0
        ? Math.min(10, Math.max(1.5, totalPool / winnerPool))
        : 2;
      const displayMultiplier = Math.round(dynamicMultiplier * 10) / 10;

      // Distribute rewards
      const winnerBets = (allBets || []).filter(b => b.predicted_creator_id === winner_id);
      let totalRewarded = 0;
      for (const bet of winnerBets) {
        const reward = Math.round(bet.amount * dynamicMultiplier);
        totalRewarded += reward;
        await adminClient.from("prediction_bets").update({ reward_amount: reward }).eq("id", bet.id);
        await adminClient.rpc("add_tickets", { p_user_id: bet.user_id, p_amount: reward, p_type: "prediction_win", p_description: `예측 적중 보상 (${displayMultiplier}배)` });
        await adminClient.from("notifications").insert({
          user_id: bet.user_id,
          type: "prediction_win",
          title: "🎉 예측 성공!",
          message: `축하합니다! 역배당 ${displayMultiplier}배 적용! 티켓 ${reward}장이 지급되었습니다! 🔥`,
          link: "/predictions",
        });
      }

      // Notify losers
      const loserBets = (allBets || []).filter(b => b.predicted_creator_id !== winner_id);
      for (const bet of loserBets) {
        await adminClient.from("notifications").insert({
          user_id: bet.user_id,
          type: "prediction_lose",
          title: "예측 결과 발표",
          message: `아쉽게도 예측이 빗나갔어요. 다음엔 꼭 맞혀보세요! 💪`,
          link: "/predictions",
        });
      }

      // Update event status
      await adminClient.from("prediction_events").update({ status: "resolved", winner_id, resolved_at: new Date().toISOString() }).eq("id", event_id);

      return new Response(JSON.stringify({ success: true, total_rewarded: totalRewarded, winners_count: winnerBets.length, multiplier: displayMultiplier }), { headers: corsHeaders });
    }

    // ─── DELETE PREDICTION EVENT ─────────────────────────
    if (action === "delete_prediction_event") {
      const { event_id } = body;
      if (!event_id) return new Response(JSON.stringify({ error: "event_id required" }), { status: 400, headers: corsHeaders });
      // Delete bets first, then event
      await adminClient.from("prediction_bets").delete().eq("event_id", event_id);
      const { error } = await adminClient.from("prediction_events").delete().eq("id", event_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
