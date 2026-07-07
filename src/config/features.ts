/**
 * 전역 기능 제어 (Feature Flags)
 *
 * 초기 무과금 인게이지먼트 최적화 기간 동안 현금 결제 기반 기능들을
 * 일괄 비활성화하기 위한 플래그.
 *
 * 주의: 코드는 삭제하지 않고, 이 플래그로만 UI를 숨김/비활성화한다.
 * 결제·후원 인프라가 안정화되는 시점에 각 플래그를 true 로 전환한다.
 */
export const FEATURES = {
  ENABLE_PAYMENT: true,   // PG 심사(결제창 노출) 위해 활성화. 안정화 후에도 유지.
  ENABLE_BOOST: false,    // 결제 안정화 후 true로 변경 예정 (RP 부스트 투표)
  ENABLE_GIFT_RP: false,  // 후원 안정화 후 true로 변경 예정 (유저간 RP 선물)
  ENABLE_DONATION: false, // 크리에이터 인증 후 true로 변경 예정 (크리에이터 후원)

  // ── 활동 밀도 확보 전까지 임시 비활성화 (UI 노출만 제어, 데이터/로직은 유지) ──
  ENABLE_PREDICTION: false,          // 예측 게임 홈 섹션/네비 진입점
  ENABLE_FAN_LEADERBOARD: false,     // 탑팬 랭킹 · 팬덤 토너먼트 · TopFandomWidget
  ENABLE_HALL_OF_FAME: false,        // 명예의 전당 / MonthlyTop3 위젯 등 챔피언 섹션
  ENABLE_POWER_BOOST: false,         // Power Boost 카드
  ENABLE_WIDGET_EMBED: false,        // 크리에이터 위젯 임베드 진입점
  ENABLE_WEEKLY_PDF: false,          // 주간 리포트 PDF 다운로드
  ENABLE_PROFILE_ANALYTICS_TAB: false, // 프로필 분석 탭
  ENABLE_PROFILE_COMMUNITY_TAB: false, // 프로필 커뮤니티 탭
} as const;

export type FeatureKey = keyof typeof FEATURES;
