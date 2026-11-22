import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as G from "../game.mjs";
import {purchasePreview} from "../purchase-preview-v338.mjs";
import {CONTENT} from "../content.mjs";
import {A} from "../numbers.mjs";
import {CONFIG} from "../balance-config.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const s=G.createState(1800000000000);s.intro.complete=true;
const source=CONTENT.sources[0].id,moment=CONTENT.moment[0].id;
G.setPurchaseMode(s,"MAX");
const unavailable=purchasePreview(s,"source",source);
assert.equal(unavailable.count,0,"without resources, purchasable quantity is zero");
assert.equal(unavailable.quote.enabled,false);
assert.ok(A(unavailable.quote.cost).cmp(0)>0,"next cost remains visible when unaffordable");
G.addOrbs(s,"1e90");
for(const mode of ["1","10","MAX"]){
  G.setPurchaseMode(s,mode);
  const p=purchasePreview(s,"source",source);
  assert.equal(p.count,p.quote.count,"count matches purchase quote in "+mode);
  assert.ok(p.count>0);
  const projected={...s,sources:{...s.sources,[source]:{...s.sources[source],level:s.sources[source].level+p.count}}};
  assert.equal(p.sourceGain.toString(),G.sourceProduction(projected,source).sub(G.sourceProduction(s,source)).toString(),
    "source delta for all selected levels");
  const m=purchasePreview(s,"moment",moment);
  assert.equal(m.count,m.quote.count,"moment levels match purchase quote");
  assert.equal(m.afterEffect,G.momentAfterQuote(s,0,m.count),"moment after-purchase effect");
}
G.setPurchaseMode(s,"1");
const before=s.sources[source].level,quote=purchasePreview(s,"source",source).quote;
assert.equal(G.buy(s,"source",source).count,quote.count);
assert.equal(s.sources[source].level-before,quote.count,"button quantity matches actual purchase");
assert.equal(CONFIG.schemaVersion,31,"UI changes do not migrate save schema");
const app=read("app.mjs"),css=read("purchase-row-v338.css"),html=read("index.html"),sw=read("sw.js");
assert.match(app,/data-quote-count/);
assert.match(app,/data-quote-gain/);
assert.match(app,/purchasePreview\(state,kind,id\)/);
assert.match(css,/--fixed-card-h:66px/);
assert.match(css,/dense-purchase-button/);
assert.match(html,/purchase-row-v338\.css/);
assert.match(sw,/3\.39\.0-purchase-clarity/);
assert.equal((sw.match(/"purchase-row-v338\.css"/g)||[]).length,2);
assert.equal((sw.match(/"purchase-preview-v338\.mjs"/g)||[]).length,2);
for(const file of ["index.html","app.mjs","sw.js","purchase-preview-v338.mjs","purchase-row-v338.css"])
  assert.equal(read(file),read("www/"+file),file+" Web / Capacitor parity");
console.log("PASS v338 3-stage quote, variable quantity, source gain, moment effect, 66px fixed display, PWA parity");
