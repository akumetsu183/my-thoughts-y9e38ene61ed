# My Thoughts

A small static page for collecting thoughts and ideas. Plain HTML, no build step, no dependencies.

## What this is

- Single `index.html` — everything (styles, script) is inline
- Dark by default, respects `prefers-color-scheme: light`
- Collapsible entry cards (one entry open at a time by default is up to you — currently the first is open)
- `<meta name="robots" content="noindex, nofollow, noarchive">` so search engines leave it alone

## Adding an entry

Copy one of the `<details class="entry">` blocks in `index.html` and edit:

```html
<details class="entry">
  <summary>
    <span class="meta"><span class="dot"></span><span>DATE</span></span>
    <span class="title-row">
      <span class="entry-title">Your title</span>
      <span class="chev" aria-hidden="true"></span>
    </span>
  </summary>
  <div class="body">
    <p>Your thought.</p>
  </div>
</details>
```

Newest entries go at the top. Add `open` to `<details ... open>` to have it expanded on load.

Optional bits inside `.body`:

- `<blockquote>` — pulled-out quote
- `<ul><li>` — bullet list
- `<span class="tag">word</span>` — small pill tag
- `<code>` — inline code

## Design tokens

Colours are CSS variables at the top of `index.html`:

| Variable | Role |
| --- | --- |
| `--accent` | sage/moss green (`#8FBFA0` dark, `#4e8a68` light) |
| `--bg` | page background |
| `--surface` / `--surface-2` | card backgrounds |
| `--line` | borders |
| `--measure` | line length (`68ch`) |

# Privacy

The page is built to stay out of search engines:

- `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex, nocache">`
- the same directives repeated for `googlebot` and `bingbot` specifically
- `robots.txt` at the root with `Disallow: /` for all agents
- `<meta name="referrer" content="no-referrer">` so outbound clicks don't leak the URL

Caveats worth knowing:

- `robots.txt` and meta tags are **honoured voluntarily** — well-behaved crawlers obey, scrapers don't.
- Pages served by GitHub Pages cannot set custom HTTP headers, so an `X-Robots-Tag` response header is not possible. The meta tags are the equivalent.
- If a URL was already indexed before these tags existed, it can linger in results for a while. Request removal at [Google Search Console](https://search.google.com/search-console) if it matters.
- The repo name includes a random suffix, so the page is not discoverable by browsing the account.

It is still **public** — anyone with the URL can read it. Don't put anything here you wouldn't hand to a stranger.

To take it down: delete the repo, or disable Pages in Settings → Pages.

## Serving locally

```bash
python3 -m http.server 8080
```

Then open <http://127.0.0.1:8080>.
