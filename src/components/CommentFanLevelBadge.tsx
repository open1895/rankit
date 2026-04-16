import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getFanLevelByLevel } from "@/lib/fanLevel";

interface Props {
  nickname: string;
  creatorId?: string | null;
  size?: "xs" | "sm";
}

/**
 * Lightweight fan level badge for comment lists.
 * Resolves nickname → user_id (via profiles.display_name) → creator-scoped fan level.
 * Falls back silently when not resolvable.
 */
const CommentFanLevelBadge = ({ nickname, creatorId, size = "xs" }: Props) => {
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!nickname || !creatorId) {
      setLevel(null);
      return;
    }
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("display_name", nickname)
        .maybeSingle();
      if (!profile?.user_id || cancelled) return;
      const { data } = await (supabase.rpc as any)("get_creator_fan_level", {
        p_user_id: profile.user_id,
        p_creator_id: creatorId,
      });
      if (cancelled) return;
      if (data && data.length > 0) {
        setLevel(Number(data[0].fan_level) || 1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nickname, creatorId]);

  if (!level) return null;
  const fl = getFanLevelByLevel(level);
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-semibold border shrink-0 ${fl.color} ${
        size === "xs" ? "text-[8px] px-1 py-0" : "text-[9px] px-1.5 py-0.5"
      }`}
      title={`${fl.label} (Lv.${fl.level})`}
    >
      <span>{fl.emoji}</span>
      <span>Lv.{fl.level}</span>
    </span>
  );
};

export default CommentFanLevelBadge;
