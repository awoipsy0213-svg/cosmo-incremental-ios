import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createState} from "../game.mjs";
import {formatScientific3} from "../numbers.mjs";
import {CONFIG} from "../balance-config.mjs";
const path=name=>new URL("../"+name,import.meta.url);
const source=name=>readFileSync(path(name),"utf8");
let passed=0;
function test(name,fn){fn();passed++;console.log("PASS "+name);}
test("Compact scientific format: zero, 3 significant digits and exponent carry",()=>{
  assert.equal(formatScientific3(0),"0");
  assert.equal(formatScientific3(1),"1.00e+0");
  assert.equal(formatScientific3(1234),"1.23e+3");
  assert.equal(formatScientific3(9999),"1.00e+4");
  assert.equal(formatScientific3("3.14159e9999999"),"3.14e+9999999");
  assert.equal(formatScientific3("0.00123456"),"1.23e-3");
});
test("Two confirmed shared entries are visible after intro without creating saved fields",()=>{
  const html=source("index.html"),app=source("app.mjs");
  assert.match(html,/id="commonInfoBar"/);
  assert.equal((html.match(/data-common-value="/g)||[]).length,2);
  for(const metric of ["existence","timeSpeed"])assert.ok(html.includes('data-common-value="'+metric+'"'));
  assert.match(app,/function commonInfoHTML\(\)/);
  assert.match(app,/function renderWorld\(\)/);
  assert.match(app,/const showShared=state\.intro\.complete/);
  assert.match(app,/if\(action==="open-common-info"\)/);
  assert.match(app,/if\(action==="return-stage-panel"\)/);
  assert.match(source("astral-observatory.css"),/\.common-info-bar/);
  const s=createState();
  assert.equal(s.settings.confirmBulkPurchase,false);
  assert.equal(s.settings.confirmMaxPurchase,true);
  assert.equal(s.schemaVersion,31);
  assert.equal("commonInfo" in s,false);
  assert.equal("infoPanelOpen" in s,false);
});
test("Web and Capacitor copies are exactly synchronized",()=>{
  for(const f of ["index.html","app.mjs","numbers.mjs","balance-config.mjs","astral-observatory.css","stage-worlds.css","matrix-v324.css","sw.js"])
    assert.equal(source(f),source("www/"+f),f+" not in sync");
});
test("A coherent version is used by HTML, SW and game config",()=>{
  assert.equal(CONFIG.version,"3.30.1");
  assert.match(source("index.html"),/3\.34 · ENGRAVING/);
  assert.match(source("sw.js"),/3\.36\.0-automation-center/);
  assert.match(source("sw.js"),/CORE_FILES/);
  assert.match(source("sw.js"),/stage-worlds\.css/);
});
console.log("PASS "+passed+" Ver3.23 shared-info tests");
