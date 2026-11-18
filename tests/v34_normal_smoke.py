from playwright.sync_api import sync_playwright
from pathlib import Path
import base64,re
P=Path(__file__).resolve().parents[1]
cache={}
def url(name):
 if name in cache:return cache[name]
 content=(P/name).read_text(encoding='utf-8')
 content=re.sub(r'''(from\s+)(["'])(\./[\w-]+\.mjs)(["'])''',lambda m:m.group(1)+m.group(2)+url(m.group(3)[2:])+m.group(4),content)
 if name=='app.mjs':content=content.replace('const dev=params.get("dev")==="1"||mode==="lab";','const dev=true;')
 cache[name]='data:text/javascript;base64,'+base64.b64encode(content.encode()).decode()
 return cache[name]
html=(P/'index.html').read_text()
for css in ['organic-original.css','mobile.css','neon-theme.css','live-ui.css']:
 html=html.replace(f'<link rel="stylesheet" href="./{css}">',f'<style>{(P/css).read_text()}</style>')
html=re.sub(r'<link rel="(?:manifest|apple-touch-icon|icon)"[^>]*>', '', html)
html=html.replace('<script type="module" src="./app.mjs"></script>',f'<script type="module" src="{url("app.mjs")}"></script>')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],headless=True)
 ctx=browser.new_context(viewport={'width':375,'height':780},has_touch=True,is_mobile=True,service_workers='block')
 page=ctx.new_page()
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.clock.install()
 page.set_content(html,wait_until='domcontentloaded')
 page.wait_for_function('typeof KOTOWARI_DEBUG === "object"')
 assert page.evaluate('KOTOWARI_DEBUG.state().mode')=='normal'
 # Reproduce real intro gestures: neither the game logic nor saved state is test-mutated.
 page.evaluate('''() => {const el=document.getElementById("touchField");for(let i=1;i<=8;i++){el.dispatchEvent(new PointerEvent("pointerdown",{pointerId:i,pointerType:"touch",clientX:125,clientY:350,bubbles:true,cancelable:true}));window.dispatchEvent(new PointerEvent("pointerup",{pointerId:i,pointerType:"touch",bubbles:true,cancelable:true}));}}''')
 assert page.evaluate('KOTOWARI_DEBUG.state().intro.complete') is True,'intro not completed'
 assert page.locator('#boostQuick').is_visible()
 assert not page.evaluate('KOTOWARI_DEBUG.state().boost.active')
 page.clock.fast_forward(120*1000)
 v=page.evaluate('KOTOWARI_DEBUG.state().boost.seconds')
 assert v>=15, f'BOOST not accumulated in foreground: {v}'
 page.locator('#boostQuick').click(force=True)
 assert page.evaluate('KOTOWARI_DEBUG.state().boost.active') is True
 page.clock.fast_forward(1000)
 assert page.locator('#boostQuick').get_attribute('aria-pressed')=='true'
 page.locator('#boostQuick').click(force=True)
 assert page.evaluate('KOTOWARI_DEBUG.state().boost.active') is False
 assert not errors,errors
 print('PASS NORMAL MODE: intro taps -> BOOST accrues -> shortcut start/stop, no exceptions')
 browser.close()
