#!/usr/bin/env python3
"""Regenerate the sitemaps of jarrar.info from the site itself.

Run from this folder after adding or changing pages/PDFs:
    python3 generate_sitemaps.py

What it does (following Google's sitemap guidelines):
  * lists every HTML page, using the same canonical URL the page declares
    (folder pages end in "/", e.g. https://jarrar.info/courses/AI/);
  * lists every PDF that a listed page links to (papers, slides, lecture notes),
    skipping files that do not exist;
  * sets <lastmod> to the date the file last changed in git (today if it has
    uncommitted changes); no <changefreq>/<priority>, which Google ignores;
  * writes one sitemap per section plus the index sitemap.xml (named in robots.txt).
"""
import datetime, html, os, re, subprocess
from html.parser import HTMLParser
from urllib.parse import quote, unquote, urljoin, urlparse

SITE = 'https://jarrar.info/'
HOSTS = {'jarrar.info', 'www.jarrar.info', 'mustafajarrar.github.io'}
ROOT = os.path.dirname(os.path.abspath(__file__))

# Pages that must not be listed: error/verification pages, a redirect-only page,
# an unlinked copy of the homepage, and a not-yet-published sample page.
EXCLUDE = {
    '404.html', 'google886fdc4b65e87282.html', 'OOA/OOA-HR-RoadMap.html',
    'calendar.html', 'publications/HKJ25/index.html',
}

# Which sitemap a URL goes into, by path prefix (first match wins).
SECTIONS = [
    ('sitemapPublications.xml', ('publications/', 'phd-thesis/')),
    ('sitemapTalks.xml',        ('Talks/',)),
    ('sitemapCourses.xml',      ('courses/',)),
    ('CContology.xml',          ('CContology/',)),
    ('sitemapActivities.xml',   ('',)),          # everything else
]

os.chdir(ROOT)
TODAY = datetime.date.today().isoformat()
dirty = set(subprocess.run(['git', 'status', '--porcelain', '-z'], capture_output=True)
            .stdout.decode('utf-8', 'replace').split('\0'))
dirty = {d[3:] for d in dirty if len(d) > 3}

def lastmod(path):
    if path in dirty:
        return TODAY
    d = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', path],
                       capture_output=True, text=True).stdout.strip()
    return d or TODAY

def page_url(path):
    """Canonical URL of a file: folder form for index.html, spaces encoded."""
    if path == 'index.html':
        return SITE
    if path.endswith('/index.html'):
        path = path[:-len('index.html')]
    return SITE + quote(path)

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.hrefs = []; self.noindex = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'a' and a.get('href'):
            self.hrefs.append(a['href'])
        if tag == 'meta' and (a.get('name') or '').lower() == 'robots' and 'noindex' in (a.get('content') or '').lower():
            self.noindex = True

files = set()
for d, ds, fs in os.walk('.'):
    ds[:] = [x for x in ds if not x.startswith('.')]
    for f in fs:
        files.add(os.path.join(d, f)[2:])

pages = sorted(f for f in files if f.endswith('.html') and f not in EXCLUDE)
urls = {}   # url -> lastmod
for p in pages:
    parser = Links()
    parser.feed(open(p, encoding='utf-8', errors='replace').read())
    if parser.noindex:
        continue
    urls[page_url(p)] = lastmod(p)
    base = page_url(p)
    for href in parser.hrefs:
        u = urlparse(urljoin(base, html.unescape(href.strip())))
        if u.scheme not in ('http', 'https') or u.netloc.lower() not in HOSTS:
            continue
        target = unquote(u.path).lstrip('/')
        if target.lower().endswith('.pdf') and target in files:   # exact case, file exists
            urls[SITE + quote(target)] = lastmod(target)

def section_of(url):
    path = url[len(SITE):]
    for name, prefixes in SECTIONS:
        if any(path.startswith(pref) for pref in prefixes):
            return name
    return SECTIONS[-1][0]

groups = {name: [] for name, _ in SECTIONS}
for url in urls:
    groups[section_of(url)].append(url)

def write(name, body):
    with open(name, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('<?xml version="1.0" encoding="UTF-8"?>\n' + body)

index = []
for name, _ in SECTIONS:
    entries = sorted(groups[name], key=lambda u: (u.lower().endswith('.pdf'), u.lower()))
    if not entries:
        continue
    lines = [f'  <url><loc>{html.escape(u)}</loc><lastmod>{urls[u]}</lastmod></url>' for u in entries]
    write(name, '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(lines) + '\n</urlset>\n')
    newest = max(urls[u] for u in entries)
    index.append(f'  <sitemap><loc>{SITE}{name}</loc><lastmod>{newest}</lastmod></sitemap>')
    pdfs = sum(u.lower().endswith('.pdf') for u in entries)
    print(f'{name:26} {len(entries):4} URLs ({len(entries) - pdfs} pages, {pdfs} PDFs)')

write('sitemap.xml', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(index) + '\n</sitemapindex>\n')
print(f'sitemap.xml (index)        {len(index)} sitemaps, {len(urls)} URLs in total')
