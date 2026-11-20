import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const source=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
let passed=0;
function test(name,fn){fn();passed++;console.log("PASS "+name);}
test("Release workflow waits for the exact commit's successful Pages deployment",()=>{
  const yml=source(".github/workflows/verify-pages-v318.yml");
  assert.match(yml,/name: Verify published Kotowari Web/);
  assert.match(yml,/branches: \[main\]/);
  assert.match(yml,/actions: read/);
  assert.match(yml,/GITHUB_SHA/);
  assert.match(yml,/head_sha=\$\{GITHUB_SHA\}/);
  assert.match(yml,/pages build and deployment/);
  assert.match(yml,/FAIL Pages deployment status/);
  assert.match(yml,/node scripts\/verify-published\.mjs/);
  assert.ok(yml.indexOf("Wait for Pages deployment")<yml.indexOf("Compare live source files"));
  assert.ok(yml.indexOf("Compare live source files")<yml.indexOf("Exercise the published game"));
});
test("Release compares live SHA256 bytes for all PWA core and HTML assets",()=>{
  const code=source("scripts/verify-published.mjs");
  assert.match(code,/const CORE_FILES/);
  assert.match(code,/htmlText\.matchAll/);
  assert.match(code,/new Set\(/);
  assert.match(code,/expected\.equals\(actual\)/);
  assert.match(code,/SHA256 local=/);
  assert.match(code,/process\.exit\(1\)/);
  const sw=source("sw.js"),html=source("index.html");
  const match=sw.match(/const CORE_FILES\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(match);
  const core=[...match[1].matchAll(/"([^"]+)"/g)].map(m=>m[1]);
  const htmlLinked=[...html.matchAll(/(?:src|href)="\.\/([^"?#]+)"/g)].map(m=>m[1]);
  const paths=[...new Set(["index.html","sw.js",...core,...htmlLinked])];
  assert.ok(paths.length>=20,"all core assets must be considered");
  for(const name of paths){
    assert.ok(!name.startsWith("/")&&!name.includes(".."),"unsafe path "+name);
    assert.ok(existsSync(new URL("../"+name,import.meta.url)),"missing release file "+name);
  }
  for(const name of ["app.mjs","game.mjs","save.mjs","matrix-v324.css","stage-worlds.css"])
    assert.ok(paths.includes(name),name);
});
test("Release guard does not change gameplay save schema or payment code",()=>{
  const game=source("game.mjs"),save=source("save.mjs");
  assert.match(game,/schemaVersion:CONFIG\.schemaVersion/);
  assert.match(save,/kotowari_v31_normal/);
  assert.match(save,/kotowari_v31_lab/);
});
console.log("PASS "+passed+" release-integrity invariants");
