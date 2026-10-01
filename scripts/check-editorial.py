"""Browser checks for the wiki's editorial typography. Run with uv --with playwright."""
import json, os, re, time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.getenv('WIKI_PREVIEW_URL', 'http://127.0.0.1:4321/socionics-wiki/')
OUT = Path(os.getenv('WIKI_SCREENSHOT_DIR', str(Path(os.getenv('TMPDIR', 'output')) / 'wiki-editorial-check')))
OUT.mkdir(parents=True, exist_ok=True)
ROUTES = {'applications': 'applications/', 'article': 'theory/formal/otkrytyj-korpus-formalizacii-socioniki/', 'home': ''}
SELECTORS = ['article p', 'h1#_top', 'article h2', '.sidebar .group-label .large', '.sidebar a[aria-current]', '#starlight__on-this-page', '.cross-links__title', '.cross-links__list a', '.discuss-cta__lead', '.discuss-cta__btn', '.application-preview figcaption', '.application-preview__launch', '.updates-feed time', '.updates-feed h2']
STYLE = '''(e)=>{const s=getComputedStyle(e);const chain=[];for(let n=e;n;n=n.parentElement){const c=getComputedStyle(n);chain.push({bg:c.backgroundColor,opacity:c.opacity});}return {text:e.innerText,color:s.color,size:s.fontSize,font:s.fontFamily,weight:s.fontWeight,transform:s.textTransform,background:s.backgroundColor,outline:s.outlineStyle,chain};}'''

def rgba(s):
    values = [float(v) for v in re.findall(r'[\d.]+', s)]
    return tuple(values[:3]) + (values[3] if len(values) > 3 else 1,)

def blend(fg, bg):
    return tuple(fg[i]*fg[3] + bg[i]*(1-fg[3]) for i in range(3))

def luminance(rgb):
    c = [v/255 for v in rgb]
    c = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in c]
    return .2126*c[0] + .7152*c[1] + .0722*c[2]

def contrast(style):
    bg=(255,255,255)
    for layer in reversed(style['chain']):
        bg=blend(rgba(layer['bg']),bg)
    color=rgba(style['color'])
    alpha=color[3]
    for layer in style['chain']:
        alpha *= float(layer['opacity'])
    fg=blend(color[:3]+(alpha,),bg)
    a,b=sorted([luminance(fg),luminance(bg)],reverse=True)
    return (a+.05)/(b+.05)

results=[]
with sync_playwright() as p:
    browser=p.chromium.launch()
    for theme in ['dark','light']:
        context=browser.new_context(color_scheme=theme, reduced_motion='reduce')
        context.add_init_script(f"localStorage.setItem('starlight-theme', '{theme}')")
        page=context.new_page()
        errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        for width in [1880,390]:
            page.set_viewport_size({'width':width,'height':980})
            for name, route in ROUTES.items():
                for attempt in range(60):
                    try:
                        response=page.goto(BASE+route,wait_until='networkidle',timeout=15000)
                        assert response.status==200
                        break
                    except Exception:
                        time.sleep(1)
                else:
                    raise AssertionError(f'Route unavailable: {route}')
                page.evaluate('document.fonts.ready')
                assert page.get_attribute('html','data-theme')==theme
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (name,width,'overflow')
                print('CHECK', name, theme, width, flush=True)
                if width==390 and page.locator('starlight-menu-button button').count():
                    menu=page.locator('starlight-menu-button button')
                    menu.click()
                    assert page.locator('starlight-menu-button').get_attribute('aria-expanded')=='true'
                    expect(page.locator('.sidebar a[aria-current="page"]')).to_be_visible()
                    menu.click()
                    assert page.locator('starlight-menu-button').get_attribute('aria-expanded')=='false'
                record={'route':name,'theme':theme,'width':width,'styles':{}}
                for selector in SELECTORS:
                    el=page.locator(selector).first
                    if not el.count():
                        continue
                    style=el.evaluate(STYLE)
                    ratio=contrast(style)
                    assert ratio>=4.5,(name,theme,selector,ratio,style)
                    style.pop('chain')
                    style['contrast']=round(ratio,2)
                    record['styles'][selector]=style
                if name=='applications':
                    assert page.locator('.application-preview__launch').count()==5
                    assert page.locator('.application-preview img').count()==5
                    heading=page.locator('.cross-links__title')
                    assert heading.evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)')<=16
                    link=page.locator('.application-preview__launch').first
                    page.keyboard.press('Tab')
                    link.focus()
                    assert link.evaluate('(e)=>getComputedStyle(e).outlineStyle')=='solid'
                    assert link.bounding_box()['height']>=44
                    if width==1880 and theme=='dark':
                        cdp=context.new_cdp_session(page)
                        cdp.send('DOM.enable'); cdp.send('CSS.enable')
                        doc=cdp.send('DOM.getDocument')['root']['nodeId']
                        fonts={}
                        for selector in ['article p','article h2','.sidebar .group-label .large']:
                            node=cdp.send('DOM.querySelector',{'nodeId':doc,'selector':selector})['nodeId']
                            fonts[selector]=cdp.send('CSS.getPlatformFontsForNode',{'nodeId':node})['fonts']
                        record['renderedFonts']=fonts
                    for image in page.locator('.application-preview img').all():
                        image.scroll_into_view_if_needed()
                        page.wait_for_timeout(200)
                    assert page.locator('.application-preview img').evaluate_all('(els)=>els.every(e=>e.complete && e.naturalWidth>0)')
                page.evaluate('window.scrollTo(0,0)')
                page.screenshot(path=str(OUT/f'{name}-{theme}-{width}-top.png'))
                if name=='applications':
                    page.locator('.cross-links').scroll_into_view_if_needed()
                    page.evaluate("window.scrollTo(0, document.querySelector('.cross-links').getBoundingClientRect().top + window.scrollY - 430)")
                    page.screenshot(path=str(OUT/f'{name}-{theme}-{width}-footer.png'))
                results.append(record)
        assert not errors,errors
        context.close()
    browser.close()
(OUT/'verification.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'status':'passed','configurations':len(results),'minimumMeasuredContrast':min(s['contrast'] for r in results for s in r['styles'].values()),'screenshots':str(OUT)},ensure_ascii=False,indent=2))
