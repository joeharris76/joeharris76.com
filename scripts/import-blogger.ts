import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  CONTENT,
  INVENTORY,
  POSTS,
  PUBLIC,
  commentFeedPath,
  labelPath,
  legacyMonthArchivePath,
  monthPath,
  postNumber,
  serializePost,
  type Comment,
  type LegacyInventory,
  type PostMeta,
  type Site,
} from "./content.ts";

const SOURCE = process.argv[2] ?? "http://blog.joeharris76.com";
const PAGE_SIZE = 150;
const SITE_AUTHOR = "Joe Harris";
const LEGACY_ORIGINS = [
  "http://blog.joeharris76.com",
  "https://blog.joeharris76.com",
  "http://www.joeharris76.com",
  "https://www.joeharris76.com",
  "http://joeharris76.com",
];
const SYSTEM_PATHS = ["/", "/search", "/atom.xml", "/rss.xml", "/feeds/posts/default", "/feeds/comments/default", "/sitemap.xml", "/robots.txt", "/favicon.ico"];
const OWN_LINK = /\bhref=(["'])https?:\/\/(?:joeharris76\.blogspot\.com|blog\.joeharris76\.com|www\.joeharris76\.com|joeharris76\.com)(\/[^"']*)?\1/gi;
const BLOGGER_IMAGE = /(?:https?:)?\/\/(?:blogger\.googleusercontent\.com|\d+\.bp\.blogspot\.com|lh\d+\.googleusercontent\.com)\/[^"'\s<>)]+/g;
const INSECURE_EMBED = /(<(?:img|iframe|embed|script|source|video|audio)\b[^>]*?\bsrc=["'])http:\/\//gi;

type Text = { $t: string };
type Entry = {
  id: Text;
  published: Text;
  updated: Text;
  title: Text;
  content?: Text;
  link: { rel: string; href: string }[];
  category?: { term: string }[];
  author: { name: Text; uri?: Text }[];
  "thr$in-reply-to"?: { ref: string };
};
type FeedPage = { feed: { id: Text; title: Text; entry?: Entry[]; "openSearch$totalResults": Text } };
type Feed = { id: string; title: string; entries: Entry[] };
type Exclusion = { id: string; reason: string };

async function fetchFeed(pathname: string): Promise<Feed> {
  const entries: Entry[] = [];
  let first: FeedPage["feed"] | undefined;
  for (let start = 1; ; start += PAGE_SIZE) {
    const url = `${SOURCE}${pathname}?alt=json&max-results=${PAGE_SIZE}&start-index=${start}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    const page = ((await response.json()) as FeedPage).feed;
    first ??= page;
    entries.push(...(page.entry ?? []));
    if ((page.entry ?? []).length < PAGE_SIZE) break;
  }
  const total = Number(first.openSearch$totalResults.$t);
  if (entries.length !== total) throw new Error(`${pathname}: fetched ${entries.length} of ${total} entries`);
  return { id: first.id.$t, title: first.title.$t, entries };
}

function alternatePath(entry: Entry): string {
  const href = entry.link.find((link) => link.rel === "alternate")?.href;
  if (href === undefined) throw new Error(`${entry.id.$t}: no alternate link`);
  const pathname = new URL(href).pathname;
  if (!/^\/\d{4}\/\d{2}\/[a-z0-9_-]+\.html$/.test(pathname)) throw new Error(`${entry.id.$t}: unexpected post path ${pathname}`);
  return pathname;
}

function imageFileName(url: URL, taken: ReadonlySet<string>): string {
  const segments = url.pathname.split("/");
  const original = decodeURIComponent((segments.at(-1) ?? "image").replace(/\+/g, " "));
  const extension = path.extname(original).toLowerCase();
  const stem = path.basename(original, path.extname(original)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "image";
  const size = /^[swh]\d+/.test(segments.at(-2) ?? "") ? `-${segments.at(-2)}` : "";
  const name = `${stem}${size}${extension}`;
  if (!taken.has(name)) return name;
  return `${stem}${size}-${createHash("sha256").update(url.href).digest("hex").slice(0, 8)}${extension}`;
}

async function localizeImages(html: string, images: Map<string, string>): Promise<string> {
  for (const reference of new Set(html.match(BLOGGER_IMAGE) ?? [])) {
    if (images.has(reference)) continue;
    const url = new URL(reference.startsWith("//") ? `https:${reference}` : reference.replace(/^http:/, "https:"));
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url.href}: HTTP ${response.status}`);
    const name = imageFileName(url, new Set([...images.values()].map((local) => path.basename(local))));
    writeFileSync(path.join(PUBLIC, "images", name), new Uint8Array(await response.arrayBuffer()));
    images.set(reference, `/images/${name}`);
  }
  return html.replace(BLOGGER_IMAGE, (reference) => images.get(reference) ?? reference);
}

function rewriteBody(html: string): { html: string; ownLinks: number; upgraded: string[] } {
  let ownLinks = 0;
  const upgraded: string[] = [];
  const relinked = html.replace(OWN_LINK, (_match, quote: string, pathname: string | undefined) => {
    ownLinks += 1;
    return `href=${quote}${pathname ?? "/"}${quote}`;
  });
  const secured = relinked.replace(INSECURE_EMBED, (_match, prefix: string, offset: number) => {
    upgraded.push(relinked.slice(offset + prefix.length, offset + prefix.length + 80).split(/["']/)[0]);
    return `${prefix}https://`;
  });
  return { html: secured, ownLinks, upgraded };
}

function toComment(entry: Entry): Comment {
  const author = entry.author[0];
  const authorUrl = author?.uri?.$t;
  return {
    id: postNumber(entry.id.$t),
    author: author?.name.$t.trim() || "Anonymous",
    ...(authorUrl ? { authorUrl } : {}),
    published: entry.published.$t,
    html: entry.content?.$t ?? "",
  };
}

async function downloadFavicon(): Promise<void> {
  const response = await fetch(`${SOURCE}/favicon.ico`);
  if (!response.ok) throw new Error(`favicon: HTTP ${response.status}`);
  writeFileSync(path.join(PUBLIC, "favicon.ico"), new Uint8Array(await response.arrayBuffer()));
}

async function main(): Promise<void> {
  const excluded = new Map(
    (JSON.parse(readFileSync(path.join(INVENTORY, "excluded-comments.json"), "utf8")) as Exclusion[]).map((item) => [item.id, item.reason]),
  );
  const [posts, comments] = await Promise.all([fetchFeed("/feeds/posts/default"), fetchFeed("/feeds/comments/default")]);

  const commentsByPost = new Map<string, Comment[]>();
  const skipped: string[] = [];
  for (const entry of comments.entries) {
    const comment = toComment(entry);
    if (excluded.has(comment.id)) {
      skipped.push(`${comment.id} (${excluded.get(comment.id)})`);
      continue;
    }
    const postId = entry["thr$in-reply-to"]?.ref;
    if (postId === undefined) throw new Error(`comment ${comment.id} has no parent post`);
    commentsByPost.set(postId, [...(commentsByPost.get(postId) ?? []), comment]);
  }
  const missingExclusions = [...excluded.keys()].filter((id) => !comments.entries.some((entry) => postNumber(entry.id.$t) === id));
  if (missingExclusions.length > 0) throw new Error(`excluded comments not found in the feed: ${missingExclusions.join(", ")}`);

  rmSync(POSTS, { recursive: true, force: true });
  rmSync(path.join(PUBLIC, "images"), { recursive: true, force: true });
  mkdirSync(path.join(PUBLIC, "images"), { recursive: true });

  const images = new Map<string, string>();
  const metas: (PostMeta & { path: string })[] = [];
  let ownLinks = 0;
  const upgraded: string[] = [];
  for (const entry of posts.entries) {
    const urlPath = alternatePath(entry);
    const rewritten = rewriteBody(await localizeImages(entry.content?.$t ?? "", images));
    ownLinks += rewritten.ownLinks;
    upgraded.push(...rewritten.upgraded);
    const meta: PostMeta = {
      id: entry.id.$t,
      title: entry.title.$t,
      published: entry.published.$t,
      updated: entry.updated.$t,
      labels: (entry.category ?? []).map((category) => category.term),
      comments: (commentsByPost.get(entry.id.$t) ?? []).sort((left, right) => left.published.localeCompare(right.published)),
    };
    commentsByPost.delete(entry.id.$t);
    const file = path.join(POSTS, ...urlPath.slice(1).split("/"));
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, serializePost(meta, rewritten.html));
    metas.push({ ...meta, path: urlPath });
  }
  if (commentsByPost.size > 0) throw new Error(`comments for unknown posts: ${[...commentsByPost.keys()].join(", ")}`);

  await downloadFavicon();
  const site: Site = { title: posts.title, author: SITE_AUTHOR, feedId: posts.id };
  writeFileSync(path.join(CONTENT, "site.json"), `${JSON.stringify(site, null, 2)}\n`);

  const labels = [...new Set(metas.flatMap((meta) => meta.labels))].sort();
  const years = [...new Set(metas.map((meta) => `/${meta.published.slice(0, 4)}/`))];
  const months = [...new Set(metas.map((meta) => monthPath(meta.published)))];
  const legacyMonths = [...new Set(metas.map((meta) => legacyMonthArchivePath(meta.published)))];
  const inventory: LegacyInventory = {
    legacyOrigins: LEGACY_ORIGINS,
    paths: [
      ...SYSTEM_PATHS,
      ...metas.map((meta) => meta.path).sort(),
      ...years.sort(),
      ...months.sort(),
      ...legacyMonths.sort(),
      ...labels.map(labelPath),
      ...metas.flatMap((meta) => commentFeedPath(meta) ?? []).sort(),
    ],
  };
  writeFileSync(path.join(INVENTORY, "legacy-urls.json"), `${JSON.stringify(inventory, null, 2)}\n`);

  const monthMismatches = metas.filter((meta) => monthPath(meta.published) !== meta.path.slice(0, 9));
  console.log(`posts: ${metas.length}`);
  console.log(`comments: ${comments.entries.length - skipped.length} kept, ${skipped.length} excluded: ${skipped.join("; ") || "none"}`);
  console.log(`labels: ${labels.length}`);
  console.log(`images: ${images.size}`);
  console.log(`links to the old blog made site-relative: ${ownLinks}`);
  console.log(`embeds switched to https: ${upgraded.length}${upgraded.map((url) => `\n  ${url}`).join("")}`);
  console.log(`legacy paths: ${inventory.paths.length}`);
  console.log(`posts whose URL month differs from their published month: ${monthMismatches.map((meta) => meta.path).join(", ") || "none"}`);
}

await main();
