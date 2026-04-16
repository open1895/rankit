import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MILESTONES: Array<{ type: string; threshold: number }> = [
  { type: 'top_1', threshold: 1 },
  { type: 'top_10', threshold: 10 },
  { type: 'top_50', threshold: 50 },
  { type: 'top_100', threshold: 100 },
]

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const cronSecret = Deno.env.get('CRON_SECRET')

  // CRON 인증 (선택적 — 헤더가 있으면 검증)
  const authHeader = req.headers.get('x-cron-secret')
  if (cronSecret && authHeader !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // 1. TOP 100 안에 있는 크리에이터 중 contact_email이 있는 사람만 조회
  const { data: creators, error: creatorsError } = await supabase
    .from('creators')
    .select('id, name, rank, votes_count, contact_email')
    .lte('rank', 100)
    .not('contact_email', 'is', null)
    .order('rank', { ascending: true })

  if (creatorsError) {
    console.error('Failed to fetch creators', creatorsError)
    return new Response(JSON.stringify({ error: 'fetch_failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!creators?.length) {
    return new Response(JSON.stringify({ processed: 0, sent: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  let skipped = 0
  const now = Date.now()

  for (const creator of creators) {
    if (!creator.contact_email) continue

    // 적용 가능한 가장 높은 마일스톤 찾기 (rank 1이면 top_1, 5면 top_10 등)
    const eligible = MILESTONES.find((m) => creator.rank <= m.threshold)
    if (!eligible) continue

    // 이미 이 마일스톤에 대한 알림 발송 이력이 있는지 확인 (unique 제약)
    const { data: existing } = await supabase
      .from('creator_milestone_notifications')
      .select('id')
      .eq('creator_id', creator.id)
      .eq('milestone_type', eligible.type)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    // 주간 빈도 제한: 이 크리에이터에게 최근 7일 내 발송된 알림이 있으면 스킵
    const { data: recent } = await supabase
      .from('creator_milestone_notifications')
      .select('sent_at')
      .eq('creator_id', creator.id)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recent?.sent_at) {
      const ageMs = now - new Date(recent.sent_at).getTime()
      if (ageMs < ONE_WEEK_MS) {
        skipped++
        continue
      }
    }

    // 이메일 발송 — send-transactional-email 호출
    try {
      const { error: invokeError } = await supabase.functions.invoke(
        'send-transactional-email',
        {
          body: {
            templateName: 'creator-milestone',
            recipientEmail: creator.contact_email,
            idempotencyKey: `milestone-${creator.id}-${eligible.type}`,
            templateData: {
              creatorName: creator.name,
              milestoneType: eligible.type,
              rank: creator.rank,
              votes: creator.votes_count,
              creatorId: creator.id,
            },
          },
        }
      )

      if (invokeError) {
        console.error('Failed to send milestone email', {
          creator_id: creator.id,
          milestone: eligible.type,
          error: invokeError,
        })
        continue
      }

      // 발송 성공 시 트래킹 테이블에 기록
      const { error: insertError } = await supabase
        .from('creator_milestone_notifications')
        .insert({
          creator_id: creator.id,
          milestone_type: eligible.type,
          rank_at_notification: creator.rank,
          votes_at_notification: creator.votes_count,
          recipient_email: creator.contact_email,
        })

      if (insertError) {
        console.error('Failed to track milestone notification', {
          creator_id: creator.id,
          error: insertError,
        })
      } else {
        sent++
      }
    } catch (err) {
      console.error('Unexpected error sending milestone email', {
        creator_id: creator.id,
        error: err,
      })
    }
  }

  return new Response(
    JSON.stringify({
      processed: creators.length,
      sent,
      skipped,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
