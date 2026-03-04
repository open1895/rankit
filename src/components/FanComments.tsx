import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import AICommentSummary from "@/components/AICommentSummary";
import { MessageCircle, Heart } from "lucide-react";
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

const MAX_VISIBLE = 10;

const AVATAR_COLORS = [
  "from-purple-500 to-cyan-500",
  "from-pink-500 to-orange-500",
  "from-green-500 to-teal-500",
  "from-blue-500 to-indigo-500",
  "from-red-500 to-pink-500",
];

const getAvatarColor = (nickname: string) => {
  const hash = nickname.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const CARD_HEIGHT = 88; // px per card + gap
const GAP = 8;

const FanComments = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, creators(name)")
        .order("created_at", { ascending: false })
        .limit(MAX_VISIBLE);

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
      .channel("fan-comments-live")
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

          setComments((prev) => [enriched, ...prev].slice(0, MAX_VISIBLE));
          setNewIds((prev) => new Set(prev).add(enriched.id));

          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev);
              next.delete(enriched.id);
              return next;
            });
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-scroll animation
  useEffect(() => {
    if (comments.length === 0) return;
    const track = trackRef.current;
    if (!track) return;

    const SPEED = 0.7;
    const totalHeight = comments.length * (CARD_HEIGHT + GAP);

    const animate = () => {
      if (!pausedRef.current && track) {
        posRef.current += SPEED;
        if (posRef.current >= totalHeight) {
          posRef.current = 0;
        }
        track.style.transform = `translateY(-${posRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [comments]);

  if (comments.length === 0) {
    return (
      <div className="glass rounded-2xl p-5 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <MessageCircle className="w-4 h-4" />
          <span>아직 응원 메시지가 없습니다. 첫 번째를 남겨보세요!</span>
        </div>
      </div>
    );
  }

  // Duplicate for seamless loop
  const items = [...comments, ...comments];

  return (
    <div className="space-y-3">
      <AICommentSummary />
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

      <div
        className="overflow-hidden"
        style={{ height: `${Math.min(comments.length, 4) * (CARD_HEIGHT + GAP)}px` }}
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
        onTouchStart={() => { pausedRef.current = true; }}
        onTouchEnd={() => { pausedRef.current = false; }}
      >
        <div
          ref={trackRef}
          className="space-y-2"
          style={{ willChange: "transform" }}
        >
          {items.map((comment, idx) => {
            const isNew = newIds.has(comment.id);
            return (
              <div
                key={`${comment.id}-${idx}`}
                className={`glass-sm rounded-2xl px-3.5 py-3 transition-all duration-200 cursor-default ${
                  isNew
                    ? "border-neon-cyan/40 shadow-[0_0_16px_rgba(0,255,255,0.12)]"
                    : "hover:scale-[1.02] hover:border-neon-cyan/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.2)]"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarColor(comment.nickname)} flex items-center justify-center shrink-0 text-[10px] font-bold text-white`}
                  >
                    {comment.nickname.slice(0, 1)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-foreground">{comment.nickname}</span>
                      <span className="text-[10px] text-neon-cyan font-medium bg-neon-cyan/10 px-1.5 py-0.5 rounded-full border border-neon-cyan/20">
                        {comment.creator_name}
                      </span>
                      {isNew && (
                        <span className="text-[9px] font-bold text-neon-red bg-neon-red/10 px-1.5 py-0.5 rounded-full border border-neon-red/20 animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground/85 mt-0.5 leading-relaxed">{comment.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { locale: ko, addSuffix: true })}
                      </span>
                      <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Heart className="w-2.5 h-2.5" />
                        <span>{comment.vote_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FanComments;
