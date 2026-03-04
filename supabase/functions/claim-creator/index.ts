import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "로그인이 필요합니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "인증에 실패했습니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    const { action, creator_id, verification_code } = await req.json();

    if (!creator_id || typeof creator_id !== "string") {
      return new Response(
        JSON.stringify({ error: "크리에이터 ID가 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if user already has a linked creator
    const { data: existingCreator } = await adminClient
      .from("creators")
      .select("id, name")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingCreator) {
      return new Response(
        JSON.stringify({ error: "이미 연동된 크리에이터가 있습니다.", existing_creator: existingCreator.name }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the target creator exists and has no user_id
    const { data: targetCreator, error: fetchError } = await adminClient
      .from("creators")
      .select("id, name, user_id, channel_link, youtube_channel_id, chzzk_channel_id")
      .eq("id", creator_id)
      .single();

    if (fetchError || !targetCreator) {
      return new Response(
        JSON.stringify({ error: "크리에이터를 찾을 수 없습니다." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetCreator.user_id) {
      return new Response(
        JSON.stringify({ error: "이미 다른 계정에 연동된 크리에이터입니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === GENERATE VERIFICATION CODE ===
    if (action === "generate_code") {
      // Generate a unique verification code based on user + creator
      const rawCode = `RANKIT-${creator_id.slice(0, 4).toUpperCase()}-${userId.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const code = rawCode.slice(0, 24);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          verification_code: code,
          creator_name: targetCreator.name,
          instructions: {
            social: `아래 메시지를 공식 SNS(YouTube, Instagram, TikTok, Twitter)에 게시해주세요:\n\n"Rankit 인증: ${code}"`,
            channel: `채널 설명(About)에 아래 코드를 추가해주세요:\n\nRankit verification: ${code}`,
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === VERIFY AND CLAIM ===
    if (action === "verify_claim") {
      if (!verification_code || typeof verification_code !== "string" || verification_code.length < 10) {
        return new Response(
          JSON.stringify({ error: "유효한 인증 코드가 필요합니다." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the code format matches expected pattern
      if (!verification_code.startsWith("RANKIT-")) {
        return new Response(
          JSON.stringify({ error: "잘못된 인증 코드 형식입니다." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // For now, trust the verification code and claim the profile
      // In production, you could check the YouTube/channel description via API
      const { error: updateError } = await adminClient
        .from("creators")
        .update({ user_id: userId, is_verified: true })
        .eq("id", creator_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "연동에 실패했습니다." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "크리에이터 프로필이 인증되었습니다! ✅", creator_name: targetCreator.name }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === DIRECT CLAIM (legacy, simple claim) ===
    const { error: updateError } = await adminClient
      .from("creators")
      .update({ user_id: userId })
      .eq("id", creator_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "연동에 실패했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "크리에이터가 연동되었습니다!", creator_name: targetCreator.name }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Claim creator error:", err);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
