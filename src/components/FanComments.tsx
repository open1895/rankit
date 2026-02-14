import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import FanBadge from "./FanBadge";

interface Comment {
  id: string;
  nickname: string;
  message: string;
  vote_count: number;
  post_count: number;
  created_at: string;
  creator_name?: string;
}

const FanComments = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, creators(name)")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error && data) {
        setComments(
          data.map((c: any) => ({
            ...c,
            creator_name: c.creators?.name || "알 수 없음",
          }))
        );
      }
    };

    fetchComments();

    const channel = supabase
      .channel("fan-comments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        async (payload) => {
          const newComment = payload.new as any;
          // Fetch creator name
          const { data } = await supabase
            .from("creators")
            .select("name")
            .eq("id", newComment.creator_id)
            .single();

          const enriched: Comment = {
            ...newComment,
            creator_name: data?.name || "알 수 없음",
          };

          setComments((prev) => [enriched, ...prev].slice(0, 5));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (comments.length === 0) {
    return (
      <div className="glass p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <MessageCircle className="w-4 h-4" />
          <span>아직 응원 메시지가 없습니다. 첫 번째 응원을 남겨보세요!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <MessageCircle className="w-4 h-4 text-neon-cyan" />
        <h3 className="text-sm font-semibold gradient-text">실시간 팬들의 한마디</h3>
      </div>

      <div ref={scrollRef} className="glass p-3 space-y-2 overflow-hidden relative">
        {comments.map((comment, i) => (
          <div
            key={comment.id}
            className="animate-slide-up glass-sm px-3 py-2 flex items-center gap-2 text-xs"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="text-neon-cyan font-semibold shrink-0">
              [{comment.creator_name}]
            </span>
            <FanBadge voteCount={comment.vote_count} postCount={comment.post_count} />
            <span className="truncate text-foreground/90 flex-1">
              {comment.message.length > 20
                ? comment.message.slice(0, 20) + "…"
                : comment.message}
            </span>
            <span className="text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(comment.created_at), {
                locale: ko,
                addSuffix: true,
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FanComments;
