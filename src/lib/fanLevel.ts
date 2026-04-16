export interface FanLevel {
  level: number;
  label: string;
  emoji: string;
  minPoints: number;
  color: string; // tailwind classes
  rpMultiplier: number;
  perks: string[];
}

export const FAN_LEVELS: FanLevel[] = [
  {
    level: 1,
    label: "New Fan",
    emoji: "🌱",
    minPoints: 0,
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    rpMultiplier: 1.0,
    perks: ["기본 투표", "댓글 작성"],
  },
  {
    level: 2,
    label: "Active Fan",
    emoji: "⚡",
    minPoints: 50,
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    rpMultiplier: 1.2,
    perks: ["팬클럽 채팅 참여", "RP 보너스 1.2배"],
  },
  {
    level: 3,
    label: "Super Fan",
    emoji: "🔥",
    minPoints: 200,
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    rpMultiplier: 1.5,
    perks: ["크리에이터 직접 응원 메시지", "RP 보너스 1.5배"],
  },
  {
    level: 4,
    label: "Legend Fan",
    emoji: "👑",
    minPoints: 500,
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    rpMultiplier: 2.0,
    perks: ["전용 👑 뱃지", "RP 보너스 2배", "특별 인정"],
  },
];

export interface FanActivityPoints {
  votes: number;
  posts: number;
  comments: number;
  shares?: number;
}

export const POINT_WEIGHTS = {
  vote: 3,
  post: 5,
  comment: 1,
  share: 3,
};

export function calculateFanPoints(activity: FanActivityPoints): number {
  return (
    activity.votes * POINT_WEIGHTS.vote +
    activity.posts * POINT_WEIGHTS.post +
    activity.comments * POINT_WEIGHTS.comment +
    (activity.shares || 0) * POINT_WEIGHTS.share
  );
}

export function getFanLevel(points: number): FanLevel {
  for (let i = FAN_LEVELS.length - 1; i >= 0; i--) {
    if (points >= FAN_LEVELS[i].minPoints) return FAN_LEVELS[i];
  }
  return FAN_LEVELS[0];
}

export function getFanLevelByLevel(level: number): FanLevel {
  return FAN_LEVELS.find((l) => l.level === level) ?? FAN_LEVELS[0];
}

export function getNextLevel(currentLevel: FanLevel): FanLevel | null {
  const idx = FAN_LEVELS.findIndex((l) => l.level === currentLevel.level);
  if (idx < FAN_LEVELS.length - 1) return FAN_LEVELS[idx + 1];
  return null;
}

export function getLevelProgress(points: number): { current: FanLevel; next: FanLevel | null; progress: number } {
  const current = getFanLevel(points);
  const next = getNextLevel(current);
  if (!next) return { current, next: null, progress: 100 };
  const range = next.minPoints - current.minPoints;
  const earned = points - current.minPoints;
  return { current, next, progress: Math.min(100, Math.round((earned / range) * 100)) };
}

// Permission checks for creator-specific fan level
export const FAN_PERMISSIONS = {
  CAN_FANCLUB_CHAT: 2,
  CAN_DIRECT_MESSAGE: 3,
  HAS_LEGEND_BADGE: 4,
} as const;

export function canAccessPermission(level: number, required: number): boolean {
  return level >= required;
}
