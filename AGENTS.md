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
- `npm run import` reimports everything from Blogger's public feeds and
  overwrites `content/posts/`, `public/images/`, `public/favicon.ico`,
  `content/site.json` and `inventory/legacy-urls.json`. Run it only while
  Blogger still serves the blog and nothing has been edited here since.

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

## Deploys

- `.github/workflows/deploy.yml` runs on a push to `main` and by hand. It
  builds, runs `npm run check` and uploads the Pages artifact.
- The repository variable `SITE_DEPLOY_TARGET` decides what happens next.
  Unset, the run stops after the checks. `rehearsal` deploys with every page
  marked `noindex` and a `robots.txt` that disallows everything.
  `production` deploys the public site. Only the owner sets `production`.
- `SITE_ORIGIN` is the origin the site is built for and probed at, for
  example `https://new.joeharris76.com` for a rehearsal. Unset, the build
  uses `https://joeharris76.com`.
- After a deploy the run probes every inventory path on `SITE_ORIGIN` for up
  to eleven minutes, which covers the ten-minute cache lifetime of Pages
  responses.

## Hosting

The site depends on this layout. DNS is at Porkbun.

- The apex has the GitHub Pages A and AAAA records, and the Pages custom
  domain is `joeharris76.com` with HTTPS enforced.
- `www.joeharris76.com` and `blog.joeharris76.com` are Porkbun URL
  forwards: permanent (301), to `https://joeharris76.com`, with the
  requested path included. Porkbun serves them over HTTPS with its own
  certificate. `www` is not a CNAME to GitHub, because GitHub issued the
  Pages certificate for the apex only, so `https://www` failed there.
- Blogger still serves `joeharris76.blogspot.com`. While Blogger lists
  `blog.joeharris76.com` as the blog's custom domain, it answers blogspot
  URLs with its own "You're about to be redirected" page (HTTP 404) that
  links to the same path on `blog.joeharris76.com`. With the custom domain
  removed (Blogger → Settings → Publishing) and this script placed right
  after `<head>` in the Blogger theme, visitors go straight to the same
  path here:

  ```html
  <script>//<![CDATA[
  location.replace('https://joeharris76.com' + location.pathname + location.search + location.hash);
  //]]></script>
  ```

  Neither answer is an HTTP redirect, so `check:live --legacy` does not
  cover blogspot. Do not delete the Blogger blog.
- Website changes never touch these records: MX, SPF, `apple-domain` and
  `sig1._domainkey` (iCloud mail), `_atproto` (the Bluesky handle) and the
  `7ybor4w6mef4` CNAME (Google's ownership check for the Blogger domain).
- After any DNS or forwarding change, run
  `npm run check:live -- --origin https://joeharris76.com --legacy --window 900`.
  Porkbun's forwarder answers HTTP 429 to bursts of requests, and the
  window retries them.

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
