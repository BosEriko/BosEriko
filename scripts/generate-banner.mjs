import fs from "fs";
import puppeteer from "puppeteer";

const username = "BosEriko";
const token = process.env.GITHUB_TOKEN;

const topics = JSON.parse(fs.readFileSync("topics.json", "utf-8"));
const counts = JSON.parse(fs.readFileSync("topic-count.json", "utf-8"));

const headers = {
  Accept: "application/vnd.github+json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

async function fetchLatestRepo(topic) {
  const res = await fetch(
    `https://api.github.com/search/repositories?q=user:${username}+topic:${topic}&sort=updated&order=desc&per_page=1`,
    { headers }
  );

  if (!res.ok) return null;

  const data = await res.json();
  return data.items?.[0] ?? null;
}

async function resolveCover(repo) {
  const coverUrl = `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch}/COVER.png`;
  const res = await fetch(coverUrl, { method: "HEAD" });
  return res.ok ? coverUrl : `https://opengraph.githubassets.com/${repo.node_id}/${repo.full_name}`;
}

const renderPill = ([topic, count]) => {
  const deviconClass = topics[topic]?.deviconClass;
  return `
    <span class="pill">
      ${deviconClass ? `<i class="${escapeHtml(deviconClass)}"></i>` : ""}
      <span>${escapeHtml(topic)}</span>
      <span class="count">${count}</span>
    </span>`;
};

const renderCard = async (label, repo) => {
  if (!repo) return "";

  const cover = await resolveCover(repo);
  return `
    <div class="card">
      <p class="eyebrow">Latest ${label}</p>
      <div class="window">
        <div class="bar">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot brand"></span>
          <span class="label">${escapeHtml(repo.full_name.toLowerCase())}</span>
        </div>
        <div class="cover"><img src="${escapeHtml(cover)}" alt="" /></div>
      </div>
      <h2>${escapeHtml(repo.name)}</h2>
      <p class="description">${escapeHtml(repo.description)}</p>
    </div>`;
};

async function main() {
  const [product, project] = await Promise.all([
    fetchLatestRepo("product"),
    fetchLatestRepo("project"),
  ]);

  const pills = Object.entries(counts).filter(([topic]) => topics[topic]).map(renderPill).join("");
  const cards = (await Promise.all([renderCard("product", product), renderCard("project", project)])).join("");

  const today = new Date().toISOString().slice(0, 10);

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono&family=Instrument+Serif:ital@0;1&display=block" rel="stylesheet" />
<link href="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/devicon.min.css" rel="stylesheet" />
<style>
  :root {
    --paper: #f6f1e7;
    --paper-deep: #ede5d6;
    --ink: #1a1714;
    --ink-soft: #3d3730;
    --muted: #776e62;
    --line: #ddd3c2;
    --brand: #f7b43d;
    --brand-deep: #9a6300;
    --sans: "Geist", ui-sans-serif, system-ui, sans-serif;
    --mono: "Geist Mono", ui-monospace, monospace;
    --serif: "Instrument Serif", ui-serif, Georgia, serif;
  }
  * { box-sizing: border-box; margin: 0; }
  body { background: var(--paper); color: var(--ink); font-family: var(--sans); -webkit-font-smoothing: antialiased; }
  #banner { width: 1200px; padding: 56px 64px 40px; background: var(--paper); }
  .header { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 32px; }
  .eyebrow { font-family: var(--mono); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
  h1 { margin-top: 16px; font-family: var(--serif); font-weight: 400; font-size: 112px; line-height: 0.9; letter-spacing: -0.02em; }
  h1 em { color: var(--brand-deep); }
  .tagline { margin-top: 24px; font-size: 22px; line-height: 1.5; color: var(--ink-soft); }
  .highlight { color: var(--ink); background: linear-gradient(transparent 58%, var(--brand) 58%, var(--brand) 92%, transparent 92%); padding: 0 0.1em; }
  .logo { width: 96px; height: 96px; transform: rotate(-12deg); box-shadow: 8px 8px 0 var(--brand); border-radius: 2px; }
  .section { margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--line); }
  .pills { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px; }
  .pill { display: flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 2px; padding: 6px 6px 6px 10px; font-family: var(--mono); font-size: 13px; color: var(--ink-soft); }
  .pill i { font-size: 15px; }
  .count { background: var(--paper-deep); border-radius: 2px; padding: 2px 6px; font-size: 11px; color: var(--muted); }
  .cards { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .card .eyebrow { margin-bottom: 12px; }
  .window { border: 2px solid var(--ink); border-radius: 2px; background: var(--ink); box-shadow: 8px 8px 0 var(--brand); }
  .bar { display: flex; align-items: center; gap: 6px; padding: 8px 10px; }
  .dot { width: 6px; height: 6px; background: rgb(246 241 231 / 0.25); }
  .dot.brand { background: var(--brand); }
  .label { margin-left: 8px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.05em; color: rgb(246 241 231 / 0.6); }
  .cover { aspect-ratio: 2 / 1; overflow: hidden; background: var(--paper-deep); }
  .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  h2 { margin-top: 24px; font-family: var(--serif); font-weight: 400; font-size: 32px; line-height: 1.1; }
  .description { margin-top: 8px; font-size: 15px; line-height: 1.6; color: var(--ink-soft); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; font-family: var(--mono); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
  .footer strong { color: var(--ink); font-weight: 400; }
</style>
</head>
<body>
  <div id="banner">
    <div class="header">
      <div>
        <p class="eyebrow">Portfolio &mdash; Software Engineer</p>
        <h1>Bos <em>Eriko</em></h1>
        <p class="tagline">I&apos;m a software engineer who likes <span class="highlight">anime</span> and <span class="highlight">streaming</span>.</p>
      </div>
      <svg class="logo" viewBox="0 0 16 16" shape-rendering="crispEdges">
        <rect width="16" height="16" rx="2" fill="#1a1714"/>
        <path d="M9 2h2v2h-2zM11 4h2v3h-2zM8 7h3v2h-3zM11 9h2v3h-2zM9 12h2v2h-2z" fill="#f6f1e7"/>
        <path d="M3 2h2v12h-2zM5 2h4v2h-4zM5 7h3v2h-3zM5 12h4v2h-4z" fill="#f7b43d"/>
      </svg>
    </div>
    <div class="section">
      <p class="eyebrow">Things I work with</p>
      <div class="pills">${pills}</div>
    </div>
    <div class="section">
      <div class="cards">${cards}</div>
    </div>
    <div class="footer">
      <strong>boseriko.com</strong>
      <span>Updated ${today}</span>
    </div>
  </div>
</body>
</html>`;

  const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);

  const banner = await page.$("#banner");
  await banner.screenshot({ path: "banner.png" });
  await browser.close();

  console.log("Updated banner.png");
}

main();
