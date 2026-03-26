import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WEIGHTS = {
  youtube: 1.5,
  chzzk: 2.0,
  instagram: 1.2,
  tiktok: 0.8,
};

async function fetchYouTubeSubscribers(channelId: string, apiKey: string): Promise<number | null> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`YouTube API error: ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      return parseInt(data.items[0].statistics.subscriberCount, 10) || 0;
    }
    return null;
  } catch (e) {
    console.error("YouTube fetch error:", e);
    return null;
  }
}

async function fetchChzzkFollowers(channelId: string): Promise<number | null> {
  try {
    const url = `https://api.chzzk.naver.com/service/v1/channels/${channelId}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) {
      console.error(`Chzzk API error: ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data.content) {
      return data.content.followerCount ?? null;
    }
    return null;
  } catch (e) {
    console.error("Chzzk fetch error:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing server config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is a cron call
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;

    // Allow internal pg_net cron calls (no auth, body has cron flag)
    let bodyText = "";
    try { bodyText = await req.text(); } catch { /* empty */ }
    let parsedBody: any = {};
    try { parsedBody = bodyText ? JSON.parse(bodyText) : {}; } catch { /* empty */ }
    const isInternalCron = parsedBody.cron === true && !authHeader;

    if (!isCronCall && !isInternalCron) {
      // Manual call: require admin role
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await authClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const { data: roleData } = await supabaseAdmin
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

    console.log(`fetch-social-stats called (cron: ${isCronCall || isInternalCron})`);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch 50 oldest-updated creators to stay within YouTube API quota
    const { data: creators, error: fetchError } = await supabase
      .from("creators")
      .select("id, youtube_channel_id, chzzk_channel_id, youtube_subscribers, chzzk_followers, instagram_followers, tiktok_followers")
      .order("last_stats_updated", { ascending: true, nullsFirst: true })
      .limit(50);

    if (fetchError) throw fetchError;
    if (!creators || creators.length === 0) {
      return new Response(JSON.stringify({ message: "No creators found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updatedCount = 0;

    for (const creator of creators) {
      let ytSubs = creator.youtube_subscribers;
      let czFollowers = creator.chzzk_followers;
      let changed = false;

      // Fetch YouTube stats if channel ID exists
      if (creator.youtube_channel_id && youtubeApiKey) {
        const subs = await fetchYouTubeSubscribers(creator.youtube_channel_id, youtubeApiKey);
        if (subs !== null) {
          ytSubs = subs;
          changed = true;
        }
      }

      // Fetch Chzzk stats if channel ID exists
      if (creator.chzzk_channel_id) {
        const followers = await fetchChzzkFollowers(creator.chzzk_channel_id);
        if (followers !== null) {
          czFollowers = followers;
          changed = true;
        }
      }

      if (changed) {
        const rankitScore =
          ytSubs * WEIGHTS.youtube +
          czFollowers * WEIGHTS.chzzk +
          creator.instagram_followers * WEIGHTS.instagram +
          creator.tiktok_followers * WEIGHTS.tiktok;

        const { error: updateError } = await supabase
          .from("creators")
          .update({
            youtube_subscribers: ytSubs,
            chzzk_followers: czFollowers,
            rankit_score: rankitScore,
            last_stats_updated: new Date().toISOString(),
          })
          .eq("id", creator.id);

        if (updateError) {
          console.error(`Update error for ${creator.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
    }

    // Recalculate ranks after stats update
    if (updatedCount > 0) {
      await supabase.rpc("batch_recalculate_ranks");
      console.log("Ranks recalculated after stats update");
    }

    return new Response(
      JSON.stringify({ message: `Updated ${updatedCount}/${creators.length} creators, ranks recalculated` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("fetch-social-stats error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
