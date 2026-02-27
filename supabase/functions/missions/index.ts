import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MISSION_REWARDS: Record<string, { reward: number; label: string }> = {
  change_nickname: { reward: 2, label: "닉네임 변경" },
  first_comment: { reward: 3, label: "첫 응원톡 작성" },
  first_post: { reward: 5, label: "첫 게시글 작성" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user
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
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, mission_key } = await req.json();
    const admin = createClient(supabaseUrl, serviceKey);

    if (action === "get_missions") {
      // Get completed missions for user
      const { data: completed } = await admin
        .from("user_missions")
        .select("mission_key, completed_at, reward_amount")
        .eq("user_id", user.id);

      // Check actual completion status from DB
      const completionStatus: Record<string, boolean> = {};

      // Check nickname changed (display_name != '' and != email)
      const { data: profile } = await admin
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();
      const hasNickname =
        profile?.display_name &&
        profile.display_name !== "" &&
        profile.display_name !== user.email;
      completionStatus["change_nickname"] = !!hasNickname;

      // Check first comment (comments table)
      const { count: commentCount } = await admin
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("nickname", profile?.display_name || "___impossible___");
      completionStatus["first_comment"] = (commentCount || 0) > 0;

      // Check first post (board_posts table)
      const { count: postCount } = await admin
        .from("board_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      completionStatus["first_post"] = (postCount || 0) > 0;

      const completedKeys = new Set(
        (completed || []).map((c) => c.mission_key)
      );

      const missions = Object.entries(MISSION_REWARDS).map(
        ([key, { reward, label }]) => ({
          key,
          label,
          reward,
          claimed: completedKeys.has(key),
          eligible: completionStatus[key] || false,
        })
      );

      return new Response(JSON.stringify({ missions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "claim") {
      if (!mission_key || !MISSION_REWARDS[mission_key]) {
        return new Response(
          JSON.stringify({ error: "Invalid mission_key" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if already claimed (UNIQUE constraint also prevents duplicates)
      const { data: existing } = await admin
        .from("user_missions")
        .select("id")
        .eq("user_id", user.id)
        .eq("mission_key", mission_key)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "already_claimed", message: "이미 보상을 수령했습니다." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Verify mission completion
      let eligible = false;
      const { data: profile } = await admin
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();

      if (mission_key === "change_nickname") {
        eligible =
          !!profile?.display_name &&
          profile.display_name !== "" &&
          profile.display_name !== user.email;
      } else if (mission_key === "first_comment") {
        const { count } = await admin
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("nickname", profile?.display_name || "___impossible___");
        eligible = (count || 0) > 0;
      } else if (mission_key === "first_post") {
        const { count } = await admin
          .from("board_posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        eligible = (count || 0) > 0;
      }

      if (!eligible) {
        return new Response(
          JSON.stringify({
            error: "not_eligible",
            message: "미션을 먼저 완료해주세요.",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const reward = MISSION_REWARDS[mission_key].reward;

      // Insert mission record
      const { error: insertErr } = await admin
        .from("user_missions")
        .insert({
          user_id: user.id,
          mission_key,
          reward_amount: reward,
        });

      if (insertErr) {
        // UNIQUE constraint violation = already claimed
        return new Response(
          JSON.stringify({ error: "already_claimed", message: "이미 보상을 수령했습니다." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Add tickets
      await admin.rpc("add_tickets", {
        p_user_id: user.id,
        p_amount: reward,
        p_type: "mission",
        p_description: `미션 보상: ${MISSION_REWARDS[mission_key].label}`,
      });

      // Get updated balance
      const { data: updatedProfile } = await admin
        .from("profiles")
        .select("tickets")
        .eq("user_id", user.id)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          reward,
          tickets: updatedProfile?.tickets ?? 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
