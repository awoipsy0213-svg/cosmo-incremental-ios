import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CONFIG} from "../balance-config.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const html=read("index.html"),sw=read("sw.js"),css=read("luminous-glass-v332.css"),previous=read("live-ui.css");
assert.equal(CONFIG.schemaVersion,31,"save schema preserved");
assert.equal(CONFIG.version,"3.30.1","UI release must not revise game balance version");
for(const path of ["index.html","sw.js","luminous-glass-v332.css",
  "app.mjs","game.mjs","save.mjs","numbers.mjs","balance-config.mjs"]){
  assert.equal(read(path),read("www/"+path),path+" mismatched Web/Capacitor assets");
}
assert.ok(html.indexOf("matrix-v324.css")<html.indexOf("luminous-glass-v332.css") && html.indexOf("luminous-glass-v332.css")<html.indexOf("fixed-layout-v333.css"),
  "new theme must override legacy theme");
assert.match(html,/3\.34 · ENGRAVING/);
assert.match(html,/name="theme-color" content="#f4f2ff"/);
assert.match(sw,/const VERSION = "3\.37\.1-automation-switch"/);
assert.equal((sw.match(/"luminous-glass-v332\.css"/g)||[]).length,2,
  "new theme must be core cached and available offline");
assert.match(css,/--sheet-half-height:min\(51dvh,452px\)/);
assert.match(css,/color-scheme:light/);
assert.match(css,/\.kw-sheet-body \.compact-upgrades/);
assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
assert.match(css,/\.kw-sheet-body \.moment-card \.compact-stat/);
assert.match(css,/\.kw-sheet-body \.source-card \.source-rates/);
assert.match(css,/\.kw-sheet-body \.engraving-card/);
assert.match(css,/min-height:44px/);
assert.match(css,/@media\(max-width:350px\)/);
assert.match(css,/@media\(min-width:560px\)/);
assert.match(css,/body\.low-power/);
assert.match(css,/body\.reduced-motion/);
assert.match(css,/body\.high-contrast/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
assert.ok(previous.includes("min-height:142px"),"baseline from v3.30.1 original implementation");
assert.ok(previous.includes(".compact-upgrades"),"baseline from prior UI style");
console.log("PASS v332 UI-only light design, 44px purchase targets, responsive density, PWA and schema31/asset parity");
