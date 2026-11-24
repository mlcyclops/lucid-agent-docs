// Real-browser gate over dist/: on every page with an annotated screenshot, the callout layer must sit exactly on
// its image (same box, within half a pixel) and every callout box must fall inside the image. A static check cannot
// see this: Starlight's markdown margins once pushed every layer 16 px below its image and nothing else failed.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, process.env.DOCS_DIST ?? "dist");
const chrome = process.env.CHROME_PATH ?? [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => existsSync(p));
if (!chrome) {
  console.error("check-overlays: no Chrome found; set CHROME_PATH");
  process.exit(1);
}

const pages = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name === "index.html") pages.push("/" + relative(DIST, dir).split(sep).filter(Boolean).map((s) => `${s}/`).join(""));
  }
})(DIST);

const server = Bun.serve({
  port: 0,
  hostname: "127.0.0.1",
  fetch(req) {
    let path = decodeURIComponent(new URL(req.url).pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = Bun.file(join(DIST, path));
    return file.size ? new Response(file) : new Response("not found", { status: 404 });
  },
});

const problems = [];
let checked = 0;
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, defaultViewport: { width: 1280, height: 900 } });
try {
  for (const width of [1280, 420]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    for (const path of pages) {
      await page.goto(`http://127.0.0.1:${server.port}${path}`, { waitUntil: "load" });
      await page.evaluate(() => Promise.all([...document.querySelectorAll(".shot img")].map((i) => { i.loading = "eager"; return i.decode().catch(() => {}); })));
      const found = await page.evaluate(() => [...document.querySelectorAll(".shot-frame")].map((f) => {
        const img = f.querySelector("img"), svg = f.querySelector("svg");
        if (!svg) return null;
        const a = img.getBoundingClientRect(), b = svg.getBoundingClientRect();
        const [, , vw, vh] = svg.getAttribute("viewBox").split(" ").map(Number);
        const outside = [...svg.querySelectorAll(".shot-box")].filter((r) => {
          const x = +r.getAttribute("x"), y = +r.getAttribute("y"), w = +r.getAttribute("width"), h = +r.getAttribute("height");
          return x < -1 || y < -1 || x + w > vw + 1 || y + h > vh + 1;
        }).length;
        const dots = [...svg.querySelectorAll(".shot-dot")].map((c) => [+c.getAttribute("cx"), +c.getAttribute("cy"), +c.getAttribute("r")]);
        const clashes = dots.filter((d, i) => dots.some((e, j) => j < i && Math.hypot(d[0] - e[0], d[1] - e[1]) < d[2] + e[2])).length;
        return { src: img.getAttribute("src"), img: [a.x, a.y, a.width, a.height], svg: [b.x, b.y, b.width, b.height], outside, clashes };
      }).filter(Boolean));
      for (const f of found) {
        checked++;
        if (f.img.some((v, i) => Math.abs(v - f.svg[i]) > 0.5)) problems.push(`${path} @${width}px ${f.src}: callouts at ${f.svg.map(Math.round)} but image at ${f.img.map(Math.round)}`);
        if (f.outside) problems.push(`${path} ${f.src}: ${f.outside} callout box(es) outside the image`);
        if (f.clashes) problems.push(`${path} ${f.src}: ${f.clashes} callout number(s) on top of another`);
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.stop(true);
}

if (problems.length) {
  console.error(`check-overlays: ${problems.length} problem(s)\n` + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`check-overlays: ${checked} annotated screenshots on ${pages.length} pages at 1280 and 420 px, every layer on its image`);
