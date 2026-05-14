// Periodic YouTube channel health validator
// Modes:
//   POST { mode: "cron" }      → batch process oldest checks (default 200)
//   POST { mode: "all" }       → force re-check all creators
//   POST { creator_ids: [...] }→ check specific creators
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

const YT_KEY = Deno.env.get('YOUTUBE_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET')

type CheckResult = {
  status:
    | 'ok'
    | 'channel_not_found'
    | 'handle_not_found'
    | 'fake_id'
    | 'no_channel_info'
    | 'api_error'
    | 'unknown'
  reason?: string
  http_status?: number
  resolved_channel_id?: string | null
}

function isValidUcId(id?: string | null): boolean {
  if (!id) return false
  return /^UC[A-Za-z0-9_-]{22}$/.test(id)
}

function extractHandle(channel_link?: string | null): string | null {
  if (!channel_link) return null
  const m = channel_link.match(/@([A-Za-z0-9._-]+)/)
  return m ? m[1] : null
}

async function checkById(channelId: string): Promise<CheckResult> {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=id&id=${encodeURIComponent(channelId)}&key=${YT_KEY}`
  const r = await fetch(url)
  if (!r.ok) return { status: 'api_error', http_status: r.status, reason: `channels.list ${r.status}` }
  const j = await r.json()
  if (Array.isArray(j.items) && j.items.length > 0) {
    return { status: 'ok', resolved_channel_id: channelId }
  }
  return { status: 'channel_not_found', reason: 'channelId returned 0 items' }
}

async function checkByHandle(handle: string): Promise<CheckResult> {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=@${encodeURIComponent(handle)}&key=${YT_KEY}`
  const r = await fetch(url)
  if (!r.ok) return { status: 'api_error', http_status: r.status, reason: `forHandle ${r.status}` }
  const j = await r.json()
  if (Array.isArray(j.items) && j.items.length > 0) {
    return { status: 'ok', resolved_channel_id: j.items[0].id }
  }
  return { status: 'handle_not_found', reason: `@${handle} returned 0 items` }
}

async function validateCreator(c: {
  id: string
  youtube_channel_id?: string | null
  channel_link?: string | null
}): Promise<CheckResult> {
  const handle = extractHandle(c.channel_link)
  const ytId = c.youtube_channel_id?.trim() || null

  // 1) youtube_channel_id가 진짜 UC 형식이면 그걸로 검증
  if (isValidUcId(ytId)) {
    const r = await checkById(ytId!)
    if (r.status === 'ok') return r
    // UC 형식인데도 죽은 경우 → 핸들로 폴백
    if (handle) {
      const h = await checkByHandle(handle)
      if (h.status === 'ok') return h
      return { status: 'channel_not_found', reason: 'UC id dead, handle dead' }
    }
    return r
  }

  // 2) youtube_channel_id가 fake (UC 형식 아님) → 핸들로만 검증
  if (handle) {
    const h = await checkByHandle(handle)
    if (h.status === 'ok') {
      return { ...h, reason: ytId ? 'fake UC id but handle alive' : 'handle alive' }
    }
    return { status: ytId ? 'fake_id' : 'handle_not_found', reason: h.reason }
  }

  return { status: 'no_channel_info', reason: 'no UC id and no handle' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // 인증: cron secret 또는 admin JWT
  const cronHeader = req.headers.get('x-cron-secret')
  const authHeader = req.headers.get('authorization') || ''
  const isCron = CRON_SECRET && cronHeader === CRON_SECRET

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  if (!isCron) {
    // admin 체크
    const token = authHeader.replace('Bearer ', '')
    if (!token) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: userData } = await supabase.auth.getUser(token)
    const userId = userData?.user?.id
    if (!userId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()
    if (!roleRow) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let body: any = {}
  try { body = await req.json() } catch { /* empty */ }
  const mode: 'cron' | 'all' | 'ids' = body.creator_ids?.length ? 'ids' : (body.mode === 'all' ? 'all' : 'cron')
  const batchSize = Math.min(Number(body.batch_size) || 200, 500)

  // 대상 크리에이터 선정
  let creators: any[] = []
  if (mode === 'ids') {
    const { data } = await supabase
      .from('creators')
      .select('id, name, channel_link, youtube_channel_id')
      .in('id', body.creator_ids)
    creators = data || []
  } else if (mode === 'all') {
    const { data } = await supabase
      .from('creators')
      .select('id, name, channel_link, youtube_channel_id')
      .limit(batchSize)
    creators = data || []
  } else {
    // cron: 미검사 우선, 그다음 오래된 순
    const { data: unchecked } = await supabase
      .rpc('exec_sql_dummy_placeholder' as any, {})
      .select('*')
      .limit(0)
    void unchecked
    // 1) 아직 health 행이 없는 크리에이터
    const { data: healthRows } = await supabase
      .from('creator_youtube_health')
      .select('creator_id')
    const knownIds = new Set((healthRows || []).map((h: any) => h.creator_id))
    const { data: allCreators } = await supabase
      .from('creators')
      .select('id, name, channel_link, youtube_channel_id')
    const newOnes = (allCreators || []).filter((c: any) => !knownIds.has(c.id))
    if (newOnes.length >= batchSize) {
      creators = newOnes.slice(0, batchSize)
    } else {
      // 부족분 → 오래된 health 순
      const need = batchSize - newOnes.length
      const { data: stale } = await supabase
        .from('creator_youtube_health')
        .select('creator_id')
        .order('checked_at', { ascending: true })
        .limit(need)
      const staleIds = (stale || []).map((s: any) => s.creator_id)
      const staleCreators = (allCreators || []).filter((c: any) => staleIds.includes(c.id))
      creators = [...newOnes, ...staleCreators]
    }
  }

  const results = { checked: 0, ok: 0, problems: 0, errors: 0 }
  const problems: any[] = []

  for (const c of creators) {
    results.checked++
    let r: CheckResult
    try {
      r = await validateCreator(c)
    } catch (e: any) {
      r = { status: 'api_error', reason: e?.message || 'unknown' }
    }

    // 기존 health 행 조회 (consecutive_failures 누적용)
    const { data: prev } = await supabase
      .from('creator_youtube_health')
      .select('consecutive_failures, last_ok_at, notified_at, status')
      .eq('creator_id', c.id)
      .maybeSingle()

    const isOk = r.status === 'ok'
    const consecutive = isOk ? 0 : (prev?.consecutive_failures || 0) + 1

    await supabase.from('creator_youtube_health').upsert({
      creator_id: c.id,
      status: r.status,
      reason: r.reason || null,
      http_status: r.http_status || null,
      checked_at: new Date().toISOString(),
      consecutive_failures: consecutive,
      last_ok_at: isOk ? new Date().toISOString() : (prev?.last_ok_at || null),
      notified_at: isOk ? null : prev?.notified_at || null,
    })

    if (isOk) {
      results.ok++
    } else if (r.status === 'api_error') {
      results.errors++
    } else {
      results.problems++
      problems.push({ id: c.id, name: c.name, status: r.status, reason: r.reason })
    }

    // YouTube API rate-limit 보호
    await new Promise((res) => setTimeout(res, 30))
  }

  // 신규 문제 크리에이터 → 관리자에게 알림 (notified_at 미발송 + 2회 이상 연속 실패 시)
  if (problems.length > 0) {
    const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role', 'admin')
    const adminIds = (admins || []).map((a: any) => a.user_id)
    if (adminIds.length > 0) {
      const { data: toNotify } = await supabase
        .from('creator_youtube_health')
        .select('creator_id, consecutive_failures, notified_at')
        .in('creator_id', problems.map((p) => p.id))
        .gte('consecutive_failures', 2)
        .is('notified_at', null)

      if (toNotify && toNotify.length > 0) {
        const idMap = new Map(problems.map((p) => [p.id, p]))
        const notifications = []
        for (const t of toNotify) {
          const p = idMap.get(t.creator_id)
          if (!p) continue
          for (const adminId of adminIds) {
            notifications.push({
              user_id: adminId,
              type: 'system',
              title: '⚠️ YouTube 채널 연결 오류',
              message: `${p.name} 크리에이터의 YouTube 채널이 ${t.consecutive_failures}회 연속 검증 실패 (${p.status})`,
              link: '/admin-panel?tab=youtubeHealth',
            })
          }
        }
        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications)
          await supabase
            .from('creator_youtube_health')
            .update({ notified_at: new Date().toISOString() })
            .in('creator_id', toNotify.map((t: any) => t.creator_id))
        }
      }
    }
  }

  return new Response(JSON.stringify({ ...results, problems: problems.slice(0, 50) }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
