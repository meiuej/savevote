#!/usr/bin/env python3
"""Build news pages from the JSON entries managed by Decap CMS (stdlib only)."""
import argparse
import html
import json
import shutil
from datetime import datetime
from pathlib import Path
from urllib.parse import quote, urlparse

ROOT = Path(__file__).resolve().parents[1]
def esc(value):
    return html.escape(str(value), quote=True)

def image_url(value):
    value = str(value or '')
    if value.startswith('/uploads/news/') and '..' not in value.split('/'):
        return value
    if urlparse(value).scheme == 'https':
        return value
    return ''

def page(title, description, content):
    return f'''<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)} — Сохранить Голос</title><meta name="description" content="{esc(description)}">
<link rel="stylesheet" href="/styles.css?v=20260918-3"><link rel="stylesheet" href="/news.css?v=1"></head>
<body class="news-page"><header class="news-header"><nav class="container" aria-label="Навигация"><a class="news-brand" href="/">Сохранить Голос</a><div><a href="/">Главная</a><a href="/news/" aria-current="{'page' if title == 'Новости' else 'false'}">Новости</a></div></nav></header>
<main class="container news-main">{content}</main><footer class="container news-footer">© 2026 «Сохранить голос» · <a href="https://t.me/savemyvote_bot">Связаться с нами</a></footer></body></html>'''

def build(source, output):
    entries = []
    for path in source.glob('*.json'):
        post = json.loads(path.read_text())
        for key in ('title', 'summary', 'body', 'date'):
            if not isinstance(post.get(key), str) or not post[key].strip():
                raise ValueError(f'{path.name}: missing {key}')
        date = datetime.fromisoformat(post['date'].replace('Z', '+00:00'))
        if date.tzinfo is None:
            raise ValueError(f'{path.name}: date must include timezone')
        entries.append((date, path.stem, post))
    entries.sort(key=lambda item: (item[0], item[1]), reverse=True)
    output.mkdir(parents=True, exist_ok=True)
    cards = []
    for date, slug, post in entries:
        url = '/news/' + quote(slug, safe='') + '/'
        photo = image_url(post.get('image'))
        image = f'<img src="{esc(photo)}" alt="{esc(post.get("image_alt", ""))}" loading="lazy">' if photo else ''
        stamp = f'<time datetime="{esc(post["date"])}">{date:%d.%m.%Y}</time>'
        cards.append(f'<article class="news-card"><a href="{url}">{image}<div>{stamp}<h2>{esc(post["title"])}</h2><p>{esc(post["summary"])}</p><span class="news-more">Читать новость ↗</span></div></a></article>')
        body = ''.join('<p>' + esc(paragraph).replace('\n', '<br>') + '</p>' for paragraph in post['body'].split('\n\n') if paragraph.strip())
        content = f'<article class="news-article"><a class="news-back" href="/news/">← Все новости</a>{stamp}<h1>{esc(post["title"])}</h1><p class="news-summary">{esc(post["summary"])}</p>{image}<div class="news-body">{body}</div></article>'
        directory = output / slug
        directory.mkdir(exist_ok=True)
        (directory / 'index.html').write_text(page(post['title'], post['summary'], content))
    listing = '<div class="news-grid">' + ''.join(cards) + '</div>' if cards else '<div class="news-empty"><h2>Скоро здесь появятся новости</h2><p>Обновления проекта и важные сообщения — на одной странице.</p><a href="/">Вернуться на главную ↗</a></div>'
    (output / 'index.html').write_text(page('Новости', 'Новости и обновления проекта «Сохранить голос».', '<p class="eyebrow">Сохранить голос · Новости</p><h1>Что нового</h1><p class="news-intro">Новости и важные обновления проекта.</p>' + listing))
    return len(entries)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=ROOT / '_site')
    args = parser.parse_args()
    destination = args.output.resolve()
    if destination == ROOT or ROOT in destination.parents and destination != ROOT / '_site':
        raise SystemExit('Choose _site or an output directory outside the repository')
    destination.mkdir(parents=True, exist_ok=True)
    for path in ROOT.iterdir():
        if path.is_file() and path.suffix in ('.html', '.css', '.js', '.webp', '.otf') or path.name == 'CNAME':
            shutil.copy2(path, destination / path.name)
    for folder in ('admin', 'data', 'uploads'):
        shutil.copytree(ROOT / folder, destination / folder, dirs_exist_ok=True)
    # Remove previous generated articles so deleted entries cannot remain published.
    news = destination / 'news'
    if news.exists():
        shutil.rmtree(news)
    count = build(ROOT / 'content/news', news)
    (destination / '.nojekyll').touch()
    print(f'Built {count} news entries in {destination}')
