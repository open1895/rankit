import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES = [
  { name: "게임", query: "한국 게임 유튜버" },
  { name: "먹방", query: "한국 먹방 유튜버" },
  { name: "뷰티", query: "한국 뷰티 유튜버" },
  { name: "음악", query: "한국 음악 커버 유튜버" },
  { name: "운동", query: "한국 운동 피트니스 유튜버" },
  { name: "여행", query: "한국 여행 브이로그 유튜버" },
  { name: "테크", query: "한국 IT 테크 리뷰 유튜버" },
  { name: "교육", query: "한국 교육 공부 유튜버" },
  { name: "댄스", query: "한국 댄스 커버 유튜버" },
  { name: "아트", query: "한국 그림 일러스트 유튜버" },
  { name: "요리", query: "한국 요리 레시피 유튜버" },
  { name: "반려동물", query: "한국 강아지 고양이 유튜버" },
];

const MAX_SUBSCRIBERS = 200000;
const TARGET_PER_CATEGORY = 10;

interface YouTubeChannel {
  id: string;
  snippet: {
    title: string;
    thumbnails: { high?: { url: string }; default?: { url: string } };
    customUrl?: string;
  };
  statistics: {
    subscriberCount: string;
  };
}

async function searchAndFetchChannels(
  query: string,
  apiKey: string,
  maxResults: number = 25
): Promise<YouTubeChannel[]> {
  // Step 1: Search for channels
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&regionCode=KR&relevanceLanguage=ko&maxResults=${maxResults}&key=${apiKey}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    console.error(`YouTube search error: ${searchRes.status} - ${await searchRes.text()}`);
    return [];
  }
  const searchData = await searchRes.json();
  const channelIds = (searchData.items || [])
    .map((item: any) => item.snippet?.channelId || item.id?.channelId)
    .filter(Boolean);

  if (channelIds.length === 0) return [];

  // Step 2: Get channel details with statistics
  const detailsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds.join(",")}&key=${apiKey}`;
  const detailsRes = await fetch(detailsUrl);
  if (!detailsRes.ok) {
    console.error(`YouTube channels error: ${detailsRes.status}`);
    return [];
  }
  const detailsData = await detailsRes.json();
  return detailsData.items || [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing server config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!youtubeApiKey) {
      return new Response(JSON.stringify({ error: "YOUTUBE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: CRON_SECRET header or admin role
    const authHeader = req.headers.get("Authorization");
    const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;

    // Also allow internal pg_net calls (no auth header, request from internal network)
    let bodyText = "";
    try {
      bodyText = await req.text();
    } catch { /* empty */ }

    let parsedBody: any = {};
    try {
      parsedBody = bodyText ? JSON.parse(bodyText) : {};
    } catch { /* empty */ }

    const isInternalCron = parsedBody.cron === true && !authHeader;

    if (!isCronCall && !isInternalCron) {
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

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Use already-parsed body for category filter
    let targetCategories = CATEGORIES;
    if (parsedBody.category) {
      targetCategories = CATEGORIES.filter(c => c.name === parsedBody.category);
    }

    // Process all categories to ensure 10 creators per category per day

    console.log(`auto-add-creators: processing category "${targetCategories.map(c => c.name).join(", ")}"`);

    // Get existing youtube_channel_ids to avoid duplicates
    const { data: existingCreators } = await supabase
      .from("creators")
      .select("youtube_channel_id")
      .neq("youtube_channel_id", "");

    const existingIds = new Set(
      (existingCreators || []).map((c: any) => c.youtube_channel_id).filter(Boolean)
    );

    let totalAdded = 0;
    const results: { category: string; added: number }[] = [];

    for (const cat of targetCategories) {
      const channels = await searchAndFetchChannels(cat.query, youtubeApiKey, 50);

      // Filter: under 200k subs, not already in DB
      const eligible = channels.filter((ch) => {
        const subs = parseInt(ch.statistics.subscriberCount, 10) || 0;
        return subs > 0 && subs <= MAX_SUBSCRIBERS && !existingIds.has(ch.id);
      });

      // Take up to TARGET_PER_CATEGORY
      const toAdd = eligible.slice(0, TARGET_PER_CATEGORY);

      if (toAdd.length > 0) {
        const rows = toAdd.map((ch) => {
          const subs = parseInt(ch.statistics.subscriberCount, 10) || 0;
          const avatarUrl =
            ch.snippet.thumbnails?.high?.url ||
            ch.snippet.thumbnails?.default?.url ||
            "";
          const channelLink = ch.snippet.customUrl
            ? `https://youtube.com/${ch.snippet.customUrl}`
            : `https://youtube.com/channel/${ch.id}`;

          return {
            name: ch.snippet.title,
            category: cat.name,
            youtube_channel_id: ch.id,
            youtube_subscribers: subs,
            avatar_url: avatarUrl,
            channel_link: channelLink,
            rank: 0,
            votes_count: 0,
            chzzk_followers: 0,
            instagram_followers: 0,
            tiktok_followers: 0,
            rankit_score: 0,
          };
        });

        const { error: insertError } = await supabase
          .from("creators")
          .insert(rows);

        if (insertError) {
          console.error(`Insert error for ${cat.name}:`, insertError);
          results.push({ category: cat.name, added: 0 });
        } else {
          // Mark these as existing to prevent cross-category dupes
          toAdd.forEach((ch) => existingIds.add(ch.id));
          totalAdded += toAdd.length;
          results.push({ category: cat.name, added: toAdd.length });
        }
      } else {
        results.push({ category: cat.name, added: 0 });
      }
    }

    // Recalculate ranks if any were added
    if (totalAdded > 0) {
      await supabase.rpc("batch_recalculate_ranks");
      console.log("Ranks recalculated after adding new creators");
    }

    return new Response(
      JSON.stringify({
        message: `Added ${totalAdded} new creators`,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("auto-add-creators error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
