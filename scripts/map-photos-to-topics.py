#!/usr/bin/env python
"""Map each photo file to its Telegram topic by reply-chain.

Telegram topic groups thread messages under a topic root. We follow
the reply_to_message chain to trace each photo back to topic root
2 (Соционика Типирование), 4 (Дизайн Человека + Генные Ключи),
or 6 (Целительные Сессии).
"""
import json
import re
from pathlib import Path
from collections import defaultdict

SRC = Path(r"C:\Serge\Новая папка\socionics-wiki-main\socionics-wiki-main\public\messages reviews.html")
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "photo-topics.json"

TOPICS = {2: 'typing', 4: 'human-design', 6: 'therapy'}

src_html = SRC.read_text(encoding='utf-8')

# Pull all messages: id, reply_to_id, photo files referenced, has_text
markers = list(re.finditer(
    r'<div class="message (default clearfix(?: joined)?|service)" id="message(-?\d+)">',
    src_html,
))

messages = {}
for i, m in enumerate(markers):
    start = m.start()
    end = markers[i + 1].start() if i + 1 < len(markers) else len(src_html)
    body = src_html[start:end]
    mid = int(m.group(2))

    reply_match = re.search(r'GoToMessage\((\d+)\)', body)
    reply_to = int(reply_match.group(1)) if reply_match else None

    photos = re.findall(r'href="photos/(photo_[^"]+\.jpg)"', body)

    messages[mid] = {
        'reply_to': reply_to,
        'photos': photos,
    }


def trace_topic(mid: int, depth: int = 0) -> str | None:
    if depth > 30:
        return None
    if mid in TOPICS:
        return TOPICS[mid]
    msg = messages.get(mid)
    if not msg or msg['reply_to'] is None:
        return None
    return trace_topic(msg['reply_to'], depth + 1)


photo_to_topic = {}
for mid, msg in messages.items():
    if not msg['photos']:
        continue
    topic = trace_topic(mid)
    if not topic:
        continue
    for ph in msg['photos']:
        # Skip thumbs — they're scaled-down previews
        if '_thumb' in ph:
            continue
        photo_to_topic[ph] = topic

# Stats
counts = defaultdict(int)
for t in photo_to_topic.values():
    counts[t] += 1

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(photo_to_topic, ensure_ascii=False, indent=2), encoding='utf-8')

print(f"Mapped {len(photo_to_topic)} photos to topics:")
for t, c in sorted(counts.items()):
    print(f"  {t}: {c}")
print(f"\nWritten to: {OUT.relative_to(OUT.parent.parent.parent)}")
