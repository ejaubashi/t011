from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image, ImageStat
import os

base = os.environ.get('OSPLY_TEST_URL', 'http://127.0.0.1:3000/').rstrip('/') + '/'
Path('/tmp/osply-checks').mkdir(exist_ok=True)
read_flow = '''() => {
  const gl=document.querySelector('canvas').getContext('webgl');
  const active=gl.getParameter(gl.ACTIVE_TEXTURE);
  gl.activeTexture(gl.TEXTURE1);
  const texture=gl.getParameter(gl.TEXTURE_BINDING_2D);
  const framebuffer=gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
  const pixels=new Uint8Array(128*128*4);
  gl.readPixels(0,0,128,128,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  let displaced=0;
  for(let i=0;i<pixels.length;i+=4) if(Math.abs(pixels[i]-128)>2 || Math.abs(pixels[i+1]-128)>2) displaced++;
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.deleteFramebuffer(framebuffer);gl.activeTexture(active);
  return displaced;
}'''
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
    page = browser.new_page(viewport={'width':1440,'height':900})
    page.add_init_script("sessionStorage.setItem('osply-visited','yes')")
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto(base)
    page.wait_for_timeout(1300)
    assert page.locator('.project-track').get_attribute('data-fluid-ready') == 'true'
    assert page.evaluate(read_flow) == 0
    page.mouse.move(560,500)
    page.mouse.move(880,620,steps=16)
    assert page.evaluate(read_flow) > 10, 'The GPU field must actually contain displaced velocities'
    assert page.locator('.project-cursor').evaluate("e=>getComputedStyle(e).opacity") != '0'
    page.screenshot(path='/tmp/osply-checks/liquid-final.png')
    page.wait_for_function("document.querySelector('.project-track').dataset.flowEnergy === '0.000'")
    assert page.evaluate(read_flow) == 0, 'The flow must relax to a completely clean texture'
    page.locator('.project-card.selected').click()
    page.wait_for_timeout(180)
    assert page.locator('.transition-image').count() == 1
    assert page.locator('.flight-aura').count() == 1
    page.wait_for_function("document.querySelectorAll('.transition-image, .flight-aura').length === 0")
    assert page.locator('.transition-image, .flight-aura').count() == 0
    page.locator('.next-case').click()
    page.wait_for_timeout(80)
    assert page.locator('html').get_attribute('data-native-transition') == 'running'
    page.wait_for_function("!document.documentElement.dataset.nativeTransition")
    assert page.url.rstrip('/').endswith('/work/ara-niko')
    assert page.locator('.case-hero').is_visible()
    page.keyboard.press('Escape')
    page.wait_for_timeout(800)
    page.get_by_role('link',name='About',exact=True).click()
    page.wait_for_timeout(1000)
    page.get_by_role('link',name="Let's make something matter.").click()
    page.wait_for_timeout(250)
    path='/tmp/osply-checks/native-panel-final.png'
    page.screenshot(path=path)
    # A warm panel must remain visible during the snapshot transition.
    panel=Image.open(path).crop((500,400,1300,800))
    mean=ImageStat.Stat(panel).mean
    assert min(mean) > 110 and max(mean) < 250, mean
    page.wait_for_function("!document.documentElement.dataset.nativeTransition")
    page.keyboard.press('Escape')
    page.wait_for_timeout(250)
    page.get_by_role('link',name='About',exact=True).click()
    page.wait_for_timeout(850)
    page.get_by_role('link',name="Let's make something matter.").click()
    page.wait_for_timeout(50)
    page.keyboard.press('Escape')
    page.wait_for_timeout(1000)
    assert page.locator('#overlay').is_hidden()
    assert page.locator('.transition-image, .flight-aura').count() == 0
    assert page.locator('html').get_attribute('data-native-transition') is None

    fallback=browser.new_page(reduced_motion='reduce')
    fallback.add_init_script("document.startViewTransition=undefined")
    fallback.on('pageerror',lambda e: errors.append(str(e)))
    fallback.goto(base)
    fallback.wait_for_timeout(400)
    fallback.get_by_role('link',name='About',exact=True).click()
    fallback.get_by_role('link',name="Let's make something matter.").click()
    assert fallback.locator('.contact-email').is_visible()
    assert fallback.locator('html').get_attribute('data-native-transition') is None
    assert fallback.locator('.project-cursor').evaluate("e=>getComputedStyle(e).display") == 'none'
    for width in [360,390,768,1440,1920]:
        page.set_viewport_size({'width':width,'height':900})
        page.wait_for_timeout(120)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
    touch=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    touch.add_init_script("sessionStorage.setItem('osply-visited','yes')")
    touch.on('pageerror',lambda e:errors.append(str(e)))
    touch.goto(base);touch.wait_for_timeout(1100)
    cdp=touch.context.new_cdp_session(touch)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':195,'y':460}]})
    touch.wait_for_timeout(40)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':220,'y':420}]})
    touch.wait_for_timeout(40)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':225,'y':390}]})
    touch.wait_for_timeout(40)
    assert touch.evaluate(read_flow) > 0, 'Touch dragging must also inject the fluid field'
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    assert touch.locator('#overlay').is_hidden()
    assert not errors, errors
    print('GPU flow injection and full decay, refractive image flights, native project/panel transitions, interruptions, reduced motion, API fallback and viewport fit passed')
    browser.close()
