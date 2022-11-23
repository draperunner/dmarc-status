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
    return dmarcRecord ? parseDmarcRecord(hostname, dmarcRecord) : undefined;
  } catch (error) {
    return undefined;
  }
}

function parseDmarcRecord(domain, stringRecord) {
  return {
    domain,
    v: /v=(\w+)/.exec(stringRecord)?.[1],
    p: /p=(\w+)/.exec(stringRecord)?.[1],
  };
}

function policyValue(dmarcRecord) {
  return ["none", "quarantine", "reject"].indexOf(dmarcRecord.p);
}

function comparator(dmarcA, dmarcB) {
  const policyDiff = policyValue(dmarcA) - policyValue(dmarcB);
  if (policyDiff != 0) {
    return policyDiff;
  }

  return dmarcA.domain.localeCompare(dmarcB.domain);
}

async function main() {
  const policies = [];

  for (const domain of DOMAINS) {
    const dmarc = await getDmarcRecord(domain);

    policies.push({
      domain,
      ...(dmarc || {}),
    });
  }

  const tableRows = [...policies]
    .sort(comparator)
    .map(
      ({ domain, p }) =>
        `<tr><td>${domain}</td><td class="${p ?? "non-existent"}">${
          p ?? "DMARC manglar!"
        }</td></tr>`
    );

  const htmlTemplate = readFileSync("./src/index.html", "utf-8");
  const populatedTemplate = htmlTemplate.replace(
    "{{TABLE_ROWS}}",
    tableRows.join("\n")
  );

  mkdirSync("./dist", { recursive: true });
  writeFileSync("./dist/index.html", populatedTemplate, "utf-8");
}

main();
