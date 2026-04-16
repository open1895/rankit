// Web Push delivery via VAPID (no external libs - native crypto)
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@rankit.today";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (e) {
    console.error("VAPID setup error:", e);
  }
}

interface SendOptions {
  user_ids: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
  pref_key?: "rank_change" | "battle_result" | "donation_received" | "vote_reminder" | "season_ending";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cronSecret = req.headers.get("x-cron-secret");
    const internalCall = cronSecret && cronSecret === Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (!internalCall) {
      // Require admin for non-cron calls
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
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
      const { data: roleRow } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!roleRow) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const opts = (await req.json()) as SendOptions;
    if (!opts.user_ids?.length || !opts.title || !opts.body) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter by preferences
    let allowedIds = opts.user_ids;
    if (opts.pref_key) {
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select(`user_id, push_enabled, ${opts.pref_key}`)
        .in("user_id", opts.user_ids);
      const allowed = new Set<string>();
      for (const p of prefs || []) {
        if ((p as any).push_enabled && (p as any)[opts.pref_key!]) allowed.add(p.user_id);
      }
      // Users without prefs row default to true (created via trigger but be safe)
      const missing = opts.user_ids.filter((id) => !(prefs || []).some((p: any) => p.user_id === id));
      missing.forEach((id) => allowed.add(id));
      allowedIds = Array.from(allowed);
    }

    if (allowedIds.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, filtered: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth_key")
      .in("user_id", allowedIds);

    if (!subs?.length) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title: opts.title,
      body: opts.body,
      url: opts.url || "/",
      tag: opts.tag,
    });

    let sent = 0, failed = 0;
    const expiredIds: string[] = [];

    await Promise.allSettled(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
            payload
          );
          sent++;
        } catch (err: any) {
          failed++;
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            expiredIds.push(s.id);
          } else {
            console.error("push send error", err?.statusCode, err?.body);
          }
        }
      })
    );

    if (expiredIds.length) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds);
    }

    return new Response(JSON.stringify({ success: true, sent, failed, expired: expiredIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("push-send error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
