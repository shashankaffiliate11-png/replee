// Generates public/sitemap.xml at build time. Reads slugs directly out of
// src/lib/blogPosts.ts as text (regex, not a TS-aware import) so this
// script runs in plain Node with no extra build tooling/dependencies.
// Re-run automatically on every build (wired into package.json), so it
// can never go stale as blog posts are added.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SITE_URL = "https://noticedesk.help";

const source = readFileSync(join(ROOT, "src/lib/blogPosts.ts"), "utf8");

// Pull out each post's slug + date in file order. blogPosts.ts's format is
// consistent (slug then date, a few lines apart, inside one object per
// post), so a couple of targeted regexes are reliable here without needing
// to actually parse/execute the TypeScript.
const posts = [];
const postBlockRegex = /slug:\s*"([^"]+)"[\s\S]*?date:\s*"([^"]+)"/g;
let match;
while ((match = postBlockRegex.exec(source)) !== null) {
  posts.push({ slug: match[1], date: match[2] });
}

if (posts.length === 0) {
  console.warn(
    "[generate-sitemap] Warning: found 0 blog posts in src/lib/blogPosts.ts — " +
      "check the file hasn't been restructured in a way this script's regex no longer matches.",
  );
}

const today = new Date().toISOString().slice(0, 10);

// Only genuinely public, indexable pages. /app/*, /login, /onboarding and
// /auth/callback are all behind auth or are pure utility redirects and
// must never be crawled — see the matching robots.txt Disallow rules.
const staticUrls = [
  { loc: "/", priority: "1.0", changefreq: "weekly", lastmod: today },
  { loc: "/pricing", priority: "0.9", changefreq: "monthly", lastmod: today },
  { loc: "/blog", priority: "0.8", changefreq: "weekly", lastmod: today },
  { loc: "/privacy", priority: "0.3", changefreq: "yearly", lastmod: today },
  { loc: "/terms", priority: "0.3", changefreq: "yearly", lastmod: today },
];

const blogUrls = posts.map((p) => ({
  loc: `/blog/${p.slug}`,
  priority: "0.7",
  changefreq: "monthly",
  lastmod: p.date,
}));

const allUrls = [...staticUrls, ...blogUrls];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

writeFileSync(join(ROOT, "public/sitemap.xml"), xml);
console.log(
  `[generate-sitemap] Wrote public/sitemap.xml with ${allUrls.length} URLs ` +
    `(${staticUrls.length} static + ${blogUrls.length} blog posts).`,
);
