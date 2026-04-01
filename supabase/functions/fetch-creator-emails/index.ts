import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Auth check: admin only
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

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await supabase
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

    // Parse body for optional limit
    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }
    const batchSize = Math.min(body.batch_size || 50, 100);

    // Get creators without contact_email that have youtube_channel_id
    const { data: creators, error: fetchError } = await supabase
      .from("creators")
      .select("id, name, youtube_channel_id")
      .neq("youtube_channel_id", "")
      .or("contact_email.is.null,contact_email.eq.")
      .limit(batchSize);

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!creators || creators.length === 0) {
      return new Response(JSON.stringify({
        message: "모든 크리에이터의 이메일이 이미 수집되었거나 채널 ID가 없습니다.",
        found: 0,
        checked: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch YouTube API call (max 50 IDs per request)
    const channelIds = creators.map(c => c.youtube_channel_id).filter(Boolean);
    let emailsFound = 0;
    const results: { name: string; email: string }[] = [];

    // Process in chunks of 50
    for (let i = 0; i < channelIds.length; i += 50) {
      const chunk = channelIds.slice(i, i + 50);
      const creatorsChunk = creators.filter(c => chunk.includes(c.youtube_channel_id));

      const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,brandingSettings&id=${chunk.join(",")}&key=${youtubeApiKey}`;
      const res = await fetch(url);

      if (!res.ok) {
        console.error(`YouTube API error: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const channels = data.items || [];

      for (const channel of channels) {
        // Try to extract email from channel description
        const description = channel.snippet?.description || "";
        const brandingDesc = channel.brandingSettings?.channel?.description || "";
        const fullText = `${description} ${brandingDesc}`;

        // Email regex
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const foundEmails = fullText.match(emailRegex);

        if (foundEmails && foundEmails.length > 0) {
          // Use the first email found (usually business email)
          const email = foundEmails[0].toLowerCase();

          // Filter out common non-business emails
          const skipDomains = ["example.com", "test.com"];
          if (skipDomains.some(d => email.endsWith(d))) continue;

          const creator = creatorsChunk.find(c => c.youtube_channel_id === channel.id);
          if (creator) {
            const { error: updateError } = await supabase
              .from("creators")
              .update({ contact_email: email })
              .eq("id", creator.id);

            if (!updateError) {
              emailsFound++;
              results.push({ name: creator.name, email });
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({
      message: `${creators.length}명 확인, ${emailsFound}명의 이메일 수집 완료`,
      checked: creators.length,
      found: emailsFound,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("fetch-creator-emails error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
