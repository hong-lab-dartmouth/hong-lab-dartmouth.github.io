#!/usr/bin/env python3
"""Bundle the multi-page Hong Lab site into ONE self-contained HTML file.

The real site is 6 HTML pages + external CSS/JS + 7.5MB of images, served
over HTTP with absolute /data/*.json fetches. An artifact is a single file
with no server, so this:

  - downsizes every image and embeds it as a data: URI
  - inlines style.css and all six JS files
  - replaces the JSON fetches with inlined constants
  - stitches the six pages into one document with a hash router

The page CONTENT and the motion code are untouched — this is the branch's
actual site, just re-plumbed to run from a single file.
"""
import base64, io, json, os, re, sys
from pathlib import Path
from PIL import Image

ROOT = Path(sys.argv[1])
OUT = Path(sys.argv[2])

PAGES = [
    ("home",         "index.html",              "Home"),
    ("about",        "about/index.html",        "Research"),
    ("people",       "people/index.html",       "People"),
    ("publications", "publications/index.html", "Publications"),
    ("gallery",      "gallery/index.html",      "Gallery"),
    ("contact",      "contact/index.html",      "Contact"),
]

# ---------------------------------------------------------------- images
_cache = {}
BUDGET = {"bytes": 0}

def encode_image(rel: str) -> str:
    """Downsize + recompress, return a data: URI. Cached per path."""
    rel = rel.split("?")[0].split("#")[0]
    key = rel
    if key in _cache:
        return _cache[key]

    path = (ROOT / rel.lstrip("/")).resolve()
    if not path.exists():
        _cache[key] = ""
        return ""

    try:
        im = Image.open(path)
    except Exception:
        _cache[key] = ""
        return ""

    # Logos and marks stay crisp but small; photos get a hard cap.
    is_logo = "/logos/" in rel or "favicon" in rel
    max_dim = 640 if is_logo else 1900
    if max(im.size) > max_dim:
        im.thumbnail((max_dim, max_dim), Image.LANCZOS)

    buf = io.BytesIO()
    has_alpha = im.mode in ("RGBA", "LA", "P")
    if is_logo and has_alpha:
        im.convert("RGBA").save(buf, "PNG", optimize=True)
        mime = "image/png"
    else:
        im.convert("RGB").save(buf, "JPEG", quality=90, optimize=True, progressive=True, subsampling=0)
        mime = "image/jpeg"

    raw = buf.getvalue()
    BUDGET["bytes"] += len(raw)
    uri = "data:%s;base64,%s" % (mime, base64.b64encode(raw).decode())
    _cache[key] = uri
    return uri


def resolve(src: str, page_rel: str) -> str:
    """Turn a page-relative src into a repo-relative path."""
    if src.startswith(("data:", "http:", "https:", "//", "#", "mailto:")):
        return ""
    base = os.path.dirname(page_rel)
    if src.startswith("/"):
        return src.lstrip("/")
    return os.path.normpath(os.path.join(base, src))


def inline_images(html: str, page_rel: str) -> str:
    def sub_attr(m):
        attr, src = m.group(1), m.group(2)
        rp = resolve(src, page_rel)
        if not rp:
            return m.group(0)
        uri = encode_image(rp)
        return '%s="%s"' % (attr, uri) if uri else m.group(0)

    html = re.sub(r'\b(src|href)="([^"]+\.(?:png|jpe?g|webp|ico))"', sub_attr, html, flags=re.I)
    # srcset would multiply the payload; drop it and let src carry the image.
    html = re.sub(r'\ssrcset="[^"]*"', '', html, flags=re.I)
    # <source> in <picture> likewise.
    html = re.sub(r'<source\b[^>]*>', '', html, flags=re.I)
    return html


# ---------------------------------------------------------------- pages
def extract_main(html: str):
    """Everything from <main> up to <site-footer>.

    Taking only the contents of <main> loses the bio modal and the gallery
    lightbox — both are siblings that sit AFTER </main>, and dropping them
    makes people.js and gallery.js throw on a null element.
    """
    start = re.search(r'<main\b', html, re.I)
    if not start:
        return ""
    end = re.search(r'<site-footer\b', html[start.start():], re.I)
    body = html[start.start(): start.start() + end.start()] if end else html[start.start():]
    # Scripts are collected separately and emitted once, not per page.
    body = re.sub(r'<script\b.*?</script>', '', body, flags=re.S | re.I)
    return body


def page_title(html: str) -> str:
    m = re.search(r'<title>(.*?)</title>', html, re.S | re.I)
    return m.group(1).strip() if m else "Hong Lab"


sections = []
for slug, rel, label in PAGES:
    raw = (ROOT / rel).read_text(encoding="utf-8")
    raw = inline_images(raw, rel)
    sections.append({
        "slug": slug,
        "label": label,
        "title": page_title(raw),
        "html": extract_main(raw),
    })

# ---------------------------------------------------------------- css
css = (ROOT / "css/style.css").read_text(encoding="utf-8")
# Keep the Google Fonts import — that host is allowed — but hoist it out of
# the inline <style> into a <link>, since @import inside <style> is fragile.
font_link = ""
m = re.search(r"@import url\('([^']+)'\);", css)
if m:
    font_link = '<link rel="stylesheet" href="%s">' % m.group(1)
    css = css.replace(m.group(0), "")
css = re.sub(r'url\((["\']?)(?!data:|https?:|//)([^)"\']+)\1\)',
             lambda mm: 'url(%s)' % (encode_image(mm.group(2)) or mm.group(2)), css)

# ---------------------------------------------------------------- js + data
js = {p.stem: p.read_text(encoding="utf-8") for p in sorted((ROOT / "js").glob("*.js"))}
people_json = json.loads((ROOT / "data/people.json").read_text(encoding="utf-8"))
pubs_json = json.loads((ROOT / "data/publications.json").read_text(encoding="utf-8"))

# People images live in the JSON, not the HTML — embed them too.
def walk_people(node):
    if isinstance(node, dict):
        if isinstance(node.get("image"), str):
            rp = resolve(node["image"], "people/index.html")
            uri = encode_image(rp) if rp else ""
            if uri:
                node["image"] = uri
        for v in node.values():
            walk_people(v)
    elif isinstance(node, list):
        for v in node:
            walk_people(v)

walk_people(people_json)

# The header logo and the footer's Geisel mark are built inside JS template
# strings, so the HTML pass never saw them. Embed those too.
for k in js:
    js[k] = re.sub(
        r'(src|href)="(/?assets/[^"]+)"',
        lambda mm: '%s="%s"' % (mm.group(1), encode_image(mm.group(2)) or mm.group(2)),
        js[k])

# Route the two fetches to the inlined constants instead of the network.
for k in js:
    js[k] = js[k].replace(
        "fetch('/data/people.json', { cache: 'no-store' })",
        "Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(window.__PEOPLE__) })")
    js[k] = js[k].replace(
        "fetch('/data/publications.json', { cache: 'no-store' })",
        "Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(window.__PUBS__) })")
    js[k] = re.sub(
        r"fetch\((['\"])/?data/publications\.json\1[^)]*\)",
        "Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(window.__PUBS__) })", js[k])
    js[k] = re.sub(
        r"fetch\((['\"])/?data/people\.json\1[^)]*\)",
        "Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(window.__PEOPLE__) })", js[k])

# Leaflet is loaded from a CDN on the contact page; the artifact CSP blocks
# it, so the map is replaced with a static note in the bundle.
order = ["spring", "components", "home", "people", "publications", "gallery"]
js_blob = "\n\n".join("/* ==== js/%s.js ==== */\n%s" % (n, js[n]) for n in order if n in js)

parts = [
    "<title>Hong Lab</title>",
    font_link,
    '<style>\n%s\n</style>' % css,
    """<style>
/* Bundle-only: page switching, and a couple of fixes for running the
   site from a single file with no server. */
.bundle-page { display: none; }
.bundle-page.active { display: block; }
.bundle-banner {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 9999;
  background: #0E0917; color: rgba(255,255,255,.82);
  font-family: "Geist", system-ui, sans-serif; font-size: 12px;
  letter-spacing: .04em; text-align: center; padding: 7px 14px;
  border-top: 1px solid rgba(255,255,255,.14);
}
.bundle-banner b { color: #fff; font-weight: 500; }
.bundle-banner a { color: #3E8E88; }
body { padding-bottom: 34px; }
.map-fallback {
  display: flex; align-items: center; justify-content: center;
  min-height: 260px; background: #E9E6EE; color: #5A5266;
  font-family: "Geist", system-ui, sans-serif; font-size: 14px;
  border-radius: 8px; text-align: center; padding: 24px;
}
</style>""",
]

parts.append("<site-header></site-header>")
# Each section already carries its own <main> plus any modal/lightbox that
# followed it, so there is no outer <main> wrapper here.
for s in sections:
    parts.append('<div class="bundle-page" id="page-%s" data-label="%s">%s</div>'
                 % (s["slug"], s["label"], s["html"]))
parts.append("<site-footer></site-footer>")
parts.append('<div class="bundle-banner">Single-file bundle of branch <b>apple-motion-pass</b> — the real site, images downsized. The contact map is omitted (external script).</div>')

parts.append("<script>window.__PEOPLE__ = %s;\nwindow.__PUBS__ = %s;</script>"
             % (json.dumps(people_json), json.dumps(pubs_json)))
parts.append("<script>\n%s\n</script>" % js_blob)

parts.append("""<script>
/* ---- Bundle router -------------------------------------------------
   The real site navigates between six documents. Here they are six
   divs, so nav clicks swap which one is visible and re-run the loader
   that page would have run on DOMContentLoaded. */
(function () {
  var PAGES = %s;

  /* The page loaders (people, publications) self-invoke at the bottom of
     their own files, so every page's content is already built by the time
     this runs. Routing only has to choose which one is visible. */

  function activate(slug, anchor) {
    var found = false;
    PAGES.forEach(function (p) {
      var el = document.getElementById('page-' + p.slug);
      if (!el) return;
      var on = p.slug === slug;
      el.classList.toggle('active', on);
      if (on) found = true;
    });
    if (!found) { activate('home'); return; }

    document.querySelectorAll('.main-nav a').forEach(function (a) {
      a.classList.toggle('is-current', slugFromHref(a.getAttribute('href')) === slug);
    });

    /* Re-run scroll-reveal so cards on the newly shown page get observed. */
    if (window.initScrollReveal) { try { window.initScrollReveal(); } catch (e) {} }

    if (anchor) {
      var t = document.getElementById(anchor);
      if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    }
    window.scrollTo(0, 0);
  }

  /* Nav hrefs on the real site are '/people/', '/#research-start', '/'.
     Map each to a bundle slug, keeping any in-page anchor. */
  function parseHref(href) {
    if (!href) return null;
    var anchor = null;
    var hash = href.indexOf('#');
    if (hash !== -1) { anchor = href.slice(hash + 1) || null; href = href.slice(0, hash); }

    var clean = href.replace(/^\\.\\.\\//, '').replace(/^\\.\\//, '')
                    .replace(/index\\.html$/, '').replace(/^\\/+|\\/+$/g, '');
    if (clean === '') return { slug: 'home', anchor: anchor };
    for (var i = 0; i < PAGES.length; i++) {
      if (PAGES[i].slug === clean) return { slug: clean, anchor: anchor };
    }
    return anchor ? { slug: null, anchor: anchor } : null;
  }

  function slugFromHref(href) {
    var r = parseHref(href);
    return r ? r.slug : null;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || a.target === '_blank' || /^(https?:|mailto:|tel:)/.test(href)) return;
    var r = parseHref(href);
    if (!r) return;
    e.preventDefault();

    if (r.slug === null) {                    // same-page anchor
      var t = document.getElementById(r.anchor);
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    var want = '#' + r.slug + (r.anchor ? '@' + r.anchor : '');
    if (location.hash !== want) location.hash = want.slice(1);
    else activate(r.slug, r.anchor);
  });

  function fromHash() {
    var h = (location.hash || '').slice(1);
    if (!h) return { slug: 'home', anchor: null };
    var at = h.indexOf('@');
    return at === -1 ? { slug: h, anchor: null }
                     : { slug: h.slice(0, at), anchor: h.slice(at + 1) };
  }

  window.addEventListener('hashchange', function () {
    var r = fromHash();
    activate(r.slug, r.anchor);
  });

  function boot() {
    /* Leaflet is CDN-loaded on the real contact page and blocked here. */
    var map = document.getElementById('map');
    if (map) {
      map.outerHTML = '<div class="map-fallback">Map omitted in this bundle &mdash; ' +
        'it loads Leaflet from a CDN, which a single-file page cannot reach.<br>' +
        'One Medical Center Drive, Lebanon NH</div>';
    }
    var r = fromHash();
    activate(r.slug, r.anchor);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
</script>""" % json.dumps([{"slug": s["slug"], "label": s["label"]} for s in sections]))

OUT.write_text("\n".join(parts), encoding="utf-8")
size = OUT.stat().st_size
print("  images embedded : %d  (%.1f MB raw)" % (len([v for v in _cache.values() if v]), BUDGET["bytes"] / 1e6))
print("  pages stitched  : %d" % len(sections))
print("  bundle          : %.2f MB  %s" % (size / 1e6, "OK" if size < 16e6 else "OVER 16MB CAP"))
