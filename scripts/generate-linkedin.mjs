import fs from "fs";
import puppeteer from "puppeteer";

const experience = JSON.parse(fs.readFileSync("experience.json", "utf-8"));
const topics = JSON.parse(fs.readFileSync("topics.json", "utf-8"));
const counts = JSON.parse(fs.readFileSync("topic-count.json", "utf-8"));

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatDate = (timestamp) =>
  new Date(timestamp).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "Asia/Manila" });

const renderRole = ({ position, company, date, location, active, responsibilities }) => {
  const isRemote = location.toLowerCase() === "remote";

  const fields = [
    ["Title", position],
    ["Company or organization", company],
    ["I am currently working in this role", active ? "Yes" : "No"],
    ["Start date", formatDate(date.start)],
    ["End date", date.end ? formatDate(date.end) : "Present"],
    ["Location", isRemote ? "—" : location],
    ["Location type", isRemote ? "Remote" : "On-site"],
  ];

  return [
    `## ${position} · ${company}`,
    ["| Field | Value |", "| --- | --- |", ...fields.map(([field, value]) => `| ${field} | ${value} |`)].join("\n"),
    `**Description**`,
    "```text\n" + responsibilities.map((item) => `• ${item}`).join("\n") + "\n```",
  ].join("\n\n");
};

const renderPill = ([topic, count]) => {
  const deviconClass = topics[topic]?.deviconClass;
  return `
    <span class="pill">
      ${deviconClass ? `<i class="${escapeHtml(deviconClass)}"></i>` : ""}
      <span>${escapeHtml(topic)}</span>
      <span class="count">${count}</span>
    </span>`;
};

function writeExperience() {
  const roles = experience
    .filter((role) => !role.hidden)
    .sort((a, b) => b.date.start - a.date.start);

  const today = new Date().toISOString().slice(0, 10);

  const markdown = [
    `# Experience`,
    `My work history, from most recent to earliest.`,
    ...roles.map(renderRole),
    `<sub>Updated weekly by GitHub Actions · ${today}</sub>`,
  ].join("\n\n");

  fs.writeFileSync("linkedin/EXPERIENCE.md", `${markdown}\n`);
  console.log(`Updated linkedin/EXPERIENCE.md with ${roles.length} roles`);
}

async function writeBanner() {
  const pills = Object.entries(counts).filter(([topic]) => topics[topic]).map(renderPill).join("");

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
  #banner { position: relative; width: 1400px; height: 350px; padding: 0 64px 36px 460px; display: flex; flex-direction: column; justify-content: center; background: var(--paper); overflow: hidden; }
  .eyebrow { display: flex; align-items: center; gap: 12px; font-family: var(--mono); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
  .logo { width: 28px; height: 28px; }
  h1 { margin-top: 10px; font-family: var(--serif); font-weight: 400; font-size: 72px; line-height: 0.9; letter-spacing: -0.02em; }
  h1 em { color: var(--brand-deep); }
  .tagline { margin-top: 10px; font-size: 18px; line-height: 1.5; color: var(--ink-soft); }
  .highlight { color: var(--ink); background: linear-gradient(transparent 58%, var(--brand) 58%, var(--brand) 92%, transparent 92%); padding: 0 0.1em; }
  .pills { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 8px; }
  .pill { display: flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 2px; padding: 5px 5px 5px 9px; font-family: var(--mono); font-size: 12px; color: var(--ink-soft); }
  .pill i { font-size: 14px; }
  .count { background: var(--paper-deep); border-radius: 2px; padding: 2px 6px; font-size: 10px; color: var(--muted); }
  .halo { position: absolute; left: 174px; top: 287px; border-radius: 50%; transform: translate(-50%, -50%); }
  .halo.glow { width: 300px; height: 300px; background: var(--brand); }
  .halo.ring { width: 360px; height: 360px; border: 2px solid var(--ink); }
  .halo.dash { width: 430px; height: 430px; border: 2px dashed var(--line); }
  .halo.scan { width: 560px; height: 560px; background: repeating-linear-gradient(0deg, rgb(26 23 20 / 0.06) 0px, rgb(26 23 20 / 0.06) 1px, transparent 1px, transparent 4px); -webkit-mask: radial-gradient(circle, #000 40%, transparent 70%); }
  .footer { position: absolute; z-index: 1; left: 0; right: 0; bottom: 0; height: 36px; padding: 0 64px; display: flex; align-items: center; justify-content: flex-end; gap: 24px; background: var(--ink); font-family: var(--mono); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: rgb(246 241 231 / 0.6); }
  .footer strong { color: var(--brand); font-weight: 400; }
</style>
</head>
<body>
  <div id="banner">
    <div class="halo scan"></div>
    <div class="halo dash"></div>
    <div class="halo ring"></div>
    <div class="halo glow"></div>
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
    <div class="footer">
      <span>See everything I build at</span>
      <strong>boseriko.com</strong>
    </div>
  </div>
</body>
</html>`;

  const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 350 });
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);

  const banner = await page.$("#banner");
  await banner.screenshot({ path: "linkedin/banner.png" });
  await browser.close();

  console.log("Updated linkedin/banner.png");
}

writeExperience();
await writeBanner();
