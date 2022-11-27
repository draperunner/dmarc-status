import { resolveTxt } from "dns";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

import DOMAINS from "./domains.json" assert { type: "json" };

function getTxtRecords(hostname) {
  return new Promise((resolve, reject) =>
    resolveTxt(hostname, (err, records) =>
      err
        ? reject(err)
        : resolve(records.map((recordParts) => recordParts.join("")))
    )
  );
}

async function getDmarcRecord(hostname) {
  try {
    const records = await getTxtRecords("_dmarc." + hostname);
    const dmarcRecord = records.find((record) => record.includes("v=DMARC"));
    return dmarcRecord ? parseDmarcRecord(dmarcRecord) : undefined;
  } catch (error) {
    return undefined;
  }
}

function parseDmarcRecord(stringRecord) {
  return {
    v: /v=(\w+)/.exec(stringRecord)?.[1],
    p: /p=(\w+)/.exec(stringRecord)?.[1],
  };
}

function policyHeader(policy) {
  switch (policy) {
    case "none":
      return "None&nbsp;☹️";
    case "quarantine":
      return "Quarantine&nbsp;🫤";
    case "reject":
      return "Reject&nbsp;✅";
    default:
      return "DMARC manglar!&nbsp;❌";
  }
}

function getTimeElement() {
  const now = new Date();
  return `<time datetime="${now.toISOString()}">${now.toLocaleString(
    "no"
  )}</time>`;
}

async function main() {
  const dmarcs = [];

  for (const domain of DOMAINS) {
    const dmarc = await getDmarcRecord(domain);

    dmarcs.push({
      domain,
      ...(dmarc || {}),
    });
  }

  const htmlContent = [undefined, "none", "quarantine", "reject"].flatMap(
    (policy) => {
      return [
        "<div>",
        `<h2>${policyHeader(policy)}</h2>`,
        "<ul>",
        ...dmarcs
          .filter(({ p }) => policy === p)
          .sort((a, b) => a.domain.localeCompare(b.domain))
          .map(
            ({ domain }) =>
              `<li><a href="https://${domain}" target="_blank">${domain}</a></li>`
          ),
        "</ul>",
        "</div>",
      ];
    }
  );

  const htmlTemplate = readFileSync("./src/index.html", "utf-8");
  const populatedTemplate = htmlTemplate
    .replace("{{CONTENT}}", htmlContent.join("\n"))
    .replace("{{UPDATED_AT}}", getTimeElement());

  mkdirSync("./dist", { recursive: true });
  writeFileSync("./dist/index.html", populatedTemplate, "utf-8");
}

main();
