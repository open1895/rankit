
-- Add triggers to recalculate ranks when board activity happens
CREATE TRIGGER on_post_inserted
AFTER INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_ranks();

CREATE TRIGGER on_post_comment_inserted
AFTER INSERT ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_ranks();

CREATE TRIGGER on_post_like_inserted
AFTER INSERT ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_ranks();
