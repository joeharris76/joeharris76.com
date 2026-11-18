# joeharris76.com agent instructions

This repository builds Joe Harris's blog, served by GitHub Pages at
`https://joeharris76.com/`. The posts, labels and comments were imported
once from the Blogger blog that used to live at `blog.joeharris76.com`
(blog id `7423363075024286359`). Every URL that Blogger served keeps working.

## Language

- Tooling is Node and TypeScript, run directly with Node's type stripping
  (`node --experimental-strip-types`). The Node version is in `.nvmrc`.
- The site has no runtime dependencies. Keep it that way: HTML is rendered
  with template literals in `scripts/build.ts`.

## Content

- A post is `content/posts/YYYY/MM/<slug>.html`. Its path under
  `content/posts/` is its URL, so `/YYYY/MM/<slug>.html` matches Blogger.
- The file starts with a JSON front matter block between `---` lines: `id`,
  `title`, `published`, `updated`, `labels` and `comments`, followed by the
  post body as HTML. A new post needs a unique, permanent `id` such as
  `tag:joeharris76.com,2026:<slug>`; only imported posts use the
  `tag:blogger.com,1999:blog-…` form, and only they get a Blogger-style
  per-post comment feed.
- `content/site.json` holds the blog title, the author and the Atom feed id.
  The feed id and each imported post id are the ones Blogger published, so
  feed readers do not show old posts as new.
- Imported comments are an archive; the site takes no new comments.
  `inventory/excluded-comments.json` lists the Blogger comments left out
  and why.
- The Blogger blog has been deleted, so the content here is the only copy.
  Edit posts in place; there is no reimport.

## Legacy URLs

- `inventory/legacy-urls.json` is the closed set of paths Blogger served:
  posts, year and month archives, the old `YYYY_MM_01_archive.html`
  archives, label pages, the post and comment feeds, `/atom.xml`,
  `/rss.xml`, `/sitemap.xml`, `/robots.txt` and `/favicon.ico`. It also
  lists the old origins that must redirect here with the path kept.
- Never drop a path from the inventory or stop serving one. `npm run check`
  fails when the built site does not serve every inventory path or when a
  page links to a path the site does not serve. `ci` runs it.
- Static hosting ignores query strings, so Blogger's `?m=1`, `?alt=rss` and
  `?updated-max=…` forms serve the same page.
- Paths must resolve the way GitHub Pages resolves them: an exact file,
  then `<path>.html`, then a redirect to `<path>/` when `<path>/index.html`
  exists. `scripts/pages.ts` implements that rule for the check and for
  `npm run serve`, the local preview on port 4330.
- `npm run check:live -- --origin <origin>` requests every inventory path on
  a live origin. Add `--legacy` to start from each old origin instead and
  require a redirect to the same path on `<origin>`. `--window <seconds>`
  retries failures every ten seconds until the window closes.

## Deploys and hosting

`README.md` describes the deploy workflow and its repository variables, the
DNS records, the URL forwards, GitHub Pages, Blogger and the rollback. Read
it before changing any of them, and keep it current when they change.

- `SITE_DEPLOY_TARGET` stays `production`. The repository has one Pages
  site, so a rehearsal deploy replaces the live site with a `noindex` copy.
  Only the owner changes it.
- DNS changes leave the email, DMARC, CAA, Bluesky and GitHub Pages
  verification records as they are.
- After any DNS or forwarding change, run
  `npm run check:live -- --origin https://joeharris76.com --legacy --window 900`.
- `joeharris76.blogspot.com` belongs to Google and answers "Blog not
  found" now that the Blogger blog is deleted. Nothing here can redirect it.

## Changes

- Work on a named branch and open a pull request to `main`. Merge with
  squash once `ci` is green.
- Stage files by explicit path. Never run `git add -A` or `git add .`.
- Commit identity: `Joe Harris <joeharris76@gmail.com>`. Add no agent or
  co-author trailers; the `commit-msg` hook refuses them.
- Commit messages, pull request text and committed files state the durable
  reason for a change. Leave out tracker ids, plan references and run-local
  state.

## Code comments

First-party code carries no explanatory comments or docstrings. Name things
so the code explains itself. Directives the tools need are allowed.
`npm run lint:comments` enforces this, and `ci` runs it.
