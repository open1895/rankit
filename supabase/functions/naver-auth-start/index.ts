import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// OAuth start: redirects user to Naver authorization page
Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const NAVER_CLIENT_ID = Deno.env.get("NAVER_CLIENT_ID");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  if (!NAVER_CLIENT_ID || !SUPABASE_URL) {
    return new Response(JSON.stringify({ error: "Naver OAuth not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  // Where to send the user back to in the SPA after we exchange the code
  const returnTo = url.searchParams.get("return_to") || "/";

  // CSRF state — also encodes the SPA return URL
  const state = btoa(JSON.stringify({ r: returnTo, n: crypto.randomUUID() }));

  const callbackUrl = `${SUPABASE_URL}/functions/v1/naver-auth-callback`;

  const naverUrl = new URL("https://nid.naver.com/oauth2.0/authorize");
  naverUrl.searchParams.set("response_type", "code");
  naverUrl.searchParams.set("client_id", NAVER_CLIENT_ID);
  naverUrl.searchParams.set("redirect_uri", callbackUrl);
  naverUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: naverUrl.toString(),
    },
  });
});
