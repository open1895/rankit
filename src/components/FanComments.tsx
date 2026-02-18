import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

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
      <div className="glass rounded-2xl p-5 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <MessageCircle className="w-4 h-4" />
          <span>아직 응원 메시지가 없습니다. 첫 번째 응원을 남겨보세요!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="w-5 h-5 rounded-md bg-neon-cyan/20 flex items-center justify-center">
          <MessageCircle className="w-3 h-3 text-neon-cyan" />
        </div>
        <h3 className="text-sm font-bold gradient-text">실시간 응원 톡</h3>
        <div className="ml-auto flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-[10px] text-green-400 font-medium">LIVE</span>
        </div>
      </div>

      <div className="glass rounded-2xl p-3 space-y-2 border border-neon-cyan/10">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="glass-sm rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 text-xs transition-all hover:border-neon-cyan/20 hover:shadow-[0_0_12px_rgba(0,255,255,0.06)]"
          >
            <span className="text-neon-cyan font-bold shrink-0">
              [{comment.creator_name}]
            </span>
            <span className="text-foreground/90 truncate flex-1">
              {comment.message.length > 20
                ? comment.message.slice(0, 20) + "…"
                : comment.message}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0 border-l border-glass-border pl-2">
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
