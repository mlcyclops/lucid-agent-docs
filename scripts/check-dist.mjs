// Post-build gate over dist/: fails the build on
//   - any <img> without an alt attribute, or a page-content image whose alt is empty;
//   - any <video> without a <track kind="captions">;
//   - any page or shot file that uses an em dash (house style);
//   - a missing sitemap (the app's in-app links are checked against it, ADR-0660 step 5);
//   - a shot in src/shots/manifest.json whose image file is missing from public/shots/.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, process.env.DOCS_DIST ?? "dist");
const problems = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

if (!existsSync(DIST)) {
  console.error("dist/ is missing. Run astro build first.");
  process.exit(1);
}

const pages = walk(DIST).filter((p) => p.endsWith(".html"));
for (const file of pages) {
  const html = readFileSync(file, "utf8");
  const where = relative(DIST, file);
  const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? "";
  // The page body proper: from Starlight's markdown container to the page footer. The hero and the site logo are
  // decorative (empty alt); a picture inside the text, or any screenshot, must describe itself.
  const start = main.indexOf("sl-markdown-content");
  const content = start < 0 ? "" : main.slice(start, main.indexOf("<footer", start) >>> 0);
  const hasAlt = (tag) => /\salt(?:=|[\s>])/.test(tag);
  const emptyAlt = (tag) => /\salt(?:=""|[\s>])/.test(tag);
  for (const tag of html.match(/<img\b[^>]*>/g) ?? []) {
    if (!hasAlt(tag)) problems.push(`${where}: <img> without alt: ${tag.slice(0, 120)}`);
    else if (emptyAlt(tag) && /\ssrc="\/shots\//.test(tag)) problems.push(`${where}: screenshot with empty alt: ${tag.slice(0, 120)}`);
  }
  for (const tag of content.match(/<img\b[^>]*>/g) ?? []) {
    if (emptyAlt(tag)) problems.push(`${where}: content image with empty alt: ${tag.slice(0, 120)}`);
  }
  for (const video of html.match(/<video\b[\s\S]*?<\/video>/g) ?? []) {
    if (!/<track\b[^>]*kind="captions"/.test(video)) problems.push(`${where}: <video> without a captions track`);
  }
  const text = main.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
  if (text.includes("\u2014")) problems.push(`${where}: contains an em dash`);
}

if (!existsSync(join(DIST, "sitemap-index.xml"))) problems.push("dist/sitemap-index.xml is missing");

const SHOTS = join(ROOT, "src", "shots");
let shotCount = 0;
for (const name of existsSync(SHOTS) ? readdirSync(SHOTS).filter((n) => n.endsWith(".json")) : []) {
  const fragment = JSON.parse(readFileSync(join(SHOTS, name), "utf8"));
  for (const [id, shot] of Object.entries(fragment.shots)) {
    shotCount++;
    if (!existsSync(join(ROOT, "public", "shots", shot.file))) problems.push(`shot ${id} (${name}): public/shots/${shot.file} is missing`);
  }
}

// A shot file no manifest names is a leftover from an older capture: it ships without anyone checking it.
const named = new Set();
for (const name of existsSync(SHOTS) ? readdirSync(SHOTS).filter((n) => n.endsWith(".json")) : []) {
  for (const shot of Object.values(JSON.parse(readFileSync(join(SHOTS, name), "utf8")).shots)) named.add(shot.file);
}
for (const file of readdirSync(join(ROOT, "public", "shots"))) {
  if (!named.has(file)) problems.push(`public/shots/${file} is in no src/shots/*.json manifest (a leftover capture)`);
}

if (problems.length) {
  console.error(`check-dist: ${problems.length} problem(s)\n` + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`check-dist: ${pages.length} pages, ${shotCount} shots, no problems`);
