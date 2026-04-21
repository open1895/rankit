import { useState, useEffect } from "react";

/**
 * 하이브리드 시즌 규칙
 * - 주간 배틀: 매주 월요일 00:00 KST 마감/리셋
 * - 월간 시즌: 매월 1일 00:00 KST 마감/리셋
 */

function getNextMonthStartKST(): Date {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kstNow.getUTCFullYear();
  const month = kstNow.getUTCMonth();
  // "다음 달 1일 00:00 KST" = UTC 기준 (다음 달 1일 -9시)
  const nextMonthStartUTC = Date.UTC(year, month + 1, 1, -9, 0, 0);
  return new Date(nextMonthStartUTC);
}

function getNextMondayStartKST(): Date {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kstNow.getUTCFullYear();
  const month = kstNow.getUTCMonth();
  const date = kstNow.getUTCDate();
  // KST 요일 (0=Sun ... 6=Sat)
  const kstDay = kstNow.getUTCDay();
  // 다음 월요일까지 남은 일수 (월요일=1, 오늘이 월요일이면 7일 뒤)
  const daysUntilNextMon = ((1 - kstDay + 7) % 7) || 7;
  // "다음 월요일 00:00 KST" = UTC 기준 해당 일자 -9시
  const nextMonStartUTC = Date.UTC(year, month, date + daysUntilNextMon, -9, 0, 0);
  return new Date(nextMonStartUTC);
}

function diffParts(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    diff,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

const ZERO = { days: 0, hours: 0, minutes: 0, seconds: 0 };

/**
 * 월간 시즌 종료까지 남은 시간 (기본 export, 기존 호환성 유지)
 */
export function useCountdown() {
  const [target, setTarget] = useState(getNextMonthStartKST);
  const [timeLeft, setTimeLeft] = useState(ZERO);

  useEffect(() => {
    const tick = () => {
      const parts = diffParts(target);
      if (parts.diff === 0) {
        setTarget(getNextMonthStartKST());
      }
      setTimeLeft({
        days: parts.days,
        hours: parts.hours,
        minutes: parts.minutes,
        seconds: parts.seconds,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return timeLeft;
}

/**
 * 주간 배틀 종료까지 남은 시간 (다음 월요일 00:00 KST)
 */
export function useWeeklyCountdown() {
  const [target, setTarget] = useState(getNextMondayStartKST);
  const [timeLeft, setTimeLeft] = useState(ZERO);

  useEffect(() => {
    const tick = () => {
      const parts = diffParts(target);
      if (parts.diff === 0) {
        setTarget(getNextMondayStartKST());
      }
      setTimeLeft({
        days: parts.days,
        hours: parts.hours,
        minutes: parts.minutes,
        seconds: parts.seconds,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return timeLeft;
}

/**
 * 하이브리드: 주간 배틀 + 월간 시즌 동시 반환
 */
export function useHybridCountdown() {
  const monthly = useCountdown();
  const weekly = useWeeklyCountdown();
  return { monthly, weekly };
}
