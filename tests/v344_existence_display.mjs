import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {A,formatExistenceDisplay,formatOrbAmount} from "../numbers.mjs";
import * as G from "../game.mjs";
import {engravingPurchaseQuote,engravingTrialUpgradeQuote} from "../engraving-rules-v317.mjs";
import {encode,decode} from "../save.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const check=(name,fn)=>{fn();console.log("PASS v344",name);};

check("Existence HUD keeps grouped decimal values through exactly one million",()=>{
  for(const [input,expected] of [
    ["0","0"],["1","1"],["1.2","1.2"],["1234.5","1,234.5"],
    ["1234.56789","1,234.568"],["999999.999","999,999.999"],
    ["1000000","1,000,000"],["1000000.001","1.00e+6"],
    ["1234567","1.23e+6"],["1e25","1.00e+25"],
    ["0.00000001","0.001未満"],["0.001","0.001"]
  ])assert.equal(formatExistenceDisplay(input),expected,input);
});

check("decimal formatter works regardless of the game-wide scientific notation preference",()=>{
  const s=G.createState(1800000000000);
  s.intro.complete=true;s.surplusExistence="1234.56789";
  s.settings.notation="scientific";
  assert.equal(formatExistenceDisplay(G.existence(s)),"1,235.568");
  assert.equal(s.surplusExistence,"1234.56789","do not change source precision");
  s.surplusExistence="999999";
  assert.equal(formatExistenceDisplay(G.existence(s)),"1,000,000");
  s.surplusExistence="999999.001";
  assert.equal(formatExistenceDisplay(G.existence(s)),"1.00e+6");
});

check("Engraving Existence costs display three decimals, conservatively rounded up",()=>{
  for(const [input,expected] of [
    ["0","0"],["0.001","0.001"],["0.0010001","0.002"],
    ["0.0016","0.002"],["0.0021","0.003"],["0.025","0.025"],
    ["0.125","0.125"],["0.1251","0.126"],["1.234567","1.235"],
    ["0.00001","0.001未満"],["1234567","1.24e+6"],["9999999.999","1.00e+7"]
  ])assert.equal(formatExistenceDisplay(input,{roundUp:true}),expected,input);
});

check("display rounding never changes actual purchase price, orb quantities or saved state",()=>{
  const s=G.createState(1800000000000);s.intro.complete=true;s.surplusExistence="0.02";
  const first=engravingPurchaseQuote(s,"ENG-01");
  assert.equal(formatExistenceDisplay(first.price,{roundUp:true}),"0.001");
  const beforeInitial=A(s.surplusExistence);
  assert.ok(G.buyEngraving(s,"ENG-01").ok);
  assert.equal(beforeInitial.sub(s.surplusExistence).cmp("0.001"),0);
  const quote=engravingTrialUpgradeQuote(s,"ENG-01");
  assert.equal(formatExistenceDisplay(quote.price,{roundUp:true}),"0.002");
  assert.equal(A(quote.price).cmp("0.0016"),0);
  const before=A(s.surplusExistence);
  assert.ok(G.buyEngravingTrialUpgrade(s,"ENG-01").ok);
  assert.equal(before.sub(s.surplusExistence).cmp("0.0016"),0);
  const raw=encode(s,"v344-existence");
  const after=decode(raw,"normal");
  assert.equal(after.surplusExistence,s.surplusExistence);
  assert.equal(after.schemaVersion,31);
  assert.equal(after.engraving.levels["ENG-01"],2);
  assert.equal(formatOrbAmount("1234.75"),"1,234");
});

check("all player-facing engraving costs and upper HUD use compact formatter",()=>{
  const app=read("app.mjs");
  assert.ok(app.includes('["existence",formatExistenceDisplay(G.existence(state))'));
  assert.ok(app.includes("esc(formatExistenceDisplay(G.existence(state)))"));
  assert.ok(app.includes('const shownPrice=price===undefined||price===null?"—":formatExistenceDisplay(price,{roundUp:true});'));
  assert.ok(app.includes("formatExistenceDisplay(q.price,{roundUp:true})"));
  assert.ok(app.includes("formatExistenceDisplay(quote.price,{roundUp:true})"));
  assert.ok(!app.includes("formatScientific3(G.existence(state))"));
  assert.ok(!app.includes("f(q.price,6)"));
  assert.ok(!app.includes("f(price,6)"));
});

check("Web/iOS mirrors are identical and PWA revision reflects the new formatter",()=>{
  for(const path of ["app.mjs","numbers.mjs","sw.js"])
    assert.equal(read(path),read("www/"+path),path+" web/iOS mismatch");
  assert.match(read("sw.js"),/const UI_REVISION = "-engraving-v342-grade-v343-existence-v344(?:-[a-z0-9]+)*"/);
});
console.log("PASS v344 all Existence UI format tests");
