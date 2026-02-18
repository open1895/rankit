import { useState, useEffect } from "react";
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

const FanMarquee = () => {
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
      .channel("fan-marquee")
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

  if (comments.length === 0) return null;

  const marqueeItems = [...comments, ...comments];

  return (
    <div className="glass border-b border-glass-border/30 overflow-hidden">
      <div className="container max-w-lg mx-auto">
        <div className="flex items-center gap-2 py-2 px-4">
          <div className="flex items-center gap-1.5 shrink-0">
            <MessageCircle className="w-3.5 h-3.5 text-neon-cyan" />
            <span className="text-[10px] font-bold text-neon-cyan whitespace-nowrap">팬들의 한마디</span>
          </div>
          <div className="overflow-hidden flex-1 relative">
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[hsl(var(--glass))] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[hsl(var(--glass))] to-transparent z-10 pointer-events-none" />
            
            <div className="flex gap-4 animate-marquee">
              {marqueeItems.map((comment, i) => (
                <div
                  key={`${comment.id}-${i}`}
                  className="flex items-center gap-1.5 text-[11px] whitespace-nowrap shrink-0"
                >
                  <span className="text-neon-cyan font-semibold">
                    [{comment.creator_name}]
                  </span>
                  <FanBadge voteCount={comment.vote_count} postCount={comment.post_count} />
                  <span className="text-foreground/80">
                    {comment.message.length > 20
                      ? comment.message.slice(0, 20) + "…"
                      : comment.message}
                  </span>
                  <span className="text-muted-foreground/60 text-[10px]">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      locale: ko,
                      addSuffix: true,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FanMarquee;
