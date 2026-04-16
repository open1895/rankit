import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // KST date
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    const today = kstDate.toISOString().slice(0, 10);

    // Skip if already exists
    const { data: existing } = await supabase
      .from("daily_matchups")
      .select("id")
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ skipped: true, reason: "already exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recent 7-day matchups to avoid repeat pairs
    const sevenDaysAgo = new Date(kstDate.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);
    const { data: recent } = await supabase
      .from("daily_matchups")
      .select("creator_a_id, creator_b_id")
      .gte("date", sevenDaysAgo);

    const recentPairs = new Set<string>();
    (recent || []).forEach((r: any) => {
      const k1 = `${r.creator_a_id}_${r.creator_b_id}`;
      const k2 = `${r.creator_b_id}_${r.creator_a_id}`;
      recentPairs.add(k1);
      recentPairs.add(k2);
    });

    // Pick from top 50 active creators
    const { data: creators } = await supabase
      .from("creators")
      .select("id, name")
      .order("votes_count", { ascending: false })
      .limit(50);

    if (!creators || creators.length < 2) {
      return new Response(JSON.stringify({ error: "Not enough creators" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try up to 30 random pairs
    let selected: any = null;
    for (let i = 0; i < 30; i++) {
      const a = creators[Math.floor(Math.random() * creators.length)];
      let b = creators[Math.floor(Math.random() * creators.length)];
      let tries = 0;
      while (b.id === a.id && tries < 10) {
        b = creators[Math.floor(Math.random() * creators.length)];
        tries++;
      }
      if (b.id === a.id) continue;
      const key = `${a.id}_${b.id}`;
      if (!recentPairs.has(key)) {
        selected = { a, b };
        break;
      }
    }

    if (!selected) {
      // Fallback: pick any non-same pair
      const a = creators[0];
      const b = creators[1];
      selected = { a, b };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("daily_matchups")
      .insert({
        creator_a_id: selected.a.id,
        creator_b_id: selected.b.id,
        date: today,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send push notification to all subscribers (best effort)
    try {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("user_id")
        .limit(1000);

      const uniqueUsers = Array.from(new Set((subs || []).map((s: any) => s.user_id)));
      const notifications = uniqueUsers.map((uid) => ({
        user_id: uid,
        type: "daily_matchup",
        title: "⚔️ 오늘의 라이벌 매치!",
        message: `${selected.a.name} vs ${selected.b.name} — 누가 이길까요?`,
        link: "/battle",
      }));

      if (notifications.length > 0) {
        // chunk inserts
        for (let i = 0; i < notifications.length; i += 500) {
          await supabase.from("notifications").insert(notifications.slice(i, i + 500));
        }
      }

      // Trigger push-send
      try {
        await supabase.functions.invoke("push-send", {
          body: {
            title: "⚔️ 오늘의 라이벌 매치!",
            body: `${selected.a.name} vs ${selected.b.name} — 누가 이길까요?`,
            url: "/battle",
            broadcast: true,
          },
        });
      } catch (e) { console.error("push-send error:", e); }
    } catch (e) { console.error("Notification error:", e); }

    return new Response(
      JSON.stringify({ success: true, matchup: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-daily-matchup error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
