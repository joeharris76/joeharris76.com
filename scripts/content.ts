import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const CONTENT = path.join(ROOT, "content");
export const POSTS = path.join(CONTENT, "posts");
export const PUBLIC = path.join(ROOT, "public");
export const INVENTORY = path.join(ROOT, "inventory");
export const DIST = path.join(ROOT, "dist");

export type Comment = { id: string; author: string; authorUrl?: string; published: string; html: string };
export type PostMeta = { id: string; title: string; published: string; updated: string; labels: string[]; comments: Comment[] };
export type Post = PostMeta & { path: string; html: string };
export type Site = { title: string; author: string; feedId: string };
export type LegacyInventory = { legacyOrigins: string[]; paths: string[] };

const FENCE = "---\n";

export function parsePost(source: string, urlPath: string): Post {
  const end = source.indexOf(`\n${FENCE}`, FENCE.length);
  if (!source.startsWith(FENCE) || end < 0) throw new Error(`${urlPath}: missing front matter`);
  const meta = JSON.parse(source.slice(FENCE.length, end)) as PostMeta;
  return { ...meta, path: urlPath, html: source.slice(end + FENCE.length + 1) };
}

export function readSite(): Site {
  return JSON.parse(readFileSync(path.join(CONTENT, "site.json"), "utf8")) as Site;
}

export function readInventory(): LegacyInventory {
  return JSON.parse(readFileSync(path.join(INVENTORY, "legacy-urls.json"), "utf8")) as LegacyInventory;
}

export function readPosts(): Post[] {
  return readdirSync(POSTS, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".html"))
    .map((file) => parsePost(readFileSync(path.join(POSTS, file), "utf8"), `/${file.split(path.sep).join("/")}`))
    .sort((left, right) => right.published.localeCompare(left.published));
}

export function labelPath(label: string): string {
  return `/search/label/${encodeURIComponent(label)}`;
}

export function monthPath(published: string): string {
  return `/${published.slice(0, 4)}/${published.slice(5, 7)}/`;
}

export function legacyMonthArchivePath(published: string): string {
  return `/${published.slice(0, 4)}_${published.slice(5, 7)}_01_archive.html`;
}

export function commentFeedPath(post: Pick<PostMeta, "id">): string | undefined {
  const number = /^tag:blogger\.com,1999:blog-\d+\.post-(\d+)$/.exec(post.id)?.[1];
  return number === undefined ? undefined : `/feeds/${number}/comments/default`;
}
