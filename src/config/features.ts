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
  ENABLE_PAYMENT: false,  // 6~8주 후 true로 변경 예정 (현금 결제·RP 충전)
  ENABLE_BOOST: false,    // 결제 안정화 후 true로 변경 예정 (RP 부스트 투표)
  ENABLE_GIFT_RP: false,  // 후원 안정화 후 true로 변경 예정 (유저간 RP 선물)
  ENABLE_DONATION: false, // 크리에이터 인증 후 true로 변경 예정 (크리에이터 후원)
} as const;

export type FeatureKey = keyof typeof FEATURES;
