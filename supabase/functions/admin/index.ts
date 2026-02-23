import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getAdminPassword(): string {
  return Deno.env.get("ADMIN_PANEL_PASSWORD") || "rankit1234";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...body } = await req.json();

    // ─── VERIFY PASSWORD (no auth required) ───────────────
    if (action === "verify_password") {
      const { password } = body;
      const verified = password === getAdminPassword();
      return new Response(JSON.stringify({ verified }), { headers: corsHeaders });
    }

    // ─── All other actions require JWT auth + admin role ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), { status: 403, headers: corsHeaders });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── LIST USERS ───────────────────────────────────────
    if (action === "list_users") {
      const { data: users, error } = await adminClient.auth.admin.listUsers({ perPage: 200 });
      if (error) throw error;

      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, display_name, avatar_url, created_at");

      const { data: roles } = await adminClient
        .from("user_roles")
        .select("user_id, role");

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));

      const merged = users.users.map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        display_name: profileMap.get(u.id)?.display_name || "",
        avatar_url: profileMap.get(u.id)?.avatar_url || "",
        role: roleMap.get(u.id) || "user",
      }));

      return new Response(JSON.stringify({ users: merged }), { headers: corsHeaders });
    }

    // ─── DELETE USER ──────────────────────────────────────
    if (action === "delete_user") {
      const { user_id } = body;
      if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: corsHeaders });
      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── SET ADMIN ────────────────────────────────────────
    if (action === "set_admin") {
      const { user_id, is_admin } = body;
      if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: corsHeaders });
      if (is_admin) {
        await adminClient.from("user_roles").upsert({ user_id, role: "admin" }, { onConflict: "user_id,role" });
      } else {
        await adminClient.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── UPDATE CREATOR ───────────────────────────────────
    if (action === "update_creator") {
      const { creator_id, ...updates } = body;
      if (!creator_id) return new Response(JSON.stringify({ error: "creator_id required" }), { status: 400, headers: corsHeaders });
      const { error } = await adminClient.from("creators").update(updates).eq("id", creator_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── DELETE CREATOR ───────────────────────────────────
    if (action === "delete_creator") {
      const { creator_id } = body;
      if (!creator_id) return new Response(JSON.stringify({ error: "creator_id required" }), { status: 400, headers: corsHeaders });
      const { error } = await adminClient.from("creators").delete().eq("id", creator_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── LIST CREATORS ────────────────────────────────────
    if (action === "list_creators") {
      const { data, error } = await adminClient
        .from("creators")
        .select("*")
        .order("rank", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ creators: data }), { headers: corsHeaders });
    }

    // ─── LIST NOMINATIONS ─────────────────────────────────
    if (action === "list_nominations") {
      const { data, error } = await adminClient
        .from("nominations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ nominations: data }), { headers: corsHeaders });
    }

    // ─── UPDATE NOMINATION STATUS ─────────────────────────
    if (action === "update_nomination") {
      const { nomination_id, status } = body;
      if (!nomination_id || !status) return new Response(JSON.stringify({ error: "nomination_id and status required" }), { status: 400, headers: corsHeaders });
      if (!["approved", "rejected"].includes(status)) return new Response(JSON.stringify({ error: "Invalid status" }), { status: 400, headers: corsHeaders });
      const { error } = await adminClient.from("nominations").update({ status }).eq("id", nomination_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── APPROVE NOMINATION ──────────────────────────────
    if (action === "approve_nomination") {
      const { nomination_id } = body;
      if (!nomination_id) return new Response(JSON.stringify({ error: "nomination_id required" }), { status: 400, headers: corsHeaders });

      const { data: nom, error: nomErr } = await adminClient
        .from("nominations")
        .select("*")
        .eq("id", nomination_id)
        .single();
      if (nomErr || !nom) return new Response(JSON.stringify({ error: "Nomination not found" }), { status: 404, headers: corsHeaders });

      let youtubeChannelId = "";
      const urlStr = nom.channel_url || "";
      const ytMatch = urlStr.match(/youtube\.com\/(channel\/|@|c\/)?([^\/\?\s]+)/);
      if (ytMatch) {
        const extracted = ytMatch[2];
        if (extracted.startsWith("UC")) {
          youtubeChannelId = extracted;
        }
      }

      const { data: newCreator, error: insertErr } = await adminClient
        .from("creators")
        .insert({
          name: nom.creator_name,
          channel_link: nom.channel_url,
          category: nom.category || "",
          youtube_channel_id: youtubeChannelId,
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      await adminClient.from("nominations").update({ status: "approved" }).eq("id", nomination_id);

      try {
        const statsUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/fetch-social-stats`;
        await fetch(statsUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
        });
      } catch (e) {
        console.error("Failed to trigger fetch-social-stats:", e);
      }

      return new Response(JSON.stringify({ success: true, creator_id: newCreator.id }), { headers: corsHeaders });
    }

    // ─── REJECT NOMINATION ────────────────────────────────
    if (action === "reject_nomination") {
      const { nomination_id } = body;
      if (!nomination_id) return new Response(JSON.stringify({ error: "nomination_id required" }), { status: 400, headers: corsHeaders });
      const { error } = await adminClient.from("nominations").delete().eq("id", nomination_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
