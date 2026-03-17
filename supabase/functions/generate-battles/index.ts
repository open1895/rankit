import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate: require service role key as Bearer token
    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get expired battles to determine winners before closing
    const { data: expiredBattles } = await supabase
      .from("battles")
      .select("id, votes_a, votes_b, creator_a_id, creator_b_id")
      .eq("status", "active")
      .lt("ends_at", new Date().toISOString());

    // Close expired battles with winner_id
    if (expiredBattles && expiredBattles.length > 0) {
      for (const battle of expiredBattles) {
        const winnerId = battle.votes_a > battle.votes_b
          ? battle.creator_a_id
          : battle.votes_b > battle.votes_a
            ? battle.creator_b_id
            : null; // tie = no winner
        await supabase
          .from("battles")
          .update({ status: "completed", winner_id: winnerId })
          .eq("id", battle.id);
      }
    }

    // Check how many active battles exist
    const { data: activeBattles } = await supabase
      .from("battles")
      .select("id, creator_a_id, creator_b_id")
      .eq("status", "active");

    const activeCount = activeBattles?.length || 0;
    const needed = Math.max(0, 3 - activeCount);

    if (needed === 0) {
      return new Response(JSON.stringify({ message: "Already have enough active battles", count: activeCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all creators with their scores
    const { data: creators } = await supabase
      .from("creators")
      .select("id, name, category, rankit_score, votes_count")
      .order("rankit_score", { ascending: false });

    if (!creators || creators.length < 2) {
      return new Response(JSON.stringify({ message: "Not enough creators" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get existing active battle pairs to avoid duplicates
    const existingPairs = new Set(
      (activeBattles || []).map(b => [b.creator_a_id, b.creator_b_id].sort().join("-"))
    );

    const newBattles = [];

    // Group by category for better matchups
    const byCategory: Record<string, typeof creators> = {};
    for (const c of creators) {
      const cat = c.category || "기타";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(c);
    }

    const categories = Object.keys(byCategory).filter(k => byCategory[k].length >= 2);

    for (let i = 0; i < needed && categories.length > 0; i++) {
      // Pick a random category
      const catIdx = Math.floor(Math.random() * categories.length);
      const cat = categories[catIdx];
      const pool = byCategory[cat];

      // Sort by score and pick close pairs
      pool.sort((a, b) => (b.rankit_score || 0) - (a.rankit_score || 0));

      let found = false;
      for (let j = 0; j < pool.length - 1 && !found; j++) {
        const a = pool[j];
        const b = pool[j + 1];
        const pairKey = [a.id, b.id].sort().join("-");

        if (!existingPairs.has(pairKey)) {
          existingPairs.add(pairKey);
          newBattles.push({
            creator_a_id: a.id,
            creator_b_id: b.id,
            category: cat,
            featured: i === 0 && activeCount === 0,
          });
          // Remove used creators from pool
          pool.splice(j, 2);
          found = true;
        }
      }

      // If no pair found in this category, remove it
      if (!found) {
        categories.splice(catIdx, 1);
      }
    }

    // If we still need more, use cross-category with similar scores
    if (newBattles.length < needed) {
      const remaining = creators.filter(c =>
        !newBattles.some(b => b.creator_a_id === c.id || b.creator_b_id === c.id)
      );

      for (let i = newBattles.length; i < needed && remaining.length >= 2; i++) {
        const idx = Math.floor(Math.random() * (remaining.length - 1));
        const a = remaining[idx];
        const b = remaining[idx + 1];
        const pairKey = [a.id, b.id].sort().join("-");

        if (!existingPairs.has(pairKey)) {
          existingPairs.add(pairKey);
          newBattles.push({
            creator_a_id: a.id,
            creator_b_id: b.id,
            category: a.category || b.category || '크로스',
            featured: newBattles.length === 0 && activeCount === 0,
          });
          remaining.splice(idx, 2);
        }
      }
    }

    if (newBattles.length > 0) {
      await supabase.from("battles").insert(newBattles);
    }

    return new Response(JSON.stringify({ message: `Generated ${newBattles.length} new battles`, battles: newBattles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: true, message: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
