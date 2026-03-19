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
    const body = await req.json();
    const { action, creator_id } = body;

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

    if (existingCreator && action !== "generate_code" && action !== "submit_code_claim") {
      return new Response(
        JSON.stringify({ error: "이미 연동된 크리에이터가 있습니다.", existing_creator: existingCreator.name }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the target creator exists
    const { data: targetCreator, error: fetchError } = await adminClient
      .from("creators")
      .select("id, name, user_id, channel_link, youtube_channel_id, chzzk_channel_id, verification_status")
      .eq("id", creator_id)
      .single();

    if (fetchError || !targetCreator) {
      return new Response(
        JSON.stringify({ error: "크리에이터를 찾을 수 없습니다." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetCreator.user_id && targetCreator.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "이미 다른 계정에 연동된 크리에이터입니다." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === SUBMIT CLAIM REQUEST (new simple form) ===
    if (action === "submit_claim_request") {
      const { applicant_name, contact_email, instagram_handle, youtube_channel, claim_message } = body;

      // Validate inputs
      if (!applicant_name || typeof applicant_name !== "string" || applicant_name.trim().length < 2 || applicant_name.trim().length > 50) {
        return new Response(
          JSON.stringify({ error: "이름은 2~50자로 입력해주세요." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!contact_email || typeof contact_email !== "string" || !contact_email.includes("@") || contact_email.length > 255) {
        return new Response(
          JSON.stringify({ error: "유효한 이메일 주소를 입력해주세요." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if already pending
      if (targetCreator.verification_status === "pending") {
        return new Response(
          JSON.stringify({ error: "이미 인증 심사가 진행 중입니다." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (targetCreator.verification_status === "verified") {
        return new Response(
          JSON.stringify({ error: "이미 인증된 크리에이터입니다." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update creator with claim request data
      const { error: updateError } = await adminClient
        .from("creators")
        .update({
          user_id: userId,
          verification_status: "pending",
          contact_email: (contact_email || "").trim().slice(0, 255),
          instagram_handle: (instagram_handle || "").trim().slice(0, 100),
          claim_message: (claim_message || "").trim().slice(0, 500),
        })
        .eq("id", creator_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "신청에 실패했습니다." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Notify admins
      const { data: adminRoles } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const notifications = adminRoles.map((r: any) => ({
          user_id: r.user_id,
          type: "claim_request",
          title: "🔔 크리에이터 인증 요청",
          message: `${applicant_name.trim()}님이 "${targetCreator.name}" 프로필 인증을 요청했습니다.`,
          link: "/admin-panel",
        }));
        await adminClient.from("notifications").insert(notifications);
      }

      return new Response(
        JSON.stringify({ success: true, message: "인증 신청이 접수되었습니다! 관리자 심사 후 결과를 알려드립니다." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === GENERATE VERIFICATION CODE ===
    if (action === "generate_code") {
      if (existingCreator) {
        return new Response(
          JSON.stringify({ error: "이미 연동된 크리에이터가 있습니다.", existing_creator: existingCreator.name }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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

    // === SUBMIT CODE-BASED CLAIM (goes to admin review) ===
    if (action === "submit_code_claim") {
      const { verification_code, verify_method } = body;
      if (!verification_code || typeof verification_code !== "string" || verification_code.length < 10) {
        return new Response(
          JSON.stringify({ error: "유효한 인증 코드가 필요합니다." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!verification_code.startsWith("RANKIT-")) {
        return new Response(
          JSON.stringify({ error: "잘못된 인증 코드 형식입니다." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (targetCreator.verification_status === "pending") {
        return new Response(
          JSON.stringify({ error: "이미 인증 심사가 진행 중입니다." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (targetCreator.verification_status === "verified") {
        return new Response(
          JSON.stringify({ error: "이미 인증된 크리에이터입니다." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const methodLabel = verify_method === "social" ? "SNS 게시" : "채널 설명";

      // Set to pending for admin review — do NOT auto-verify
      const { error: updateError } = await adminClient
        .from("creators")
        .update({
          user_id: userId,
          verification_status: "pending",
          claim_message: `[코드 인증 - ${methodLabel}] 코드: ${verification_code.slice(0, 30)}`,
        })
        .eq("id", creator_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "신청에 실패했습니다." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Notify admins
      const { data: adminRoles } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const notifications = adminRoles.map((r: any) => ({
          user_id: r.user_id,
          type: "claim_request",
          title: "🔔 크리에이터 코드 인증 요청",
          message: `"${targetCreator.name}" 프로필에 대한 코드 인증(${methodLabel}) 요청이 접수되었습니다.`,
          link: "/admin-panel",
        }));
        await adminClient.from("notifications").insert(notifications);
      }

      return new Response(
        JSON.stringify({ success: true, message: "인증 요청이 접수되었습니다! 관리자가 SNS/채널에서 코드를 확인 후 승인합니다." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "알 수 없는 액션입니다." }),
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
