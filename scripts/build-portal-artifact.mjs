#!/usr/bin/env node
/**
 * Builds a self-contained, single-file HTML preview of the seller portal.
 *
 * The step content (labels, copy, checklists, help resources, services and
 * vendors) is read straight out of src/lib/seller-journey.ts, so the preview
 * never drifts from the app's bundled defaults. Fonts, the logo and the
 * placeholder help video are inlined as data URIs, which makes the result
 * portable enough to publish as an artifact or email as an attachment — it
 * needs no server, no network and no build step to open.
 *
 * Usage:
 *   npm run build:artifact
 *   node scripts/build-portal-artifact.mjs --out path/to/file.html
 *
 * Note: the preview reflects bundled defaults only. Step content saved through
 * the admin content editor lives in the database and is not included here.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const paths = {
  journey: resolve(repoRoot, "src/lib/seller-journey.ts"),
  template: resolve(here, "artifact/portal.template.html"),
  font: resolve(here, "artifact/eb-garamond-latin.woff2"),
  logo: resolve(repoRoot, "public/assets/images/logo/settled-logo.png"),
  video: resolve(repoRoot, "public/videos/help-placeholder.mp4"),
};

/**
 * Returns the object or array literal that follows a declaration, by matching
 * brackets while skipping over string contents.
 */
function readLiteral(source, declarationPattern, label) {
  const match = source.match(declarationPattern);

  if (!match) {
    throw new Error(`Could not find the ${label} declaration in seller-journey.ts.`);
  }

  const start = match.index + match[0].length - 1;
  const openChar = source[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let quote = null;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (char === "\\") {
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
    } else if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  throw new Error(`Unbalanced brackets while reading ${label} from seller-journey.ts.`);
}

/** Evaluates the extracted literals. They are plain data, free of type syntax. */
function extractJourneyData(source) {
  const literals = {
    stateMeta: readLiteral(source, /export const stateMeta[^=]*= \{/, "stateMeta"),
    journeyStates: readLiteral(source, /export const journeyStates[^=]*= \[/, "journeyStates"),
    transitionMap: readLiteral(source, /const transitionMap[^=]*= \{/, "transitionMap"),
    sampleJourney: readLiteral(source, /export const sampleJourney[^=]*= \{/, "sampleJourney"),
  };

  // The two shared asset constants are resolved by the template at runtime.
  literals.stateMeta = literals.stateMeta
    .replace(/helpVideoPlaceholderUrl/g, '"video-placeholder"')
    .replace(/helpGuidePlaceholderUrl/g, '"guide-placeholder"');

  const script = Object.entries(literals)
    .map(([name, literal]) => `const ${name} = ${literal};`)
    .join("\n");

  const context = vm.createContext({});
  vm.runInContext(`${script}\nresult = { stateMeta, journeyStates, transitionMap, sampleJourney };`, context);

  return context.result;
}

async function dataUri(path) {
  return (await readFile(path)).toString("base64");
}

function parseOutPath(argv) {
  const index = argv.indexOf("--out");
  const custom = index !== -1 ? argv[index + 1] : null;
  return resolve(repoRoot, custom || "build/artifacts/settled-seller-portal.html");
}

async function main() {
  const [source, template] = await Promise.all([
    readFile(paths.journey, "utf8"),
    readFile(paths.template, "utf8"),
  ]);

  const data = extractJourneyData(source);
  const [font, logo, video] = await Promise.all([
    dataUri(paths.font),
    dataUri(paths.logo),
    dataUri(paths.video),
  ]);

  const html = template
    .replace("__JOURNEY_JSON__", JSON.stringify(data))
    .replace("__FONT_B64__", font)
    .replace("__LOGO_B64__", logo)
    .replace("__VIDEO_B64__", video);

  const leftover = html.match(/__[A-Z_]+__/);
  if (leftover) {
    throw new Error(`Template placeholder ${leftover[0]} was never filled.`);
  }

  const outPath = parseOutPath(process.argv.slice(2));
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, html);

  const vendors = Object.values(data.stateMeta).reduce(
    (total, stage) => total + stage.associatedServices.reduce((sum, service) => sum + service.vendors.length, 0),
    0,
  );
  const tasks = Object.values(data.stateMeta).reduce((total, stage) => total + stage.checklist.length, 0);

  console.log(`Built ${outPath}`);
  console.log(
    `${data.journeyStates.length} steps · ${tasks} tasks · ${vendors} vendors · ${(html.length / 1024 / 1024).toFixed(2)} MB`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
