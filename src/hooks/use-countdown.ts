import { useState, useEffect } from "react";

/**
 * 월간 시즌 사이클: 매월 1일 00:00 (KST) 종료/시작
 * 이번 달 말 (= 다음 달 1일 00:00 KST) 까지 남은 시간을 반환
 */
function getNextMonthStartKST(): Date {
  const now = new Date();
  // KST(UTC+9) 기준 현재 연/월 추출
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kstNow.getUTCFullYear();
  const month = kstNow.getUTCMonth(); // 0-indexed
  // 다음 달 1일 00:00 KST = UTC로는 (다음 달 1일 - 9시간)
  // Date.UTC(year, month+1, 1, 0, 0, 0) 은 "다음 달 1일 00:00 UTC"
  // 우리는 "다음 달 1일 00:00 KST" = Date.UTC(year, month+1, 1, -9, 0, 0)
  const nextMonthStartUTC = Date.UTC(year, month + 1, 1, -9, 0, 0);
  return new Date(nextMonthStartUTC);
}

export function useCountdown() {
  const [target, setTarget] = useState(getNextMonthStartKST);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, target.getTime() - Date.now());
      if (diff === 0) {
        // 다음 달로 갱신
        setTarget(getNextMonthStartKST());
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return timeLeft;
}
