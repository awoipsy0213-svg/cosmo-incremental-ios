from playwright.sync_api import sync_playwright
from pathlib import Path
import re,base64
P=Path(__file__).resolve().parents[1]
OUT=P/'qa-results'; OUT.mkdir(exist_ok=True)
cache={}
def mod(name):
    if name in cache: return cache[name]
    code=(P/name).read_text(encoding='utf-8')
    code=re.sub(r'''(from\s+)(["'])(\./[\w-]+\.mjs)(["'])''',lambda m:m.group(1)+m.group(2)+mod(m.group(3)[2:])+m.group(4),code)
    if name=='app.mjs': code=code.replace('const dev=params.get("dev")==="1"||mode==="lab";','const dev=true;')
    cache[name]='data:text/javascript;base64,'+base64.b64encode(code.encode()).decode()
    return cache[name]
html=(P/'index.html').read_text()
for css in ['organic-original.css','mobile.css','neon-theme.css','live-ui.css']:
    html=html.replace(f'<link rel="stylesheet" href="./{css}">',f'<style>{(P/css).read_text()}</style>')
html=re.sub(r'<link rel="(?:manifest|apple-touch-icon|icon)"[^>]*>','',html)
html=html.replace('<script type="module" src="./app.mjs"></script>',f'<script type="module" src="{mod("app.mjs")}"></script>')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'],headless=True)
    for lab in [False,True]:
        for width in [320,375,430]:
            context=browser.new_context(viewport={'width':width,'height':780},device_scale_factor=1,has_touch=True,is_mobile=True,service_workers='block')
            page=context.new_page()
            errors=[]
            page.on('pageerror',lambda err:errors.append(str(err)))
            setup=html
            if lab: setup=setup.replace('const mode=params.get("lab")==="1"?"lab":"normal";','const mode="lab";')
            # HTML does not contain script mode declaration; replace inside module URL via cache if needed.
            if lab:
                # Rewrite app module again using a unique mode URI; use original cache for dependencies.
                original=(P/'app.mjs').read_text()
                original=re.sub(r'''(from\s+)(["'])(\./[\w-]+\.mjs)(["'])''',lambda m:m.group(1)+m.group(2)+mod(m.group(3)[2:])+m.group(4),original)
                original=original.replace('const mode=params.get("lab")==="1"?"lab":"normal";','const mode="lab";')
                original=original.replace('const dev=params.get("dev")==="1"||mode==="lab";','const dev=true;')
                appuri='data:text/javascript;base64,'+base64.b64encode(original.encode()).decode()
                setup=setup.replace(mod('app.mjs'),appuri)
            page.set_content(setup,wait_until='domcontentloaded',timeout=30000)
            page.wait_for_function('typeof window.KOTOWARI_DEBUG === "object"',timeout=15000)
            assert page.evaluate('KOTOWARI_DEBUG.state().mode')==('lab' if lab else 'normal')
            page.evaluate('KOTOWARI_DEBUG.open("organizer","proposals")')
            page.wait_for_timeout(150)
            text=page.locator('#sheetBody').inner_text()
            assert '未決定' in text and '候補' in text
            if lab:
                assert page.locator('#sheetBody details.proposal-item').count()>=14
                assert page.locator('button[data-action="toggle-trial"]').count()==1
                assert not page.evaluate('KOTOWARI_DEBUG.state().trial.enabled')
                page.locator('button[data-action="toggle-trial"]').click()
                assert page.evaluate('KOTOWARI_DEBUG.state().trial.enabled')
                assert '候補効果を停止' in page.locator('#sheetBody').inner_text()
                # 42 resource descriptions exist (hidden within collapsed details until open)
                page.locator('details[data-preserve="rank-1"] summary').click()
                assert page.locator('details[data-preserve="rank-1"] .proposal-line').count()==15
                page.locator('details[data-preserve="rank-1"] summary').click()
                page.screenshot(path=str(OUT/f'v35_research_lab_{width}.png'),full_page=False)
                # Preview should not expose new game event functions
                assert '計算プレビューのみ' in page.locator('#sheetBody').inner_text()
            else:
                assert page.locator('button[data-action="toggle-trial"]').count()==0
                assert '密度' not in text and 'UR1_01' not in text and 'エルム' not in text
                assert '別セーブ' in text
                assert not page.evaluate('KOTOWARI_DEBUG.state().trial.enabled')
                page.screenshot(path=str(OUT/f'v35_research_normal_{width}.png'),full_page=False)
            geom=page.evaluate('''()=>({screen:innerWidth,body:document.querySelector('#sheetBody').getBoundingClientRect().toJSON(),text:document.querySelector('#sheetBody').scrollWidth,scroll:document.querySelector('#sheetBody').clientWidth})''')
            assert geom['text']<=geom['scroll']+3, f'Horizontal overflow: {geom}'
            assert not errors,errors
            print('PASS UI', 'lab' if lab else 'normal',width,'no horizontal overflow, correct trial/privacy semantics')
            context.close()
    browser.close()
