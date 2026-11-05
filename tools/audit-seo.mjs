import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BASE = 'https://physix-academy.vercel.app';
const failures = [];

const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);
const filesIn = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => path.join(dir, entry.name));

const htmlFiles = [
  ...filesIn(ROOT),
  ...filesIn(path.join(ROOT, 'blog')),
  ...filesIn(path.join(ROOT, 'html5-sims')),
].filter((file) => !file.includes(`${path.sep}dist${path.sep}`));

const getTitle = (html) => html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;

const getMeta = (html, key, value) => {
  const tag = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => match[0])
    .find((candidate) => {
      const attr = candidate.match(new RegExp(`${key}=["']${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i'));
      return Boolean(attr);
    });
  return tag?.match(/content=(["'])([\s\S]*?)\1/i)?.[2] ?? null;
};

const getCanonical = (html) => {
  const tag = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .find((candidate) => /rel=["']canonical["']/i.test(candidate));
  return tag?.match(/href=(["'])([\s\S]*?)\1/i)?.[2] ?? null;
};

const getJsonLd = (html) => {
  const blocks = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch (error) {
      failures.push(`invalid JSON-LD: ${error.message}`);
    }
  }
  return blocks;
};

const pages = htmlFiles.map((file) => {
  const html = read(file);
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/');
  const robots = getMeta(html, 'name', 'robots');
  return {
    file,
    rel,
    html,
    title: getTitle(html),
    description: getMeta(html, 'name', 'description'),
    canonical: getCanonical(html),
    robots,
    ogTitle: getMeta(html, 'property', 'og:title'),
    ogDescription: getMeta(html, 'property', 'og:description'),
    ogType: getMeta(html, 'property', 'og:type'),
    ogUrl: getMeta(html, 'property', 'og:url'),
    ogImage: getMeta(html, 'property', 'og:image'),
    twitterCard: getMeta(html, 'name', 'twitter:card'),
    twitterTitle: getMeta(html, 'name', 'twitter:title'),
    twitterDescription: getMeta(html, 'name', 'twitter:description'),
    twitterImage: getMeta(html, 'name', 'twitter:image'),
    jsonLd: getJsonLd(html),
    indexable: !/noindex/i.test(robots ?? ''),
  };
});

const titles = new Map();
for (const page of pages) {
  if (!page.title) failures.push(`${page.rel}: missing <title>`);
  else if (titles.has(page.title)) failures.push(`${page.rel}: duplicate title with ${titles.get(page.title)}`);
  else titles.set(page.title, page.rel);
}

const descriptions = new Map();
const indexable = pages.filter((page) => page.indexable);
for (const page of indexable) {
  if (!page.description) failures.push(`${page.rel}: missing meta description`);
  else if (descriptions.has(page.description)) failures.push(`${page.rel}: duplicate description with ${descriptions.get(page.description)}`);
  else descriptions.set(page.description, page.rel);

  if (!page.canonical) failures.push(`${page.rel}: missing canonical`);
  else {
    const expected = page.rel === 'index.html' ? `${BASE}/` : `${BASE}/${page.rel}`;
    if (page.canonical !== expected) failures.push(`${page.rel}: canonical ${page.canonical} != ${expected}`);
    if (!page.canonical.startsWith(`${BASE}/`)) failures.push(`${page.rel}: canonical not absolute`);
  }

  for (const key of ['ogTitle', 'ogDescription', 'ogType', 'ogUrl', 'ogImage', 'twitterCard', 'twitterTitle', 'twitterDescription', 'twitterImage']) {
    if (!page[key]) failures.push(`${page.rel}: missing ${key}`);
  }
  if (page.ogImage && !page.ogImage.startsWith(`${BASE}/`)) failures.push(`${page.rel}: og:image not absolute`);
  if (page.ogUrl && page.ogUrl !== page.canonical) failures.push(`${page.rel}: og:url != canonical`);
}

for (const page of pages) {
  if (/\b(JEE|NEET)\b/i.test(page.html)) failures.push(`${page.rel}: contains JEE/NEET`);
}

const homepage = pages.find((page) => page.rel === 'index.html');
if (!homepage) failures.push('missing index.html');
else {
  const expectedTitle = 'PhysiX Academy | Free Physics Learning Without Ads';
  const expectedDescription =
    'Learn physics for free with PhysiX Academy. Explore interactive physics simulations, virtual experiments, practice questions, an AI tutor and more. No advertisements, just learning.';
  if (homepage.title !== expectedTitle) failures.push(`index.html: title ${homepage.title} != ${expectedTitle}`);
  if (homepage.description !== expectedDescription) failures.push('index.html: description does not match the mandated master value');
  if (homepage.robots && /noindex/i.test(homepage.robots)) failures.push('index.html: is noindex');
  if (!homepage.html.includes('Learn physics for free, without advertisements.')) {
    failures.push('index.html: missing visible "Learn physics for free, without advertisements." line');
  }
  for (const link of ['html5-sims/index.html', 'motion-graphs.html']) {
    if (!homepage.html.includes(`href="${link}"`)) failures.push(`index.html: footer missing link to ${link}`);
  }
  const graphNodes = homepage.jsonLd.flatMap((block) => block['@graph'] ?? [block]);
  for (const type of ['WebSite', 'EducationalOrganization']) {
    const node = graphNodes.find((candidate) => candidate['@type'] === type);
    if (!node) {
      failures.push(`index.html: JSON-LD missing ${type}`);
      continue;
    }
    const names = node.alternateName ?? [];
    if (!Array.isArray(names) || !names.includes('PhysixAcademy')) {
      failures.push(`index.html: JSON-LD ${type} alternateName missing "PhysixAcademy"`);
    }
  }
  if (!graphNodes.some((node) => node['@type'] === 'EducationalOrganization' && node.slogan === "Understand Physics. Don't Just Memorize It.")) {
    failures.push('index.html: JSON-LD EducationalOrganization missing official slogan');
  }
}

const noindexPages = ['404.html', 'login.html', 'privacy.html', 'terms.html'];
for (const rel of noindexPages) {
  const page = pages.find((candidate) => candidate.rel === rel);
  if (page && !/noindex/i.test(page.robots ?? '')) failures.push(`${rel}: expected noindex`);
}

const sitemap = read(path.join(ROOT, 'sitemap.xml'));
const sitemapLocs = [...sitemap.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => match[1].trim());
if (sitemapLocs.length !== 48) failures.push(`sitemap.xml: expected 48 URLs, found ${sitemapLocs.length}`);
if (sitemapLocs.some((loc) => loc.includes('#/'))) failures.push('sitemap.xml: contains hash-route URL');
if (!sitemapLocs.includes(`${BASE}/motion-graphs.html`)) failures.push('sitemap.xml: missing motion-graphs.html');
for (const loc of sitemapLocs) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(loc).pathname);
  } catch {
    failures.push(`sitemap.xml: invalid URL ${loc}`);
    continue;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = path.join(ROOT, pathname.replace(/^\/+/, ''));
  if (!exists(target)) failures.push(`sitemap.xml: URL does not map to a file: ${loc}`);
}

for (const page of pages) {
  if (!page.jsonLd.length) continue;
  const types = page.jsonLd.flatMap((block) => block['@graph'] ?? [block]).map((node) => node['@type']);
  if (page.rel === 'index.html' && !types.includes('Person')) failures.push('index.html: JSON-LD missing Person');
  if (page.rel === 'blog/index.html' && !types.includes('Blog')) failures.push('blog/index.html: JSON-LD missing Blog');
  if (page.rel.startsWith('blog/') && page.rel !== 'blog/index.html' && !types.includes('Article')) {
    failures.push(`${page.rel}: JSON-LD missing Article`);
  }
}

/* Brand-consistency and internal-link-graph assertions (40-search-variation project). */
for (const page of pages) {
  if (page.rel.startsWith('html5-sims/') && page.rel !== 'html5-sims/index.html') {
    if (!page.title || !page.title.includes('PhysiX Academy')) {
      failures.push(`${page.rel}: title missing brand suffix "PhysiX Academy" (${page.title})`);
    }
  }
}
const simHub = pages.find((page) => page.rel === 'html5-sims/index.html');
if (simHub) {
  for (const link of ['../index.html', '../motion-graphs.html']) {
    if (!simHub.html.includes(`href="${link}"`)) failures.push(`html5-sims/index.html: missing link to ${link}`);
  }
} else {
  failures.push('missing html5-sims/index.html');
}
const motion = pages.find((page) => page.rel === 'motion-graphs.html');
if (motion && !motion.html.includes('href="html5-sims/index.html"')) {
  failures.push('motion-graphs.html: missing link to html5-sims/index.html');
}
for (const page of pages.filter((candidate) => candidate.rel.startsWith('blog/'))) {
  if (!page.html.includes('href="../html5-sims/index.html"')) {
    failures.push(`${page.rel}: missing link to ../html5-sims/index.html`);
  }
}
const blogIndex = pages.find((page) => page.rel === 'blog/index.html');
if (blogIndex && !blogIndex.html.includes('href="../index.html"')) {
  failures.push('blog/index.html: missing link to ../index.html');
}

console.log(`Scanned ${pages.length} HTML files`);
console.log(`Indexable pages: ${indexable.length}`);
console.log(`Unique titles: ${titles.size}`);
console.log(`Unique descriptions: ${descriptions.size}`);
console.log(`Sitemap URLs: ${sitemapLocs.length}`);

if (failures.length) {
  console.error(`\n${failures.length} SEO failure(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('\nSEO AUDIT PASSED');
