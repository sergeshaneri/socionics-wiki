"""Browser regression check. Start npm run dev, then:
uv run --with playwright python scripts/check-reader.py http://127.0.0.1:4322/socionics-wiki/
Install the test browser once: uv run --with playwright python -m playwright install chromium
"""
import sys
from playwright.sync_api import sync_playwright

base = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4322/socionics-wiki/').rstrip('/') + '/'
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    page.goto(base + 'information-elements/aspekton-struktura/', wait_until='networkidle')
    article = page.locator('article.sl-markdown-content')
    assert article.locator('p').filter(has_text='**').count() == 0, 'Stray Markdown marker'
    assert article.locator('a').first.inner_text() == 'Исходный документ в Google Docs'
    assert article.locator('table').first.locator('thead th').all_text_contents() == ['', 'Сущ', 'Верт', 'дт/бт', 'отвл/вовл', 'аф/гм', '-яв/яв', 'Наль', 'Таль']
    assert article.locator('table').first.locator('tbody tr').count() == 8
    assert article.locator('table').first.locator('tbody td').nth(1).evaluate('(e)=>getComputedStyle(e).textAlign') == 'center'
    for theme in ['dark', 'light']:
        page.evaluate('(t)=>document.documentElement.dataset.theme=t', theme)
        assert page.locator('.sidebar .group-label .large').first.evaluate('(e)=>getComputedStyle(e).textTransform') == 'none'
        assert page.locator('#starlight__on-this-page').evaluate('(e)=>getComputedStyle(e).fontSize') == '16px'
        for width in [390, 768, 1440]:
            page.set_viewport_size({'width': width, 'height': 1000})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (theme, width)
    page.goto(base + 'beginners/metodichka/', wait_until='networkidle')
    # Synthetic markup isolates spacing rules without changing published content.
    page.locator('article [itemprop="articleBody"]').evaluate('''e=>{
      const f=document.createElement('section');f.id='reader-fixture';
      f.innerHTML='<ul><li>Короткий</li><li id="tight">Короткий</li></ul><ul><li><p>Первый абзац</p><p>Второй абзац</p></li><li id="loose"><p>Следующий пункт</p></li></ul><ul><li>Внешний<ul><li>Вложенный</li></ul></li></ul>';
      e.append(f);
    }''')
    margins = page.evaluate("['tight','loose'].map(id=>parseFloat(getComputedStyle(document.getElementById(id)).marginTop))")
    assert margins[1] > margins[0], margins
    for heading in page.locator('article h1, article h2, article h3').all():
        assert 'Inter Variable' in heading.evaluate('(e)=>getComputedStyle(e).fontFamily')
    assert page.locator('article .sl-heading-wrapper.level-h2').evaluate_all("els=>els.length>0 && els.every(e=>getComputedStyle(e,'::after').display==='none')")
    page.locator('#reader-fixture').evaluate('(e)=>e.remove()')
    # Reader styles must not activate on standalone landings or the homepage.
    for route in ['', 'typing/', 'human-design/', 'services/']:
        page.goto(base + route, wait_until='networkidle')
        assert page.locator('article.sl-markdown-content').count() == 0, route
        assert page.locator('html').evaluate("e=>getComputedStyle(e).getPropertyValue('--reader-font')") == '', route
    browser.close()
print('PASS: pilot Markdown/table, navigation, list rhythm, headings, theme/viewport checks, excluded pages')
