import { resolveTxt } from "node:dns/promises";
import { readFile, writeFile, mkdir, open } from "node:fs/promises";

async function getTxtRecords(hostname) {
  const records = await resolveTxt(hostname);
  return records.map((recordParts) => recordParts.join(""));
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
      return "Quarantine&nbsp;🤔";
    case "reject":
      return "Reject&nbsp;✅";
    default:
      return "DMARC manglar!&nbsp;❌";
  }
}

function getTimeElement() {
  const now = new Date();
  return `<time datetime="${now.toISOString()}">${now.toLocaleString(
    "no",
  )}</time>`;
}

async function main() {
  const dmarcs = [];

  const domainsFile = await open("./domains.txt");

  for await (const domain of domainsFile.readLines()) {
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
              `<li><a href="https://${domain}" target="_blank">${domain}</a></li>`,
          ),
        "</ul>",
        "</div>",
      ];
    },
  );

  const htmlTemplate = await readFile("./src/index.html", "utf-8");
  const populatedTemplate = htmlTemplate
    .replace("{{CONTENT}}", htmlContent.join("\n"))
    .replace("{{UPDATED_AT}}", getTimeElement());

  await mkdir("./dist", { recursive: true });
  await writeFile("./dist/index.html", populatedTemplate, "utf-8");
}

main();
