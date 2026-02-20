
## 이번 주 혜택 배너에 D-N 카운트다운 추가

### 현재 상황
- `src/pages/Index.tsx`의 "이번 주 혜택" 배너는 현재 아이콘+텍스트 pill만 표시
- `src/hooks/use-countdown.ts`에 이미 `useCountdown()` 훅이 구현되어 있어 `{ days, hours, minutes, seconds }` 반환
- `Index.tsx`에 이미 `CountdownTimer` 컴포넌트를 import하고 있음

### 변경 계획

**파일: `src/pages/Index.tsx`**

1. `useCountdown` 훅을 import 추가
2. "이번 주 혜택" 배너 우측에 D-N 카운트다운 칩 추가

```
🎁 이번 주 혜택          D-3 ⏰
[ 🏆 1위 팬 100명 추첨 ] [ 👑 활동왕 뱃지 ] [ ⭐ 시즌 MVP ]
```

### 표시 로직

- `days > 0` → `D-{days}` 표시 (예: D-3)
- `days === 0` → `오늘 마감 🔥` 표시 (긴박감 강조)
- 뱃지 스타일: 작은 pill 형태, 빨간/주황 강조색

### 수정 범위

- `src/pages/Index.tsx` 1개 파일만 수정
  - `useCountdown` import 추가
  - 배너 헤더 행에 D-N 칩 추가
