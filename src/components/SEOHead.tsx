import { Helmet } from "react-helmet-async";

const BASE_URL = "https://rankit.today";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-rankit-20260303.png?v=20260303-2`;
const SITE_NAME = "Rankit";

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
  keywords?: string;
  structuredData?: object | object[];
}

const SEOHead = ({
  title,
  description = "크리에이터 영향력을 팬이 증명하는 플랫폼. 투표, 배틀, 예측으로 공정한 영향력 순위를 만들어갑니다.",
  path = "/",
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  noIndex = false,
  keywords,
  structuredData,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - The Creator Competition Platform`;
  const url = `${BASE_URL}${path}`;

  const structuredDataArray = Array.isArray(structuredData)
    ? structuredData
    : structuredData
    ? [structuredData]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="ko_KR" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data */}
      {structuredDataArray.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEOHead;
