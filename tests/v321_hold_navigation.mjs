import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createState,addOrbs,setPurchaseMode,converge,validateState,purchaseQuote} from "../game.mjs";
import {encode,decode,KEYS} from "../save.mjs";
import {CONFIG} from "../balance-config.mjs";

let pass=0;
function testCase(label,fn){fn();pass++;console.log("✓",label)}
const sample=()=>{const s=createState(1800000000000);s.intro.complete=true;return s;};

testCase("U-43 purchase mode remains unchanged across state writes and normal v31 save restore",()=>{
 const s=sample();
 assert.equal(setPurchaseMode(s,"10"),true);
 assert.equal(s.purchaseMode,"10");
 const revived=decode(encode(s,"U43-persist"),"normal");
 assert.equal(revived.purchaseMode,"10");
 assert.equal(KEYS.normal,"kotowari_v31_normal");
 assert.equal(CONFIG.schemaVersion,31);
 assert.equal(setPurchaseMode(revived,"NEXT"),true);
 assert.equal(decode(encode(revived,"U43-next"),"normal").purchaseMode,"NEXT");
});
testCase("U-43 convergence preserves chosen purchase mode and existing strong types",()=>{
 const s=sample();
 addOrbs(s,"1e20");
 assert.equal(setPurchaseMode(s,"MAX"),true);
 const quote=purchaseQuote(s,"moment","tap");
 assert.equal(quote.enabled,true);
 assert.equal(s.purchaseMode,"MAX");
 assert.equal(converge(s).ok,true);
 assert.equal(s.purchaseMode,"MAX");
 assert.equal(validateState(s,"normal").purchaseMode,"MAX");
});
testCase("U-43 rejected modes cannot damage progression",()=>{
 const s=sample(),before=JSON.stringify(s);
 assert.equal(setPurchaseMode(s,"invalid"),false);
 assert.equal(JSON.stringify(s),before);
});
testCase("U-43 app cancels active/pending hold on each major navigation path",()=>{
 const source=readFileSync(new URL("../app.mjs",import.meta.url),"utf8");
 assert.match(source,/function setStage\(id\)\{[\s\S]*?stopHoldPurchase\(null,true\)/);
 assert.match(source,/function setSheet\(which\)\{[\s\S]*?stopHoldPurchase\(null,true\)/);
 assert.match(source,/function openOrganizerPage\(id\)\{[\s\S]*?stopHoldPurchase\(null,true\)/);
 assert.ok(source.includes('if(b.dataset.child){stopHoldPurchase(null,true);'));
 assert.ok(source.includes('if(b.dataset.buyMode){stopHoldPurchase(null,true);'));
 assert.match(source,/if\(action==="cycle-buy-mode"\)\{[\s\S]*?stopHoldPurchase\(null,true\)/);
 assert.ok(source.includes('window.addEventListener("blur",()=>stopHoldPurchase(null,true))'));
 assert.ok(source.includes('window.addEventListener("pointercancel",e=>stopHoldPurchase(e,true))'));
 assert.ok(source.includes('holdPurchase=null;\n  clearTimeout(h.timer);clearInterval(h.repeat);'));
});
console.log("PASS "+pass+" U-43 state retention, hold cancellation and save compatibility");
