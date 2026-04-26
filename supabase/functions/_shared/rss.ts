// Shared RSS utilities — Naver Search Advisor compliant
// Strict format: no CDATA, escapeXml only, RFC822 KST dates
export const SITE_URL = "https://rankit.today";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export const rssHeaders = {
  "Content-Type": "application/rss+xml; charset=UTF-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=600",
};

export function escapeXml(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// RFC822 date with KST (+0900)
export function toRFC822(date: Date | string | number | null | undefined): string {
  const d = date ? new Date(date) : new Date();
  const valid = isNaN(d.getTime()) ? new Date() : d;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const kst = new Date(valid.getTime() + 9 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${days[kst.getUTCDay()]}, ${pad(kst.getUTCDate())} ${months[kst.getUTCMonth()]} ${kst.getUTCFullYear()} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}:${pad(kst.getUTCSeconds())} +0900`;
}

// Backwards-compatible alias
export const toRfc822 = toRFC822;

export interface RssChannelOptions {
  title: string;
  link: string;
  description: string;
  /** Self-referential feed URL for atom:link */
  feedUrl: string;
}

export function buildRss(channel: RssChannelOptions, itemsXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>ko</language>
    <lastBuildDate>${toRFC822(new Date())}</lastBuildDate>
    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`;
}

export function buildItem(opts: {
  title: string;
  link: string;
  description: string;
  pubDate?: Date | string | number | null;
  guid?: string;
}): string {
  const guid = opts.guid || opts.link;
  return `    <item>
      <title>${escapeXml(opts.title)}</title>
      <link>${escapeXml(opts.link)}</link>
      <description>${escapeXml(opts.description)}</description>
      <pubDate>${toRFC822(opts.pubDate ?? null)}</pubDate>
      <guid>${escapeXml(guid)}</guid>
    </item>`;
}

export function errorResponse(message: string, status = 500): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Rankit RSS Error</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(message)}</description>
    <language>ko</language>
    <lastBuildDate>${toRFC822(new Date())}</lastBuildDate>
  </channel>
</rss>`;
  return new Response(xml, { headers: rssHeaders, status });
}
