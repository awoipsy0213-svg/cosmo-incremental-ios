import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {A} from "../numbers.mjs";
import {createState,validateState} from "../game.mjs";
import {SaveStore,KEYS,encode,decode,checksum} from "../save.mjs";

const NOW=1763600000000;
let checked=0;
const test=(name,fn)=>{fn();checked++;console.log("✓",name);};
const storageFrom=(pairs)=>{const data=new Map(pairs);
  return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value))};};
const valid=()=>{const s=createState(NOW);s.intro.complete=true;s.orbs="123456";
  return encode(s,"previous-writer");};
const broken='{"kind":"kotowari-save","version":31,"checksum":"00000000","data":{}}';

test("broken primary is not replaced with an old snapshot automatically",()=>{
  const good=valid(),st=storageFrom([
    [KEYS.normal,broken],[KEYS.normal+".backups",JSON.stringify([{at:NOW,raw:good}])]
  ]);
  const store=new SaveStore(st,"normal","safe-recovery");
  const result=store.load(NOW);
  assert.equal(result.blocked,true);
  assert.equal(result.recoverableBackups,1);
  assert.equal(store.blocked,true);
  assert.equal(st.getItem(KEYS.normal),broken);
  assert.equal(st.getItem(KEYS.normal+".corrupt"),broken);
  assert.equal(A(decode(good,"normal").orbs).cmp(123456),0);
  assert.throws(()=>store.write(result.state),/保護中/);
  assert.throws(()=>store.export(result.state),/保護中/);
});
test("user-selected backup restores saved progress and retains original broken bytes",()=>{
  const good=valid(),st=storageFrom([[KEYS.normal,broken],
    [KEYS.normal+".backups",JSON.stringify([{at:NOW,raw:good}])]]);
  const store=new SaveStore(st,"normal","explicit-recovery");
  store.load(NOW);
  const restored=store.restoreBackup(0,NOW+1000);
  assert.equal(A(restored.orbs).cmp(123456),0);
  assert.equal(store.blocked,false);
  assert.equal(st.getItem(KEYS.normal+".before-import"),broken);
  assert.equal(st.getItem(KEYS.normal+".corrupt"),broken);
  assert.equal(A(decode(st.getItem(KEYS.normal),"normal").orbs).cmp(123456),0);
  assert.doesNotThrow(()=>validateState(restored,"normal"));
});
test("subsequent re-import never overwrites a previously protected raw snapshot",()=>{
  const good=valid(),st=storageFrom([[KEYS.normal,broken],
    [KEYS.normal+".backups",JSON.stringify([{at:NOW,raw:good}])]]);
  const store=new SaveStore(st,"normal","second-recovery");
  store.load(NOW);
  const previous=store.restoreBackup(0,NOW+100);
  const beforeSecond=st.getItem(KEYS.normal);
  const latest=createState(NOW);latest.intro.complete=true;latest.orbs="777";
  store.import(encode(latest,"new-writer"),NOW+200);
  assert.equal(st.getItem(KEYS.normal+".before-import"),broken);
  assert.equal(st.getItem(KEYS.normal+".before-import-"+(NOW+200)),beforeSecond);
  assert.equal(A(decode(st.getItem(KEYS.normal),"normal").orbs).cmp(777),0);
  assert.equal(A(previous.orbs).cmp(123456),0);
});
test("cannot recover until the original was saved byte-for-byte",()=>{
  const good=valid(),st=storageFrom([[KEYS.normal,broken]]);
  const base=st.setItem;st.setItem=(key,value)=>{
    if(key===KEYS.normal+".before-import")throw Error("storage quota");
    base(key,value);
  };
  const store=new SaveStore(st,"normal","quota-test");
  store.load(NOW);
  assert.throws(()=>store.import(good,NOW+100),/storage quota/);
  assert.equal(st.getItem(KEYS.normal),broken);
  assert.equal(store.blocked,true);
});
test("incompatible current-format data stays quarantined instead of being guessed",()=>{
  const good=valid(),decoded=JSON.parse(good);
  decoded.data.schemaVersion=99;
  decoded.checksum=checksum(JSON.stringify(decoded.data));
  const invalid=JSON.stringify(decoded);
  const st=storageFrom([[KEYS.normal,invalid],
    [KEYS.normal+".backups",JSON.stringify([{at:NOW,raw:good}])]]);
  const store=new SaveStore(st,"normal","reject-unknown");
  assert.equal(store.load(NOW).blocked,true);
  assert.equal(st.getItem(KEYS.normal),invalid);
  assert.equal(store.blocked,true);
});
test("PWA core cache includes the transitive import graph of the playable app",()=>{
  const source=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
  const block=source.match(/const CORE_FILES = \[([\s\S]*?)\];/);
  assert.ok(block,"CORE_FILES declaration missing");
  const core=new Set([...block[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]));
  const seen=new Set(),todo=["app.mjs","game.mjs","save.mjs"];
  while(todo.length){
    const path=todo.pop();
    if(seen.has(path))continue;
    seen.add(path);
    assert.ok(core.has(path),"Offline core is missing required module: "+path);
    const text=readFileSync(new URL("../"+path,import.meta.url),"utf8");
    for(const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']\.\/([^"'?#]+\.mjs)["']/g))
      todo.push(match[1]);
  }
  assert.ok(seen.has("source-effects-v315.mjs"));
  assert.ok(seen.has("telemetry-v319.mjs"));
  assert.ok(seen.size>=16,"unexpectedly incomplete app dependency traversal");
});
test("UI never exports a generated empty placeholder while protected",()=>{
  const app=readFileSync(new URL("../app.mjs",import.meta.url),"utf8");
  assert.ok(app.includes('if(store.blocked)return toast("主セーブ保護中です'));
  assert.ok(app.includes("保護中の主セーブをそのまま救出"));
  assert.ok(app.includes("store.restoreBackup"));
  assert.ok(app.includes("candidate=decode(x.raw,mode)"));
  assert.ok(app.includes("この履歴を選択して復元"));
  assert.ok(app.includes("report.elapsed<10"));
});
test("snapshot quota failure does not negate the successfully saved primary progress (U-32)",()=>{
  const storeData=storageFrom([]);
  const originalSet=storeData.setItem;
  storeData.setItem=(key,value)=>{
    if(key.endsWith(".backups"))throw new Error("quota exceeded for history");
    originalSet(key,value);
  };
  const store=new SaveStore(storeData,"normal","quota-priority");
  const s=createState(NOW);s.intro.complete=true;s.orbs="3200";
  assert.equal(store.write(s,{snapshot:true}),true);
  assert.equal(A(decode(storeData.getItem(KEYS.normal),"normal").orbs).cmp(3200),0);
  assert.equal(store.expectedRevision,s.revision);
  assert.ok(store.lastError.includes("進捗本体は保存済み"));
  assert.equal(storeData.getItem(KEYS.normal+".backups"),null);
  s.orbs="6400";
  assert.equal(store.write(s),true);
  assert.equal(A(decode(storeData.getItem(KEYS.normal),"normal").orbs).cmp(6400),0);
  assert.ok(store.expectedRevision===s.revision);
});
test("primary write failure preserves progress in memory and does not falsely commit",()=>{
  const storeData=storageFrom([]);
  storeData.setItem=(key,value)=>{throw new Error("primary storage full");};
  const store=new SaveStore(storeData,"normal","hard-quota");
  const s=createState(NOW);s.orbs="123";const revision=s.revision;
  assert.throws(()=>store.write(s,{snapshot:true}),/primary storage full/);
  assert.equal(s.revision,revision);
  assert.equal(store.expectedRevision,0);
  assert.equal(storeData.getItem(KEYS.normal),null);
});
console.log("PASS "+checked+" Ver3.20 recovery/PWA checks");
