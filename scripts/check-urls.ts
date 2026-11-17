import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";
import { DIST, readInventory } from "./content.ts";
import { servesPath } from "./pages.ts";

const DEFAULT_ORIGIN = "https://joeharris76.com";
const MAX_HOPS = 6;
const CONCURRENCY = 8;

type Probe = { start: string; expected: string };
type Outcome = { probe: Probe; ok: boolean; chain: string[] };

function checkDist(origin: string): number {
  const problems: string[] = [];
  for (const urlPath of readInventory().paths) {
    if (!servesPath(DIST, urlPath)) problems.push(`legacy path not served: ${urlPath}`);
  }
  const files = readdirSync(DIST, { recursive: true, encoding: "utf8" }).filter((file) => /\.html$|\.xml$|\/default$|^default$/.test(file));
  const reference = /\b(href|src)=["']([^"']+)["']/g;
  for (const file of files) {
    const source = readFileSync(path.join(DIST, file), "utf8");
    for (const [, attribute, raw] of source.matchAll(reference)) {
      const value = raw.replace(/&amp;/g, "&");
      if (attribute === "src" && value.startsWith("http://")) problems.push(`${file}: insecure ${attribute} ${value}`);
      const local = value.startsWith(`${origin}/`) ? value.slice(origin.length) : value.startsWith("/") && !value.startsWith("//") ? value : undefined;
      if (local === undefined) continue;
      const urlPath = local.split(/[?#]/)[0];
      if (!servesPath(DIST, urlPath)) problems.push(`${file}: broken link ${value}`);
    }
  }
  for (const problem of problems) console.log(problem);
  console.log(`dist check: ${readInventory().paths.length} legacy paths, ${files.length} files, ${problems.length} problems`);
  return problems.length === 0 ? 0 : 1;
}

async function follow(probe: Probe): Promise<Outcome> {
  const chain: string[] = [];
  let url = probe.start;
  for (let hop = 0; hop <= MAX_HOPS; hop += 1) {
    let response: Response;
    try {
      response = await fetch(url, { redirect: "manual", headers: { "User-Agent": "joeharris76.com-url-check/1.0" }, signal: AbortSignal.timeout(20_000) });
    } catch (error) {
      chain.push(`${url} -> ${error instanceof Error ? (error.cause instanceof Error ? error.cause.message : error.message) : String(error)}`);
      return { probe, ok: false, chain };
    }
    await response.body?.cancel();
    const location = response.headers.get("location");
    chain.push(`${response.status} ${url}`);
    if (response.status >= 300 && response.status < 400 && location !== null) {
      url = new URL(location, url).href;
      continue;
    }
    const expected = new URL(probe.expected).href;
    return { probe, ok: response.status === 200 && (url === expected || url === `${expected}/`), chain };
  }
  return { probe, ok: false, chain: [...chain, "too many redirects"] };
}

async function runAll(probes: readonly Probe[]): Promise<Outcome[]> {
  const outcomes: Outcome[] = [];
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < probes.length) outcomes.push(await follow(probes[next++]));
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return outcomes;
}

async function checkLive(origin: string, legacy: boolean, windowSeconds: number): Promise<number> {
  const inventory = readInventory();
  const starts = legacy ? inventory.legacyOrigins : [origin];
  let pending: Probe[] = starts.flatMap((start) => inventory.paths.map((urlPath) => ({ start: `${start}${urlPath}`, expected: `${origin}${urlPath}` })));
  const total = pending.length;
  const deadline = performance.now() + windowSeconds * 1000;
  for (let attempt = 1; ; attempt += 1) {
    const failures = (await runAll(pending)).filter((outcome) => !outcome.ok);
    console.log(`attempt ${attempt}: ${total - failures.length} of ${total} reach ${origin}`);
    pending = failures.map((outcome) => outcome.probe);
    if (failures.length === 0) return 0;
    if (performance.now() >= deadline) {
      for (const failure of failures) console.log(`FAIL ${failure.probe.start}\n  ${failure.chain.join("\n  ")}`);
      return 1;
    }
    await sleep(Math.min(10_000, deadline - performance.now()));
  }
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { origin: { type: "string" }, legacy: { type: "boolean", default: false }, window: { type: "string", default: "0" } },
});
const origin = (values.origin || process.env.SITE_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, "");
const mode = positionals[0];
if (mode === "dist") process.exit(checkDist(origin));
if (mode === "live") process.exit(await checkLive(origin, values.legacy, Number(values.window)));
console.error("usage: check-urls.ts dist | live [--origin <url>] [--legacy] [--window <seconds>]");
process.exit(2);
