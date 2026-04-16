import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Rankit'
const SITE_URL = 'https://rankit.today'

interface CreatorMilestoneProps {
  creatorName?: string
  milestoneType?: 'top_1' | 'top_10' | 'top_50' | 'top_100'
  rank?: number
  votes?: number
  creatorId?: string
}

const MILESTONE_COPY: Record<
  string,
  { emoji: string; title: string; subtitle: string; accent: string }
> = {
  top_1: {
    emoji: '👑',
    title: '랭킷 1위 등극!',
    subtitle: '대한민국 크리에이터 랭킹 정상에 오르셨습니다.',
    accent: '#FFD700',
  },
  top_10: {
    emoji: '🔥',
    title: 'TOP 10 진입!',
    subtitle: '상위 10위권에 진입하신 것을 축하드립니다.',
    accent: '#FF6B35',
  },
  top_50: {
    emoji: '⚡',
    title: 'TOP 50 달성!',
    subtitle: '상위 50위 안에 이름을 올리셨습니다.',
    accent: '#9333EA',
  },
  top_100: {
    emoji: '🌟',
    title: 'TOP 100 진입!',
    subtitle: '랭킷 TOP 100 크리에이터가 되셨습니다.',
    accent: '#3B82F6',
  },
}

const CreatorMilestoneEmail = ({
  creatorName = '크리에이터',
  milestoneType = 'top_100',
  rank = 100,
  votes = 0,
  creatorId,
}: CreatorMilestoneProps) => {
  const copy = MILESTONE_COPY[milestoneType] ?? MILESTONE_COPY.top_100
  const profileUrl = creatorId
    ? `${SITE_URL}/creator/${creatorId}`
    : SITE_URL
  const claimUrl = `${SITE_URL}/auth`

  return (
    <Html lang="ko" dir="ltr">
      <Head />
      <Preview>
        {creatorName}님, {copy.title} 랭킷에서 축하드립니다!
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brandText}>⚡ {SITE_NAME}</Text>
          </Section>

          <Section style={{ ...badgeSection, borderColor: copy.accent }}>
            <Text style={emoji}>{copy.emoji}</Text>
            <Heading style={{ ...h1, color: copy.accent }}>
              {copy.title}
            </Heading>
            <Text style={subtitle}>{copy.subtitle}</Text>
          </Section>

          <Text style={greeting}>안녕하세요, {creatorName}님!</Text>

          <Text style={text}>
            랭킷에서 진행 중인 크리에이터 랭킹에서{' '}
            <strong style={{ color: copy.accent }}>
              현재 {rank}위
            </strong>
            를 달성하셨습니다. 팬들의 뜨거운 응원 덕분입니다 🎉
          </Text>

          <Section style={statsBox}>
            <Text style={statLabel}>현재 순위</Text>
            <Text style={{ ...statValue, color: copy.accent }}>#{rank}</Text>
            <Hr style={statDivider} />
            <Text style={statLabel}>누적 득표수</Text>
            <Text style={statValue}>{votes.toLocaleString()}표</Text>
          </Section>

          <Text style={text}>
            랭킷에서 본인 프로필을 인증하시면 다음과 같은 혜택을 받으실 수
            있습니다:
          </Text>

          <Section style={benefits}>
            <Text style={benefitItem}>✅ 인증 배지 (블루 체크) 부여</Text>
            <Text style={benefitItem}>✅ 팬과 직접 소통 가능 (오피셜 피드)</Text>
            <Text style={benefitItem}>✅ 후원 수익화 (수수료 10%)</Text>
            <Text style={benefitItem}>✅ 성장 분석 대시보드 제공</Text>
            <Text style={benefitItem}>✅ 주간 랭킹 보상 RP 지급</Text>
          </Section>

          <Section style={ctaSection}>
            <Button style={{ ...primaryButton, backgroundColor: copy.accent }} href={claimUrl}>
              내 프로필 인증하기 →
            </Button>
          </Section>

          <Section style={ctaSectionSecondary}>
            <Link href={profileUrl} style={secondaryLink}>
              내 랭킷 프로필 보기
            </Link>
          </Section>

          <Hr style={divider} />

          <Text style={footer}>
            랭킷은 대한민국 크리에이터들의 영향력을 측정하고 응원하는 플랫폼입니다.
            <br />
            팬들의 투표와 응원을 통해 매주 새로운 랭킹이 결정됩니다.
          </Text>

          <Text style={footerSmall}>
            본 메일은 랭킷에서 자동으로 발송된 알림입니다.
            <br />
            <Link href={SITE_URL} style={footerLink}>
              {SITE_URL.replace('https://', '')}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CreatorMilestoneEmail,
  subject: (data: Record<string, any>) => {
    const copy = MILESTONE_COPY[data?.milestoneType] ?? MILESTONE_COPY.top_100
    const name = data?.creatorName ?? '크리에이터'
    return `${copy.emoji} ${name}님, ${copy.title} - Rankit`
  },
  displayName: '크리에이터 마일스톤 진입 알림',
  previewData: {
    creatorName: '홍길동',
    milestoneType: 'top_10',
    rank: 8,
    votes: 1234,
    creatorId: 'preview-id',
  },
} satisfies TemplateEntry

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Pretendard", "Noto Sans KR", sans-serif',
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 24px',
}
const header = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}
const brandText = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: '#9333EA',
  margin: '0',
  letterSpacing: '-0.5px',
}
const badgeSection = {
  textAlign: 'center' as const,
  padding: '32px 24px',
  border: '2px solid',
  borderRadius: '16px',
  backgroundColor: '#FAFAFA',
  marginBottom: '32px',
}
const emoji = {
  fontSize: '64px',
  margin: '0 0 8px',
  lineHeight: '1',
}
const h1 = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  margin: '8px 0',
  letterSpacing: '-0.5px',
}
const subtitle = {
  fontSize: '15px',
  color: '#6B7280',
  margin: '0',
}
const greeting = {
  fontSize: '16px',
  color: '#111827',
  fontWeight: '600' as const,
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#374151',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const statsBox = {
  backgroundColor: '#F9FAFB',
  padding: '24px',
  borderRadius: '12px',
  textAlign: 'center' as const,
  margin: '24px 0',
}
const statLabel = {
  fontSize: '12px',
  color: '#6B7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 4px',
}
const statValue = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#111827',
  margin: '0 0 16px',
  lineHeight: '1',
}
const statDivider = {
  borderColor: '#E5E7EB',
  margin: '12px 0',
}
const benefits = {
  backgroundColor: '#FFFFFF',
  padding: '0 8px',
  margin: '16px 0 24px',
}
const benefitItem = {
  fontSize: '14px',
  color: '#374151',
  margin: '6px 0',
  lineHeight: '1.5',
}
const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0 12px',
}
const ctaSectionSecondary = {
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const primaryButton = {
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const secondaryLink = {
  color: '#6B7280',
  fontSize: '14px',
  textDecoration: 'underline',
}
const divider = {
  borderColor: '#E5E7EB',
  margin: '32px 0 20px',
}
const footer = {
  fontSize: '13px',
  color: '#6B7280',
  lineHeight: '1.5',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}
const footerSmall = {
  fontSize: '12px',
  color: '#9CA3AF',
  lineHeight: '1.5',
  margin: '0',
  textAlign: 'center' as const,
}
const footerLink = {
  color: '#9333EA',
  textDecoration: 'none',
}
