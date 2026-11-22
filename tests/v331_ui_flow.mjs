import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as G from "../game.mjs";
import {A,formatOrbAmount} from "../numbers.mjs";
import {encode,decode} from "../save.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const started=()=>{const s=G.createState(1800000000000);s.intro.complete=true;return s;};
let n=0;
const check=(name,fn)=>{fn();n++;console.log("PASS v331",name);};
check("orb quantities are displayed without decimals; prices round up",()=>{
  assert.equal(formatOrbAmount("0"),"0");
  assert.equal(formatOrbAmount("0.2"),"1未満");
  assert.equal(formatOrbAmount("0.2","ceil"),"1");
  assert.equal(formatOrbAmount("1.25"),"1");
  assert.equal(formatOrbAmount("1.25","ceil"),"2");
  assert.equal(formatOrbAmount("1234.99"),"1,234");
  assert.equal(formatOrbAmount("1234.01","ceil"),"1,235");
  assert.equal(formatOrbAmount("1.2345e9"),"123e+7");
  assert.equal(formatOrbAmount("1.2345e9","ceil"),"124e+7");
  for(const v of ["0.00001","0.95","1.5","100.4","1.2345e10","9.99e100"]){
    for(const rounding of ["floor","ceil"]){
      assert.ok(!/\\d+\\.\\d+/.test(formatOrbAmount(v,rounding)),"orb has fraction: "+v);
    }
  }
});
check("new saves retain last tab and fast-confirm defaults on reload",()=>{
  const s=started();
  assert.equal(s.settings.existenceLastTab,"moment");
  assert.equal(s.settings.confirmEngravingPurchase,false);
  assert.equal(s.settings.confirmEngravingUpgrade,false);
  assert.equal(s.settings.confirmBoostUpgrade,false);
  assert.equal(s.settings.confirmConvergence,true);
  assert.equal(s.settings.confirmSaveImport,true);
  assert.equal(s.settings.confirmSaveRestore,true);
  s.settings.existenceLastTab="engraving";
  s.settings.confirmEngravingUpgrade=true;
  const restored=decode(encode(s,"v331"),"normal");
  assert.equal(restored.settings.existenceLastTab,"engraving");
  assert.equal(restored.settings.confirmEngravingUpgrade,true);
});
check("prior saves get new settings without modifying history",()=>{
  const old=started();
  for(const key of ["existenceLastTab","confirmEngravingPurchase","confirmEngravingUpgrade",
    "confirmBoostUpgrade","confirmSourceBreakthrough","confirmSaveImport","confirmSaveRestore"])
    delete old.settings[key];
  const restored=G.validateState(old,"normal");
  assert.equal(restored.settings.existenceLastTab,"moment");
  assert.equal(restored.settings.confirmEngravingUpgrade,false);
  assert.equal(restored.settings.confirmSaveImport,true);
  restored.settings.existenceLastTab="bogus";
  assert.equal(G.validateState(restored).settings.existenceLastTab,"moment");
});
check("verified earned orbs, not spendable balance, drive all convergence math",()=>{
  const s=started();G.addOrbs(s,"1500");
  const p=G.convergenceProgress(s);
  assert.equal(p.basis,"run-earned");
  assert.ok(p.steps>0);
  assert.equal(p.historyVerified,true);
  assert.ok(G.buy(s,"moment","tap").ok);
  assert.equal(G.convergenceProgress(s).steps,p.steps);
  assert.equal(G.convergenceProgress(s).percent,p.percent);
  assert.ok(G.converge(s).ok);
  assert.equal(s.runOrbsEarned,"0");
});
check("unverified old saves never silently use current wallet as convergence income",()=>{
  const prior=started();prior.orbs="9000";prior.totalOrbs="12000";
  delete prior.runOrbsEarned;delete prior.runOrbsEvidence;
  const s=G.validateState(prior,"normal");
  assert.equal(s.runOrbsEvidence,"legacy-unverified");
  assert.equal(G.convergenceQuote(s).steps,0);
  assert.equal(G.convergenceProgress(s).percent,0);
  G.addOrbs(s,"1500");
  const q=G.convergenceQuote(s);
  assert.equal(q.basis,"run-earned");
  assert.equal(q.historyVerified,false);
  assert.ok(q.steps>0);
  assert.equal(s.orbs!==s.runOrbsEarned,true);
  assert.ok(G.converge(s).ok);
  assert.equal(s.runOrbsEvidence,"verified");
  assert.equal(s.runOrbsEarned,"0");
});
check("legacy import keeps saved currency, does not fabricate historical run earnings",()=>{
  const old={stage:1,particles:9000,total:13000,clickLevel:0,autoLevel:0};
  const s=G.migrateLegacy(old);
  assert.equal(A(s.orbs).cmp("9000"),0);
  assert.equal(s.runOrbsEvidence,"legacy-unverified");
  assert.equal(G.convergenceQuote(s).steps,0);
});
check("www game files exactly match root files",()=>{
  for(const path of ["app.mjs","game.mjs","numbers.mjs","sw.js"])
    assert.equal(read(path),read("www/"+path),"www mismatch: "+path);
});
console.log("PASS v331 total",n);
