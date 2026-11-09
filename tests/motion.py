from playwright.sync_api import sync_playwright
from pathlib import Path
import json
import os
base_url = os.environ.get("OSPLY_TEST_URL", "http://127.0.0.1:3000/").rstrip("/") + "/"
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base_url);page.wait_for_timeout(2600)
 print('WebGL:',page.locator('.project-track').get_attribute('class'))
 assert page.locator('.project-track.webgl-ready').count()==1
 page.screenshot(path='/tmp/osply-checks/motion-rest.png')
 page.mouse.wheel(0,400);page.wait_for_timeout(100)
 page.screenshot(path='/tmp/osply-checks/motion-curve.png')
 page.wait_for_timeout(1700)
 page.locator('.project-card.selected').click();page.wait_for_timeout(200)
 assert page.locator('.transition-image').count()==1
 page.screenshot(path='/tmp/osply-checks/motion-open.png')
 page.wait_for_timeout(1000)
 assert page.locator('.transition-image').count()==0
 page.locator('.case-scroll').hover();page.mouse.wheel(0,600);page.wait_for_timeout(500)
 assert page.locator('.scroll-reveal.is-revealed').count()>0
 page.keyboard.press('Escape');page.wait_for_timeout(800)
 assert page.locator('.transition-image').count()==0
 fallback=b.new_context(reduced_motion='reduce')
 fallback.add_init_script("const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { if (type === 'webgl') return null; return original.call(this, type, ...args); };")
 fp=fallback.new_page();fp.on('pageerror',lambda e:errors.append(str(e)))
 fp.goto(base_url);fp.wait_for_timeout(400)
 assert fp.locator('.project-track.webgl-ready').count()==0
 assert fp.locator('.project-card.selected img').evaluate('(e)=>getComputedStyle(e).opacity')=='1'
 fp.keyboard.press('ArrowDown');fp.wait_for_timeout(80)
 assert fp.locator('.project-card.selected').get_attribute('data-project')=='1'
 fp.locator('.project-card.selected').click();fp.wait_for_timeout(200)
 assert fp.locator('.case-hero').is_visible()
 assert fp.locator('.transition-image').count()==0
 mobile=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 mobile.on('pageerror',lambda e:errors.append(str(e)))
 mobile.goto(base_url);mobile.wait_for_timeout(2600)
 cdp=mobile.context.new_cdp_session(mobile)
 cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':195,'y':500}]})
 mobile.wait_for_timeout(40)
 cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':195,'y':300}]})
 mobile.wait_for_timeout(40)
 cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
 mobile.wait_for_timeout(1300)
 assert mobile.locator('.project-card.selected').get_attribute('data-project')=='1'
 mobile.locator('.project-card.selected').click();mobile.wait_for_timeout(1100)
 assert mobile.locator('.case-hero').is_visible()
 mobile.keyboard.press('Escape');mobile.wait_for_timeout(800)
 assert mobile.locator('.transition-image').count()==0
 print('WebGL curve, image transition, scroll reveal, cleanup, fallback, reduced motion: passed')
 print('Errors:',json.dumps(errors));assert not errors
 b.close()
