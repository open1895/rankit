// Daily 20:00 KST cron - sends vote reminder to users who haven't voted today
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cronSecret = req.headers.get("x-cron-secret");
    if (cronSecret !== Deno.env.get("CRON_SECRET")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Compute KST today start (UTC)
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const kstYear = kstNow.getUTCFullYear();
    const kstMonth = kstNow.getUTCMonth();
    const kstDay = kstNow.getUTCDate();
    const kstStartUtc = new Date(Date.UTC(kstYear, kstMonth, kstDay) - 9 * 60 * 60 * 1000);

    // Get users who voted today (KST)
    const { data: votesToday } = await supabase
      .from("votes")
      .select("user_id")
      .gte("created_at", kstStartUtc.toISOString());
    const votedSet = new Set((votesToday || []).map((v: any) => v.user_id).filter(Boolean));

    // Get all users who have push subscriptions and reminder enabled
    const { data: candidates } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("push_enabled", true)
      .eq("vote_reminder", true);

    const targetIds = (candidates || [])
      .map((c: any) => c.user_id)
      .filter((id: string) => !votedSet.has(id));

    if (!targetIds.length) {
      return new Response(JSON.stringify({ success: true, target: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert in-app notifications
    const notifs = targetIds.map((uid: string) => ({
      user_id: uid,
      type: "vote_reminder",
      title: "🗳️ 오늘 투표하셨나요?",
      message: "응원하는 크리에이터에게 한 표를 보내주세요!",
      link: "/",
    }));
    await supabase.from("notifications").insert(notifs);

    // Trigger push send (fire-and-forget)
    const pushUrl = `${supabaseUrl}/functions/v1/push-send`;
    fetch(pushUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": Deno.env.get("CRON_SECRET")!,
      },
      body: JSON.stringify({
        user_ids: targetIds,
        title: "🗳️ 오늘 투표하셨나요?",
        body: "응원하는 크리에이터에게 한 표를 보내주세요!",
        url: "/",
        tag: "vote-reminder",
        pref_key: "vote_reminder",
      }),
    }).catch((e) => console.error("push trigger failed", e));

    return new Response(JSON.stringify({ success: true, target: targetIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vote-reminder error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
