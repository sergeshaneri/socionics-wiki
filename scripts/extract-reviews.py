#!/usr/bin/env python
"""Extract Telegram reviews export into per-topic JSON (keyword-classified).

Telegram topic groups don't reliably expose topic membership in the HTML
export, so we classify each forwarded review by keyword heuristics against
the three landing topics: typing, human-design, therapy.
"""
import json
import re
import html as html_mod
from pathlib import Path

SRC = Path(r"C:\Serge\messages reviews.html")
OUT_DIR = Path(__file__).resolve().parent.parent / "src" / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)

RE_FROM_NAME = re.compile(r'<div class="from_name">\s*([^<]+?)\s*(?:<span|</div>)', re.DOTALL)
RE_TEXT_BLOCK = re.compile(r'<div class="text">(.*?)</div>', re.DOTALL)
RE_FORWARDED_MARKER = re.compile(r'<div class="forwarded body">')
RE_DATE_TITLE = re.compile(r'title="(\d{2}\.\d{2}\.\d{4}[^"]+)"')

# Keyword lexicons, lowercase
KW = {
    'typing': [
        'типирован', 'тим ', 'тим,', 'тим.', 'тим!', 'тим?', 'тима', 'тиму', 'тимом',
        'социоанализ', 'соционик', 'соционики', 'рейнин', 'модель а', 'модели а',
        'аспект', 'функци', 'семантик', 'дихотоми', 'интертип',
    ],
    'human-design': [
        'дизайн человека', 'дизайна человека', 'дизайну человека', 'идч',
        'генные ключи', 'генных ключ', 'генными ключ', 'бодиграф', 'хологенет',
        'активаци', 'золотой путь', 'генератор', 'манифестор', 'проектор',
        'рефлектор', 'профиль', 'сакральной ран', 'венер', 'юпитер', 'меркури',
        'внутренн', 'авторитет', 'стратеги',
    ],
    'therapy': [
        'медитац', 'терапи', 'терапевт', 'исцел', 'чувств', 'эмоци',
        'проработ', 'травм', 'душ', 'дух', 'состояни', 'расстан',
        'подсозн', 'гипно', 'регресс', 'сессия', 'сессии', 'сессий',
        'гештальт', 'эот', 'родовы', 'субличн',
    ],
}


def clean_text(raw: str) -> str:
    raw = re.sub(r'<br\s*/?>', '\n', raw)
    text = re.sub(r'<[^>]+>', '', raw)
    text = html_mod.unescape(text)
    lines = [ln.strip() for ln in text.split('\n')]
    return '\n'.join(ln for ln in lines if ln).strip()


def classify(text: str) -> str | None:
    """Return topic key or None if ambiguous / no match."""
    lower = text.lower()
    scores = {}
    for topic, words in KW.items():
        s = sum(lower.count(w) for w in words)
        scores[topic] = s
    # Pick the top scorer if it has a clear lead
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return None
    # Therapy signals often overlap with HD ("чувств", "душ") — require
    # HD to WIN decisively if both score:
    sorted_scores = sorted(scores.values(), reverse=True)
    if sorted_scores[0] == sorted_scores[1]:
        # Tie: prefer the more specific (longer-tail) topic first:
        # typing > human-design > therapy
        if scores['typing'] == sorted_scores[0]:
            return 'typing'
        if scores['human-design'] == sorted_scores[0]:
            return 'human-design'
        return 'therapy'
    return best


def first_sentence(text: str, max_chars: int = 220) -> str:
    """Short preview sentence (not used yet but handy)."""
    text = text.strip()
    m = re.search(r'[.!?]', text)
    if m and m.start() < max_chars:
        return text[: m.start() + 1]
    return text[:max_chars] + ('…' if len(text) > max_chars else '')


def main():
    src_html = SRC.read_text(encoding='utf-8')

    # Split into message blocks by id marker
    markers = [(m.start(), m.group(1), m.group(2))
               for m in re.finditer(r'<div class="message (default clearfix(?: joined)?|service)" id="message(-?\d+)">', src_html)]

    reviews_by_topic = {'typing': [], 'human-design': [], 'therapy': []}
    uncategorized = 0

    for i, (start, kind, mid) in enumerate(markers):
        if not kind.startswith('default'):
            continue
        end = markers[i + 1][0] if i + 1 < len(markers) else len(src_html)
        body = src_html[start:end]

        # Prefer forwarded body (original client message) if present.
        # The forwarded div contains nested divs, so rather than balancing
        # tags just split the body at the marker and scan forward.
        fwd_pos = body.find('<div class="forwarded body">')
        if fwd_pos >= 0:
            section = body[fwd_pos:]
        else:
            section = body

        from_m = RE_FROM_NAME.search(section)
        author = from_m.group(1).strip() if from_m else 'Аноним'
        # When no forwarded block, the outer from_name is Сергей — skip those
        # (his own messages aren't client reviews).
        if fwd_pos < 0 and 'Сергей Шанэри' in author:
            continue

        # Text — pull the first .text block inside the section
        t_m = RE_TEXT_BLOCK.search(section)
        if not t_m:
            continue
        text = clean_text(t_m.group(1))
        if len(text) < 60:
            continue

        # Date — use the outer date for consistency
        d_m = RE_DATE_TITLE.search(body)
        date = d_m.group(1) if d_m else ''

        topic = classify(text)
        if not topic:
            uncategorized += 1
            continue

        # Clean author — strip any trailing non-name tokens
        author = re.sub(r'\s*<.*$', '', author).strip()
        if author == 'Deleted Account':
            author = 'Клиент'

        reviews_by_topic[topic].append({
            'author': author,
            'text': text,
            'date': date[:10],  # just DD.MM.YYYY
        })

    # De-duplicate by text (sometimes same review posted multiple times)
    for topic, revs in reviews_by_topic.items():
        seen = set()
        unique = []
        for r in revs:
            key = r['text'][:120]
            if key in seen:
                continue
            seen.add(key)
            unique.append(r)
        reviews_by_topic[topic] = unique

    for topic, reviews in reviews_by_topic.items():
        out = OUT_DIR / f"reviews-{topic}.json"
        out.write_text(
            json.dumps(reviews, ensure_ascii=False, indent=2),
            encoding='utf-8',
        )
        rel = out.relative_to(OUT_DIR.parent.parent)
        print(f"{topic}: {len(reviews)} reviews -> {rel}")
    print(f"uncategorized: {uncategorized}")


if __name__ == '__main__':
    main()
