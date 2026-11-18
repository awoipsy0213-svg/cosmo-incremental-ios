from playwright.sync_api import sync_playwright
from pathlib import Path
import re,base64
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa-results';OUT.mkdir(exist_ok=True)
cache={}
def module_url(name):
    if name in cache:return cache[name]
    code=(ROOT/name).read_text(encoding='utf-8')
    code=re.sub(r'''(from\s+)(["'])(\./[\w-]+\.mjs)(["'])''',lambda m:m.group(1)+m.group(2)+module_url(m.group(3)[2:])+m.group(4),code)
    if name=='app.mjs':
        code=code.replace('const mode=params.get("lab")==="1"?"lab":"normal";', 'const mode="lab";')
        code=code.replace('const dev=params.get("dev")==="1"||mode==="lab";', 'const dev=true;')
    cache[name]='data:text/javascript;base64,'+base64.b64encode(code.encode('utf-8')).decode('ascii')
    return cache[name]
html=(ROOT/'index.html').read_text(encoding='utf-8')
for css in ['organic-original.css','mobile.css','neon-theme.css','live-ui.css']:
    html=html.replace(f'<link rel="stylesheet" href="./{css}">',f'<style>\n{(ROOT/css).read_text(encoding="utf-8")}\n</style>')
html=re.sub(r'<link rel="(?:manifest|apple-touch-icon|icon)"[^>]*>','',html)
html=html.replace('<script type="module" src="./app.mjs"></script>',f'<script type="module" src="{module_url("app.mjs")}"></script>')
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in [320,375,430]:
        ctx=b.new_context(viewport={'width':width,'height':780},has_touch=True,is_mobile=True,device_scale_factor=1,service_workers='block')
        page=ctx.new_page();errors=[]
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.set_content(html,wait_until='domcontentloaded',timeout=30000)
        page.wait_for_function('typeof KOTOWARI_DEBUG==="object"',timeout=15000)
        page.evaluate('''() => {const s=KOTOWARI_DEBUG.state();s.intro.complete=true;s.intro.touches=8;s.orbs='1000000';KOTOWARI_DEBUG.setLabState(s);KOTOWARI_DEBUG.open('existence','sources')}''')
        page.wait_for_timeout(250)
        units=page.locator('#sheetBody .source-card .source-yield')
        assert units.count()==30, ('Expected 30 source unit-rate labels',units.count())
        for i,expect in [(0,'0.1'),(1,'0.5'),(2,'1'),(3,'5'),(4,'25'),(5,'100'),(6,'400')]:
            text=units.nth(i).inner_text()
            assert expect in text,(i,text,expect)
        first=page.locator('button[data-purchase="source"][data-id="SOURCE_01"]')
        assert first.is_enabled(),'source01 unavailable with 1M orbs'
        assert '30' in first.inner_text(),first.inner_text()
        first.click()
        assert page.evaluate('KOTOWARI_DEBUG.state().sources.SOURCE_01.level')==1,'source01 level not incremented'
        assert page.evaluate('KOTOWARI_DEBUG.state().time.unlocked') is True,'time not unlocked'
        page.wait_for_timeout(350)
        assert '40.5' in first.inner_text(),('Next price not multiplied by 1.35',first.inner_text())
        assert '0.1' in page.locator('#worldDetails').inner_text(),('Source01 production not visible',page.locator('#worldDetails').inner_text())
        assert units.count()==30, 'lost source rate rows on purchase'
        geom=page.evaluate('''() => ({width:innerWidth,scroll:document.querySelector('#sheetBody').scrollWidth,client:document.querySelector('#sheetBody').clientWidth})''')
        assert geom['scroll']<=geom['client']+4,('horizontal scroll',geom)
        page.screenshot(path=str(OUT/f'v36_sources_{width}.png'),full_page=False)
        assert not errors,errors
        print('PASS SOURCE UI',width,'30 fixed yields, x1.35 live price, time unlocked, no overflow')
        ctx.close()
    b.close()
