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

    // ─── SUBMIT PROMOTION (non-admin, user action) ──────
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (action === "submit_promotion") {
      const { creator_id, promotion_type, duration_hours } = body;
      if (!creator_id || !promotion_type) return new Response(JSON.stringify({ error: "creator_id and promotion_type required" }), { status: 400, headers: corsHeaders });
      if (!["featured", "rising"].includes(promotion_type)) return new Response(JSON.stringify({ error: "Invalid promotion_type" }), { status: 400, headers: corsHeaders });

      const { data: creator } = await adminClient.from("creators").select("user_id, promotion_status").eq("id", creator_id).single();
      if (!creator) return new Response(JSON.stringify({ error: "Creator not found" }), { status: 404, headers: corsHeaders });
      if (creator.user_id !== user.id) return new Response(JSON.stringify({ error: "Not your creator profile" }), { status: 403, headers: corsHeaders });
      if (creator.promotion_status === "pending") return new Response(JSON.stringify({ error: true, message: "이미 심사 대기 중인 신청이 있습니다." }), { status: 200, headers: corsHeaders });

      const { error } = await adminClient.from("creators").update({
        promotion_type,
        promotion_status: "pending",
        is_promoted: false,
      }).eq("id", creator_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Verify admin role for all other actions
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
      console.log("Deleting creator:", creator_id);
      const { error } = await adminClient.from("creators").delete().eq("id", creator_id);
      if (error) {
        console.error("Delete creator error:", JSON.stringify(error));
        throw error;
      }
      console.log("Creator deleted successfully:", creator_id);
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

      // Calculate difficulty tier based on winner bet ratio
      const winnerBetCount = (allBets || []).filter(b => b.predicted_creator_id === winner_id).length;
      const totalBetCount = (allBets || []).length;
      const winnerRatio = totalBetCount > 0 ? winnerBetCount / totalBetCount : 0.5;

      // Difficulty tiers: lower ratio = harder prediction = more RP
      let difficultyLabel = "";
      let rpBonus = 5; // base RP for prediction win
      if (winnerRatio <= 0.2) {
        difficultyLabel = "🔥 전설급 예측";
        rpBonus = 30;
      } else if (winnerRatio <= 0.35) {
        difficultyLabel = "⚡ 고난도 예측";
        rpBonus = 20;
      } else if (winnerRatio <= 0.5) {
        difficultyLabel = "🎯 역배 예측";
        rpBonus = 10;
      } else {
        difficultyLabel = "✅ 예측 적중";
        rpBonus = 5;
      }

      // Distribute rewards
      const winnerBets = (allBets || []).filter(b => b.predicted_creator_id === winner_id);
      let totalRewarded = 0;
      for (const bet of winnerBets) {
        const reward = Math.round(bet.amount * dynamicMultiplier);
        totalRewarded += reward;
        await adminClient.from("prediction_bets").update({ reward_amount: reward }).eq("id", bet.id);
        await adminClient.rpc("add_tickets", { p_user_id: bet.user_id, p_amount: reward, p_type: "prediction_win", p_description: `예측 적중 보상 (${displayMultiplier}배)` });

        // Grant difficulty-based RP bonus
        const { data: levelData } = await adminClient.rpc("get_fan_level_multiplier", { p_user_id: bet.user_id });
        const rpMultiplier = levelData?.[0]?.rp_multiplier || 1;
        const finalRP = Math.round(rpBonus * Number(rpMultiplier));

        await adminClient.from("point_transactions").insert({
          user_id: bet.user_id,
          amount: finalRP,
          type: "prediction_difficulty_bonus",
          description: `${difficultyLabel} +${finalRP} RP (난이도 보너스)`,
        });
        await adminClient.from("user_points").upsert(
          { user_id: bet.user_id, balance: finalRP, total_earned: finalRP },
          { onConflict: "user_id" }
        );
        // Actually increment existing balance
        const { data: existingPt } = await adminClient.from("user_points").select("balance, total_earned").eq("user_id", bet.user_id).single();
        if (existingPt) {
          await adminClient.from("user_points").update({
            balance: existingPt.balance + finalRP,
            total_earned: existingPt.total_earned + finalRP,
          }).eq("user_id", bet.user_id);
        }

        await adminClient.from("notifications").insert({
          user_id: bet.user_id,
          type: "prediction_win",
          title: `${difficultyLabel} 성공!`,
          message: `축하합니다! 역배당 ${displayMultiplier}배 → 티켓 ${reward}장 + 난이도 보너스 ${finalRP} RP 획득! 🔥`,
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
      await adminClient.from("prediction_bets").delete().eq("event_id", event_id);
      const { error } = await adminClient.from("prediction_events").delete().eq("id", event_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── LIST TOURNAMENTS ────────────────────────────────
    if (action === "list_tournaments") {
      const { data, error } = await adminClient
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const tournamentIds = (data || []).map((t: any) => t.id);
      const { data: matches } = await adminClient
        .from("tournament_matches")
        .select("tournament_id, is_completed, status")
        .in("tournament_id", tournamentIds.length > 0 ? tournamentIds : ["__none__"]);

      const matchStats = new Map<string, { total: number; completed: number }>();
      for (const m of (matches || [])) {
        const s = matchStats.get(m.tournament_id) || { total: 0, completed: 0 };
        s.total++;
        if (m.is_completed || m.status === "completed") s.completed++;
        matchStats.set(m.tournament_id, s);
      }

      // Get participant counts
      const { data: participants } = await adminClient
        .from("tournament_participants")
        .select("tournament_id")
        .in("tournament_id", tournamentIds.length > 0 ? tournamentIds : ["__none__"]);

      const participantCounts = new Map<string, number>();
      for (const p of (participants || [])) {
        participantCounts.set(p.tournament_id, (participantCounts.get(p.tournament_id) || 0) + 1);
      }

      const enriched = (data || []).map((t: any) => ({
        ...t,
        match_total: matchStats.get(t.id)?.total || 0,
        match_completed: matchStats.get(t.id)?.completed || 0,
        participant_count: participantCounts.get(t.id) || 0,
      }));

      return new Response(JSON.stringify({ tournaments: enriched }), { headers: corsHeaders });
    }

    // ─── CREATE TOURNAMENT (category-based, 8 creators) ──
    if (action === "create_tournament") {
      const { title: tTitle, description: tDesc, category: tCategory } = body;
      if (!tTitle) return new Response(JSON.stringify({ error: "title required" }), { status: 400, headers: corsHeaders });
      
      const category = tCategory || "";

      // Get recent 7-day votes
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentVotes } = await adminClient
        .from("votes")
        .select("creator_id")
        .gte("created_at", sevenDaysAgo);

      const recentVoteCount = new Map<string, number>();
      for (const v of (recentVotes || [])) {
        recentVoteCount.set(v.creator_id, (recentVoteCount.get(v.creator_id) || 0) + 1);
      }

      // Get creators (filtered by category if provided)
      let creatorsQuery = adminClient
        .from("creators")
        .select("id, name, avatar_url, rankit_score, votes_count")
        .order("rankit_score", { ascending: false });
      
      if (category) {
        creatorsQuery = creatorsQuery.eq("category", category);
      }

      const { data: creators, error: cErr } = await creatorsQuery.limit(50);
      if (cErr) throw cErr;

      // Filter eligible
      const eligible = (creators || []).filter((c: any) => {
        if (!c.avatar_url || c.avatar_url === "") return false;
        return true;
      });

      if (eligible.length < 8) {
        return new Response(JSON.stringify({ error: `적격 크리에이터가 8명 이상 필요합니다. (현재 ${eligible.length}명)` }), { status: 400, headers: corsHeaders });
      }

      // Score and select top 8
      const scored = eligible.map((c: any) => {
        const recent7d = recentVoteCount.get(c.id) || 0;
        const score = (recent7d * 0.35) + ((c.rankit_score || 0) * 0.20) + ((c.votes_count || 0) * 0.01);
        return { ...c, selectionScore: score, recent7d };
      });
      scored.sort((a: any, b: any) => b.selectionScore - a.selectionScore);
      const selected = scored.slice(0, 8);

      // Get next season number
      const { data: maxSeason } = await adminClient
        .from("tournaments")
        .select("season_number")
        .order("season_number", { ascending: false })
        .limit(1);
      const seasonNumber = ((maxSeason?.[0]?.season_number) || 0) + 1;

      const now = new Date();
      const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Create tournament
      const { data: tournament, error: tErr } = await adminClient
        .from("tournaments")
        .insert({
          title: tTitle,
          description: tDesc || "",
          is_active: true,
          status: "active",
          category,
          season_number: seasonNumber,
          current_round: "quarterfinal",
          round: 8,
          start_at: now.toISOString(),
          end_at: endDate.toISOString(),
        })
        .select("id")
        .single();
      if (tErr) throw tErr;

      // Insert participants
      const participantInserts = selected.map((c: any, idx: number) => ({
        tournament_id: tournament.id,
        creator_id: c.id,
        seed: idx + 1,
        selection_score: c.selectionScore,
      }));
      await adminClient.from("tournament_participants").insert(participantInserts);

      // Create matches (seed1 vs seed8, seed2 vs seed7, etc.)
      const matchEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const matchInserts = [];
      for (let i = 0; i < 4; i++) {
        matchInserts.push({
          tournament_id: tournament.id,
          round: 8,
          match_order: i,
          creator_a_id: selected[i].id,
          creator_b_id: selected[7 - i].id,
          status: "active",
          start_at: now.toISOString(),
          end_at: matchEnd.toISOString(),
        });
      }
      const { error: mErr } = await adminClient.from("tournament_matches").insert(matchInserts);
      if (mErr) {
        await adminClient.from("tournaments").update({ status: "draft", is_active: false }).eq("id", tournament.id);
        throw mErr;
      }

      // Log
      await adminClient.from("tournament_logs").insert({
        tournament_id: tournament.id,
        log_type: "created",
        message: `관리자 수동 생성: ${tTitle} (${category || "전체"}, 8명, 4매치)`,
      });

      return new Response(JSON.stringify({
        success: true,
        tournament_id: tournament.id,
        creators: selected.map((c: any) => c.name),
        matches: matchInserts.length,
      }), { headers: corsHeaders });
    }

    // ─── DELETE TOURNAMENT ────────────────────────────────
    if (action === "delete_tournament") {
      const { tournament_id } = body;
      if (!tournament_id) return new Response(JSON.stringify({ error: "tournament_id required" }), { status: 400, headers: corsHeaders });

      const { data: matchIds } = await adminClient
        .from("tournament_matches")
        .select("id")
        .eq("tournament_id", tournament_id);
      if (matchIds && matchIds.length > 0) {
        const ids = matchIds.map((m: any) => m.id);
        await adminClient.from("tournament_votes").delete().in("match_id", ids);
      }
      // CASCADE will handle tournament_matches, tournament_participants, tournament_logs
      const { error } = await adminClient.from("tournaments").delete().eq("id", tournament_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── APPROVE TOURNAMENT (draft → active) ─────────────
    if (action === "approve_tournament") {
      const { tournament_id } = body;
      if (!tournament_id) return new Response(JSON.stringify({ error: "tournament_id required" }), { status: 400, headers: corsHeaders });
      
      const { data: t } = await adminClient.from("tournaments").select("id, status, title").eq("id", tournament_id).single();
      if (!t) return new Response(JSON.stringify({ error: "Tournament not found" }), { status: 404, headers: corsHeaders });
      if (t.status === "active") return new Response(JSON.stringify({ error: "이미 활성화된 토너먼트입니다." }), { status: 400, headers: corsHeaders });

      // Verify matches exist
      const { data: matchCount } = await adminClient
        .from("tournament_matches")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", tournament_id);

      const { error } = await adminClient
        .from("tournaments")
        .update({ is_active: true, status: "active", start_at: new Date().toISOString() })
        .eq("id", tournament_id);
      if (error) throw error;

      await adminClient.from("tournament_logs").insert({
        tournament_id,
        log_type: "activated",
        message: `관리자 승인으로 활성화: ${t.title}`,
      });

      return new Response(JSON.stringify({ success: true, message: `"${t.title}" 토너먼트가 승인되어 활성화되었습니다.` }), { headers: corsHeaders });
    }

    // ─── GENERATE WEEKLY TOURNAMENTS (manual trigger) ────
    if (action === "generate_weekly_tournaments") {
      const funcUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-weekly-tournaments`;
      const resp = await fetch(funcUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
      });
      const result = await resp.json();
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    // ─── REGENERATE TOURNAMENT MATCHES ────────────────────
    if (action === "regenerate_matches") {
      const { tournament_id } = body;
      if (!tournament_id) return new Response(JSON.stringify({ error: "tournament_id required" }), { status: 400, headers: corsHeaders });

      // Delete existing matches and votes
      const { data: matchIds } = await adminClient
        .from("tournament_matches")
        .select("id")
        .eq("tournament_id", tournament_id);
      if (matchIds && matchIds.length > 0) {
        await adminClient.from("tournament_votes").delete().in("match_id", matchIds.map((m: any) => m.id));
        await adminClient.from("tournament_matches").delete().eq("tournament_id", tournament_id);
      }

      // Get participants
      const { data: participants } = await adminClient
        .from("tournament_participants")
        .select("creator_id, seed")
        .eq("tournament_id", tournament_id)
        .order("seed", { ascending: true });

      if (!participants || participants.length < 8) {
        return new Response(JSON.stringify({ error: "참가자가 8명 미만입니다." }), { status: 400, headers: corsHeaders });
      }

      const now = new Date();
      const matchEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      const matchInserts = [];
      for (let i = 0; i < 4; i++) {
        matchInserts.push({
          tournament_id,
          round: 8,
          match_order: i,
          creator_a_id: participants[i].creator_id,
          creator_b_id: participants[7 - i].creator_id,
          status: "active",
          start_at: now.toISOString(),
          end_at: matchEnd.toISOString(),
        });
      }

      await adminClient.from("tournament_matches").insert(matchInserts);
      await adminClient.from("tournaments").update({ round: 8, current_round: "quarterfinal" }).eq("id", tournament_id);

      await adminClient.from("tournament_logs").insert({
        tournament_id,
        log_type: "regenerated",
        message: `매치 재생성됨 (4개 8강 매치)`,
      });

      return new Response(JSON.stringify({ success: true, matches: matchInserts.length }), { headers: corsHeaders });
    }

    // ─── OVERRIDE WINNER ──────────────────────────────────
    if (action === "override_winner") {
      const { match_id, winner_creator_id } = body;
      if (!match_id || !winner_creator_id) return new Response(JSON.stringify({ error: "match_id and winner_creator_id required" }), { status: 400, headers: corsHeaders });

      const { error } = await adminClient
        .from("tournament_matches")
        .update({ winner_id: winner_creator_id, is_completed: true, status: "completed" })
        .eq("id", match_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── END TOURNAMENT ──────────────────────────────────
    if (action === "end_tournament") {
      const { tournament_id } = body;
      if (!tournament_id) return new Response(JSON.stringify({ error: "tournament_id required" }), { status: 400, headers: corsHeaders });
      
      const { error } = await adminClient
        .from("tournaments")
        .update({ is_active: false, status: "ended", ended_at: new Date().toISOString() })
        .eq("id", tournament_id);
      if (error) throw error;

      await adminClient.from("tournament_logs").insert({
        tournament_id,
        log_type: "force_ended",
        message: `관리자에 의해 강제 종료됨`,
      });

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── LIST CLAIM REQUESTS ─────────────────────────────
    if (action === "list_claim_requests") {
      const { data, error } = await adminClient
        .from("creators")
        .select("id, name, avatar_url, category, user_id, verification_status, contact_email, instagram_handle, claim_message, rank")
        .in("verification_status", ["pending", "rejected"])
        .order("rank", { ascending: true });
      if (error) throw error;

      // Fetch applicant display names
      const userIds = (data || []).filter((c: any) => c.user_id).map((c: any) => c.user_id);
      let profileMap = new Map();
      if (userIds.length > 0) {
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));
      }

      const enriched = (data || []).map((c: any) => ({
        ...c,
        applicant_name: profileMap.get(c.user_id) || "알 수 없음",
      }));

      return new Response(JSON.stringify({ claims: enriched }), { headers: corsHeaders });
    }

    // ─── APPROVE CLAIM ───────────────────────────────────
    if (action === "approve_claim") {
      const { creator_id } = body;
      if (!creator_id) return new Response(JSON.stringify({ error: "creator_id required" }), { status: 400, headers: corsHeaders });

      const { data: creator } = await adminClient.from("creators").select("user_id, name").eq("id", creator_id).single();
      if (!creator) return new Response(JSON.stringify({ error: "Creator not found" }), { status: 404, headers: corsHeaders });

      const { error } = await adminClient.from("creators").update({
        claimed: true,
        claimed_at: new Date().toISOString(),
        verification_status: "verified",
        is_verified: true,
      }).eq("id", creator_id);
      if (error) throw error;

      // Notify the user
      if (creator.user_id) {
        await adminClient.from("notifications").insert({
          user_id: creator.user_id,
          type: "claim_approved",
          title: "🎉 크리에이터 인증 승인!",
          message: `${creator.name} 프로필이 인증되었습니다. 대시보드와 배지가 활성화되었습니다!`,
          link: `/creator/${creator_id}`,
        });
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── REJECT CLAIM ────────────────────────────────────
    if (action === "reject_claim") {
      const { creator_id } = body;
      if (!creator_id) return new Response(JSON.stringify({ error: "creator_id required" }), { status: 400, headers: corsHeaders });

      const { data: creator } = await adminClient.from("creators").select("user_id, name").eq("id", creator_id).single();
      if (!creator) return new Response(JSON.stringify({ error: "Creator not found" }), { status: 404, headers: corsHeaders });

      const { error } = await adminClient.from("creators").update({
        verification_status: "rejected",
        user_id: null,
        claimed: false,
      }).eq("id", creator_id);
      if (error) throw error;

      // Notify the user
      if (creator.user_id) {
        await adminClient.from("notifications").insert({
          user_id: creator.user_id,
          type: "claim_rejected",
          title: "크리에이터 인증 결과",
          message: `${creator.name} 프로필 인증 요청이 반려되었습니다. 추가 정보와 함께 다시 신청해주세요.`,
          link: `/creator/${creator_id}`,
        });
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }


    // ─── LIST PROMOTIONS ──────────────────────────────────
    if (action === "list_promotions") {
      const { data, error } = await adminClient
        .from("creators")
        .select("id, name, avatar_url, category, rank, promotion_type, promotion_status, promotion_start, promotion_end")
        .eq("promotion_status", "pending")
        .order("rank", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ promotions: data }), { headers: corsHeaders });
    }

    // ─── APPROVE PROMOTION ────────────────────────────────
    if (action === "approve_promotion") {
      const { creator_id, duration_hours } = body;
      if (!creator_id) return new Response(JSON.stringify({ error: "creator_id required" }), { status: 400, headers: corsHeaders });
      const hours = duration_hours || 24;
      const now = new Date();
      const end = new Date(now.getTime() + hours * 60 * 60 * 1000);

      const { data: creator } = await adminClient.from("creators").select("user_id, name").eq("id", creator_id).single();
      if (!creator) return new Response(JSON.stringify({ error: "Creator not found" }), { status: 404, headers: corsHeaders });

      const { error } = await adminClient.from("creators").update({
        is_promoted: true,
        promotion_status: "approved",
        promotion_start: now.toISOString(),
        promotion_end: end.toISOString(),
      }).eq("id", creator_id);
      if (error) throw error;

      // Notify the creator
      if (creator.user_id) {
        await adminClient.from("notifications").insert({
          user_id: creator.user_id,
          type: "promotion_approved",
          title: "⭐ 프로모션 승인!",
          message: `${creator.name} 프로필 홍보가 승인되었습니다! ${hours}시간 동안 노출됩니다.`,
          link: `/creator/${creator_id}`,
        });
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── REJECT PROMOTION ─────────────────────────────────
    if (action === "reject_promotion") {
      const { creator_id } = body;
      if (!creator_id) return new Response(JSON.stringify({ error: "creator_id required" }), { status: 400, headers: corsHeaders });

      const { data: creator } = await adminClient.from("creators").select("user_id, name").eq("id", creator_id).single();
      if (!creator) return new Response(JSON.stringify({ error: "Creator not found" }), { status: 404, headers: corsHeaders });

      const { error } = await adminClient.from("creators").update({
        is_promoted: false,
        promotion_status: "rejected",
        promotion_type: "none",
      }).eq("id", creator_id);
      if (error) throw error;

      if (creator.user_id) {
        await adminClient.from("notifications").insert({
          user_id: creator.user_id,
          type: "promotion_rejected",
          title: "프로모션 신청 결과",
          message: `${creator.name} 프로필 홍보 신청이 반려되었습니다.`,
          link: `/creator/${creator_id}`,
        });
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
