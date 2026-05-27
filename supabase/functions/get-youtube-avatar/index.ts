// Public edge function: redirects to a creator's YouTube channel avatar.
// Usage: GET /functions/v1/get-youtube-avatar?channel_id=UCxxxx
// If the YouTube API key isn't set, redirects to a placeholder.
// Also backfills the creators.avatar_url so subsequent loads skip this hop.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLACEHOLDER = "/placeholder.svg";

// In-memory cache (per warm instance) to avoid quota burn
const cache = new Map<string, { url: string; at: number }>();
const TTL_MS = 1000 * 60 * 60 * 6; // 6h

async function resolveAvatar(channelId: string, apiKey: string): Promise<string | null> {
  const cached = cache.get(channelId);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.url;
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const t = data?.items?.[0]?.snippet?.thumbnails;
    const url = t?.high?.url || t?.medium?.url || t?.default?.url || null;
    if (url) cache.set(channelId, { url, at: Date.now() });
    return url;
  } catch (e) {
    console.error("resolveAvatar error", channelId, e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const channelId = url.searchParams.get("channel_id")?.trim();
  const creatorId = url.searchParams.get("creator_id")?.trim();

  if (!channelId) {
    return Response.redirect(new URL(PLACEHOLDER, url.origin).toString(), 302);
  }

  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) {
    return Response.redirect(new URL(PLACEHOLDER, url.origin).toString(), 302);
  }

  const avatar = await resolveAvatar(channelId, apiKey);
  if (!avatar) {
    return Response.redirect(new URL(PLACEHOLDER, url.origin).toString(), 302);
  }

  // Best-effort backfill so future loads use creators.avatar_url directly
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceRoleKey) {
      const admin = createClient(supabaseUrl, serviceRoleKey);
      if (creatorId) {
        await admin.from("creators").update({ avatar_url: avatar }).eq("id", creatorId);
      } else {
        await admin
          .from("creators")
          .update({ avatar_url: avatar })
          .eq("youtube_channel_id", channelId)
          .or("avatar_url.is.null,avatar_url.eq.,avatar_url.eq./placeholder.svg");
      }
    }
  } catch (e) {
    console.warn("backfill skipped", e);
  }

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: avatar,
      "Cache-Control": "public, max-age=21600",
    },
  });
});
