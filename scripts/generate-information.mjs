import fs from "fs";
import puppeteer from "puppeteer";

const username = "BosEriko";
const token = process.env.GITHUB_TOKEN;

const topics = JSON.parse(fs.readFileSync("topics.json", "utf-8"));
const counts = JSON.parse(fs.readFileSync("topic-count.json", "utf-8"));
const links = JSON.parse(fs.readFileSync("links.json", "utf-8"));
const packages = JSON.parse(fs.readFileSync("packages.json", "utf-8"));
const gems = JSON.parse(fs.readFileSync("gems.json", "utf-8"));
const contributions = JSON.parse(fs.readFileSync("contributions.json", "utf-8"));

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

async function fetchLatestRepos(topic, limit) {
  const res = await fetch(
    `https://api.github.com/search/repositories?q=user:${username}+topic:${topic}&sort=updated&order=desc&per_page=${limit}`,
    { headers }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return data.items ?? [];
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

const truncate = (text, length) => (text.length > length ? `${text.slice(0, length).trimEnd()}…` : text);

const renderRepoGrid = async (items) => {
  const cells = await Promise.all(
    items.map(async ({ repo, kind }) => {
      const cover = await resolveCover(repo);
      return `    <td width="33%" valign="top">
      <a href="${repo.html_url}"><img src="${escapeHtml(cover)}" alt="${escapeHtml(repo.name)}" width="100%" /></a>
      <br /><sub>${kind.toUpperCase()}</sub>
      <br /><b><a href="${repo.html_url}">${escapeHtml(repo.name)}</a></b>${repo.description ? `
      <br /><sub>${escapeHtml(truncate(repo.description, 120))}</sub>` : ""}
    </td>`;
    })
  );

  const rows = [];
  for (let i = 0; i < cells.length; i += 3) {
    const row = cells.slice(i, i + 3);
    while (row.length < 3) row.push(`    <td width="33%"></td>`);
    rows.push(`  <tr>\n${row.join("\n")}\n  </tr>`);
  }

  return `<table>\n${rows.join("\n")}\n</table>`;
};

async function resolveDevicon(deviconClass) {
  const [name, variant] = deviconClass.replace(/^devicon-/, "").split(/-(?=[^-]+$)/);
  const base = `https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons/${name}`;

  for (const url of [`${base}/${name}-${variant}.svg`, `${base}/${name}-original.svg`]) {
    const res = await fetch(url, { method: "HEAD" });
    if (res.ok) return url;
  }

  return null;
}

const badge = (label, color, logo) =>
  `https://img.shields.io/badge/${encodeURIComponent(label.replace(/-/g, "--"))}-${color.replace("#", "")}?style=for-the-badge&logo=${logo}&logoColor=white`;

const socialLogos = { xtwitter: "x" };

const renderReadme = async (products, projects, today) => {
  const latestWork = [
    ...products.map((repo) => ({ repo, kind: "product" })),
    ...projects.map((repo) => ({ repo, kind: "project" })),
  ].slice(0, Math.max(3, Math.floor((products.length + projects.length) / 3) * 3));

  const topicIcons = (
    await Promise.all(
      Object.entries(counts)
        .filter(([topic]) => topics[topic]?.deviconClass)
        .map(async ([topic, count]) => {
          const icon = await resolveDevicon(topics[topic].deviconClass);
          const title = `${topics[topic].title} · ${count} ${count === 1 ? "repository" : "repositories"}`;
          return icon && `<a href="https://boseriko.com/topic/${topic}" title="${escapeHtml(title)}"><img src="${icon}" alt="${escapeHtml(topics[topic].title)}" width="40" height="40" /></a>`;
        })
    )
  )
    .filter(Boolean)
    .join("&nbsp;&nbsp;\n");

  const openSource = [
    ...packages.map(({ name, link }) =>
      `<a href="${link}"><img src="https://img.shields.io/npm/v/${name}?style=for-the-badge&logo=npm&label=${encodeURIComponent(name)}&color=1a1714" alt="${escapeHtml(name)}" /></a>`
    ),
    ...gems.map(({ name, link }) =>
      `<a href="${link}"><img src="https://img.shields.io/gem/v/${name}?style=for-the-badge&logo=rubygems&label=${encodeURIComponent(name)}&color=1a1714" alt="${escapeHtml(name)}" /></a>`
    ),
    ...contributions.map(({ name, link, author }) =>
      `<a href="${link}"><img src="${badge(`${author.name}/${name}`, "#1a1714", "github")}" alt="${escapeHtml(`${author.name}/${name}`)}" /></a>`
    ),
  ];

  const socials = links.map(({ name, icon, url, color }) => {
    const slug = icon.replace(/^fa/, "").toLowerCase();
    return `<a href="${url}"><img src="${badge(name, color, socialLogos[slug] ?? slug)}" alt="${escapeHtml(name)}" /></a>`;
  });

  const sections = [
    `<a href="https://boseriko.com"><img src="github/banner.png" alt="Bos Eriko — boseriko.com" /></a>`,
    `### Hey, I'm Bos Eriko`,
    `A software engineer who likes anime and streaming. See everything I build at **[boseriko.com](https://boseriko.com)** or read my **[resume](https://boseriko.com/resume)**.`,
    latestWork.length && `#### Latest work\n\n${await renderRepoGrid(latestWork)}`,
    topicIcons && `#### Things I work with\n\n<p>\n${topicIcons}\n</p>`,
    openSource.length && `#### Open source\n\n<p>\n${openSource.join("\n")}\n</p>`,
    socials.length && `#### Connect\n\n<p>\n${socials.join("\n")}\n</p>`,
    `<sub>Updated weekly by GitHub Actions · ${today}</sub>`,
  ];

  return `${sections.filter(Boolean).join("\n\n")}\n`;
};

async function main() {
  const [products, projects] = await Promise.all([
    fetchLatestRepos("product", 3),
    fetchLatestRepos("project", 3),
  ]);

  const pills = Object.entries(counts).filter(([topic]) => topics[topic]).map(renderPill).join("");

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
  #banner { position: relative; width: 1500px; height: 360px; padding: 28px 56px 64px; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 48px; background: var(--paper); overflow: hidden; }
  .eyebrow { font-family: var(--mono); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
  .intro .eyebrow { display: flex; align-items: center; gap: 12px; }
  .logo { width: 28px; height: 28px; }
  h1 { margin-top: 10px; font-family: var(--serif); font-weight: 400; font-size: 72px; line-height: 0.9; letter-spacing: -0.02em; }
  h1 em { color: var(--brand-deep); }
  .tagline { margin-top: 10px; font-size: 18px; line-height: 1.5; color: var(--ink-soft); }
  .highlight { color: var(--ink); background: linear-gradient(transparent 58%, var(--brand) 58%, var(--brand) 92%, transparent 92%); padding: 0 0.1em; }
  .pills { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 8px; }
  .pill { display: flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 2px; padding: 5px 5px 5px 9px; font-family: var(--mono); font-size: 12px; color: var(--ink-soft); }
  .pill i { font-size: 14px; }
  .count { background: var(--paper-deep); border-radius: 2px; padding: 2px 6px; font-size: 10px; color: var(--muted); }
  .portrait { width: 240px; margin-right: 12px; border: 2px solid var(--ink); border-radius: 2px; background: var(--ink); box-shadow: 10px 10px 0 var(--brand); }
  .bar { display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; font-family: var(--mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: rgb(246 241 231 / 0.6); }
  .live { display: flex; align-items: center; gap: 6px; color: var(--paper); }
  .live::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: #ef4444; }
  .frame { position: relative; height: 200px; overflow: hidden; background: var(--paper-deep); }
  .frame img { width: 100%; height: 100%; object-fit: cover; display: block; filter: grayscale(40%); }
  .frame::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgb(26 23 20 / 0.18) 0px, rgb(26 23 20 / 0.18) 1px, transparent 1px, transparent 3px); }
  .corner { position: absolute; z-index: 1; width: 18px; height: 18px; border: 0 solid var(--brand); }
  .corner.tl { top: 10px; left: 10px; border-top-width: 2px; border-left-width: 2px; }
  .corner.tr { top: 10px; right: 10px; border-top-width: 2px; border-right-width: 2px; }
  .corner.bl { bottom: 10px; left: 10px; border-bottom-width: 2px; border-left-width: 2px; }
  .corner.br { bottom: 10px; right: 10px; border-bottom-width: 2px; border-right-width: 2px; }
  .tag { position: absolute; z-index: 1; left: 0; bottom: 18px; display: flex; flex-direction: column; align-items: flex-start; }
  .tag .name { background: var(--brand); padding: 3px 12px 3px 14px; font-family: var(--serif); font-size: 18px; line-height: 1.2; }
  .tag .handle { background: var(--ink); padding: 4px 12px 4px 14px; font-family: var(--mono); font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--paper); }
  .footer { position: absolute; left: 0; right: 0; bottom: 0; height: 36px; padding: 0 56px; display: flex; align-items: center; justify-content: space-between; background: var(--ink); font-family: var(--mono); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: rgb(246 241 231 / 0.6); }
  .footer strong { color: var(--brand); font-weight: 400; }
</style>
</head>
<body>
  <div id="banner">
    <div class="intro">
      <p class="eyebrow">
        <svg class="logo" viewBox="0 0 16 16" shape-rendering="crispEdges">
          <rect width="16" height="16" rx="2" fill="#1a1714"/>
          <path d="M9 2h2v2h-2zM11 4h2v3h-2zM8 7h3v2h-3zM11 9h2v3h-2zM9 12h2v2h-2z" fill="#f6f1e7"/>
          <path d="M3 2h2v12h-2zM5 2h4v2h-4zM5 7h3v2h-3zM5 12h4v2h-4z" fill="#f7b43d"/>
        </svg>
        Portfolio &mdash; Software Engineer
      </p>
      <h1>Bos <em>Eriko</em></h1>
      <p class="tagline">I&apos;m a software engineer who likes <span class="highlight">anime</span> and <span class="highlight">streaming</span>.</p>
      <div class="pills">${pills}</div>
    </div>
    <div class="portrait">
      <div class="bar"><span class="live">On air</span><span>cam_01</span></div>
      <div class="frame">
        <img src="https://avatars.githubusercontent.com/${username}" alt="" />
        <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
        <div class="tag"><span class="name">Bos Eriko</span><span class="handle">Software engineer &middot; @${username}</span></div>
      </div>
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
  await page.setViewport({ width: 1500, height: 360, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);

  const banner = await page.$("#banner");
  await banner.screenshot({ path: "github/banner.png" });
  await browser.close();

  console.log("Updated github/banner.png");

  fs.writeFileSync("README.md", await renderReadme(products, projects, today));
  console.log("Updated README.md");
}

main();
