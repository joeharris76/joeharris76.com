import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  DIST,
  PUBLIC,
  commentFeedPath,
  labelPath,
  legacyMonthArchivePath,
  monthPath,
  readPosts,
  readSite,
  type Comment,
  type Post,
} from "./content.ts";

const ORIGIN = (process.env.SITE_ORIGIN || "https://joeharris76.com").replace(/\/+$/, "");
const REHEARSAL = process.env.SITE_DEPLOY_TARGET === "rehearsal";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const site = readSite();
const posts = readPosts();

function escape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function formatDate(timestamp: string): string {
  const [year, month, day] = timestamp.slice(0, 10).split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

function monthTitle(urlPath: string): string {
  const [, year, month] = urlPath.split("/");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

function write(urlPath: string, content: string): void {
  const relative = urlPath.endsWith("/") ? `${urlPath}index.html` : urlPath;
  const file = path.join(DIST, ...decodeURIComponent(relative).slice(1).split("/"));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function page(title: string, canonicalPath: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#091833">
${REHEARSAL ? '<meta name="robots" content="noindex, nofollow">\n' : ""}<title>${escape(title)}</title>
<link rel="canonical" href="${escape(ORIGIN + canonicalPath)}">
<link rel="alternate" type="application/atom+xml" title="${escape(site.title)}" href="${ORIGIN}/feeds/posts/default">
<link rel="icon" href="/favicon.ico">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header class="site"><a href="/">${escape(site.title)}</a></header>
<main>
${body}
</main>
<footer class="site"><a href="/search">All posts</a> · <a href="/feeds/posts/default">Feed</a> · © ${escape(site.author)}</footer>
</body>
</html>
`;
}

function redirectPage(target: string): string {
  const href = escape(target);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>This page has moved</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${escape(ORIGIN + target)}">
<meta http-equiv="refresh" content="0; url=${href}">
</head>
<body>
<p>This page has moved. <a href="${href}">Continue to the new page</a>.</p>
</body>
</html>
`;
}

function postList(items: readonly Post[]): string {
  const rows = items.map(
    (post) => `<li><time datetime="${post.published.slice(0, 10)}">${formatDate(post.published)}</time> <a href="${post.path}">${escape(post.title)}</a></li>`,
  );
  return `<ul class="posts">\n${rows.join("\n")}\n</ul>`;
}

function groupBy(items: readonly Post[], key: (post: Post) => string): Map<string, Post[]> {
  const groups = new Map<string, Post[]>();
  for (const post of items) groups.set(key(post), [...(groups.get(key(post)) ?? []), post]);
  return groups;
}

function postsByYear(items: readonly Post[]): string {
  return [...groupBy(items, (post) => post.published.slice(0, 4))]
    .map(([year, list]) => `<h2><a href="/${year}/">${year}</a></h2>\n${postList(list)}`)
    .join("\n");
}

function userContent(html: string): string {
  return html.replace(/<a\s(?![^>]*\brel=)/gi, '<a rel="nofollow ugc" ');
}

function commentHtml(comment: Comment): string {
  const author = comment.authorUrl ? `<a href="${escape(comment.authorUrl)}" rel="nofollow ugc">${escape(comment.author)}</a>` : escape(comment.author);
  return `<article class="comment" id="c${comment.id}">
<p class="meta">${author} · <a href="#c${comment.id}"><time datetime="${comment.published}">${formatDate(comment.published)}</time></a></p>
<div>${userContent(comment.html)}</div>
</article>`;
}

function postPage(post: Post, newer: Post | undefined, older: Post | undefined): string {
  const labels =
    post.labels.length === 0 ? "" : `<p class="labels">Labels: ${post.labels.map((label) => `<a href="${labelPath(label)}">${escape(label)}</a>`).join(", ")}</p>`;
  const comments =
    post.comments.length === 0
      ? ""
      : `<section class="comments" id="comments">
<h2>Comments</h2>
<p class="note">Archived from the original blog; comments are closed.</p>
${post.comments.map(commentHtml).join("\n")}
</section>`;
  const nav = [
    newer ? `<a rel="prev" href="${newer.path}">Newer: ${escape(newer.title)}</a>` : "",
    older ? `<a rel="next" href="${older.path}">Older: ${escape(older.title)}</a>` : "",
  ].filter(Boolean);
  const body = `<article>
<h1>${escape(post.title)}</h1>
<p class="meta"><time datetime="${post.published}">${formatDate(post.published)}</time></p>
<div class="post-body">
${post.html}
</div>
${labels}
</article>
${comments}
<nav class="pager">${nav.join("\n")}</nav>`;
  return page(`${post.title} – ${site.title}`, post.path, body);
}

function absolutize(html: string): string {
  return html.replace(/(\b(?:href|src)=["'])\/(?!\/)/gi, `$1${ORIGIN}/`);
}

function latest(timestamps: readonly string[]): string {
  return [...timestamps].sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? new Date(0).toISOString();
}

function atomFeed(id: string, title: string, selfPath: string, alternatePath: string, updated: string, entries: readonly string[]): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<id>${escape(id)}</id>
<title type="text">${escape(title)}</title>
<updated>${updated}</updated>
<link rel="self" type="application/atom+xml" href="${ORIGIN}${selfPath}"/>
<link rel="alternate" type="text/html" href="${escape(ORIGIN + alternatePath)}"/>
<author><name>${escape(site.author)}</name></author>
${entries.join("\n")}
</feed>
`;
}

function postEntry(post: Post): string {
  return `<entry>
<id>${escape(post.id)}</id>
<published>${post.published}</published>
<updated>${post.updated}</updated>
<title type="text">${escape(post.title)}</title>
<link rel="alternate" type="text/html" href="${ORIGIN}${post.path}"/>
${post.labels.map((label) => `<category term="${escape(label)}"/>`).join("\n")}
<content type="html">${escape(absolutize(post.html))}</content>
</entry>`;
}

function commentEntry(post: Post, comment: Comment): string {
  return `<entry>
<id>${escape(`${site.feedId}.post-${comment.id}`)}</id>
<published>${comment.published}</published>
<updated>${comment.published}</updated>
<title type="text">${escape(`${comment.author} on ${post.title}`)}</title>
<link rel="alternate" type="text/html" href="${ORIGIN}${post.path}#c${comment.id}"/>
<author><name>${escape(comment.author)}</name></author>
<content type="html">${escape(userContent(absolutize(comment.html)))}</content>
</entry>`;
}

function sitemap(paths: readonly { path: string; updated?: string }[]): string {
  const urls = paths.map(
    (entry) => `<url><loc>${escape(ORIGIN + entry.path)}</loc>${entry.updated ? `<lastmod>${entry.updated}</lastmod>` : ""}</url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

function robots(): string {
  if (REHEARSAL) return "User-agent: *\nDisallow: /\n";
  return `User-agent: *\nDisallow: /search\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`;
}

rmSync(DIST, { recursive: true, force: true });
cpSync(PUBLIC, DIST, { recursive: true });

write("/", page(site.title, "/", postsByYear(posts)));
write("/search/", page(`All posts – ${site.title}`, "/", `<h1>All posts</h1>\n${postsByYear(posts)}`));

posts.forEach((post, index) => write(post.path, postPage(post, posts[index - 1], posts[index + 1])));

for (const [year, list] of groupBy(posts, (post) => post.published.slice(0, 4))) {
  write(`/${year}/`, page(`${year} – ${site.title}`, `/${year}/`, `<h1>${year}</h1>\n${postList(list)}`));
}

for (const [month, list] of groupBy(posts, (post) => monthPath(post.published))) {
  write(month, page(`${monthTitle(month)} – ${site.title}`, month, `<h1>${monthTitle(month)}</h1>\n${postList(list)}`));
  write(legacyMonthArchivePath(list[0].published), redirectPage(month));
}

const labels = [...new Set(posts.flatMap((post) => post.labels))].sort();
for (const label of labels) {
  const list = posts.filter((post) => post.labels.includes(label));
  write(`${labelPath(label)}.html`, page(`${label} – ${site.title}`, labelPath(label), `<h1>Posts labelled “${escape(label)}”</h1>\n${postList(list)}`));
}

const postFeed = atomFeed(site.feedId, site.title, "/feeds/posts/default", "/", latest(posts.map((post) => post.updated)), posts.map(postEntry));
for (const feedPath of ["/feeds/posts/default", "/atom.xml", "/rss.xml"]) write(feedPath, postFeed);

const allComments = posts.flatMap((post) => post.comments.map((comment) => ({ post, comment })));
allComments.sort((left, right) => Date.parse(right.comment.published) - Date.parse(left.comment.published));
write(
  "/feeds/comments/default",
  atomFeed(
    `${site.feedId}.comments`,
    `${site.title} comments`,
    "/feeds/comments/default",
    "/",
    latest(allComments.map((item) => item.comment.published)),
    allComments.map((item) => commentEntry(item.post, item.comment)),
  ),
);
for (const post of posts) {
  const feedPath = commentFeedPath(post);
  if (feedPath === undefined) continue;
  write(
    feedPath,
    atomFeed(
      `${post.id}.comments`,
      `Comments on ${post.title}`,
      feedPath,
      post.path,
      latest([post.updated, ...post.comments.map((comment) => comment.published)]),
      post.comments.map((comment) => commentEntry(post, comment)),
    ),
  );
}

write("/sitemap.xml", sitemap([{ path: "/" }, ...posts.map((post) => ({ path: post.path, updated: post.updated }))]));
write("/robots.txt", robots());
write("/404.html", page(`Page not found – ${site.title}`, "/404.html", `<h1>Page not found</h1>\n<p>Try the <a href="/">list of posts</a>.</p>`));

console.log(`built ${posts.length} posts, ${labels.length} labels for ${ORIGIN}${REHEARSAL ? " (rehearsal, noindex)" : ""}`);
