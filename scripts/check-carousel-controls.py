"""Check review carousel control bounds and real navigation on service pages."""
import json
import os
import sys
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright, expect

BASE = os.getenv("WIKI_PREVIEW_URL", "http://127.0.0.1:4321/socionics-wiki/").rstrip("/") + "/"
ROUTES = ["typing", "human-design", "therapy", "teo"]
WIDTHS = [320, 390, 768, 1440]
BOUNDS = """el => {
    const r = el.getBoundingClientRect();
    const parent = el.closest('[data-carousel]').getBoundingClientRect();
    return r.width >= 28 && r.height >= 28 && r.left >= Math.max(0, parent.left) - 1 && r.right <= Math.min(innerWidth, parent.right) + 1;
}"""


def wait_slide(page, index):
    page.wait_for_function("""index => {
        const track = document.querySelector('[data-rc-track]');
        const slide = document.querySelectorAll('[data-rc-slide]')[index];
        const target = Math.max(0, Math.min(slide.offsetLeft - track.offsetLeft, track.scrollWidth - track.clientWidth));
        return Math.abs(track.scrollLeft - target) < 2;
    }""", arg=index, timeout=5000)


def main():
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for observer in [True, False]:
            for width in WIDTHS:
                for route in ROUTES:
                    context = browser.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce")
                    context.set_default_timeout(5000)
                    if not observer:
                        context.add_init_script("delete window.IntersectionObserver;")
                    page = context.new_page()
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    result = {"route": route, "width": width, "observer": observer}
                    try:
                        response = page.goto(urljoin(BASE, route + "/"), wait_until="domcontentloaded")
                        assert response and response.status == 200
                        root = page.locator("[data-carousel]")
                        assert root.count() == 1, "Expected one carousel"
                        controls = root.locator(".rc__controls")
                        controls.scroll_into_view_if_needed()
                        prev = root.locator("[data-rc-prev]")
                        next_button = root.locator("[data-rc-next]")
                        dots = root.locator("[data-rc-dot]")
                        assert prev.evaluate(BOUNDS), "Previous arrow outside carousel or viewport"
                        assert next_button.evaluate(BOUNDS), "Next arrow outside carousel or viewport"
                        assert dots.evaluate_all(f"els => els.every({BOUNDS})"), "Dot controls outside carousel or viewport"
                        expect(prev).to_be_disabled()
                        next_button.click()
                        wait_slide(page, 1)
                        expect(prev).to_be_enabled()
                        prev.click()
                        wait_slide(page, 0)
                        track = root.locator("[data-rc-track]")
                        track.press("ArrowRight")
                        wait_slide(page, 1)
                        track.press("ArrowLeft")
                        wait_slide(page, 0)
                        dots.last.click()
                        wait_slide(page, dots.count() - 1)
                        expect(next_button).to_be_disabled()
                        expect(prev).to_be_enabled()
                        assert prev.evaluate(BOUNDS) and next_button.evaluate(BOUNDS), "Arrow escaped bounds after switching"
                        assert not errors, errors
                        result["passed"] = True
                    except Exception as error:
                        result.update(passed=False, error=str(error))
                    finally:
                        context.close()
                    results.append(result)
                    print(json.dumps(result, ensure_ascii=False), file=sys.stderr, flush=True)
        browser.close()
    assert len(results) == len(ROUTES) * len(WIDTHS) * 2
    failed = [r for r in results if not r["passed"]]
    print(json.dumps({"cases": len(results), "failed": len(failed), "results": results}, ensure_ascii=False, indent=2))
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
