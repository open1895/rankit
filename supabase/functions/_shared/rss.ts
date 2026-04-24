// Shared RSS utilities for all RSS feed edge functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export const rssHeaders = {
  ...corsHeaders,
  "Content-Type": "application/rss+xml; charset=utf-8",
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

export function toRfc822(date: Date | string | null | undefined): string {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

export interface RssChannelOptions {
  title: string;
  link: string;
  description: string;
  language?: string;
}

export function buildRss(channel: RssChannelOptions, itemsXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>${channel.language || "ko"}</language>
    <lastBuildDate>${toRfc822(new Date())}</lastBuildDate>
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
}): string {
  return `    <item>
      <title>${escapeXml(opts.title)}</title>
      <link>${escapeXml(opts.link)}</link>
      <description>${escapeXml(opts.description)}</description>
      <pubDate>${toRfc822(opts.pubDate || null)}</pubDate>
      <guid>${escapeXml(opts.guid || opts.link)}</guid>
    </item>`;
}

export function errorResponse(message: string, status = 500): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<error>${escapeXml(message)}</error>`;
  return new Response(xml, {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" },
  });
}

export const SITE_URL = "https://www.rankit.today";
