#!/usr/bin/env python3
"""Build projects/index.html from GitHub repos tagged with the `corey-app` topic.

Each tagged repo needs a description and a homepage URL (the live app).
Run locally with `python3 scripts/build_projects.py`; the Deploy workflow runs
it on every push and once a day, so a new tagged repo shows up within a day.
Set GITHUB_TOKEN to avoid the unauthenticated API rate limit.
"""
import html
import json
import os
import pathlib
import urllib.parse
import urllib.request
from datetime import datetime

USER = "csciuto"
TOPIC = "corey-app"
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "projects" / "index.html"


HEADERS = {"Accept": "application/vnd.github+json", "User-Agent": "build-projects"}
if os.environ.get("GITHUB_TOKEN"):
    HEADERS["Authorization"] = "Bearer " + os.environ["GITHUB_TOKEN"]


def fetch_repos():
    repos, page = [], 1
    headers = HEADERS
    while True:
        url = f"https://api.github.com/users/{USER}/repos?per_page=100&page={page}"
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as r:
            batch = json.load(r)
        repos += batch
        if len(batch) < 100:
            return repos
        page += 1


def preview_url(repo):
    """The app's preview.png (made by `npm run screenshot`), if the repo has one.

    preview.png sits next to the app's index.html, so its repo path is the
    homepage path minus the leading /<repo>/.
    """
    sub = urllib.parse.urlparse(repo["homepage"]).path.strip("/").split("/", 1)
    path = (sub[1] + "/" if len(sub) > 1 else "") + "preview.png"
    # repos deployed from docs/ by Actions serve docs/preview.png at <homepage>/preview.png
    for p in dict.fromkeys([path, "docs/preview.png"]):
        try:
            with urllib.request.urlopen(urllib.request.Request(
                    f"https://api.github.com/repos/{repo['full_name']}/contents/{p}", headers=HEADERS), timeout=20):
                return repo["homepage"].rstrip("/") + "/preview.png"
        except Exception:
            continue
    return None


def card(repo):
    e = html.escape
    img = preview_url(repo)
    shot = (f'<a class="shot" href="{e(repo["homepage"])}" tabindex="-1">'
            f'<img src="{e(img)}" alt="" loading="lazy" width="1200" height="630"></a>') if img else ""
    made = datetime.strptime(repo["created_at"][:10], "%Y-%m-%d").strftime("%b %Y")
    lang = f'<span>{e(repo["language"])}</span>' if repo.get("language") else ""
    return f"""
    <article class="card">{shot}
      <h2><a href="{e(repo["homepage"])}">{e(repo["name"])}</a></h2>
      <p>{e(repo.get("description") or "")}</p>
      <footer>
        <a class="btn" href="{e(repo["homepage"])}">Open app</a>
        <a href="{e(repo["html_url"])}">Source</a>
        <span class="meta">{lang}<span>{made}</span></span>
      </footer>
    </article>"""


def main():
    apps = [
        r for r in fetch_repos()
        if TOPIC in r.get("topics", []) and not r["archived"] and not r["private"] and r.get("homepage")
    ]
    apps.sort(key=lambda r: r["created_at"], reverse=True)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(PAGE.replace("{{CARDS}}", "".join(card(r) for r in apps)).replace("{{COUNT}}", str(len(apps))))
    print(f"wrote {OUT.relative_to(ROOT)} with {len(apps)} projects")


PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Projects | Corey Sciuto</title>
<meta name="description" content="Small web apps, games and data explorers built by Corey Sciuto.">
<meta property="og:title" content="Projects | Corey Sciuto">
<meta property="og:description" content="Small web apps, games and data explorers built by Corey Sciuto.">
<meta property="og:url" content="https://corey.sciu.to/projects/">
<meta property="og:type" content="website">
<link rel="icon" href="/favicon.ico">
<style>
  :root {
    --bg: #f6f7f9; --card: #ffffff; --text: #1d232b; --muted: #5d6875;
    --line: #dde1e6; --accent: #485564; --accent-text: #ffffff; --link: #2f5f8f;
    color-scheme: light dark;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #161a1f; --card: #1f252c; --text: #e8ebef; --muted: #9aa5b1;
      --line: #2e363f; --accent: #8fa3b8; --accent-text: #11161b; --link: #8cb8e6;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .wrap { max-width: 980px; margin: 0 auto; padding: 48px 20px 64px; }
  header { margin-bottom: 32px; }
  h1 { font-size: 2.2rem; margin: 0 0 6px; letter-spacing: -0.02em; }
  .lede { color: var(--muted); margin: 0; max-width: 60ch; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  .card {
    background: var(--card); border: 1px solid var(--line); border-radius: 10px;
    padding: 20px; display: flex; flex-direction: column; overflow: hidden;
  }
  .shot { display: block; margin: -20px -20px 16px; border-bottom: 1px solid var(--line); }
  .shot img { display: block; width: 100%; height: auto; aspect-ratio: 1200 / 630; object-fit: cover;
    border-radius: 10px 10px 0 0; }
  .card h2 { font-size: 1.15rem; margin: 0 0 6px; }
  .card h2 a { color: var(--text); text-decoration: none; }
  .card h2 a:hover { color: var(--link); }
  .card p { margin: 0 0 16px; color: var(--muted); flex: 1; }
  .card footer { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; font-size: 0.9rem; }
  .card footer a { color: var(--link); }
  .btn {
    background: var(--accent); color: var(--accent-text) !important; text-decoration: none;
    padding: 6px 12px; border-radius: 6px; font-weight: 600;
  }
  .meta { margin-left: auto; color: var(--muted); font-size: 0.8rem; display: flex; gap: 10px; }
  .foot { margin-top: 40px; color: var(--muted); font-size: 0.85rem; }
  .foot a { color: var(--link); }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>Projects</h1>
    <p class="lede">Small web apps, games and data explorers I've built, most of them with AI coding tools. Everything runs in your browser, and the source for each is on GitHub.</p>
  </header>
  <main class="grid">{{CARDS}}
  </main>
  <p class="foot">{{COUNT}} projects &middot; Built with <a href="https://claude.com/claude-code">Claude Code</a> &middot; <a href="https://github.com/csciuto">github.com/csciuto</a></p>
</div>
</body>
</html>
"""

if __name__ == "__main__":
    main()
