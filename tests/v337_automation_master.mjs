import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as G from "../game.mjs";
import {A} from "../numbers.mjs";
import {SaveStore,checksum,KEYS,decode,encode} from "../save.mjs";

const NOW=1800000000000;
const load=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const fresh=()=>{const s=G.createState(NOW);s.intro.complete=true;return s;};
const own=(s,id)=>{s.engraving.owned.push(id);s.engraving.levels[id]=1;};
let total=0;
const check=(name,fn)=>{fn();console.log("PASS v337",name);total++;};

check("new and previous saves default to master ON; preserve schema 31",()=>{
  const s=fresh();
  assert.equal(s.settings.automationEnabled,true);
  assert.equal(s.schemaVersion,31);
  assert.equal(decode(encode(s,"v337-check"),"normal").settings.automationEnabled,true);
  delete s.settings.automationEnabled;
  const old=G.validateState(s,"normal");
  assert.equal(old.settings.automationEnabled,true);
});
check("master setting rejects invalid input and leaves individual features unchanged",()=>{
  const s=fresh();own(s,"ENG-23");own(s,"ENG-26");own(s,"ENG-24");
  G.configureAutoPurchase(s,"moment",{priority:"expensive",intervalSeconds:5});
  G.configureAutoPurchase(s,"source",{intervalSeconds:10,enabled:false});
  G.configureAutoConvergence(s,{enabled:true,mode:"minutes",intervalMinutes:3},NOW);
  const copy=JSON.stringify(s.engraving);
  assert.equal(G.configureAutomationMaster(s,"OFF").ok,false);
  assert.equal(s.settings.automationEnabled,true);
  assert.equal(G.configureAutomationMaster(s,false).ok,true);
  assert.equal(s.settings.automationEnabled,false);
  assert.equal(JSON.stringify(s.engraving),copy,"global pause never overwrites stored options");
  assert.equal(G.configureAutomationMaster(s,true).ok,true);
  assert.equal(JSON.stringify(s.engraving),copy,"resuming retains every automation preference");
});
check("paused automation performs no purchased levels or autonomous taps, stores credits",()=>{
  const s=fresh();own(s,"ENG-23");own(s,"ENG-26");own(s,"ENG-22");
  G.addOrbs(s,"1e60");
  s.engraving.runtime.autoMomentCredit=.5;
  s.engraving.runtime.autoSourceCredit=.25;
  const before=A(s.totalOrbs);
  const snapshot=structuredClone(s.engraving.runtime);
  assert.ok(G.configureAutomationMaster(s,false).ok);
  G.advance(s,NOW+10000,{offline:false,rng:()=>.99});
  assert.equal(Object.values(s.moment).reduce((a,b)=>a+b,0),0);
  assert.equal(Object.values(s.sources).reduce((a,b)=>a+b.level,0),0);
  assert.deepEqual(s.engraving.runtime,snapshot,"paused credit and interval clocks must not advance");
  assert.ok(A(s.totalOrbs).cmp(before)>=0,"normal online income may continue");
  assert.ok(G.configureAutomationMaster(s,true).ok);
  G.advance(s,NOW+14000,{offline:false,rng:()=>.99}); // ENG-23 Lv1 now buys at 1 / 3 game seconds
  assert.ok(Object.values(s.moment).reduce((a,b)=>a+b,0)>0,"existing enabled purchased automation resumes");
});
check("global pause prevents auto convergence even above threshold and 60s",()=>{
  const s=fresh();s.convergenceCount=1;own(s,"ENG-24");G.addOrbs(s,"1e80");
  assert.ok(G.convergenceQuote(s).steps>0);
  assert.ok(G.configureAutoConvergence(s,{enabled:true,mode:"ready"},NOW).ok);
  G.configureAutomationMaster(s,false);
  assert.equal(G.autoConvergenceTick(s,NOW+70000,false).ok,false);
  assert.equal(s.convergenceCount,1);
  G.configureAutomationMaster(s,true);
  assert.equal(G.autoConvergenceTick(s,NOW+70001,false).ok,true);
  assert.equal(s.convergenceCount,2);
});
check("offline mode still never progresses automatic purchases or game resources",()=>{
  const s=fresh();own(s,"ENG-23");G.addOrbs(s,"1e50");
  G.configureAutomationMaster(s,true);
  const prior=s.orbs;
  G.advance(s,NOW+3600000,{offline:true,rng:()=>0});
  assert.equal(s.orbs,prior);
  assert.equal(Object.values(s.moment).reduce((a,b)=>a+b,0),0);
});
check("pre-v337 raw save is byte-for-byte preserved before new setting is saved",()=>{
  const old=fresh();old.orbs="123.75";own(old,"ENG-23");
  delete old.settings.automationEnabled;
  const body=JSON.stringify(old);
  const raw=JSON.stringify({kind:"kotowari-save",version:31,
    writer:"before-master",checksum:checksum(body),data:old});
  const map=new Map([[KEYS.normal,raw]]);
  const mem={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};
  const store=new SaveStore(mem,"normal","new-writer");
  const loaded=store.load(NOW);
  assert.equal(loaded.blocked,undefined,"valid old save should load");
  assert.equal(loaded.state.settings.automationEnabled,true);
  assert.equal(loaded.state.orbs,"1.2375e2");
  assert.equal(map.get(KEYS.normal+".before-v337-automation-master"),raw);
  assert.equal(map.get(KEYS.normal),raw,"loading must not overwrite original bytes");
  store.write(loaded.state);
  assert.equal(decode(map.get(KEYS.normal),"normal").settings.automationEnabled,true);
  assert.deepEqual(decode(raw,"normal").engraving.owned,["ENG-23"]);
});
check("backup failure blocks writes and preserves original save",()=>{
  const s=fresh();delete s.settings.automationEnabled;
  const body=JSON.stringify(s);
  const raw=JSON.stringify({kind:"kotowari-save",version:31,
    writer:"old-writer",checksum:checksum(body),data:s});
  const map=new Map([[KEYS.normal,raw]]);
  const mem={getItem:k=>map.get(k)??null,setItem:(k,v)=>{
    if(k.endsWith(".before-v337-automation-master"))throw Error("quota");
    map.set(k,v);
  }};
  const store=new SaveStore(mem,"normal","new");
  const data=store.load(NOW);
  assert.equal(data.blocked,true);assert.equal(store.blocked,true);
  assert.equal(map.get(KEYS.normal),raw);
});
check("UI/master implementation, fixed cards, PWA refresh and Capacitor parity",()=>{
  const app=load("app.mjs"),css=load("automation-center-v336.css"),sw=load("sw.js");
  assert.match(app,/data-auto-master/);
  assert.match(app,/data-action="toggle-auto-details"/);
  assert.match(app,/data-auto-mode/);
  assert.match(app,/automation-status-line/);
  assert.match(css,/height:111px/);
  assert.match(css,/height:185px/);
  assert.match(css,/appearance:none!important/,"auto checkboxes have switch appearance");
  assert.match(sw,/3\.50\.0-time-residue/);
  assert.match(load("game.mjs"),/s\.settings\.automationEnabled===false/);
  for(const file of ["app.mjs","game.mjs","save.mjs","sw.js",
    "automation-center-v336.css","index.html","engraving-effects-v333.mjs"]){
    assert.equal(load(file),load("www/"+file),"Web/Capacitor mismatch "+file);
  }
});
console.log("PASS v337",total,"automation master controls, persistence and protected migrations");
