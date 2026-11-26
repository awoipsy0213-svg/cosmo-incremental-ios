import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {A} from "../numbers.mjs";
import {createState,buyAll,quoteBuyAll,validateState} from "../game.mjs";
import {encode,decode,KEYS} from "../save.mjs";
import {CONFIG} from "../balance-config.mjs";
const text=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
let count=0;
function check(name,fn){fn();count++;console.log("PASS "+name);}
check("Main/in-app data is still schema31 and the release is v3.27",()=>{
 const s=createState();
 assert.equal(CONFIG.version,"3.30.1");
 assert.equal(s.schemaVersion,31);
 assert.equal(KEYS.normal,"kotowari_v31_normal");
 assert.equal(KEYS.lab,"kotowari_v31_lab");
 assert.equal(decode(encode(s),"normal").schemaVersion,31);
});
check("Only the top-right organizer remains",()=>{
 const app=text("app.mjs"),html=text("index.html");
 const nav=app.split('function renderNav(){')[1].split('function renderWorld(){')[0];
 assert.ok(nav.includes('data-stage='));
 assert.equal(nav.includes('data-action="organizer"'),false);
 assert.equal((html.match(/data-action="organizer"/g)||[]).length,1);
});
check("Visuals use real stages and keep all stage tabs",()=>{
 const html=text("index.html"),css=text("matrix-v324.css"),app=text("app.mjs");
 for(const id of ["matrixCaption","matrixSummary","matrixFill","worldObserve","heroSigil","activeStageTitle"])
   assert.ok(html.includes('id="'+id+'"'),id);
 for(const selector of [".world-matrix",".world-sideboards",".matrix-hero-cube",".scene-sidebar"])
   assert.ok(css.includes(selector),selector);
 assert.ok(app.includes("const conceptsCount=Object.keys(state.time.concepts).length"));
 assert.ok(app.includes('stageRows=currentStage==="time"'));
 assert.ok(app.includes('stageRows=currentStage==="time"')&&app.includes('currentStage==="universe"'));
});
check("One-tap bulk uses a single live buy without a second state-advance",()=>{
 const app=text("app.mjs");
 const bulk=app.split('if(action==="buy-all"){')[1].split('if(action==="close-drawer")')[0];
 assert.equal((bulk.match(/const result=G\.buyAll\(/g)||[]).length,1);
 assert.equal((bulk.match(/checkpoint\(\);/g)||[]).length,2);
 assert.ok(bulk.includes('if(state.settings.confirmBulkPurchase){'));
 assert.ok(bulk.includes("bulkPurchasePending=true"));
 assert.ok(bulk.includes("bulkPurchasePending=false"));
 assert.ok(bulk.includes("el.getClientRects().length>0"));
 assert.equal(bulk.includes("A(updated.remaining).cmp(quote.remaining)"),false);
});
check("Quoted bulk and actual purchases preserve the same spend",()=>{
 const s=createState(1800000000000);
 s.intro.complete=true;s.time.unlocked=true;s.orbs="250000";s.totalOrbs="250000";
 s.engraving.owned.push("ENG-05");s.engraving.levels["ENG-05"]=1; // v342 bulk unlock
 s.sources.SOURCE_01.level=6;
 const q=quoteBuyAll(s,"source","cheap",["SOURCE_01","SOURCE_02"]);
 assert.ok(q.ok);
 const actual=buyAll(s,"source","cheap",["SOURCE_01","SOURCE_02"]);
 assert.equal(actual.count,q.count);
 assert.equal(A(actual.spent).cmp(q.spent),0);
 assert.equal(A(s.orbs).cmp(q.remaining),0);
 assert.equal(validateState(s,"normal").schemaVersion,31);
});
check("Published SW and iOS copy include new CSS",()=>{
 const root=["app.mjs","index.html","balance-config.mjs","sw.js","stage-worlds.css","matrix-v324.css"];
 for(const name of root)assert.equal(text(name),text("www/"+name),name);
 assert.match(text("sw.js"),/3\.50\.0-time-residue/);
 assert.match(text("sw.js"),/matrix-v324\.css/);
 assert.match(text("index.html"),/3\.62/);
});
console.log("PASS "+count+" Ver3.28 matrix and bulk invariants");
