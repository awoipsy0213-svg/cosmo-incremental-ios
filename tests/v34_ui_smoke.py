from playwright.sync_api import sync_playwright
from pathlib import Path
import re,base64,os,json
P=Path(__file__).resolve().parents[1]
OUT=P/'qa-results'
OUT.mkdir(exist_ok=True)
mem={}
def encode_module(name):
 if name in mem:return mem[name]
 code=(P/name).read_text()
 code=re.sub(r'''(from\s+)(["'])(\./[a-zA-Z0-9_-]+\.mjs)(["'])''',lambda m:m.group(1)+m.group(2)+encode_module(m.group(3)[2:])+m.group(4),code)
 if name=='app.mjs':
  code=code.replace('const mode=params.get("lab")==="1"?"lab":"normal";','const mode="lab";')
  code=code.replace('const dev=params.get("dev")==="1"||mode==="lab";','const dev=true;')
 uri='data:text/javascript;base64,'+base64.b64encode(code.encode()).decode()
 mem[name]=uri
 return uri
html=(P/'index.html').read_text()
for css in ['organic-original.css','mobile.css','neon-theme.css','live-ui.css']:
 html=html.replace(f'<link rel="stylesheet" href="./{css}">',f'<style>\n{(P/css).read_text()}\n</style>')
html=re.sub(r'<link rel="(?:manifest|apple-touch-icon|icon)"[^>]*>', '', html)
html=html.replace('<script type="module" src="./app.mjs"></script>',f'<script type="module" src="{encode_module("app.mjs")}"></script>')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [320,375,430]:
  ctx=b.new_context(viewport={'width':width,'height':780},device_scale_factor=1,has_touch=True,is_mobile=True,service_workers='block')
  page=ctx.new_page()
  errors=[]
  page.on('pageerror',lambda exc:errors.append(str(exc)))
  page.set_content(html,wait_until='domcontentloaded',timeout=30000)
  page.wait_for_function('typeof window.KOTOWARI_DEBUG === "object"',timeout=15000)
  page.evaluate('''() => {let s=KOTOWARI_DEBUG.state();s.intro.complete=true;s.intro.touches=8;s.boost.seconds=1800;s.orbs="0";KOTOWARI_DEBUG.setLabState(s);KOTOWARI_DEBUG.open("existence","sources");}''')
  page.wait_for_timeout(350)
  btn=page.locator('#boostQuick');assert btn.count()==1,'boost shortcut missing'
  assert btn.is_visible(), 'boost shortcut not visible'
  assert btn.get_attribute('aria-pressed')=='false','boost should not yet be active'
  rect0=btn.bounding_box()
  keys=['.purchase-toolbar','.purchase-live-summary','.purchase-card','.buy-button','.live-buy-hint','.source-card .source-meta','.stage-nav .boost-quick']
  def geom():return page.evaluate('''keys => Object.fromEntries(keys.map(k=>{const r=document.querySelector(k)?.getBoundingClientRect();return [k,r?{h:r.height,w:r.width,x:r.x,y:r.y}:null]}))''',keys)
  geom0=geom()
  
  for orb in ['0','1','50','100','99999999','100000000000000000000000']:
   page.evaluate('''value=>{let s=KOTOWARI_DEBUG.state();s.orbs=value;KOTOWARI_DEBUG.setLabState(s)}''',orb)
   page.wait_for_timeout(240)
   cur=geom()
   for key,v in cur.items():
    base=geom0[key]
    assert base is not None and v is not None, f'element missing: {key}'
    for dim in ['h','w','x','y']:
     assert abs(v[dim]-base[dim]) <= 0.5, f'layout jump at {width}px {orb}: {key} {dim} {v[dim]} != {base[dim]}'
  page.locator('#boostQuick').click()
  page.wait_for_timeout(240)
  assert page.locator('#boostQuick').get_attribute('aria-pressed')=='true','boost did not start'
  assert page.evaluate('KOTOWARI_DEBUG.state().boost.active') is True,'state was not activated'
  page.locator('#boostQuick').click()
  assert page.evaluate('KOTOWARI_DEBUG.state().boost.active') is False,'boost did not stop'
  page.evaluate('''() => {let s=KOTOWARI_DEBUG.state(); s.boost.seconds=0;KOTOWARI_DEBUG.setLabState(s)}''')
  page.locator('#boostQuick').click()
  page.wait_for_timeout(240)
  assert page.locator('#sheetHeading').inner_text()=='ORGANIZER / BOOST','empty boost shortcut should open BOOST info'
  # Stress 4 stage buttons plus BOOST + organizer on narrow screens.
  page.evaluate('''() => {let s=KOTOWARI_DEBUG.state();s.time.unlocked=true;s.universe.unlocked=true;s.life.unlocked=true;KOTOWARI_DEBUG.setLabState(s);KOTOWARI_DEBUG.open("existence","sources");}''')
  nav=page.evaluate('''() => {const root=document.querySelector('#stageNav').getBoundingClientRect(); const tabs=[...document.querySelectorAll('#stageNav button')].map(x=>({name:x.textContent.trim(),x:x.getBoundingClientRect().x,right:x.getBoundingClientRect().right,w:x.getBoundingClientRect().width}));return {root:root.toJSON(),tabs}}''')
  assert len(nav['tabs'])==6, f'Expected 4 stages, boost and organizer {nav}'
  assert nav['tabs'][0]['w']>=43, 'BOOST is too narrow to tap'
  for tab in nav['tabs']:
   assert tab['x']>=nav['root']['x']-1 and tab['right']<=nav['root']['right']+1,f'nav overflows viewport at {width}: {tab}'
  page.screenshot(path=str(OUT/f'v34_{width}.png'),full_page=False)
  assert not errors, f'JS errors {errors}'
  print('PASS',width,'card geometry fixed, boost toggle and no-fuel info', 'boost bbox',rect0)
  ctx.close()
 b.close()
print('ALL UI SMOKE PASSED')
