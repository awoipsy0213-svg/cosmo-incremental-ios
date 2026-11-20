import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=f=>readFileSync(new URL("../"+f,import.meta.url),"utf8");
const html=source("index.html"),css=source("matrix-v324.css"),sw=source("sw.js");
assert.match(html,/id="confirmDialog"[^>]+aria-labelledby="confirmTitle"/);
assert.match(html,/id="confirmText" tabindex="0"/);
assert.match(html,/id="confirmNo" type="button" autofocus/);
assert.match(html,/id="confirmYes" type="button"/);
assert.match(css,/\.confirm-dialog\[open\]\s*\{[\s\S]*?display:flex/);
assert.match(css,/\.confirm-dialog #confirmText\s*\{[\s\S]*?overflow-y:auto/);
assert.match(css,/\.confirm-dialog \.dialog-actions\s*\{[\s\S]*?flex:0 0 auto/);
assert.match(css,/max-height:calc\(100dvh/);
assert.match(css,/@media\(max-height:450px\)/);
assert.match(sw,/3\.26\.0-confirmed-audit/);
for(const p of ["index.html","matrix-v324.css","sw.js"]){
  assert.equal(source(p),source("www/"+p),p+" Web/iOS assets differ");
}
assert.match(source("game.mjs"),/schemaVersion:CONFIG\.schemaVersion/);
assert.match(source("save.mjs"),/kotowari_v31_normal/);
console.log("PASS I-40 confirmation dialog: visible controls, scrollable details, Web/iOS parity and schema31");
