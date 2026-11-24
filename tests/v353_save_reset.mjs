import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as G from "../game.mjs";
import {A,formatExistenceDisplay} from "../numbers.mjs";
import {SaveStore,KEYS,encode,decode} from "../save.mjs";

const NOW=1800000000000;
const fixture=(mode="normal")=>{
  const s=G.createState(NOW,mode);s.intro.complete=true;s.intro.touches=8;
  s.orbs="1e1000000";s.totalOrbs="1e1000001";s.runOrbsEarned="1e1000000";
  s.totalExistenceEarned="1234.567";s.surplusExistence="42.123";
  s.moment.tap=42;s.sources.SOURCE_01.level=100;
  s.convergenceCount=6;s.engraving.owned=["ENG-01"];s.engraving.levels={"ENG-01":1};
  s.time.unlocked=true;s.boost.seconds=500;s.settings.automationEnabled=false;
  s.counters.taps=123;s.counters.onlineSeconds=50;s.events=[{at:NOW,text:"saved"}];
  return s;
};
function memory(pairs=[]){
  const data=new Map(pairs);
  return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
}
const old=encode(fixture(),"old"),lab=encode(fixture("lab"),"lab");
const legacy='{"particles":17,"stage":1}';
const db=memory([[KEYS.normal,old],[KEYS.lab,lab],[KEYS.legacy,legacy],
  [KEYS.normal+".backups",JSON.stringify([{at:NOW,raw:old}])]]);
const store=new SaveStore(db,"normal","new");
let s=store.load(NOW).state;
s.counters.taps=124;
const saved=store.protect(s,"manual",NOW+1);
assert.equal(saved.index,0);
assert.equal(db.getItem(KEYS.normal),old,"manual archive never replaces primary");
assert.equal(store.protectedBackups()[0].originalRaw,old);
assert.equal(decode(store.protectedBackups()[0].raw,"normal").counters.taps,124);
const next=store.reset(s,NOW+2);
const expected=G.createState(NOW+2,"normal");
expected.revision=next.revision;
assert.deepEqual(next,expected,"all progress, resources, settings and statistics reset");
assert.deepEqual(decode(db.getItem(KEYS.normal),"normal"),G.validateState(next,"normal"));
assert.equal(store.protectedBackups().length,2);
assert.equal(store.protectedBackups()[1].reason,"reset");
assert.equal(db.getItem(KEYS.lab),lab);
assert.equal(db.getItem(KEYS.legacy),legacy);
assert.equal(store.backups()[0].raw,old);
for(let i=0;i<5;i++)store.write(next,{snapshot:true});
assert.equal(store.backups().length,3);
assert.equal(store.protectedBackups().length,2,"ordinary rotation never deletes protected copies");
const restored=store.restoreProtectedBackup(1,NOW+3);
assert.equal(restored.totalExistenceEarned,"1.234567e3");
assert.equal(restored.counters.taps,124);
assert.equal(restored.boost.seconds,500);
assert.equal(restored.lastWall,NOW+3);
assert.equal(store.protectedBackups().length,2);
assert.equal(formatExistenceDisplay(restored.totalExistenceEarned),"1,234.567");
assert.equal(db.getItem(KEYS.lab),lab);
assert.equal(db.getItem(KEYS.legacy),legacy);

for(const failure of ["quota","readback","primary","stale","archive-malformed"]){
  const db=memory([[KEYS.normal,old],[KEYS.lab,lab]]);
  const store=new SaveStore(db,"normal","failure");
  const s=store.load(NOW).state;
  const initial=JSON.stringify(s);
  const write=db.setItem,read=db.getItem;
  if(failure==="quota")db.setItem=(k,v)=>{if(k.endsWith(".protected-backups"))throw Error("quota");write(k,v);};
  if(failure==="readback")db.getItem=k=>k.endsWith(".protected-backups")&&db.data.has(k)?"[]":read(k);
  if(failure==="primary")db.setItem=(k,v)=>{if(k===KEYS.normal)throw Error("primary quota");write(k,v);};
  if(failure==="archive-malformed")write(KEYS.normal+".protected-backups","broken");
  let expected=old;
  if(failure==="stale"){
    const other=fixture();other.revision=99;expected=encode(other,"other");write(KEYS.normal,expected);
  }
  assert.throws(()=>store.reset(s,NOW+5),failure);
  assert.equal(read(KEYS.normal),expected,failure+" primary preserved");
  assert.equal(read(KEYS.lab),lab);
  assert.equal(JSON.stringify(s),initial);
  if(failure==="primary")assert.equal(store.protectedBackups().length,1,"verified archive survives failed primary write");
}
const corrupt=memory([[KEYS.normal,"broken"]]);
const blocked=new SaveStore(corrupt,"normal","blocked");
const loaded=blocked.load(NOW);
assert.equal(loaded.blocked,true);
assert.throws(()=>blocked.reset(loaded.state,NOW));
assert.equal(corrupt.getItem(KEYS.normal),"broken");

const labStore=new SaveStore(db,"lab","test");
const normalBefore=db.getItem(KEYS.normal);
let test=labStore.load(NOW).state;
assert.equal(G.labGrant(test,"orbs","1e1000000").ok,true);
assert.ok(A(test.orbs).cmp("1e1000000")>0);
const total=A(test.totalExistenceEarned),surplus=A(test.surplusExistence);
assert.equal(G.labGrant(test,"existence","10").ok,true);
assert.equal(A(test.totalExistenceEarned).cmp(total.add(10)),0);
assert.equal(A(test.surplusExistence).cmp(surplus.add(10)),0);
const snapshot=JSON.stringify(test);
for(const bad of ["-1","Infinity","NaN","0","1e2000001","invalid"]){
  assert.equal(G.labGrant(test,"orbs",bad).ok,false);
  assert.equal(JSON.stringify(test),snapshot);
}
const normal=fixture(),normalRaw=JSON.stringify(normal);
assert.equal(G.labGrant(normal,"orbs","1e1000000").ok,false);
assert.equal(G.labGrant(normal,"existence","10").ok,false);
assert.equal(JSON.stringify(normal),normalRaw);
labStore.write(test);
assert.throws(()=>store.import(labStore.export(test),NOW));
assert.throws(()=>labStore.import(store.export(restored),NOW));
const freshLab=labStore.reset(test,NOW+4);
assert.equal(freshLab.mode,"lab");
assert.equal(freshLab.intro.complete,false);
assert.equal(db.getItem(KEYS.normal),normalBefore);
assert.equal(labStore.protectedBackups().length,1);
assert.equal(store.protectedBackups().length,2);
assert.equal(labStore.load(NOW+5).state.intro.complete,false,"fresh test save does not copy normal again");

const earn=G.createState(NOW);earn.intro.complete=true;
G.addOrbs(earn,"1e10");
const quote=G.convergenceQuote(earn);
assert.ok(G.converge(earn).ok);
assert.equal(A(earn.totalExistenceEarned).cmp(quote.reward),0);
const cumulative=earn.totalExistenceEarned;
assert.ok(G.buyEngraving(earn,"ENG-01").ok);
assert.equal(earn.totalExistenceEarned,cumulative,"spending does not reduce lifetime earnings");
for(const p of ["app.mjs","game.mjs","save.mjs","sw.js"])
  assert.equal(readFileSync(new URL("../"+p,import.meta.url),"utf8"),readFileSync(new URL("../www/"+p,import.meta.url),"utf8"));
console.log("PASS v353 protected backups, reset failures, separate test mode, lifetime Existence and save compatibility");
