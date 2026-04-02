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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Parse body for cron detection
    let body: any = {};
    try { body = await req.clone().json(); } catch { /* empty */ }
    const isCronCall = body?.cron === true;

    // Auth: accept service role key, anon key, cron body flag, or admin user
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || "";

    const isTrustedCall = token === serviceKey || token === anonKey || isCronCall;

    if (!isTrustedCall) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const adminClient = createClient(supabaseUrl, serviceKey);
      const { data: roleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Step 1: Close expired battles and determine winners
    const { data: expiredBattles } = await supabase
      .from("battles")
      .select("id, votes_a, votes_b, creator_a_id, creator_b_id")
      .eq("status", "active")
      .lt("ends_at", new Date().toISOString());

    if (expiredBattles && expiredBattles.length > 0) {
      for (const battle of expiredBattles) {
        const winnerId = battle.votes_a > battle.votes_b
          ? battle.creator_a_id
          : battle.votes_b > battle.votes_a
            ? battle.creator_b_id
            : null;
        await supabase
          .from("battles")
          .update({ status: "completed", winner_id: winnerId })
          .eq("id", battle.id);
      }
      console.log(`Closed ${expiredBattles.length} expired battles`);
    }

    // Step 2: Resolve prediction events linked to completed battles
    const { data: openPredictions } = await supabase
      .from("prediction_events")
      .select("id, creator_a_id, creator_b_id")
      .eq("status", "open")
      .lt("bet_deadline", new Date().toISOString());

    if (openPredictions && openPredictions.length > 0) {
      for (const pred of openPredictions) {
        // Find matching completed battle
        const { data: matchedBattle } = await supabase
          .from("battles")
          .select("winner_id, votes_a, votes_b")
          .eq("status", "completed")
          .or(`and(creator_a_id.eq.${pred.creator_a_id},creator_b_id.eq.${pred.creator_b_id}),and(creator_a_id.eq.${pred.creator_b_id},creator_b_id.eq.${pred.creator_a_id})`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (matchedBattle?.winner_id) {
          // Mark prediction as resolved
          await supabase
            .from("prediction_events")
            .update({ status: "resolved", winner_id: matchedBattle.winner_id, resolved_at: new Date().toISOString() })
            .eq("id", pred.id);

          // Get total bets for this event
          const { data: allBets } = await supabase
            .from("prediction_bets")
            .select("id, user_id, predicted_creator_id, amount")
            .eq("event_id", pred.id);

          if (allBets && allBets.length > 0) {
            const totalPool = allBets.reduce((sum, b) => sum + b.amount, 0);
            const winnerBets = allBets.filter(b => b.predicted_creator_id === matchedBattle.winner_id);
            const winnerPool = winnerBets.reduce((sum, b) => sum + b.amount, 0);

            for (const bet of allBets) {
              const isWinner = bet.predicted_creator_id === matchedBattle.winner_id;
              let rewardAmount = 0;

              if (isWinner && winnerPool > 0) {
                const odds = Math.min(5, Math.max(1.2, totalPool / winnerPool));
                rewardAmount = Math.round(bet.amount * odds);
                // Give back tickets
                await supabase.rpc("add_tickets", {
                  p_user_id: bet.user_id,
                  p_amount: rewardAmount,
                  p_type: "prediction_win",
                  p_description: `🎯 예측 적중! ${rewardAmount}장 획득`
                });
              }

              await supabase
                .from("prediction_bets")
                .update({ is_winner: isWinner, reward_amount: rewardAmount })
                .eq("id", bet.id);
            }
          }
          console.log(`Resolved prediction event ${pred.id}, winner: ${matchedBattle.winner_id}`);
        }
      }
    }

    // Step 3: Generate new battles (up to 3 active)
    const { data: activeBattles } = await supabase
      .from("battles")
      .select("id, creator_a_id, creator_b_id")
      .eq("status", "active");

    const activeCount = activeBattles?.length || 0;
    const needed = Math.max(0, 3 - activeCount);

    let newBattleCount = 0;

    if (needed > 0) {
      const { data: creators } = await supabase
        .from("creators")
        .select("id, name, category, rankit_score, votes_count")
        .order("rankit_score", { ascending: false });

      if (creators && creators.length >= 2) {
        const existingPairs = new Set(
          (activeBattles || []).map(b => [b.creator_a_id, b.creator_b_id].sort().join("-"))
        );

        const newBattles: any[] = [];

        // Group by category
        const byCategory: Record<string, typeof creators> = {};
        for (const c of creators) {
          const cat = c.category || "기타";
          if (!byCategory[cat]) byCategory[cat] = [];
          byCategory[cat].push(c);
        }

        const categories = Object.keys(byCategory).filter(k => byCategory[k].length >= 2);

        for (let i = 0; i < needed && categories.length > 0; i++) {
          const catIdx = Math.floor(Math.random() * categories.length);
          const cat = categories[catIdx];
          const pool = byCategory[cat];
          pool.sort((a, b) => (b.rankit_score || 0) - (a.rankit_score || 0));

          let found = false;
          for (let j = 0; j < pool.length - 1 && !found; j++) {
            const a = pool[j];
            const b = pool[j + 1];
            const pairKey = [a.id, b.id].sort().join("-");

            if (!existingPairs.has(pairKey)) {
              existingPairs.add(pairKey);
              newBattles.push({
                creator_a_id: a.id,
                creator_b_id: b.id,
                category: cat,
                featured: i === 0 && activeCount === 0,
              });
              pool.splice(j, 2);
              found = true;
            }
          }
          if (!found) categories.splice(catIdx, 1);
        }

        // Cross-category fallback
        if (newBattles.length < needed) {
          const remaining = creators.filter(c =>
            !newBattles.some(b => b.creator_a_id === c.id || b.creator_b_id === c.id)
          );
          for (let i = newBattles.length; i < needed && remaining.length >= 2; i++) {
            const idx = Math.floor(Math.random() * (remaining.length - 1));
            const a = remaining[idx];
            const b = remaining[idx + 1];
            const pairKey = [a.id, b.id].sort().join("-");
            if (!existingPairs.has(pairKey)) {
              existingPairs.add(pairKey);
              newBattles.push({
                creator_a_id: a.id,
                creator_b_id: b.id,
                category: a.category || b.category || '크로스',
                featured: newBattles.length === 0 && activeCount === 0,
              });
              remaining.splice(idx, 2);
            }
          }
        }

        if (newBattles.length > 0) {
          const { error: insertErr } = await supabase.from("battles").insert(newBattles);
          if (insertErr) {
            console.error("Battle insert error:", insertErr);
          } else {
            newBattleCount = newBattles.length;
            console.log(`Generated ${newBattleCount} new battles`);

            // Step 4: Auto-create prediction events for new battles
            // Get the newly created battles to get their IDs and end times
            const { data: latestBattles } = await supabase
              .from("battles")
              .select("id, creator_a_id, creator_b_id, category, ends_at")
              .eq("status", "active")
              .order("created_at", { ascending: false })
              .limit(newBattleCount);

            if (latestBattles && latestBattles.length > 0) {
              // Get creator names for titles
              const creatorIds = latestBattles.flatMap(b => [b.creator_a_id, b.creator_b_id]);
              const { data: creatorNames } = await supabase
                .from("creators")
                .select("id, name")
                .in("id", creatorIds);

              const nameMap = new Map((creatorNames || []).map(c => [c.id, c.name]));

              const predictionEvents = latestBattles.map(battle => {
                const nameA = nameMap.get(battle.creator_a_id) || "크리에이터A";
                const nameB = nameMap.get(battle.creator_b_id) || "크리에이터B";
                // Bet deadline = 1 hour before battle ends
                const endsAt = new Date(battle.ends_at);
                const betDeadline = new Date(endsAt.getTime() - 60 * 60 * 1000);

                return {
                  title: `${nameA} vs ${nameB}`,
                  description: `[${battle.category}] ${nameA}와 ${nameB}의 대결! 누가 이길까요?`,
                  creator_a_id: battle.creator_a_id,
                  creator_b_id: battle.creator_b_id,
                  bet_deadline: betDeadline.toISOString(),
                  status: "open",
                };
              });

              const { error: predErr } = await supabase.from("prediction_events").insert(predictionEvents);
              if (predErr) {
                console.error("Prediction event insert error:", predErr);
              } else {
                console.log(`Created ${predictionEvents.length} prediction events`);
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({
      message: `Closed ${expiredBattles?.length || 0} expired, generated ${newBattleCount} new battles with prediction events`,
      active: activeCount + newBattleCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-battles error:", e);
    return new Response(JSON.stringify({ error: true, message: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
