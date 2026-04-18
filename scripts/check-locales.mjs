import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const enPath = path.join(root, "app/locales/en.json");
const frPath = path.join(root, "app/locales/fr.json");

function flatten(obj, prefix = "") {
  const out = [];
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out.push(...flatten(value, next));
    } else {
      out.push(next);
    }
  }
  return out;
}

const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const fr = JSON.parse(fs.readFileSync(frPath, "utf8"));

const enKeys = new Set(flatten(en));
const frKeys = new Set(flatten(fr));

const missingInFr = [...enKeys].filter(key => !frKeys.has(key));
const extraInFr = [...frKeys].filter(key => !enKeys.has(key));

if (missingInFr.length || extraInFr.length) {
  if (missingInFr.length) {
    console.error("Missing keys in fr.json:");
    for (const key of missingInFr) console.error(`- ${key}`);
  }
  if (extraInFr.length) {
    console.error("Extra keys in fr.json:");
    for (const key of extraInFr) console.error(`- ${key}`);
  }
  process.exit(1);
}

console.log("Locale key parity check passed.");
