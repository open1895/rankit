// Generates public/sitemap-creators.xml and public/sitemap-index.xml.
// Runs before `vite dev` and `vite build` via predev/prebuild scripts.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://rankit.today";
const SUPABASE_URL = "https://jcaajxwdeqngihupjaaa.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjYWFqeHdkZXFuZ2lodXBqYWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5ODc1MzgsImV4cCI6MjA4NjU2MzUzOH0.AOa1sSPgsBvyRg64kx3pMdItCi5OjFgYMmZgVfnZiVs";

async function fetchCreators() {
  const url = `${SUPABASE_URL}/rest/v1/creators_public?select=id,updated_at&limit=10000`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) {
      // Fallback to creators table if view missing
      const res2 = await fetch(
        `${SUPABASE_URL}/rest/v1/creators?select=id,updated_at&limit=10000`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        },
      );
      if (!res2.ok) return [];
      return await res2.json();
    }
    return await res.json();
  } catch (e) {
    console.warn("[sitemap] failed to fetch creators:", e?.message);
    return [];
  }
}

function xmlEscape(s) {
  return String(s).replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c],
  );
}

function buildCreatorsSitemap(rows) {
  const urls = [];
  for (const row of rows) {
    if (!row?.id) continue;
    const lastmod = row.updated_at ? new Date(row.updated_at).toISOString() : null;
    const lm = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";
    urls.push(
      `  <url><loc>${BASE_URL}/creator/${xmlEscape(row.id)}</loc>${lm}<changefreq>weekly</changefreq><priority>0.6</priority></url>`,
    );
    urls.push(
      `  <url><loc>${BASE_URL}/creator/${xmlEscape(row.id)}/board</loc>${lm}<changefreq>weekly</changefreq><priority>0.5</priority></url>`,
    );
  }
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    "",
  ].join("\n");
}

function buildSitemapIndex() {
  const now = new Date().toISOString();
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    `  <sitemap><loc>${BASE_URL}/sitemap.xml</loc><lastmod>${now}</lastmod></sitemap>`,
    `  <sitemap><loc>${BASE_URL}/sitemap-creators.xml</loc><lastmod>${now}</lastmod></sitemap>`,
    `</sitemapindex>`,
    "",
  ].join("\n");
}

const creators = await fetchCreators();
writeFileSync(
  resolve("public/sitemap-creators.xml"),
  buildCreatorsSitemap(creators),
);
writeFileSync(resolve("public/sitemap-index.xml"), buildSitemapIndex());
console.log(
  `[sitemap] wrote sitemap-creators.xml (${creators.length} creators) + sitemap-index.xml`,
);
