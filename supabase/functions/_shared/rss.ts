// Shared RSS utilities for all RSS feed edge functions (Naver Search Advisor compliant)
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export const rssHeaders = {
  ...corsHeaders,
  "Content-Type": "application/rss+xml; charset=UTF-8",
  "Cache-Control": "public, max-age=300",
};

export function escapeXml(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Wrap content in CDATA, escaping any nested CDATA terminators
export function cdata(str: unknown): string {
  const safe = String(str ?? "").replace(/\]\]>/g, "]]]]><![CDATA[>");
  return `<![CDATA[${safe}]]>`;
}

// RFC822 date with KST (+0900) timezone — Naver Search Advisor preferred format
export function toRfc822(date: Date | string | null | undefined): string {
  const d = date ? new Date(date) : new Date();
  const valid = isNaN(d.getTime()) ? new Date() : d;
  // Convert to KST
  const kst = new Date(valid.getTime() + 9 * 60 * 60 * 1000);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n: number) => String(n).padStart(2, "0");
  const dayName = days[kst.getUTCDay()];
  const day = pad(kst.getUTCDate());
  const month = months[kst.getUTCMonth()];
  const year = kst.getUTCFullYear();
  const hh = pad(kst.getUTCHours());
  const mm = pad(kst.getUTCMinutes());
  const ss = pad(kst.getUTCSeconds());
  return `${dayName}, ${day} ${month} ${year} ${hh}:${mm}:${ss} +0900`;
}

export interface RssChannelOptions {
  title: string;
  link: string;
  description: string;
  language?: string;
  /** Self-referential feed URL for atom:link */
  feedUrl: string;
  copyright?: string;
}

export function buildRss(channel: RssChannelOptions, itemsXml: string): string {
  const copyright = channel.copyright || "Copyright 2026 크리에이트 펄스";
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${cdata(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${cdata(channel.description)}</description>
    <language>${channel.language || "ko"}</language>
    <copyright>${escapeXml(copyright)}</copyright>
    <lastBuildDate>${toRfc822(new Date())}</lastBuildDate>
    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;
}

export function buildItem(opts: {
  title: string;
  link: string;
  description: string;
  pubDate?: Date | string | null;
  guid?: string;
  creator?: string;
}): string {
  const guid = opts.guid || opts.link;
  const creator = opts.creator || "Rankit";
  return `    <item>
      <title>${cdata(opts.title)}</title>
      <link>${escapeXml(opts.link)}</link>
      <description>${cdata(opts.description)}</description>
      <pubDate>${toRfc822(opts.pubDate || null)}</pubDate>
      <guid isPermaLink="true">${escapeXml(guid)}</guid>
      <dc:creator>${cdata(creator)}</dc:creator>
    </item>`;
}

export function errorResponse(message: string, status = 500): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<error>${escapeXml(message)}</error>`;
  return new Response(xml, {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/xml; charset=UTF-8" },
  });
}

export const SITE_URL = "https://rankit.today";
