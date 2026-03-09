import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CreatorAnnouncementProps {
  creatorId: string;
  creatorName: string;
}

const CreatorAnnouncement = ({ creatorId, creatorName }: CreatorAnnouncementProps) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 2 || trimmed.length > 500) {
      toast.error("공지는 2~500자로 작성해주세요.");
      return;
    }

    setSending(true);
    try {
      // Post as official feed
      const { error } = await supabase.from("creator_feed_posts").insert({
        creator_id: creatorId,
        content: `📢 [공지] ${trimmed}`,
        image_url: "",
      });

      if (error) throw error;
      toast.success("팬들에게 공지가 발송되었습니다! 📢");
      setMessage("");
    } catch {
      toast.error("공지 발송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass p-4 rounded-xl space-y-3 border border-primary/10">
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4" style={{ color: "hsl(var(--neon-purple))" }} />
        <span className="text-xs font-bold">팬 공지 보내기</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{
          background: "hsl(var(--neon-purple) / 0.15)",
          color: "hsl(var(--neon-purple))",
        }}>
          Verified Only
        </span>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="팬들에게 전달할 공지를 작성하세요..."
        className="w-full rounded-xl glass-sm bg-card/30 text-sm text-foreground placeholder:text-muted-foreground p-3 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
      />

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{message.length}/500</span>
        <Button
          onClick={handleSend}
          disabled={sending || message.trim().length < 2}
          size="sm"
          className="gradient-primary text-primary-foreground font-bold text-xs gap-1.5"
        >
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          공지 발송
        </Button>
      </div>
    </div>
  );
};

export default CreatorAnnouncement;
