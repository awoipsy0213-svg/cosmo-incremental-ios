import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createState,validateState} from "../game.mjs";
import {encode,decode,KEYS} from "../save.mjs";
import {CONFIG} from "../balance-config.mjs";
const root=(name)=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
let passed=0;
function check(name,fn){fn();passed++;console.log("PASS "+name);}
check("Both optional confirmations default OFF; explicit saved settings remain intact",()=>{
 const s=createState(1800000000000);
 assert.equal(s.schemaVersion,31);
 assert.equal(s.settings.confirmBulkPurchase,false);
 assert.equal(s.settings.confirmMaxPurchase,false);
 delete s.settings.confirmBulkPurchase;
 delete s.settings.confirmMaxPurchase;
 const prior=validateState(s,"normal");
 assert.equal(prior.settings.confirmBulkPurchase,false);
 assert.equal(prior.settings.confirmMaxPurchase,false);
 prior.settings.confirmBulkPurchase=true;
 prior.settings.confirmMaxPurchase=true;
 const reloaded=decode(encode(prior,"v323"),"normal");
 assert.equal(reloaded.settings.confirmBulkPurchase,true);
 assert.equal(reloaded.settings.confirmMaxPurchase,true);
 assert.equal(KEYS.normal,"kotowari_v31_normal");
 assert.equal(KEYS.lab,"kotowari_v31_lab");
});
check("Two confirmed global HUD values and stage-specific resource grid exist",()=>{
 const html=root("index.html"),app=root("app.mjs");
 assert.equal((html.match(/data-common-value="/g)||[]).length,2);
 for(const id of ["existence","timeSpeed"])
   assert.ok(html.includes('data-common-value="'+id+'"'),id);
 assert.match(html,/id="stageResourceLabel"/);
 assert.match(html,/id="stageResourceList"/);
 assert.match(html,/id="hudRunCount"/);
 assert.match(html,/class="stage-backdrop"/);
 assert.match(app,/stageRows=currentStage==="time"/);
 assert.match(app,/currentStage==="universe"/);
 assert.match(app,/currentStage==="life"/);
 assert.match(app,/if\(state\.settings\.confirmBulkPurchase\)\{/);
 assert.match(app,/state\.settings\.confirmMaxPurchase&&/);
});
check("Compact cards keep their name, level, current effect, next value and purchase cost",()=>{
 const app=root("app.mjs"),css=root("stage-worlds.css");
 assert.match(app,/class="compact-stat"/);
 assert.match(app,/class="moment-next-effect"/);
 assert.match(app,/data-moment-level/);
 assert.match(app,/data-source-total/);
 assert.match(app,/data-source-next/);
 assert.match(app,/data-quote-label/);
 assert.match(app,/data-source-detail/);
 assert.match(css,/overflow-wrap:anywhere/);
 assert.match(css,/height:auto/);
});
check("Visual stage patterns cover time, universe and life without new gameplay logic",()=>{
 const css=root("stage-worlds.css");
 for(const key of ['data-cosmo-stage="2"','data-cosmo-stage="3"','data-cosmo-stage="4"'])assert.ok(css.includes(key),key);
 for(const effect of ["kw-time-turn","kw-orbit-precess","kw-cell-pulse"])assert.ok(css.includes(effect));
 assert.match(css,/pointer-events:none/);
});
check("Web and Capacitor payloads match and the PWA caches the new visuals",()=>{
 for(const name of ["app.mjs","game.mjs","index.html","balance-config.mjs","sw.js","stage-worlds.css","matrix-v324.css"])
   assert.equal(root(name),root("www/"+name),name+" mirror mismatch");
 assert.equal(CONFIG.version,"3.30.1");
 assert.equal(CONFIG.schemaVersion,31);
 assert.match(root("sw.js"),/3\.50\.0-time-residue/);
 assert.match(root("sw.js"),/stage-worlds\.css/);
 assert.match(root("sw.js"),/matrix-v324\.css/);
 assert.match(root("index.html"),/3\.58/);
});
console.log("PASS "+passed+" Ver.3.23 HUD, settings and save compatibility checks");
