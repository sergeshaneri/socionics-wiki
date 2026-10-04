"""Verify scroll-reveal progressive enhancement against a built preview."""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright

BASE = os.environ.get("WIKI_PREVIEW_URL", "http://127.0.0.1:4321/socionics-wiki/").rstrip("/") + "/"
ROUTES = ["typing", "human-design", "therapy", "teo", "reviews"]
VIEWPORTS = [{"width": 390, "height": 844}, {"width": 1440, "height": 900}]
MODES = ["no-js", "no-observer", "observer-error", "js", "reduced-motion"]

# Child opacity alone does not establish visibility when an ancestor is hidden.
VISIBLE = """el => {
  if (!el.getClientRects().length) return false;
  for (let node = el; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) < 0.99) return false;
  }
  return getComputedStyle(el).filter === 'none' || getComputedStyle(el).filter === 'blur(0px)';
}"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=["all", *MODES], default="all")
    args = parser.parse_args()
    modes = MODES if args.mode == "all" else [args.mode]
    screenshot_dir = os.environ.get("WIKI_SCREENSHOT_DIR")
    if screenshot_dir:
        Path(screenshot_dir).mkdir(parents=True, exist_ok=True)
    results = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for mode in modes:
            for viewport in VIEWPORTS:
                for route in ROUTES:
                    context = browser.new_context(
                        viewport=viewport,
                        java_script_enabled=mode != "no-js",
                        reduced_motion="reduce" if mode == "reduced-motion" else "no-preference",
                    )
                    if mode == "no-observer":
                        context.add_init_script("delete window.IntersectionObserver;")
                    elif mode == "observer-error":
                        context.add_init_script("window.IntersectionObserver = class { constructor() { throw Error('injected observer error'); } };")
                    page = context.new_page()
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    result = {"route": route, "mode": mode, "width": viewport["width"]}
                    try:
                        url = urljoin(BASE, route + "/")
                        response = page.goto(url, wait_until="domcontentloaded", timeout=20000)
                        assert response and response.status == 200, f"HTTP failure: {url}"
                        assert page.url.rstrip("/") == url.rstrip("/"), f"Wrong page: {page.url}"
                        heading = page.locator("main h1")
                        assert heading.count() == 1, "Expected one main heading"
                        reveals = page.locator("main [data-reveal]")
                        count = reveals.count()
                        assert count > 0, "Missing scroll-reveal content"
                        result["reveal_count"] = count
                        if mode == "js":
                            page.wait_for_function(f"({VISIBLE})(document.querySelector('main h1'))", timeout=5000)
                        else:
                            assert reveals.evaluate_all(f"els => els.every({VISIBLE})"), "Hidden or blurred content"
                        assert heading.evaluate(VISIBLE), "Hidden main heading"
                        assert heading.evaluate("el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; }"), "Heading outside first viewport"
                        if screenshot_dir and mode in ("no-js", "js"):
                            page.screenshot(path=str(Path(screenshot_dir) / f"{route}-{mode}-{viewport['width']}.png"))
                        pending = reveals.evaluate_all("els => els.filter(el => el.classList.contains('is-reveal-pending')).length")
                        assert pending == (count if mode in ("js", "reduced-motion") else 0), "Incorrect enhancement state"
                        if mode == "js":
                            last = reveals.last
                            last.scroll_into_view_if_needed()
                            page.wait_for_function(f"({VISIBLE})(document.querySelectorAll('main [data-reveal]')[{count - 1}])", timeout=5000)
                            assert last.evaluate("el => el.classList.contains('is-visible')"), "Scroll reveal did not activate"
                        if mode in ("js", "no-observer") and route != "reviews":
                            carousel = page.locator("[data-carousel]")
                            assert carousel.count() == 1, "Missing or ambiguous service carousel"
                            track = carousel.locator("[data-rc-track]")
                            assert track.get_attribute("tabindex") == "0", "Carousel keyboard navigation not initialized"
                            prev = carousel.locator("[data-rc-prev]")
                            assert prev.is_disabled(), "Carousel should start on first review"
                            carousel.locator("[data-rc-next]").click()
                            page.wait_for_function("!document.querySelector('[data-rc-prev]').disabled", timeout=5000)
                            prev.click()
                            page.wait_for_function("document.querySelector('[data-rc-prev]').disabled", timeout=5000)
                        unexpected_errors = [error for error in errors if mode != "observer-error" or "injected observer error" not in error]
                        assert not unexpected_errors, unexpected_errors
                        if mode == "observer-error":
                            assert any("injected observer error" in error for error in errors), "Observer failure was not injected"
                        result["passed"] = True
                    except Exception as error:
                        result.update(passed=False, error=str(error))
                    finally:
                        context.close()
                    results.append(result)
        browser.close()
    expected = len(modes) * len(VIEWPORTS) * len(ROUTES)
    assert len(results) == expected, "Incomplete test matrix"
    failed = [result for result in results if not result["passed"]]
    print(json.dumps({"base_url": BASE, "cases": len(results), "failed": len(failed), "results": results}, ensure_ascii=False, indent=2))
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
