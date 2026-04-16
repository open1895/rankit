-- 크리에이터 마일스톤 알림 트래킹 테이블
CREATE TABLE public.creator_milestone_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL, -- 'top_1', 'top_10', 'top_50', 'top_100'
  rank_at_notification INTEGER NOT NULL,
  votes_at_notification INTEGER NOT NULL DEFAULT 0,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(creator_id, milestone_type)
);

-- 주간 빈도 제한 조회 인덱스
CREATE INDEX idx_milestone_notif_creator_sent 
ON public.creator_milestone_notifications(creator_id, sent_at DESC);

-- RLS 활성화
ALTER TABLE public.creator_milestone_notifications ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회 가능 (서비스 롤은 RLS 우회)
CREATE POLICY "Admins can view milestone notifications"
ON public.creator_milestone_notifications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));