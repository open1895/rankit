import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// Naver OAuth callback: exchanges code -> Naver tokens -> profile -> Supabase session.
// Then redirects the user back to the SPA with #access_token=... so the client can persist the session.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const NAVER_CLIENT_ID = Deno.env.get("NAVER_CLIENT_ID");
  const NAVER_CLIENT_SECRET = Deno.env.get("NAVER_CLIENT_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response("Naver OAuth not configured", { status: 500 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const naverError = url.searchParams.get("error");

  // Default SPA origin: try Origin/Referer, fallback to rankit.today
  const fallbackOrigin = "https://rankit.today";
  const refererOrigin = (() => {
    const ref = req.headers.get("referer");
    if (!ref) return null;
    try { return new URL(ref).origin; } catch { return null; }
  })();

  let returnTo = "/";
  let spaOrigin = refererOrigin || fallbackOrigin;
  if (state) {
    try {
      const parsed = JSON.parse(atob(state));
      if (typeof parsed?.r === "string") returnTo = parsed.r;
    } catch { /* ignore */ }
  }

  const buildRedirect = (hash: string) => {
    const target = new URL(returnTo, spaOrigin);
    target.hash = hash;
    return Response.redirect(target.toString(), 302);
  };

  if (naverError || !code) {
    return buildRedirect(`naver_error=${encodeURIComponent(naverError || "no_code")}`);
  }

  try {
    // 1) Exchange code -> Naver access token
    const tokenRes = await fetch("https://nid.naver.com/oauth2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: NAVER_CLIENT_ID,
        client_secret: NAVER_CLIENT_SECRET,
        code,
        state: state || "",
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error("Naver token exchange failed", tokenJson);
      return buildRedirect(`naver_error=${encodeURIComponent("token_exchange_failed")}`);
    }

    // 2) Fetch Naver profile
    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const profileJson = await profileRes.json();
    if (!profileRes.ok || profileJson.resultcode !== "00") {
      console.error("Naver profile fetch failed", profileJson);
      return buildRedirect(`naver_error=${encodeURIComponent("profile_fetch_failed")}`);
    }
    const naverUser = profileJson.response;
    const naverId: string = naverUser.id;
    const email: string = naverUser.email || `naver_${naverId}@users.rankit.local`;
    const displayName: string = naverUser.nickname || naverUser.name || "네이버 사용자";
    const avatarUrl: string | undefined = naverUser.profile_image;

    // 3) Find or create Supabase user
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let userId: string | null = null;

    // Try to find existing user by email
    const { data: existing, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) {
      console.error("listUsers failed", listErr);
    } else {
      const match = existing.users.find(
        (u) =>
          u.email?.toLowerCase() === email.toLowerCase() ||
          u.user_metadata?.naver_id === naverId,
      );
      if (match) userId = match.id;
    }

    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          provider: "naver",
          naver_id: naverId,
          full_name: displayName,
          avatar_url: avatarUrl,
        },
      });
      if (createErr || !created.user) {
        console.error("createUser failed", createErr);
        return buildRedirect(`naver_error=${encodeURIComponent("user_create_failed")}`);
      }
      userId = created.user.id;
    } else {
      // Update metadata to keep nickname/avatar fresh
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: {
          provider: "naver",
          naver_id: naverId,
          full_name: displayName,
          avatar_url: avatarUrl,
        },
      });
    }

    // 4) Generate a magic link and parse out tokens to redirect into the SPA
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: spaOrigin },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      console.error("generateLink failed", linkErr);
      return buildRedirect(`naver_error=${encodeURIComponent("session_failed")}`);
    }

    // Follow the action link with redirect: 'manual' to capture the final hash containing tokens
    const verifyUrl = linkData.properties.action_link;
    const verifyRes = await fetch(verifyUrl, { redirect: "manual" });
    const location = verifyRes.headers.get("location");
    if (!location) {
      console.error("verify link returned no location", verifyRes.status);
      return buildRedirect(`naver_error=${encodeURIComponent("session_failed")}`);
    }

    // location looks like: <spaOrigin>/#access_token=...&refresh_token=...
    const hashIdx = location.indexOf("#");
    const hash = hashIdx >= 0 ? location.substring(hashIdx + 1) : "";
    if (!hash.includes("access_token")) {
      console.error("verify link missing access_token", location);
      return buildRedirect(`naver_error=${encodeURIComponent("session_failed")}`);
    }

    return buildRedirect(`${hash}&provider=naver`);
  } catch (e) {
    console.error("naver-auth-callback error", e);
    return buildRedirect(`naver_error=${encodeURIComponent("unexpected_error")}`);
  }
});
