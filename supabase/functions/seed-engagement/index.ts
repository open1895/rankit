import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;

const BOARD_CATEGORIES = ["자유", "팬아트", "질문", "공략", "이벤트"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function parseJSONArray(raw: string): any[] {
  // Strip code fences if present
  const cleaned = raw.replace(/```json\s*|```\s*/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Try to extract array substring
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return [];
      }
    }
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: allow CRON_SECRET, pg_cron internal call (anon + cron:true), or admin
  const auth = req.headers.get("authorization") || "";
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  let bodyText = "";
  try { bodyText = await req.text(); } catch { /* */ }
  let parsedBody: any = {};
  try { parsedBody = bodyText ? JSON.parse(bodyText) : {}; } catch { /* */ }

  const isCron =
    auth === `Bearer ${CRON_SECRET}` ||
    (auth === `Bearer ${ANON_KEY}` && parsedBody?.cron === true);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let isAdmin = false;
  if (!isCron) {
    const token = auth.replace(/^Bearer\s+/i, "");
    if (token && token !== ANON_KEY) {
      const { data: userData } = await supabase.auth.getUser(token);
      if (userData?.user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("role", "admin")
          .maybeSingle();
        isAdmin = !!roleData;
      }
    }
  }
  if (!isCron && !isAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Check settings
    const { data: settings } = await supabase
      .from("seed_activity_settings")
      .select("enabled, daily_quota")
      .eq("id", 1)
      .maybeSingle();

    const mode = isCron ? "scheduled" : "manual";
    if (!settings?.enabled && isCron) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const quota = settings?.daily_quota ?? 20;

    // Fetch top creators (use creators_public for safety)
    const { data: creators } = await supabase
      .from("creators_public")
      .select("id, name, category")
      .order("rank", { ascending: true })
      .limit(80);

    if (!creators || creators.length === 0) {
      throw new Error("No creators found");
    }

    // Fetch nickname pool
    const { data: bots } = await supabase
      .from("seed_bot_pool")
      .select("nickname")
      .eq("is_active", true)
      .limit(60);

    const nicknames = (bots ?? []).map((b) => b.nickname);
    if (nicknames.length === 0) throw new Error("Bot pool empty");

    const details: any[] = [];
    let commentsAdded = 0;
    let fanclubAdded = 0;
    let postsAdded = 0;

    // === 1) 응원 댓글 (quota개) ===
    const commentTargets = pickN(creators, Math.min(quota, creators.length));
    const commentPrompt = `당신은 한국 크리에이터 팬 커뮤니티의 다양한 팬들입니다. 아래 크리에이터 ${commentTargets.length}명에게 자연스럽고 짧은(20~45자) 한국어 응원/감상 댓글을 1개씩 작성해주세요.

규칙:
- 각 크리에이터 카테고리(${commentTargets.map((c) => c.category).join(", ")})에 어울리는 톤 사용
- 이모지 1~2개 자연스럽게 포함
- 광고/링크/홍보 금지
- 같은 표현 반복 금지

크리에이터 목록:
${commentTargets.map((c, i) => `${i + 1}. ${c.name} (${c.category})`).join("\n")}

JSON 배열로만 응답하세요. 예: [{"name":"...","message":"..."}]`;

    try {
      const raw = await callAI(
        "당신은 한국 팬 커뮤니티 전문 카피라이터입니다. 자연스러운 짧은 응원 댓글을 작성합니다.",
        commentPrompt
      );
      const messages = parseJSONArray(raw);
      const commentRows = commentTargets.map((c, i) => {
        const m = messages.find((x) => x.name === c.name) || messages[i];
        const message = (m?.message || `${c.name}님 항상 응원해요! 💜`).slice(0, 50);
        return {
          creator_id: c.id,
          nickname: pick(nicknames),
          message,
        };
      });
      const { error } = await supabase.from("comments").insert(commentRows);
      if (error) throw error;
      commentsAdded = commentRows.length;
      details.push({ type: "comments", count: commentsAdded });
    } catch (e) {
      details.push({ type: "comments", error: String(e).slice(0, 200) });
    }

    // === 2) 팬클럽 가입 (quota개, bot_user_id가 있는 봇만) ===
    // 가상 user_id 생성: 닉네임당 deterministic uuid (실제 auth user는 만들지 않음)
    // fanclub_members.user_id는 NOT NULL이므로 가짜 UUID 사용 (인덱스/표시용)
    try {
      const fanTargets = pickN(creators, Math.min(quota, creators.length));
      const fanRows = fanTargets.map((c) => ({
        creator_id: c.id,
        // deterministic-ish uuid v4 random
        user_id: crypto.randomUUID(),
      }));
      const { error } = await supabase.from("fanclub_members").insert(fanRows);
      if (error) throw error;
      fanclubAdded = fanRows.length;
      details.push({ type: "fanclub_members", count: fanclubAdded });
    } catch (e) {
      details.push({ type: "fanclub_members", error: String(e).slice(0, 200) });
    }

    // === 3) 커뮤니티 게시글 (quota개) ===
    try {
      const postPrompt = `한국 크리에이터 팬 커뮤니티에 올릴 자연스러운 게시글 ${quota}개를 작성해주세요.

규칙:
- 카테고리는 다음 중 무작위 선택: ${BOARD_CATEGORIES.join(", ")}
- 제목: 10~40자, 자연스럽고 클릭하고 싶은 톤
- 본문: 80~250자, 친근한 한국어, 이모지 1~3개
- 광고/링크/욕설/특정 정치 종교 발언 금지
- 다양한 주제: 추천, 후기, 질문, 일상 공유 등

JSON 배열로만 응답하세요. 예: [{"category":"자유","title":"...","content":"..."}]`;

      const raw = await callAI(
        "당신은 한국 팬 커뮤니티의 활발한 회원입니다. 자연스러운 게시글을 작성합니다.",
        postPrompt
      );
      const posts = parseJSONArray(raw).slice(0, quota);
      const postRows = posts
        .filter((p) => p?.title && p?.content)
        .map((p) => ({
          title: String(p.title).slice(0, 100),
          content: String(p.content).slice(0, 2000),
          category: BOARD_CATEGORIES.includes(p.category) ? p.category : pick(BOARD_CATEGORIES),
          author: pick(nicknames),
        }));
      if (postRows.length > 0) {
        const { error } = await supabase.from("board_posts").insert(postRows);
        if (error) throw error;
        postsAdded = postRows.length;
      }
      details.push({ type: "board_posts", count: postsAdded });
    } catch (e) {
      details.push({ type: "board_posts", error: String(e).slice(0, 200) });
    }

    // 로그 저장
    await supabase.from("seed_activity_runs").insert({
      mode,
      comments_added: commentsAdded,
      fanclub_joins_added: fanclubAdded,
      board_posts_added: postsAdded,
      details,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        mode,
        commentsAdded,
        fanclubAdded,
        postsAdded,
        details,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("seed-engagement error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
