#!/usr/bin/env node
/**
 * Sitemap & RSS Feed Validator
 *
 * 사이트맵과 모든 RSS 엔드포인트를 호출해 표준(W3C Sitemap 0.9 / RSS 2.0 + Naver Search Advisor)
 * 형식 준수 여부를 검증하고, 위반 사항을 콘솔에 출력합니다.
 *
 * Usage:
 *   node scripts/validate-feeds.mjs                       # 기본 (Supabase Functions URL)
 *   BASE_URL=https://rankit.today node scripts/validate-feeds.mjs
 *   node scripts/validate-feeds.mjs --base https://rankit.today
 */

const SUPABASE_FN_BASE = "https://jcaajxwdeqngihupjaaa.supabase.co/functions/v1";

// CLI / ENV로 Base URL override 가능
const argBase = process.argv.find((a) => a.startsWith("--base="))?.split("=")[1]
  ?? (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : null);
const BASE_URL = argBase || process.env.BASE_URL || SUPABASE_FN_BASE;

const ENDPOINTS = [
  { path: "/sitemap", type: "sitemap" },
  { path: "/rss", type: "rss" },
  { path: "/rss-rising", type: "rss" },
  { path: "/rss-hall-of-fame", type: "rss" },
  { path: "/rss-monthly", type: "rss" },
  { path: "/rss-battle", type: "rss" },
  { path: "/rss-community", type: "rss" },
  { path: "/rss-notice", type: "rss" },
  { path: `/rss-category?cat=${encodeURIComponent("게임")}`, type: "rss" },
];

// ─── ANSI 컬러 ───
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

// ─── 헬퍼 ───
const RFC822_RE =
  /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} [+-]\d{4}$/;
const W3C_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z))?$/;

function getTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}
function getAllTags(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, "g");
  return xml.match(re) || [];
}
function stripCdata(s) {
  if (!s) return s;
  const m = s.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return m ? m[1] : s;
}

// ─── 검증기 ───
function validateRss(xml, url) {
  const errors = [];
  const warnings = [];

  if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('XML 선언이 정확하지 않습니다 (<?xml version="1.0" encoding="UTF-8"?> 필요)');
  }
  if (!/<rss[^>]+version="2\.0"/.test(xml)) errors.push('rss version="2.0" 누락');
  if (!/xmlns:dc="http:\/\/purl\.org\/dc\/elements\/1\.1\/"/.test(xml)) errors.push("xmlns:dc 네임스페이스 누락");
  if (!/xmlns:atom="http:\/\/www\.w3\.org\/2005\/Atom"/.test(xml)) errors.push("xmlns:atom 네임스페이스 누락");

  const channel = xml.match(/<channel>([\s\S]*?)<\/channel>/)?.[1];
  if (!channel) {
    errors.push("<channel> 블록 누락");
    return { errors, warnings, itemCount: 0 };
  }

  for (const tag of ["title", "link", "description", "language", "copyright", "lastBuildDate"]) {
    if (!new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`).test(channel)) {
      errors.push(`channel/<${tag}> 누락`);
    }
  }

  const lastBuild = stripCdata(getTag(channel, "lastBuildDate"));
  if (lastBuild && !RFC822_RE.test(lastBuild)) {
    errors.push(`channel/lastBuildDate가 RFC822 형식이 아닙니다: "${lastBuild}"`);
  }

  if (!/<atom:link[^>]+rel="self"[^>]+type="application\/rss\+xml"/.test(channel)) {
    errors.push("channel/atom:link[rel=self, type=application/rss+xml] 누락");
  }

  const items = getAllTags(channel, "item");
  if (items.length === 0) warnings.push("item이 0개입니다 (데이터가 없을 수 있음)");

  items.forEach((itemXml, i) => {
    const required = ["title", "link", "description", "pubDate", "guid"];
    for (const tag of required) {
      if (!new RegExp(`<${tag}[^>\\s]*[^>]*>[\\s\\S]*?<\\/${tag}>`).test(itemXml)) {
        errors.push(`item[${i}]/<${tag}> 누락`);
      }
    }
    if (!/<dc:creator[^>]*>[\s\S]*?<\/dc:creator>/.test(itemXml)) {
      errors.push(`item[${i}]/<dc:creator> 누락`);
    }
    const pubDate = stripCdata(getTag(itemXml, "pubDate"));
    if (pubDate && !RFC822_RE.test(pubDate)) {
      errors.push(`item[${i}]/pubDate가 RFC822 형식이 아닙니다: "${pubDate}"`);
    }
    if (!/<guid[^>]+isPermaLink="(true|false)"/.test(itemXml)) {
      warnings.push(`item[${i}]/<guid>에 isPermaLink 속성 권장`);
    }
    // CDATA 권장 (title/description)
    const title = getTag(itemXml, "title");
    const desc = getTag(itemXml, "description");
    if (title && !title.startsWith("<![CDATA[")) warnings.push(`item[${i}]/title CDATA 미사용`);
    if (desc && !desc.startsWith("<![CDATA[")) warnings.push(`item[${i}]/description CDATA 미사용`);
  });

  return { errors, warnings, itemCount: items.length };
}

function validateSitemap(xml) {
  const errors = [];
  const warnings = [];

  if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push("XML 선언 누락 또는 잘못됨");
  }
  if (!/<urlset[^>]+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(xml)) {
    errors.push('urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 누락');
  }

  const urls = getAllTags(xml, "url");
  if (urls.length === 0) errors.push("<url> 항목이 없습니다");

  let invalidLastmod = 0;
  urls.forEach((u, i) => {
    if (!/<loc>[\s\S]*?<\/loc>/.test(u)) errors.push(`url[${i}]/<loc> 누락`);
    const lastmod = getTag(u, "lastmod");
    if (!lastmod) {
      warnings.push(`url[${i}]/<lastmod> 누락`);
    } else if (!W3C_DATE_RE.test(lastmod)) {
      invalidLastmod++;
      if (invalidLastmod <= 3) errors.push(`url[${i}]/lastmod이 W3C Datetime 형식이 아닙니다: "${lastmod}"`);
    }
    const cf = getTag(u, "changefreq");
    if (cf && !["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"].includes(cf)) {
      errors.push(`url[${i}]/changefreq 값이 잘못되었습니다: "${cf}"`);
    }
    const pr = getTag(u, "priority");
    if (pr && (Number.isNaN(+pr) || +pr < 0 || +pr > 1)) {
      errors.push(`url[${i}]/priority 범위 오류 (0.0~1.0): "${pr}"`);
    }
  });

  if (invalidLastmod > 3) errors.push(`...추가 ${invalidLastmod - 3}건의 lastmod 형식 오류 생략`);

  return { errors, warnings, itemCount: urls.length };
}

// ─── 메인 ───
async function checkOne({ path, type }) {
  const url = BASE_URL + path;
  const label = `${type.toUpperCase()} ${path}`;
  console.log(`\n${c.bold}${c.cyan}▶ ${label}${c.reset}\n  ${c.gray}${url}${c.reset}`);

  let res, body;
  try {
    res = await fetch(url, { headers: { Accept: "application/xml,application/rss+xml" } });
    body = await res.text();
  } catch (e) {
    console.log(`  ${c.red}✗ 네트워크 오류: ${e.message}${c.reset}`);
    return { ok: false, errors: 1, warnings: 0 };
  }

  if (!res.ok) {
    console.log(`  ${c.red}✗ HTTP ${res.status} ${res.statusText}${c.reset}`);
    return { ok: false, errors: 1, warnings: 0 };
  }

  const ct = res.headers.get("content-type") || "";
  const ctOk = type === "rss" ? /application\/rss\+xml/i.test(ct) : /application\/(xml|rss\+xml)/i.test(ct);
  if (!ctOk) {
    console.log(`  ${c.yellow}⚠ Content-Type: "${ct}" (권장: ${type === "rss" ? "application/rss+xml; charset=UTF-8" : "application/xml; charset=UTF-8"})${c.reset}`);
  }

  const { errors, warnings, itemCount } = type === "rss" ? validateRss(body, url) : validateSitemap(body);

  console.log(`  ${c.gray}항목 수: ${itemCount}, 응답 크기: ${(body.length / 1024).toFixed(1)} KB${c.reset}`);

  if (errors.length === 0 && warnings.length === 0) {
    console.log(`  ${c.green}✓ 표준 준수${c.reset}`);
  } else {
    errors.forEach((e) => console.log(`  ${c.red}✗ ${e}${c.reset}`));
    warnings.forEach((w) => console.log(`  ${c.yellow}⚠ ${w}${c.reset}`));
  }

  return { ok: errors.length === 0, errors: errors.length, warnings: warnings.length };
}

(async () => {
  console.log(`${c.bold}Sitemap & RSS Validator${c.reset}`);
  console.log(`${c.gray}Base: ${BASE_URL}${c.reset}`);

  const results = [];
  for (const ep of ENDPOINTS) results.push({ ep, ...(await checkOne(ep)) });

  // 요약
  const totalErr = results.reduce((s, r) => s + r.errors, 0);
  const totalWarn = results.reduce((s, r) => s + r.warnings, 0);
  const failed = results.filter((r) => !r.ok);

  console.log(`\n${c.bold}═══ 요약 ═══${c.reset}`);
  console.log(`  총 ${results.length}개 엔드포인트 검증`);
  console.log(`  ${c.green}통과: ${results.length - failed.length}${c.reset} / ${c.red}실패: ${failed.length}${c.reset}`);
  console.log(`  에러 ${totalErr}건, 경고 ${totalWarn}건`);
  if (failed.length > 0) {
    console.log(`\n${c.red}실패 엔드포인트:${c.reset}`);
    failed.forEach((r) => console.log(`  - ${r.ep.path}`));
  }
  process.exit(failed.length > 0 ? 1 : 0);
})();
