# Blog working files

Outlines and drafts for new posts live here until they are published. The
site build reads only `content/` and `public/`, so nothing under `_blog/` is
deployed.

## Layout

| Stage | Path | Holds |
|---|---|---|
| Outline | `_blog/outlines/<series>/<slug>.md` | Thesis, section plan, evidence for each claim, open questions |
| Draft | `_blog/drafts/<series>/<slug>.md` | The post text in Markdown, with a short status block at the top |
| Research | `_blog/research/<series>/` | Notes and data a post cites that are not published elsewhere |

`<slug>` is the slug the post will have in its URL.

## Voice

The global guides apply (`~/.claude/blog/STYLE_GUIDE.md` and
`VOICE_REFERENCE.md`), with one change: posts on this site are written in the
first person singular. Where the guides say "we", write "I". Headings and
titles stay free of first person, as the guides require.

## Publishing a draft

1. Convert the Markdown to HTML and save it as
   `content/posts/YYYY/MM/<slug>.html` with the JSON front matter that
   `README.md` describes. The site has no Markdown renderer.
2. Put images in `public/images/` and link them as `/images/<file>`.
3. Delete the draft and its outline in the same pull request.
4. Run `npm run build` and `npm run check`.
