from playwright.sync_api import sync_playwright
from pathlib import Path
Path("/tmp/osply-checks").mkdir(exist_ok=True)
import json
import os
base_url = os.environ.get("OSPLY_TEST_URL", "http://127.0.0.1:3000/").rstrip("/") + "/"
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base_url)
 page.wait_for_timeout(1300)
 page.screenshot(path='/tmp/osply-checks/desktop.png')
 assert page.locator('.project-card.selected').get_attribute('data-project')=='0'
 page.mouse.wheel(0,400);page.wait_for_timeout(900)
 assert page.locator('.project-card.selected').get_attribute('data-project')=='1'
 page.locator('.project-card.selected').click();page.wait_for_timeout(800)
 assert page.url.rstrip('/').endswith('/work/ara-niko')
 page.screenshot(path='/tmp/osply-checks/case.png')
 page.locator('.case-scroll').hover();page.mouse.wheel(0,600);page.wait_for_timeout(400)
 assert page.locator('.case-scroll').evaluate('(e)=>e.scrollTop')>0
 page.keyboard.press('Escape');assert page.locator('#overlay').is_hidden()
 page.go_back();page.wait_for_timeout(300);assert page.url.rstrip('/').endswith('/work/ara-niko')
 page.go_forward();page.wait_for_timeout(300);assert page.locator('#overlay').is_hidden()
 page.get_by_role('link',name='About',exact=True).click();page.wait_for_timeout(700)
 assert page.get_by_role('heading',name='Creative energy. Strategic impact.').is_visible()
 page.get_by_role('link',name="Let's make something matter.").click();page.wait_for_timeout(700)
 assert page.locator('.contact-email').get_attribute('href')=='mailto:hi@osply.co'
 page.keyboard.press('Escape')
 for i in range(4):
  page.locator(f'[data-select="{i}"]').click();page.wait_for_timeout(900)
  page.locator('.project-card.selected').click();page.wait_for_timeout(750)
  assert page.locator('.case-hero').evaluate('(e)=>e.complete && e.naturalWidth>0')
  page.keyboard.press('Escape')
 print('Desktop: carousel, all 4 projects, case scroll, Escape, history, About, Contact passed')
 mobile=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
 mobile.on('pageerror',lambda e:errors.append(str(e)))
 mobile.goto(base_url);mobile.wait_for_timeout(1300)
 mobile.screenshot(path='/tmp/osply-checks/mobile.png')
 assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
 mobile.locator('.project-card.selected').click();mobile.wait_for_timeout(700)
 mobile.screenshot(path='/tmp/osply-checks/mobile-case.png')
 mobile.locator('.case-layout').evaluate('(e)=>e.scrollTop=700')
 assert mobile.locator('.case-layout').evaluate('(e)=>e.scrollTop')>0
 mobile.get_by_role('button',name='Close case study').click(force=True)
 assert mobile.locator('#overlay').is_hidden()
 mobile.goto(base_url + 'work/ara-niko');mobile.wait_for_timeout(700)
 assert mobile.locator('.case-hero').is_visible()
 print('Mobile: viewport fit, case opening, scrolling, closing, direct URL passed')
 print('Browser errors:',json.dumps(errors))
 assert not errors
 browser.close()
