import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIN_VOTES_TO_COMPLETE = 10; // Minimum votes before a match can auto-complete

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify auth
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

    // Check match exists and is not completed
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

    if (match.is_completed) {
      return new Response(JSON.stringify({ error: "이미 종료된 매치입니다." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (voted_creator_id !== match.creator_a_id && voted_creator_id !== match.creator_b_id) {
      return new Response(JSON.stringify({ error: "유효하지 않은 크리에이터입니다." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check duplicate vote by user_id
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
    const field = voted_creator_id === match.creator_a_id ? "votes_a" : "votes_b";
    const newVotesA = voted_creator_id === match.creator_a_id ? match.votes_a + 1 : match.votes_a;
    const newVotesB = voted_creator_id === match.creator_b_id ? match.votes_b + 1 : match.votes_b;

    await supabase
      .from("tournament_matches")
      .update({ votes_a: newVotesA, votes_b: newVotesB })
      .eq("id", match_id);

    // Auto-advance: check if all matches in this round should complete
    // A match auto-completes when total votes reach a threshold and there's a clear winner
    const totalVotes = newVotesA + newVotesB;
    let matchCompleted = false;

    if (totalVotes >= MIN_VOTES_TO_COMPLETE && newVotesA !== newVotesB) {
      const winnerId = newVotesA > newVotesB ? match.creator_a_id : match.creator_b_id;

      await supabase
        .from("tournament_matches")
        .update({ is_completed: true, winner_id: winnerId })
        .eq("id", match_id);

      matchCompleted = true;

      // Check if all matches in this round are completed
      const { data: roundMatches } = await supabase
        .from("tournament_matches")
        .select("id, is_completed, winner_id, round, match_order")
        .eq("tournament_id", match.tournament_id)
        .eq("round", match.round);

      const allCompleted = roundMatches?.every((m) =>
        m.id === match_id ? true : m.is_completed
      );

      if (allCompleted && roundMatches) {
        const nextRound = match.round / 2;

        if (nextRound >= 2) {
          // Create next round matches by pairing winners
          const winners = roundMatches
            .sort((a, b) => a.match_order - b.match_order)
            .map((m) => m.id === match_id ? winnerId : m.winner_id!)
            .filter(Boolean);

          for (let i = 0; i < winners.length; i += 2) {
            if (i + 1 < winners.length) {
              // Check if match already exists
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
                });
              }
            }
          }

          // Update tournament round
          await supabase
            .from("tournaments")
            .update({ round: nextRound })
            .eq("id", match.tournament_id);
        } else {
          // Tournament is over - the final match winner is the champion
          const finalWinnerId = newVotesA > newVotesB ? match.creator_a_id : match.creator_b_id;

          // Get tournament title
          const { data: tournamentData } = await supabase
            .from("tournaments")
            .select("title")
            .eq("id", match.tournament_id)
            .single();

          // Insert champion record
          await supabase.from("tournament_champions").insert({
            tournament_id: match.tournament_id,
            creator_id: finalWinnerId,
            tournament_title: tournamentData?.title || "",
            is_featured: true,
          });

          // Mark tournament as ended
          await supabase
            .from("tournaments")
            .update({ is_active: false, ended_at: new Date().toISOString() })
            .eq("id", match.tournament_id);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      match_completed: matchCompleted,
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
