
## 투표 시 인터랙션 강화 — 4가지 효과 추가

### 현재 상태 파악
- `RankingCard.tsx`: `showPlusOne` 상태로 "+1 🗳️" float 텍스트 표시 중
- `microReward`: 투표 후 간단한 텍스트 피드백 표시
- `tailwind.config.ts`: `rank-up`, `rank-down` 애니메이션 이미 존재
- 화면 진동(shake) 애니메이션은 아직 없음

---

### 변경 파일 및 내용

#### 1. `tailwind.config.ts` — shake 키프레임 추가
투표 시 카드 전체가 좌우로 흔들리는 진동 효과를 위한 keyframe과 animation 정의를 추가합니다.

```
"shake": {
  "0%, 100%": { transform: "translateX(0) rotate(0deg)" },
  "15%":       { transform: "translateX(-5px) rotate(-0.5deg)" },
  "30%":       { transform: "translateX(5px) rotate(0.5deg)" },
  "45%":       { transform: "translateX(-4px) rotate(-0.3deg)" },
  "60%":       { transform: "translateX(4px) rotate(0.3deg)" },
  "75%":       { transform: "translateX(-2px)" },
  "90%":       { transform: "translateX(2px)" },
}
animation: "shake": "shake 0.5s ease-out"
```

#### 2. `src/components/RankingCard.tsx` — 4가지 효과 적용

**① 화면 진동 효과**
- `isShaking` state 추가
- 투표 성공 시 `animate-shake` 클래스를 카드 `div`에 0.5초간 적용

**② "+1🔥" 텍스트 변경**
- 기존 `+1 🗳️` → `+1 🔥` 로 변경
- 텍스트를 더 크고 눈에 띄게: `text-2xl`, 노란색/주황색 강조

**③ "2위와 차이 198표로 감소!" 메시지**
- `aboveCreator`는 이미 컴포넌트 내에서 계산됨
- microReward 메시지를 구체화:
  - `aboveCreator`가 있을 경우 → `"🔥 ${aboveCreator.rank}위와 차이 ${gap}표로 감소!"`
  - gap ≤ 10 → `"⚡ 거의 다 왔어요! 단 ${gap}표 차이!"`
  - gap === null (이미 1위) → `"👑 1위! 계속 달려요!"`

**④ 랭킹 실시간 애니메이션 이동**
- 기존 `rank-up` / `rank-down` 효과 개선:
  - rank-up 시 카드 배경이 초록색으로 flash + `translateY(-4px)` 상승 효과
  - rank-down 시 붉은색 flash
  - tailwind.config.ts의 `rank-up` keyframe에 translateY 추가

---

### 수정 파일 요약

```text
tailwind.config.ts
  └─ shake keyframe + animation 추가
  └─ rank-up keyframe에 translateY(-4px) 추가

src/components/RankingCard.tsx
  └─ isShaking state 추가
  └─ handleVote: isShaking 토글 로직
  └─ +1🔥 텍스트 스타일 개선
  └─ microReward 메시지 로직 → aboveCreator.rank 포함
  └─ 카드 div에 animate-shake 조건부 적용
```
