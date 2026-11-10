/**
 * Builds sitemap.xml from the pages that actually exist on disk.
 *
 * Run: node tools/build-sitemap.mjs
 *
 * Every <lastmod> is the file's real modification date, so the map cannot
 * silently drift out of date the way a hand-edited list does.
 */
import { readFileSync, writeFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://physix-academy.vercel.app";

/** @type {{path:string, file:string, priority:number, changefreq:string}[]} */
const pages = [
  { path: "/", file: "index.html", priority: 1.0, changefreq: "weekly" },

  // Service / landing pages
  { path: "/physics-simulations.html", file: "physics-simulations.html", priority: 0.9, changefreq: "monthly" },
  { path: "/ncert-physics-class-9-12.html", file: "ncert-physics-class-9-12.html", priority: 0.9, changefreq: "monthly" },
  { path: "/ai-physics-tutor.html", file: "ai-physics-tutor.html", priority: 0.8, changefreq: "monthly" },
  { path: "/physics-formulas-calculators.html", file: "physics-formulas-calculators.html", priority: 0.8, changefreq: "monthly" },
  { path: "/free-physics-learning.html", file: "free-physics-learning.html", priority: 0.8, changefreq: "monthly" },
  { path: "/faq.html", file: "faq.html", priority: 0.8, changefreq: "monthly" },
  { path: "/alternatives.html", file: "alternatives.html", priority: 0.7, changefreq: "monthly" },
  { path: "/author.html", file: "author.html", priority: 0.6, changefreq: "monthly" },
  { path: "/physics-learning-research.html", file: "physics-learning-research.html", priority: 0.6, changefreq: "monthly" },
  { path: "/case-study-offline-ai-tutor.html", file: "case-study-offline-ai-tutor.html", priority: 0.6, changefreq: "monthly" },

  // Tools
  { path: "/motion-graphs.html", file: "motion-graphs.html", priority: 0.7, changefreq: "monthly" },
  { path: "/html5-sims/index.html", file: "html5-sims/index.html", priority: 0.9, changefreq: "monthly" },

  // Blog
  { path: "/blog/index.html", file: "blog/index.html", priority: 0.7, changefreq: "monthly" },

  // Legal
  { path: "/privacy.html", file: "privacy.html", priority: 0.3, changefreq: "yearly" },
  { path: "/terms.html", file: "terms.html", priority: 0.3, changefreq: "yearly" },

  // Extra resource
  { path: "/assets/sl-arora-11-guide.html", file: "assets/sl-arora-11-guide.html", priority: 0.5, changefreq: "monthly" },
];

// Individual simulations (everything in html5-sims except the index)
const simsDir = join(ROOT, "html5-sims");
for (const name of readdirSync(simsDir).sort()) {
  if (!name.endsWith(".html") || name === "index.html") continue;
  pages.push({
    path: `/html5-sims/${name}`,
    file: `html5-sims/${name}`,
    priority: 0.6,
    changefreq: "monthly",
  });
}

// Blog posts (everything in blog/ except the index)
const blogDir = join(ROOT, "blog");
for (const name of readdirSync(blogDir).sort()) {
  if (!name.endsWith(".html") || name === "index.html") continue;
  pages.push({
    path: `/blog/${name}`,
    file: `blog/${name}`,
    priority: 0.6,
    changefreq: "yearly",
  });
}

const today = new Date().toISOString().slice(0, 10);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const missing = [];
const entries = pages.map((p) => {
  const abs = join(ROOT, p.file);
  let lastmod = today;
  if (existsSync(abs)) {
    const d = statSync(abs).mtime;
    lastmod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  } else {
    missing.push(p.file);
  }
  return `  <url>
    <loc>${esc(BASE + p.path)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority.toFixed(1)}</priority>
  </url>`;
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

writeFileSync(join(ROOT, "sitemap.xml"), xml, "utf8");
console.log(`wrote sitemap.xml — ${entries.length} URLs`);
if (missing.length) {
  console.warn(`WARNING: ${missing.length} listed file(s) not found:`);
  for (const m of missing) console.warn(`  - ${m}`);
}
