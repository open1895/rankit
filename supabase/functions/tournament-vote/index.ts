import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIN_VOTES_TO_COMPLETE = 10;

const ROUND_MAP: Record<string, string> = {
  "quarterfinal": "semifinal",
  "semifinal": "final",
};

const ROUND_NUMBER: Record<string, number> = {
  "quarterfinal": 8,
  "semifinal": 4,
  "final": 2,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "로그인이 필요합니다." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "인증에 실패했습니다." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { match_id, voted_creator_id } = await req.json();
    if (!match_id || !voted_creator_id) {
      return new Response(JSON.stringify({ error: "match_id and voted_creator_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get match
    const { data: match, error: matchErr } = await supabase
      .from("tournament_matches")
      .select("*")
      .eq("id", match_id)
      .single();

    if (matchErr || !match) {
      return new Response(JSON.stringify({ error: "매치를 찾을 수 없습니다." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (match.is_completed || match.status === "completed") {
      return new Response(JSON.stringify({ error: "이미 종료된 매치입니다." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (voted_creator_id !== match.creator_a_id && voted_creator_id !== match.creator_b_id) {
      return new Response(JSON.stringify({ error: "유효하지 않은 크리에이터입니다." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from("tournament_votes")
      .select("id")
      .eq("match_id", match_id)
      .eq("user_id", userId)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "이미 이 매치에 투표하셨습니다." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert vote
    await supabase.from("tournament_votes").insert({
      match_id,
      voted_creator_id,
      voter_ip: userId,
      user_id: userId,
    });

    // Update match vote counts
    const newVotesA = voted_creator_id === match.creator_a_id ? match.votes_a + 1 : match.votes_a;
    const newVotesB = voted_creator_id === match.creator_b_id ? match.votes_b + 1 : match.votes_b;

    await supabase
      .from("tournament_matches")
      .update({ votes_a: newVotesA, votes_b: newVotesB })
      .eq("id", match_id);

    // Auto-advance logic
    const totalVotes = newVotesA + newVotesB;
    let matchCompleted = false;

    if (totalVotes >= MIN_VOTES_TO_COMPLETE && newVotesA !== newVotesB) {
      const winnerId = newVotesA > newVotesB ? match.creator_a_id : match.creator_b_id;

      await supabase
        .from("tournament_matches")
        .update({ is_completed: true, winner_id: winnerId, status: "completed" })
        .eq("id", match_id);

      matchCompleted = true;

      // Log
      await supabase.from("tournament_logs").insert({
        tournament_id: match.tournament_id,
        log_type: "match_completed",
        message: `매치 완료 (round ${match.round}, order ${match.match_order}): 승자 결정 (${newVotesA}:${newVotesB})`,
      });

      // Check if all matches in this round are completed
      const { data: roundMatches } = await supabase
        .from("tournament_matches")
        .select("id, is_completed, winner_id, round, match_order")
        .eq("tournament_id", match.tournament_id)
        .eq("round", match.round);

      const allCompleted = roundMatches?.every((m: any) =>
        m.id === match_id ? true : m.is_completed
      );

      if (allCompleted && roundMatches) {
        const nextRound = match.round / 2;

        if (nextRound >= 2) {
          // Get next round name
          const { data: tournament } = await supabase
            .from("tournaments")
            .select("current_round")
            .eq("id", match.tournament_id)
            .single();

          const currentRoundName = tournament?.current_round || "quarterfinal";
          const nextRoundName = ROUND_MAP[currentRoundName] || "final";

          // Create next round matches
          const winners = roundMatches
            .sort((a: any, b: any) => a.match_order - b.match_order)
            .map((m: any) => m.id === match_id ? winnerId : m.winner_id!)
            .filter(Boolean);

          const now = new Date();
          const matchEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

          for (let i = 0; i < winners.length; i += 2) {
            if (i + 1 < winners.length) {
              const { data: existingMatch } = await supabase
                .from("tournament_matches")
                .select("id")
                .eq("tournament_id", match.tournament_id)
                .eq("round", nextRound)
                .eq("match_order", Math.floor(i / 2))
                .limit(1);

              if (!existingMatch || existingMatch.length === 0) {
                await supabase.from("tournament_matches").insert({
                  tournament_id: match.tournament_id,
                  round: nextRound,
                  match_order: Math.floor(i / 2),
                  creator_a_id: winners[i],
                  creator_b_id: winners[i + 1],
                  status: "active",
                  start_at: now.toISOString(),
                  end_at: matchEnd.toISOString(),
                });
              }
            }
          }

          // Update tournament round
          await supabase
            .from("tournaments")
            .update({ round: nextRound, current_round: nextRoundName })
            .eq("id", match.tournament_id);

          await supabase.from("tournament_logs").insert({
            tournament_id: match.tournament_id,
            log_type: "round_advanced",
            message: `라운드 진행: ${currentRoundName} → ${nextRoundName}`,
          });
        } else {
          // Tournament over
          const finalWinnerId = newVotesA > newVotesB ? match.creator_a_id : match.creator_b_id;

          const { data: tournamentData } = await supabase
            .from("tournaments")
            .select("title")
            .eq("id", match.tournament_id)
            .single();

          await supabase.from("tournament_champions").insert({
            tournament_id: match.tournament_id,
            creator_id: finalWinnerId,
            tournament_title: tournamentData?.title || "",
            is_featured: true,
          });

          // Grant 200 RP
          try {
            await supabase.from("creator_rp_rewards").upsert({
              creator_id: finalWinnerId,
              reward_type: "tournament_win",
              reward_key: `tournament_${match.tournament_id}`,
              rp_amount: 200,
              description: `토너먼트 우승 보상 (${tournamentData?.title || "토너먼트"})`,
            }, { onConflict: "creator_id,reward_key", ignoreDuplicates: true });

            const { data: creatorOwner } = await supabase
              .from("creators")
              .select("user_id, name")
              .eq("id", finalWinnerId)
              .single();

            if (creatorOwner?.user_id) {
              await supabase.from("notifications").insert({
                user_id: creatorOwner.user_id,
                type: "tournament_reward",
                title: "🏆 토너먼트 우승 보상!",
                message: `${creatorOwner.name}이(가) "${tournamentData?.title}"에서 우승하여 +200 RP 보상이 지급되었습니다!`,
                link: "/tournament",
              });
            }
          } catch (e) { console.error("Tournament RP reward error:", e); }

          // End tournament
          await supabase
            .from("tournaments")
            .update({
              is_active: false,
              status: "ended",
              current_round: "ended",
              champion_creator_id: finalWinnerId,
              ended_at: new Date().toISOString(),
            })
            .eq("id", match.tournament_id);

          await supabase.from("tournament_logs").insert({
            tournament_id: match.tournament_id,
            log_type: "ended",
            message: `토너먼트 종료! 챔피언 결정.`,
          });
        }
      }
    }

    // RP reward for participation
    let rpEarned = 0;
    try {
      const todayRpStart = new Date();
      todayRpStart.setHours(0, 0, 0, 0);
      const { data: todayTx } = await supabase
        .from("point_transactions")
        .select("amount")
        .eq("user_id", userId)
        .in("type", ["vote_reward", "tournament_reward"])
        .gte("created_at", todayRpStart.toISOString());

      const todayEarned = (todayTx || []).reduce((sum: number, t: any) => sum + (t.amount > 0 ? t.amount : 0), 0);

      if (todayEarned < 50) {
        let rpMultiplier = 1.0;
        let fanLevel = 1;
        try {
          const { data: levelData } = await supabase.rpc("get_fan_level_multiplier", { p_user_id: userId });
          if (levelData && levelData.length > 0) {
            rpMultiplier = Number(levelData[0].rp_multiplier) || 1.0;
            fanLevel = levelData[0].fan_level || 1;
          }
        } catch (e) { console.error("Fan level check error:", e); }

        const baseRp = 2;
        const rpAmount = Math.round(baseRp * rpMultiplier);

        const { data: existingPts } = await supabase
          .from("user_points")
          .select("id, balance, total_earned")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingPts) {
          await supabase.from("user_points").insert({ user_id: userId, balance: rpAmount, total_earned: rpAmount });
        } else {
          await supabase
            .from("user_points")
            .update({
              balance: existingPts.balance + rpAmount,
              total_earned: existingPts.total_earned + rpAmount,
            })
            .eq("user_id", userId);
        }

        const bonusText = rpMultiplier > 1 ? ` (Lv${fanLevel} ${rpMultiplier}x 보너스)` : "";
        await supabase.from("point_transactions").insert({
          user_id: userId,
          amount: rpAmount,
          type: "tournament_reward",
          description: `토너먼트 투표 참여 보상 +${rpAmount} RP${bonusText}`,
        });
        rpEarned = rpAmount;

        await supabase.from("notifications").insert({
          user_id: userId,
          type: "reward",
          title: `⚔️ 토너먼트 보상 +${rpAmount} RP`,
          message: `토너먼트 투표 참여 보상으로 ${rpAmount} RP를 획득했습니다!${bonusText}`,
          link: "/my",
        });
      }
    } catch (e) { console.error("RP reward error:", e); }

    return new Response(JSON.stringify({
      success: true,
      match_completed: matchCompleted,
      rp_earned: rpEarned,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Tournament vote error:", err);
    return new Response(JSON.stringify({ error: "요청을 처리할 수 없습니다." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
