
-- Trigger: notify post owner when a comment is added to their board post
CREATE OR REPLACE FUNCTION public.notify_board_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id uuid;
  post_title text;
BEGIN
  SELECT user_id, title INTO post_owner_id, post_title
  FROM public.board_posts
  WHERE id = NEW.post_id;

  -- Only notify if the post has an owner and the commenter is not the owner
  IF post_owner_id IS NOT NULL AND (NEW.user_id IS NULL OR NEW.user_id != post_owner_id) THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      post_owner_id,
      'comment',
      '새 댓글이 달렸어요 💬',
      NEW.nickname || '님이 "' || LEFT(post_title, 20) || '" 글에 댓글을 남겼습니다.',
      '/community'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_board_comment
AFTER INSERT ON public.board_post_comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_board_comment();

-- Trigger: notify bettors when prediction event is resolved
CREATE OR REPLACE FUNCTION public.notify_prediction_resolved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bet_record RECORD;
  winner_name text;
  result_msg text;
BEGIN
  -- Only fire when status changes to 'resolved'
  IF OLD.status != 'resolved' AND NEW.status = 'resolved' AND NEW.winner_id IS NOT NULL THEN
    SELECT name INTO winner_name FROM public.creators WHERE id = NEW.winner_id;

    FOR bet_record IN
      SELECT user_id, predicted_creator_id, is_winner
      FROM public.prediction_bets
      WHERE event_id = NEW.id
    LOOP
      IF bet_record.is_winner = true THEN
        result_msg := '🎉 예측 적중! ' || COALESCE(winner_name, '') || '이(가) 승리했습니다. 보상을 확인하세요!';
      ELSE
        result_msg := '아쉽게도 예측이 빗나갔어요. ' || COALESCE(winner_name, '') || '이(가) 최종 승리!';
      END IF;

      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        bet_record.user_id,
        'prediction',
        '예측 결과 발표 🎯',
        result_msg,
        '/predictions'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_prediction_resolved
AFTER UPDATE ON public.prediction_events
FOR EACH ROW
EXECUTE FUNCTION public.notify_prediction_resolved();
