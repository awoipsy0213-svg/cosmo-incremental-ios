import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MOMENT_BRIEFS,momentBrief,compactEffectValue} from "../purchase-clarity-v339.mjs";
import {CONTENT} from "../content.mjs";
import * as G from "../game.mjs";
import {CONFIG} from "../balance-config.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
assert.equal(MOMENT_BRIEFS.length,30,"all 30 confirmed Setsuna effects described");
assert.equal(CONTENT.moment.length,30,"names remain aligned to saved order");
for(let i=0;i<30;i++){
  const brief=momentBrief(i);
  assert.ok(brief.effect.length>=5&&brief.mechanism.length>=5,"missing effect "+i);
  assert.ok(brief.effect.length<=16&&brief.mechanism.length<=16,"too long for mobile "+i);
  assert.doesNotMatch(brief.effect+" "+brief.mechanism,/ENG-|実装|試験|未照合|DPS/);
}
assert.equal(compactEffectValue("未購入"),"—");
assert.equal(compactEffectValue("+123 /tap（次の1Lv +1）"),"+123 /tap");
const s=G.createState(1800000000000);
s.intro.complete=true;
const snap=JSON.stringify(s),b=G.momentEffects(s);
momentBrief(0);compactEffectValue(b[0].next);
assert.equal(JSON.stringify(s),snap,"readable labels must not mutate game state");
assert.equal(CONFIG.schemaVersion,31);
const app=read("app.mjs"),html=read("index.html"),sw=read("sw.js"),css=read("purchase-clarity-v339.css");
for(const text of ["momentBrief(i)","purchaseCurrentLabel(kind,id)","data-quote-current","sourceMilestoneLabel(id)"])
  assert.ok(app.includes(text),"expected UI field "+text);
assert.match(css,/background:#552b9e!important/,"purple purchase");
assert.match(css,/background:#ffffff!important/,"white cards");
assert.match(css,/color:#fff!important/,"white-on-purple contrast");
assert.match(html,/purchase-clarity-v339\.css/);
assert.match(sw,/3\.40\.0-source-milestones/);
assert.equal((sw.match(/"purchase-clarity-v339\.css"/g)||[]).length,2);
assert.equal((sw.match(/"purchase-clarity-v339\.mjs"/g)||[]).length,2);
for(const p of ["app.mjs","index.html","sw.js","purchase-clarity-v339.css","purchase-clarity-v339.mjs"])
  assert.equal(read(p),read("www/"+p),p+" mobile parity");
console.log("PASS v339 descriptions, existing engine fidelity, numeric summary, readable theme, cached assets, Web/Capacitor parity");
