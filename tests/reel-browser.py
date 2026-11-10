from playwright.sync_api import sync_playwright
from pathlib import Path
import os

base_url = os.environ.get('OSPLY_TEST_URL', 'http://127.0.0.1:3000/').rstrip('/') + '/'
Path('/tmp/osply-checks').mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'])
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.add_init_script("sessionStorage.setItem('osply-visited', 'yes')")
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(base_url)
    page.wait_for_timeout(1100)
    track = page.locator('.project-track')
    assert page.locator('.webgl-ready').count() == 1
    page.mouse.wheel(0, 12)
    page.wait_for_timeout(50)
    position = float(track.get_attribute('data-position'))
    assert 0 < position < .1, f'Small wheel input must visibly move the reel: {position}'
    page.wait_for_function("document.querySelector('.project-track').dataset.motion === 'idle'")
    assert float(track.get_attribute('data-position')) == 0
    page.mouse.wheel(0, 400)
    page.wait_for_timeout(90)
    page.screenshot(path='/tmp/osply-checks/depth-transition.png')
    page.wait_for_function("document.querySelector('.project-track').dataset.motion === 'idle'")
    assert page.locator('.project-card.selected').get_attribute('data-project') == '1'
    page.mouse.wheel(0, 800)
    page.wait_for_function("document.querySelector('.project-track').dataset.motion !== 'idle'")
    page.wait_for_function("document.querySelector('.project-track').dataset.motion === 'idle'")
    assert page.locator('.project-card.selected').get_attribute('data-project') == '3'
    page.mouse.wheel(0, -800)
    page.wait_for_function("document.querySelector('.project-track').dataset.motion !== 'idle'")
    page.wait_for_function("document.querySelector('.project-track').dataset.motion === 'idle'")
    assert page.locator('.project-card.selected').get_attribute('data-project') == '1'
    page.evaluate("window.dispatchEvent(new WheelEvent('wheel', {deltaY:400, ctrlKey:true, cancelable:true}))")
    page.wait_for_timeout(150)
    assert page.locator('.project-card.selected').get_attribute('data-project') == '1'
    page.set_viewport_size({'width': 1000, 'height': 750})
    page.wait_for_timeout(150)
    assert page.locator('.webgl-ready').count() == 1
    page.evaluate("document.querySelector('canvas').getContext('webgl').getExtension('WEBGL_lose_context').loseContext()")
    page.wait_for_timeout(150)
    assert page.locator('.webgl-ready').count() == 0
    assert page.locator('.project-card.selected img').evaluate('(e)=>getComputedStyle(e).opacity') == '1'
    assert not errors, errors
    print('Continuous small deltas, distance-proportional movement, reversal, settling, zoom gestures, resize and GPU-loss fallback passed')
    browser.close()
