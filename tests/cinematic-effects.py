from playwright.sync_api import sync_playwright
from pathlib import Path
import os

base=os.environ.get('OSPLY_TEST_URL','http://127.0.0.1:3000/').rstrip('/')+'/'
Path('/tmp/osply-checks').mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script('''
      sessionStorage.setItem('osply-visited','yes');
      const draw=WebGLRenderingContext.prototype.drawArrays;
      WebGLRenderingContext.prototype.drawArrays=function(...args){
        draw.apply(this,args);
        const t=Number(this.canvas.dataset.progress);
        if(this.canvas.matches('.portal-canvas') && t>.25 && t<.65 && !window.portalSample){
          const pixel=new Uint8Array(4);
          this.readPixels(Math.round(this.canvas.width*.15),Math.round(this.canvas.height*.5),1,1,this.RGBA,this.UNSIGNED_BYTE,pixel);
          if(pixel[3]>200)window.portalSample={t,alpha:pixel[3]};
        }
      };
    ''')
    page.goto(base);page.wait_for_timeout(1400)
    page.mouse.move(710,560);page.wait_for_timeout(350)
    page.wait_for_function("Number(document.querySelector('.project-track').dataset.lightStrength)>.8")
    assert float(page.locator('.project-track').get_attribute('data-light-strength'))>.8
    page.locator('.project-card.selected').click()
    page.wait_for_function('Boolean(window.portalSample)',polling=100)
    assert page.evaluate('window.portalSample.alpha')>200, 'The portal must paint beyond the original card bounds'
    page.wait_for_function("!document.querySelector('.portal-canvas')",polling=100)
    assert page.locator('.case-hero').is_visible()
    assert page.locator('.case-layout').get_attribute('data-story-driver')=='native'
    before=page.locator('.ink-fill').last.evaluate('(e)=>getComputedStyle(e).clipPath')
    page.locator('.case-scroll').evaluate('(e)=>e.scrollTop=500')
    page.wait_for_timeout(300)
    after=page.locator('.ink-fill').last.evaluate('(e)=>getComputedStyle(e).clipPath')
    assert before!=after and '0%' in after,(before,after)
    assert int(page.get_by_role('progressbar').get_attribute('aria-valuenow'))>0
    page.screenshot(path='/tmp/osply-checks/cinematic-story-desktop.png')
    page.locator('.case-scroll').evaluate('(e)=>e.scrollTop=e.scrollHeight')
    page.wait_for_timeout(150)
    page.wait_for_function("document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')==='100'",polling=100)
    assert page.get_by_role('progressbar').get_attribute('aria-valuenow')=='100'
    page.keyboard.press('Escape');page.wait_for_timeout(800)
    page.locator('.project-card.selected').click();page.wait_for_timeout(120)
    page.keyboard.press('Escape');page.wait_for_timeout(900)
    assert page.locator('#overlay').is_hidden()
    page.wait_for_function("document.querySelectorAll('.transition-image,.flight-aura').length===0")
    assert page.locator('.transition-image,.flight-aura').count()==0
    page.locator('.project-card.selected').click();page.wait_for_timeout(100)
    page.set_viewport_size({'width':1000,'height':800});page.wait_for_timeout(150)
    assert page.locator('.portal-canvas').count()==0
    assert page.locator('.case-hero').is_visible()
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(250)
    page.locator('.case-layout').evaluate('(e)=>e.scrollTop=e.scrollHeight')
    page.wait_for_timeout(200)
    page.wait_for_function("document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')==='100'",polling=100)
    assert page.get_by_role('progressbar').get_attribute('aria-valuenow')=='100'
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')

    fallback=browser.new_page(viewport={'width':1440,'height':900})
    fallback.on('pageerror',lambda e:errors.append(str(e)))
    fallback.add_init_script("CSS.supports=()=>false")
    fallback.goto(base+'work/prism/');fallback.wait_for_timeout(700)
    assert fallback.locator('.case-layout').get_attribute('data-story-driver')=='script'
    first=fallback.locator('.ink-word').last.evaluate("e=>e.style.getPropertyValue('--ink-reveal')")
    fallback.locator('.case-scroll').evaluate('(e)=>e.scrollTop=500');fallback.wait_for_timeout(100)
    last=fallback.locator('.ink-word').last.evaluate("e=>e.style.getPropertyValue('--ink-reveal')")
    fallback.wait_for_function("Number(document.querySelector('.ink-word:last-child').style.getPropertyValue('--ink-reveal'))>0",polling=100)
    last=fallback.locator('.ink-word').last.evaluate("e=>e.style.getPropertyValue('--ink-reveal')")
    assert float(last)>float(first)

    reduced=browser.new_page(reduced_motion='reduce')
    reduced.goto(base+'work/prism/');reduced.wait_for_timeout(500)
    assert reduced.locator('.case-layout').get_attribute('data-story-driver')=='static'
    assert reduced.locator('.ink-fill').first.evaluate('(e)=>getComputedStyle(e).clipPath')=='none'
    assert reduced.locator('.portal-canvas').count()==0

    no_gpu=browser.new_page()
    no_gpu.add_init_script("HTMLCanvasElement.prototype.getContext=()=>null;sessionStorage.setItem('osply-visited','yes')")
    no_gpu.goto(base);no_gpu.wait_for_timeout(1000)
    no_gpu.locator('.project-card.selected').click();no_gpu.wait_for_timeout(150)
    assert no_gpu.locator('.transition-image').evaluate('(e)=>e.tagName')=='IMG'
    no_gpu.wait_for_function("!document.querySelector('.transition-image')")
    assert no_gpu.locator('.case-hero').is_visible()
    assert not errors,errors
    print('GPU portal expansion, cancellation, resize cleanup, physical light, native/script text scrub, reading progress, mobile resize and reduced/GPU fallbacks passed')
    browser.close()
