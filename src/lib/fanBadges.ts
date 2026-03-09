import type { FanActivityPoints } from "@/lib/fanLevel";

export interface FanAchievementBadge {
  key: string;
  label: string;
  emoji: string;
  color: string;
}

const BADGES: { key: string; label: string; emoji: string; color: string; test: (a: FanActivityPoints) => boolean }[] = [
  { key: "early_adopter", label: "얼리어답터", emoji: "✨", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", test: () => false }, // Granted via DB flag, always shown separately
  { key: "top_voter", label: "Top Voter", emoji: "🗳️", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", test: (a) => a.votes >= 30 },
  { key: "top_commenter", label: "Top Commenter", emoji: "💬", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", test: (a) => a.comments >= 20 },
  { key: "early_fan", label: "Early Fan", emoji: "🌟", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", test: (a) => a.votes >= 1 && a.posts >= 1 && a.comments >= 1 },
  { key: "super_supporter", label: "Super Supporter", emoji: "🏆", color: "bg-rose-500/20 text-rose-400 border-rose-500/30", test: (a) => a.votes >= 50 && a.posts >= 10 && a.comments >= 10 },
];

export function getEarnedBadges(activity: FanActivityPoints): FanAchievementBadge[] {
  return BADGES.filter((b) => b.test(activity)).map(({ key, label, emoji, color }) => ({ key, label, emoji, color }));
}

export function getAllBadges() {
  return BADGES.map(({ key, label, emoji, color }) => ({ key, label, emoji, color }));
}
