import assert from "node:assert/strict";
import {checksum,decode,encode,KEYS} from "../save.mjs";
import * as G from "../game.mjs";
import * as S from "../setsuna-rules-v39.mjs";
const T=1800000000000;
let count=0;
function test(name,fn){fn();count++;console.log("PASS "+name);}
function sample(mode="normal"){
  const s=G.createState(T,mode);s.intro.complete=true;
  return s;
}
test("R2-Q09-017 combo milestones follow approved thresholds",()=>{
  assert.deepEqual(S.COMBO_MARKS,[10,50,100,250,500,1000]);
  const s=sample();
  assert.equal(G.momentComboView(s,T).nextMark,10);
  for(let i=0;i<10;i++)G.tap(s,T+1000+i*100,()=>.999);
  const v=G.momentComboView(s,T+2000);
  assert.equal(v.combo,10);
  assert.equal(v.nextMark,50);
  assert.equal(v.untilNext,40);
  assert.ok(v.remaining>0);
});
test("R2-Q09-024 Source resonance milestones count 630 and expose earned progress",()=>{
  const s=sample(),before=JSON.stringify(s);
  const empty=G.sourceResonanceProgress(s);
  assert.equal(empty.total,630);assert.equal(empty.completed,0);
  assert.equal(empty.next.level,25);assert.equal(empty.next.remaining,25);
  s.sources.SOURCE_01.level=25;s.sources.SOURCE_02.level=50;
  const p=G.sourceResonanceProgress(s);
  assert.equal(p.completed,3);assert.equal(p.total,630);
  assert.equal(p.next.level,50);assert.equal(p.next.remaining,25);
  for(const v of Object.values(s.sources))v.level=1000000;
  const full=G.sourceResonanceProgress(s);
  assert.equal(full.completed,630);assert.equal(full.next,null);
  assert.equal(JSON.stringify(sample()),before);
});
test("BOOST-Q209 gain, use, cap discard and totals preserve independent accounting",()=>{
  const s=sample();
  assert.deepEqual(G.freshBoostAccounting(),s.boost.accounting);
  s.boost.seconds=3550;
  let r=G.advance(s,T+3600000,{offline:true});
  assert.equal(r.boost,50);assert.equal(r.boostDiscarded,850);
  assert.equal(s.boost.accounting.earned,50);
  assert.equal(s.boost.accounting.discarded,850);
  assert.equal(s.boost.accounting.spent,0);
  s.boost.active=true;
  r=G.advance(s,T+3605000,{offline:false});
  assert.equal(r.boost,-5);
  assert.equal(s.boost.accounting.spent,5);
  assert.equal(s.boost.accounting.earned,50);
  assert.equal(s.boost.accounting.entries.length,3);
  assert.deepEqual(s.boost.accounting.entries.map(x=>x.kind),["earned","discarded","spent"]);
  const copy=decode(encode(s,"boost-q209"),"normal");
  assert.deepEqual(copy.boost.accounting,s.boost.accounting);
  assert.equal(copy.boost.seconds,s.boost.seconds);
});
test("BOOST-Q209 lab upgrades tracked but old five-level schema kept isolated",()=>{
  const lab=sample("lab");lab.boost.seconds=900;
  const r=G.labBoostUpgrade(lab,0);
  assert.equal(r.ok,true);
  assert.equal(lab.boost.accounting.upgrade,r.cost);
  assert.equal(lab.boost.accounting.entries.at(-1).kind,"upgrade");
  assert.equal(decode(encode(lab),"lab").boost.upgrades[0],1);
  const normal=sample();assert.equal(normal.boost.upgrades.length,5);
  assert.ok(G.validateState(normal,"normal"));
});
test("BOOST history keeps most recent 100 records but cumulative totals stay uncapped",()=>{
  const s=sample();
  for(let i=1;i<=140;i++)G.advance(s,T+i*1000,{offline:true});
  assert.equal(s.boost.accounting.entries.length,100);
  assert.ok(Math.abs(s.boost.accounting.earned-35)<1e-6);
  assert.equal(s.boost.accounting.discarded,0);
});
test("BOOST older saves gain zeroed ledger without inventing prior investment",()=>{
  const s=sample();delete s.boost.accounting;
  s.boost.seconds=650;
  const body=JSON.stringify(s);
  const old=JSON.stringify({kind:"kotowari-save",version:31,checksum:checksum(body),writer:"before-v326",data:s});
  const restored=decode(old,"normal");
  assert.equal(restored.boost.seconds,650);
  assert.deepEqual(restored.boost.accounting,G.freshBoostAccounting());
  assert.equal(restored.schemaVersion,31);
  assert.equal(KEYS.normal,"kotowari_v31_normal");
  assert.equal(KEYS.lab,"kotowari_v31_lab");
  assert.throws(()=>G.validateState({...restored,boost:{...restored.boost,accounting:{...restored.boost.accounting,spent:-4}}},"normal"),/BOOST計算履歴/);
});
test("R2-Q11-035 negative elapsed is zero reward and explicitly logged",()=>{
  const s=sample();s.lastWall=T+100000;s.boost.seconds=15;
  const r=G.advance(s,T,{offline:true});
  assert.equal(r.elapsed,0);assert.equal(s.boost.seconds,15);
  assert.equal(s.lastWall,T);
  assert.ok(s.events.at(-1).text.includes("逆行"));
  assert.equal(s.boost.accounting.earned,0);
});
test("R2-Q11-036 haptic OFF by default, persisted with schema31",()=>{
  const s=sample();
  assert.equal(s.settings.hapticTap,false);
  s.settings.hapticTap=true;
  const decoded=decode(encode(s),"normal");
  assert.equal(decoded.settings.hapticTap,true);
  delete decoded.settings.hapticTap;
  assert.equal(G.validateState(decoded,"normal").settings.hapticTap,false);
});
console.log("PASS "+count+" confirmed UI/BOOST accounting/save regression tests");