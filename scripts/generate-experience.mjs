import fs from "fs";

const experience = JSON.parse(fs.readFileSync("experience.json", "utf-8"));

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

function main() {
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

  fs.writeFileSync("EXPERIENCE.md", `${markdown}\n`);
  console.log(`Updated EXPERIENCE.md with ${roles.length} roles`);
}

main();
