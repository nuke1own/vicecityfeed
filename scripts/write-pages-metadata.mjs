import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function absolutizeNextPath(href) {
  const idx = href.indexOf("_next/");
  if (idx >= 0) return `/${href.slice(idx)}`;
  return href.startsWith("/") ? href : `/${href}`;
}

function rewriteExportStylesheets(html) {
  return html.replace(/<link\b[^>]*>/gi, (tag) => {
    const rel = /rel=["']([^"']+)["']/i.exec(tag)?.[1] ?? "";
    const as = /as=["']([^"']+)["']/i.exec(tag)?.[1] ?? "";
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href) return tag;
    const isStyle =
      /\bstylesheet\b/i.test(rel) ||
      (/\bpreload\b/i.test(rel) && /style/i.test(as));
    if (!isStyle) return tag;
    return `<link rel="stylesheet" href="${absolutizeNextPath(href)}">`;
  });
}

function walkHtml(dir, visit) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const next = join(dir, name.name);
    if (name.isDirectory()) walkHtml(next, visit);
    else if (name.name.endsWith(".html")) visit(next);
  }
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "out");

if (!existsSync(out)) {
  console.error("out/ is missing; run next build first");
  process.exit(1);
}

const publicCname = join(root, "public/CNAME");
const existingCname = existsSync(publicCname)
  ? readFileSync(publicCname, "utf8").trim()
  : "www.vicecityfeed.com";
const cname = `${existingCname || "www.vicecityfeed.com"}\n`;

writeFileSync(join(out, "CNAME"), cname);
writeFileSync(
  join(out, ".nojekyll"),
  "# Disable Jekyll so GitHub Pages publishes index.html and _next/ as-is.\n",
);

const favicon = join(root, "public/favicon.ico");
if (existsSync(favicon)) {
  cpSync(favicon, join(out, "favicon.ico"));
}

walkHtml(out, (file) => {
  const before = readFileSync(file, "utf8");
  const after = rewriteExportStylesheets(before);
  if (after !== before) writeFileSync(file, after);
});

for (const name of ["rss.xml", "sitemap.xml", "robots.txt"]) {
  const dest = join(out, name);
  if (!existsSync(dest)) {
    console.error(`${name} is missing from out/`);
    process.exit(1);
  }
}

console.log(
  "Prepared out/ (CNAME, .nojekyll, stylesheet links, feeds) for GitHub Pages deployment.",
);
