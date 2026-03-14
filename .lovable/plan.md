

## 리브랜딩 계획: "Creator Influence Platform"

### 현재 문제
- Footer에 "Creator Pulse"라는 레거시 브랜드명이 남아있음
- 히어로 메시지가 "팬 투표" 중심으로 단순하게 포지셔닝됨
- SEO 메타 설명이 투표 기능에만 집중, 플랫폼의 독창적 가치를 전달하지 못함
- 전체적으로 "투표 사이트" 느낌 → "Creator Competition Platform"으로 격상 필요

### 리브랜딩 방향

**핵심 슬로건**: `크리에이터 영향력, 팬이 증명하다`
**영문 태그라인**: `The Creator Competition Platform`

### 수정 범위

| 파일 | 변경 내용 |
|------|-----------|
| `LandingHero.tsx` | 히어로 타이틀 → "크리에이터 영향력, 팬이 증명하다", 서브카피/피쳐 카드 리라이트, 특징 섹션을 "투표 → 경쟁 → 순위 → 보상" 루프로 재구성 |
| `HomepageHero.tsx` | 로그인 유저용 히어로 카피 동일 톤으로 업데이트 |
| `Footer.tsx` | "Creator Pulse" → "Rankit" 통일, 카피라이트 "© 2026 Rankit." |
| `SEOHead.tsx` | 기본 description을 플랫폼 포지셔닝 반영하는 문구로 변경 |
| `index.html` | title, description, OG 메타, JSON-LD 동일하게 업데이트 |
| `RankitLogo.tsx` | 로고 하단에 "The Creator Competition Platform" 서브텍스트 옵션 추가 (size lg/xl에서만 표시) |
| `HomepageSections.tsx` | 섹션 헤더를 "Rankit에서 할 수 있는 것"으로 변경, 더 프로페셔널한 설명 문구 |

### 카피 변경 상세

**랜딩 히어로 (비로그인)**:
- 타이틀: `Rankit` → `크리에이터 영향력,` → `팬이 증명하다`
- 서브카피: "투표, 배틀, 예측 — 팬 활동이 만드는 공정한 크리에이터 영향력 지표"
- CTA: "지금 참여하기" / "랭킹 보기"
- 특징 3개: "실시간 경쟁" / "데이터 기반 순위" / "팬 보상 시스템"

**로그인 히어로**:
- 타이틀: `Rankit` → `팬 활동이 만드는` → `크리에이터 영향력 지표`
- 서브카피: "투표하고, 배틀에 참여하고, 순위를 예측하세요."

**Footer**:
- `Rankit — The Creator Competition Platform`
- `© 2026 Rankit. All rights reserved.`

**SEO 기본 description**:
- "크리에이터 영향력을 팬이 증명하는 플랫폼. 투표, 배틀, 예측으로 공정한 영향력 순위를 만들어갑니다."

