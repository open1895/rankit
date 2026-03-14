import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchYouTubeAvatar(channelId: string, apiKey: string): Promise<string | null> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`YouTube API error for ${channelId}: ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const thumbnails = data.items[0].snippet.thumbnails;
      // Prefer high > medium > default
      return thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || null;
    }
    return null;
  } catch (e) {
    console.error(`YouTube avatar fetch error for ${channelId}:`, e);
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

    if (!youtubeApiKey) {
      return new Response(JSON.stringify({ error: "YOUTUBE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin auth check
    const authHeader = req.headers.get("Authorization");
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

    // Parse optional filter
    let onlyMissing = true;
    try {
      const body = await req.json();
      if (body.only_missing === false) onlyMissing = false;
    } catch { /* no body */ }

    // Fetch creators with youtube_channel_id
    let query = supabaseAdmin
      .from("creators")
      .select("id, name, youtube_channel_id, avatar_url")
      .neq("youtube_channel_id", "");

    const { data: creators, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!creators || creators.length === 0) {
      return new Response(JSON.stringify({ message: "No creators with YouTube channel ID found", updated: 0, total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to only those with placeholder/default avatars if onlyMissing
    const targets = onlyMissing
      ? creators.filter(c => !c.avatar_url || c.avatar_url === "/placeholder.svg" || c.avatar_url.includes("placeholder"))
      : creators;

    let updatedCount = 0;
    const errors: string[] = [];

    for (const creator of targets) {
      if (!creator.youtube_channel_id) continue;

      const avatarUrl = await fetchYouTubeAvatar(creator.youtube_channel_id, youtubeApiKey);
      if (avatarUrl) {
        const { error: updateError } = await supabaseAdmin
          .from("creators")
          .update({ avatar_url: avatarUrl })
          .eq("id", creator.id);

        if (updateError) {
          console.error(`Update error for ${creator.name}:`, updateError);
          errors.push(creator.name);
        } else {
          updatedCount++;
          console.log(`Updated avatar for ${creator.name}`);
        }
      } else {
        console.warn(`No avatar found for ${creator.name} (${creator.youtube_channel_id})`);
        errors.push(creator.name);
      }

      // Rate limit: small delay between API calls
      await new Promise(r => setTimeout(r, 100));
    }

    return new Response(
      JSON.stringify({
        message: `${updatedCount}/${targets.length}명의 프로필 사진을 업데이트했습니다.`,
        updated: updatedCount,
        total: targets.length,
        failed: errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("fetch-creator-avatars error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
