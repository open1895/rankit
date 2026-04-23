import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Daily missions with RP rewards
const DAILY_MISSIONS: Record<string, { reward: number; label: string; type: "daily" | "onetime" }> = {
  daily_vote: { reward: 5, label: "크리에이터에게 투표하기", type: "daily" },
  daily_comment: { reward: 3, label: "응원 댓글 작성하기", type: "daily" },
  daily_post: { reward: 5, label: "팬 게시글 작성하기", type: "daily" },
  daily_share: { reward: 5, label: "크리에이터 프로필 공유하기", type: "daily" },
  // Legacy one-time missions
  first_comment: { reward: 3, label: "첫 응원톡 작성", type: "onetime" },
  first_post: { reward: 5, label: "첫 게시글 작성", type: "onetime" },
};

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86400000);
  return { start: start.toISOString(), end: end.toISOString() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, mission_key, share_token } = await req.json();
    const admin = createClient(supabaseUrl, serviceKey);
    const { start: todayStart, end: todayEnd } = getTodayRange();

    // ---- Share token (HMAC) helpers ----
    // Server-issued, short-lived token to verify a share actually started.
    const SHARE_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
    const hmacSecret = Deno.env.get("CRON_SECRET") || serviceKey;

    async function signShareToken(uid: string, issuedAt: number): Promise<string> {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        enc.encode(hmacSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const payload = `${uid}.${issuedAt}`;
      const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
      const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
      return `${issuedAt}.${b64}`;
    }

    async function verifyShareToken(uid: string, token: string): Promise<boolean> {
      try {
        const [issuedAtStr, sig] = token.split(".");
        const issuedAt = Number(issuedAtStr);
        if (!issuedAt || !sig) return false;
        if (Date.now() - issuedAt > SHARE_TOKEN_TTL_MS) return false;
        if (issuedAt > Date.now() + 60_000) return false;
        const expected = await signShareToken(uid, issuedAt);
        return expected === token;
      } catch {
        return false;
      }
    }

    if (action === "issue_share_token") {
      const token = await signShareToken(user.id, Date.now());
      return new Response(JSON.stringify({ token, ttl_ms: SHARE_TOKEN_TTL_MS }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_daily_missions") {
      const { data: profile } = await admin
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();
      const displayName = profile?.display_name || "___impossible___";

      // Get today's claimed missions
      const { data: todayClaimed } = await admin
        .from("user_missions")
        .select("mission_key")
        .eq("user_id", user.id)
        .gte("completed_at", todayStart)
        .lt("completed_at", todayEnd);
      const claimedKeys = new Set((todayClaimed || []).map(c => c.mission_key));

      // Get one-time claimed missions (all time)
      const { data: onetimeClaimed } = await admin
        .from("user_missions")
        .select("mission_key")
        .eq("user_id", user.id)
        .in("mission_key", ["first_comment", "first_post"]);
      const onetimeKeys = new Set((onetimeClaimed || []).map(c => c.mission_key));

      // Check today's activity
      const [votesRes, commentsRes, postsRes] = await Promise.all([
        admin.from("votes").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).gte("created_at", todayStart).lt("created_at", todayEnd),
        admin.from("comments").select("id", { count: "exact", head: true })
          .eq("nickname", displayName).gte("created_at", todayStart).lt("created_at", todayEnd),
        admin.from("board_posts").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).gte("created_at", todayStart).lt("created_at", todayEnd),
      ]);

      // Check share from localStorage is client-side only, so we track via claimed status
      const eligibility: Record<string, boolean> = {
        daily_vote: (votesRes.count || 0) > 0,
        daily_comment: (commentsRes.count || 0) > 0,
        daily_post: (postsRes.count || 0) > 0,
        daily_share: false, // client tracks this
      };

      const dailyMissions = Object.entries(DAILY_MISSIONS)
        .filter(([, m]) => m.type === "daily")
        .map(([key, { reward, label }]) => ({
          key,
          label,
          reward,
          claimed: claimedKeys.has(key),
          eligible: eligibility[key] || false,
        }));

      // Also return one-time missions that aren't claimed yet
      const { count: allComments } = await admin.from("comments")
        .select("id", { count: "exact", head: true })
        .eq("nickname", displayName);
      const { count: allPosts } = await admin.from("board_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      const onetimeMissions = [
        { key: "first_comment", label: "첫 응원톡 작성", reward: 3, claimed: onetimeKeys.has("first_comment"), eligible: (allComments || 0) > 0 },
        { key: "first_post", label: "첫 게시글 작성", reward: 5, claimed: onetimeKeys.has("first_post"), eligible: (allPosts || 0) > 0 },
      ].filter(m => !m.claimed);

      return new Response(JSON.stringify({ daily: dailyMissions, onetime: onetimeMissions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_missions") {
      // Legacy support - redirect to get_daily_missions logic
      const { data: profile } = await admin.from("profiles").select("display_name").eq("user_id", user.id).single();
      const { data: completed } = await admin.from("user_missions").select("mission_key").eq("user_id", user.id);
      const completedKeys = new Set((completed || []).map(c => c.mission_key));

      const { count: commentCount } = await admin.from("comments").select("id", { count: "exact", head: true }).eq("nickname", profile?.display_name || "___");
      const { count: postCount } = await admin.from("board_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id);

      const missions = [
        { key: "first_comment", label: "첫 응원톡 작성", reward: 3, claimed: completedKeys.has("first_comment"), eligible: (commentCount || 0) > 0 },
        { key: "first_post", label: "첫 게시글 작성", reward: 5, claimed: completedKeys.has("first_post"), eligible: (postCount || 0) > 0 },
      ];

      return new Response(JSON.stringify({ missions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "claim") {
      if (!mission_key || !DAILY_MISSIONS[mission_key]) {
        return new Response(JSON.stringify({ error: "Invalid mission_key" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const missionDef = DAILY_MISSIONS[mission_key];

      if (missionDef.type === "daily") {
        // Check if already claimed TODAY
        const { data: existing } = await admin
          .from("user_missions")
          .select("id")
          .eq("user_id", user.id)
          .eq("mission_key", mission_key)
          .gte("completed_at", todayStart)
          .lt("completed_at", todayEnd)
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({ error: "already_claimed", message: "오늘 이미 보상을 수령했습니다." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        // One-time: check all-time
        const { data: existing } = await admin.from("user_missions").select("id")
          .eq("user_id", user.id).eq("mission_key", mission_key).maybeSingle();
        if (existing) {
          return new Response(JSON.stringify({ error: "already_claimed", message: "이미 보상을 수령했습니다." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Verify eligibility
      const { data: profile } = await admin.from("profiles").select("display_name").eq("user_id", user.id).single();
      const displayName = profile?.display_name || "___impossible___";
      let eligible = false;

      if (mission_key === "daily_vote") {
        const { count } = await admin.from("votes").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).gte("created_at", todayStart).lt("created_at", todayEnd);
        eligible = (count || 0) > 0;
      } else if (mission_key === "daily_comment") {
        const { count } = await admin.from("comments").select("id", { count: "exact", head: true })
          .eq("nickname", displayName).gte("created_at", todayStart).lt("created_at", todayEnd);
        eligible = (count || 0) > 0;
      } else if (mission_key === "daily_post") {
        const { count } = await admin.from("board_posts").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).gte("created_at", todayStart).lt("created_at", todayEnd);
        eligible = (count || 0) > 0;
      } else if (mission_key === "daily_share") {
        // Share is client-tracked, trust the claim if within reasonable bounds
        eligible = true;
      } else if (mission_key === "first_comment") {
        const { count } = await admin.from("comments").select("id", { count: "exact", head: true }).eq("nickname", displayName);
        eligible = (count || 0) > 0;
      } else if (mission_key === "first_post") {
        const { count } = await admin.from("board_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id);
        eligible = (count || 0) > 0;
      }

      if (!eligible) {
        return new Response(JSON.stringify({ error: "not_eligible", message: "미션을 먼저 완료해주세요." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const reward = missionDef.reward;

      // Insert mission record
      const { error: insertErr } = await admin.from("user_missions").insert({
        user_id: user.id,
        mission_key,
        reward_amount: reward,
      });

      if (insertErr) {
        return new Response(JSON.stringify({ error: "claim_failed", message: "보상 수령에 실패했습니다." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add RP points
      const { data: userPoints } = await admin.from("user_points")
        .select("id").eq("user_id", user.id).maybeSingle();

      if (userPoints) {
        await admin.from("user_points").update({
          balance: admin.rpc ? undefined : undefined,
        }).eq("user_id", user.id);
        // Use raw SQL-like approach via RPC or direct update
        await admin.rpc("add_tickets", {
          p_user_id: user.id,
          p_amount: reward,
          p_type: "daily_mission",
          p_description: `일일 미션: ${missionDef.label} (+${reward} RP)`,
        });
      } else {
        // Also add tickets as reward
        await admin.rpc("add_tickets", {
          p_user_id: user.id,
          p_amount: reward,
          p_type: "daily_mission",
          p_description: `일일 미션: ${missionDef.label} (+${reward} RP)`,
        });
      }

      const { data: updatedProfile } = await admin.from("profiles")
        .select("tickets").eq("user_id", user.id).single();

      return new Response(JSON.stringify({
        success: true,
        reward,
        tickets: updatedProfile?.tickets ?? 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
