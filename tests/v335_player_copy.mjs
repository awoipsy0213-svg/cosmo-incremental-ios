import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as G from "../game.mjs";
import {engravingCatalogue} from "../engraving-rules-v317.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
let n=0;
const check=(name,fn)=>{fn();console.log("PASS player copy",name);n++;};
check("25 engraving effects show names; unknown effects never leak debug statuses",()=>{
  const arr=engravingCatalogue();
  assert.equal(arr.length,30);
  assert.equal(arr.find(x=>x.id==="ENG-01").name,"干渉増幅");
  assert.equal(arr.find(x=>x.id==="ENG-24").name,"自動収束");
  const unknown=arr.find(x=>x.id==="ENG-05");
  assert.ok(unknown.name.includes("未知"));
  assert.doesNotMatch(unknown.name+unknown.description,/ENG-|未照合|原文|未適用|実装|試験/);
});
check("engraving receipts produce only player-facing event names; engine IDs survive",()=>{
  const s=G.createState(1800000000000,"normal");
  s.intro.complete=true;s.surplusExistence="100";
  assert.ok(G.buyEngraving(s,"ENG-01").ok);
  assert.equal(s.engraving.levels["ENG-01"],1);
  assert.ok(G.buyEngravingTrialUpgrade(s,"ENG-01").ok);
  assert.equal(s.engraving.levels["ENG-01"],2);
  assert.ok(s.events.some(e=>e.text.includes("干渉増幅")));
  assert.doesNotMatch(s.events.map(e=>e.text).join(" "),/ENG-\d\d|暫定バランス|試験強化/);
});
check("normal menu hides development workspace without removing research source files",()=>{
  const app=read("app.mjs");
  assert.ok(app.includes('...(mode==="lab"?["spec","proposals","priceLab","lab"]:[])'));
  assert.ok(app.includes('const levelText=!owned?"Lv.0"'));
  assert.ok(app.includes('class="badge engraving-level'));
  assert.ok(app.includes('title="${esc(item.name)}">${esc(item.name)}</strong>'));
  assert.ok(app.includes('function chronicleHTML()'));
  assert.ok(!app.includes('item.id+" "+item.name'));
  assert.ok(read("design-proposals.mjs").length>500);
});
check("PWA cache refreshed and Web/Capacitor parity preserved",()=>{
  assert.match(read("sw.js"),/3\.37\.0-automation-controls/);
  for(const path of ["app.mjs","index.html","game.mjs","engraving-rules-v317.mjs","fixed-layout-v333.css","sw.js"])
    assert.equal(read(path),read("www/"+path),path+" parity");
  assert.match(read("fixed-layout-v333.css"),/engraving-level/);
  assert.match(read("index.html"),/id="buildLabel" hidden/);
  assert.doesNotMatch(read("index.html"),/VERSION 3\.34/);
});
console.log("PASS "+n+" player-facing copy checks");
