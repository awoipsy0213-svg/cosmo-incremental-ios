import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {A} from "../numbers.mjs";
import {CONFIG} from "../balance-config.mjs";
import {SaveStore,KEYS,encode,decode,checksum} from "../save.mjs";
import * as G from "../game.mjs";
const T=1800000000000,EPS=1e-7;
let count=0;
function test(title,fn){fn();count++;console.log("PASS "+title);}
const fresh=(mode="normal")=>{const s=G.createState(T,mode);s.intro.complete=true;return s;};
function storage(entries=[]){
  const data=new Map(entries);
  return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
}
function oldSave(seconds=5000,active=true,legacyLevels=null){
  const s=fresh();s.boost.seconds=seconds;s.boost.active=active;
  if(legacyLevels)s.boost.upgrades=[...legacyLevels];
  delete s.boost.timeOnlyMigration;
  const body=JSON.stringify(s);
  return JSON.stringify({kind:"kotowari-save",version:31,writer:"legacy-writer",checksum:checksum(body),data:s});
}
test("BOOST-CORE-004 confirms time-only rule without new resource amplifier",()=>{
 const s=fresh();s.time.unlocked=true;s.sources.SOURCE_01.level=1;s.boost.seconds=50;s.boost.active=true;
 const base=G.production(s),tap=G.tapPower(s);
 const step=G.advance(s,T+5000,{offline:false,rng:()=>.999});
 assert.equal(step.elapsed,5);assert.equal(step.gameSeconds,10);
 assert.equal(s.boost.seconds,45);assert.equal(s.time.elapsed,10);
 assert.equal(s.boost.accounting.spent,5);
 assert.equal(s.boost.accounting.entries.at(-1).kind,"spent");
 const iv=s.boost.accounting.entries.at(-1).interval;
 assert.equal(iv.from,T);assert.equal(iv.to,T+5000);
 assert.equal(iv.multiplier,2);assert.equal(iv.realSeconds,5);
 assert.equal(iv.effectiveBoostSeconds,5);assert.equal(iv.gameSeconds,10);
 assert.equal(G.production(s).toString(),base.toString());
 assert.equal(G.tapPower(s).toString(),tap.toString());
 assert.equal(CONFIG.confirmed.boostOfflineSecondsPerHour,900);
 assert.equal(CONFIG.confirmed.boostOnlineSecondsPerHour,0);
});
test("BOOST-Q312: depleted trial time is split exactly from ordinary speed",()=>{
 const s=fresh();s.time.unlocked=true;s.boost.seconds=2;s.boost.active=true;
 const r=G.advance(s,T+10000,{offline:false,rng:()=>.999});
 assert.equal(r.gameSeconds,12);
 assert.equal(s.time.elapsed,12);
 assert.equal(s.boost.seconds,0);
 assert.equal(s.boost.active,false);
 assert.equal(s.boost.accounting.spent,2);
 assert.equal(s.boost.accounting.entries.at(-1).interval.effectiveBoostSeconds,2);
 const spentInterval=s.boost.accounting.entries.at(-1).interval;
 assert.equal(spentInterval.from,T);
 assert.equal(spentInterval.to,T+2000);
 assert.equal(spentInterval.realSeconds,2);
 assert.equal(spentInterval.gameSeconds,4);
 const later=G.advance(s,T+20000,{offline:false,rng:()=>.999});
 assert.equal(later.gameSeconds,10);
 assert.equal(s.time.elapsed,22);
});
test("BOOST-Q219/497: disabled time multiplier costs no BOOST",()=>{
 const s=fresh();s.boost.seconds=1;s.boost.active=false;
 G.advance(s,T+7000,{offline:false});
 assert.equal(s.boost.seconds,1);
 assert.equal(s.boost.accounting.spent,0);
 assert.equal(s.boost.accounting.entries.length,0);
});
test("BOOST-Q499: verified prior over-cap seconds are not clipped when loading",()=>{
 const raw=oldSave(5400,true,[3,2,1,0,0]),st=storage([[KEYS.normal,raw]]);
 const store=new SaveStore(st,"normal","new-writer"),loaded=store.load(T+3600000);
 assert.equal(loaded.blocked,undefined);
 assert.equal(loaded.state.boost.seconds,5400);
 assert.equal(loaded.state.boost.active,false);
 assert.deepEqual(loaded.state.boost.upgrades,[0,0,0,0,0]);
 assert.deepEqual(loaded.state.boost.timeOnlyMigration,{
   version:1,at:T,previousActive:true,source:"pre-v327",
   legacyUpgradeLevels:[3,2,1,0,0]
 });
 const backup=st.getItem(KEYS.normal+".before-v327-time-only");
 assert.equal(backup,raw);
 assert.ok(backup.includes('"active":true'));
 assert.equal(st.getItem(KEYS.normal),raw);
 store.write(loaded.state);
 const final=decode(st.getItem(KEYS.normal),"normal");
 assert.equal(final.boost.seconds,5400);
 assert.equal(final.boost.active,false);
 assert.equal(final.boost.timeOnlyMigration.previousActive,true);
 assert.deepEqual(final.boost.timeOnlyMigration.legacyUpgradeLevels,[3,2,1,0,0]);
 assert.equal(st.getItem(KEYS.normal+".before-v327-time-only"),raw);
});
test("BOOST-Q500: above-cap balance remains usable but never accrues new BOOST",()=>{
 const s=fresh();s.boost.seconds=5400;
 const r=G.advance(s,T+3600000,{offline:true});
 assert.equal(r.boost,0);assert.equal(r.boostDiscarded,900);
 assert.equal(s.boost.seconds,5400);
 assert.equal(s.boost.accounting.earned,0);
 assert.equal(s.boost.accounting.discarded,900);
 s.boost.active=true;
 const spend=G.advance(s,T+10000000,{offline:false});
 assert.equal(s.boost.seconds,0);
 assert.ok(spend.boost<0);
 assert.equal(s.boost.active,false);
});
test("BOOST-Q500: below-cap accrual fills only capacity gap after spending",()=>{
 const s=fresh();s.boost.seconds=3599;
 const r=G.advance(s,T+7200000,{offline:true});
 assert.equal(r.boost,1);
 assert.equal(r.boostDiscarded,1799);
 assert.equal(s.boost.seconds,3600);
});
test("BOOST-Q501: previous old-mode ON bit does not turn time-only multiplier ON",()=>{
 const raw=oldSave(120,true),old=decode(raw,"normal");
 assert.equal(old.boost.active,false);
 assert.equal(old.boost.timeOnlyMigration.previousActive,true);
 assert.equal(old.boost.timeOnlyMigration.source,"pre-v327");
 const saved=encode(old,"now");
 const again=decode(saved,"normal");
 assert.equal(again.boost.active,false);
 assert.equal(again.boost.timeOnlyMigration.previousActive,true);
 assert.equal(again.boost.seconds,120);
});
test("BOOST-CORE-004 new saves can use the time-only multiplier manually",()=>{
 const s=fresh();assert.equal(s.boost.active,false);
 assert.equal(s.boost.timeOnlyMigration.source,"new");
 s.boost.seconds=120;s.boost.active=true;
 const d=decode(encode(s),"normal");
 assert.equal(d.boost.active,true);
 assert.equal(d.boost.timeOnlyMigration.source,"new");
});
test("BOOST-Q470: block save mutation when pre-v327 raw-copy backup fails",()=>{
 const raw=oldSave(7200,true),st=storage([[KEYS.normal,raw]]);
 const originalSet=st.setItem;
 st.setItem=(key,value)=>{if(key===KEYS.normal+".before-v327-time-only")throw Error("quota reached");originalSet(key,value);};
 const store=new SaveStore(st,"normal","new-writer");
 const result=store.load(T);
 assert.equal(result.blocked,true);
 assert.equal(store.blocked,true);
 assert.equal(st.getItem(KEYS.normal),raw);
 assert.throws(()=>store.write(result.state),/保護中/);
});
test("old legacy BOOST migration retains spendable excess with raw archive intact",()=>{
 const legacy={stage:1,particles:17,kotowari:{sourceLevels:[1,0,0,0,0,0]}};
 const a=JSON.stringify(legacy),rawBoost=JSON.stringify({seconds:4400,active:true,upgrades:[3,2,1,0,0]});
 const st=storage([[KEYS.legacy,a],["kotowari_boost_v1",rawBoost]]);
 const store=new SaveStore(st,"normal","new-writer");
 const result=store.load(T);
 assert.equal(result.migrated,true);
 assert.equal(result.state.boost.seconds,4400);
 assert.equal(result.state.boost.active,false);
 assert.equal(result.state.boost.timeOnlyMigration.previousActive,true);
 assert.deepEqual(result.state.boost.timeOnlyMigration.legacyUpgradeLevels,[3,2,1,0,0]);
 assert.equal(st.getItem(KEYS.legacy),a);
 const archived=JSON.parse(st.getItem(KEYS.legacyArchive));
 assert.equal(archived.raw,a);assert.equal(archived.boost,rawBoost);
 assert.equal(result.state.boost.upgrades.every(x=>x===0),true);
});
test("official new normal saves reject unapproved active old BOOST investments",()=>{
 const s=fresh();s.boost.upgrades[1]=4;
 assert.throws(()=>G.validateState(s,"normal"),/検証専用値/);
 const old=oldSave(100,false,[0,4,0,0,0]);
 const migrated=decode(old,"normal");
 assert.deepEqual(migrated.boost.upgrades,[0,0,0,0,0]);
 assert.deepEqual(migrated.boost.timeOnlyMigration.legacyUpgradeLevels,[0,4,0,0,0]);
});
test("new interval metadata validates and survives saved schema31",()=>{
 const s=fresh();s.boost.seconds=30;s.boost.active=true;
 G.advance(s,T+1000,{offline:false});
 const d=decode(encode(s),"normal");
 assert.deepEqual(d.boost.accounting.entries.at(-1).interval,s.boost.accounting.entries.at(-1).interval);
 const clone=JSON.parse(JSON.stringify(d));
 clone.boost.accounting.entries.at(-1).interval.multiplier=-1;
 assert.throws(()=>G.validateState(clone,"normal"),/BOOST計算履歴/);
 assert.equal(d.schemaVersion,31);
 assert.equal(KEYS.normal,"kotowari_v31_normal");
});
test("BOOST-Q625: all offline entrypoints persist before any success report",()=>{
 const ui=readFileSync(new URL("../app.mjs",import.meta.url),"utf8");
 const body=ui.slice(ui.indexOf("function settleOfflineAndPersist("),ui.indexOf("function applySettings("));
 assert.ok(body.includes("const persisted=save(snapshot)&&!storageUnavailable;"));
 assert.ok(body.indexOf("const persisted=save(snapshot)")<body.indexOf("if(persisted)reportOffline(report)"));
 assert.match(body,/else if\(report\.elapsed>=10\)/);
 assert.ok(!ui.includes("reportOffline(G.advance("));
 assert.ok(ui.includes("settleOfflineAndPersist(now);"));
 assert.ok(ui.includes("settleOfflineAndPersist(Date.now());"));
 assert.ok(ui.includes("settleOfflineAndPersist(Date.now(),{snapshot:true});"));
});
console.log("PASS "+count+" v327 time-only and protected migration tests");