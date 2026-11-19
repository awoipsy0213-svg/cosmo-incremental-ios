import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {A} from "../numbers.mjs";
import {createState,buyAll,quoteBuyAll,validateState} from "../game.mjs";
let n=0;const test=(name,fn)=>{fn();n++;console.log("✓",name);};
const now=1763600000000;
const fixture=()=>{const s=createState(now);s.intro.complete=true;s.orbs="1500";return s;};

test("quoted all/visible purchase never mutates real wallet or state",()=>{
  const s=fixture(),initial=JSON.stringify(s);
  const q=quoteBuyAll(s,"moment","cheap",["tap"]);
  assert.equal(q.ok,true);assert.ok(q.count>0);
  assert.equal(JSON.stringify(s),initial);
  assert.deepEqual(q.selectedIds,["tap"]);
  assert.equal(A(q.remaining).add(q.spent).cmp(s.orbs),0);
});
test("only requested stable IDs are purchased; quote equals actual money",()=>{
  const s=fixture(),before=A(s.orbs);
  const ids=["tap","tap2"];
  const q=quoteBuyAll(s,"moment","cheap",ids);
  assert.equal(q.ok,true);
  const r=buyAll(s,"moment","cheap",ids);
  assert.equal(r.ok,true);
  assert.equal(r.count,q.count);
  assert.equal(A(r.spent).cmp(q.spent),0);
  assert.equal(A(s.orbs).cmp(q.remaining),0);
  assert.equal(before.sub(s.orbs).cmp(q.spent),0);
  assert.ok(s.moment.tap>0);
  for(const [id,level] of Object.entries(s.moment))if(!ids.includes(id))assert.equal(level,0);
});
test("invalid, empty or duplicate selection cannot spend",()=>{
  for(const ids of [[],["FAKE"],["tap","tap"]]){
    const s=fixture(),initial=JSON.stringify(s);
    assert.equal(quoteBuyAll(s,"moment","cheap",ids).ok,false);
    assert.equal(buyAll(s,"moment","cheap",ids).ok,false);
    assert.equal(JSON.stringify(s),initial);
  }
});
test("default all-scope is still backward compatible",()=>{
  const a=fixture(),b=fixture();
  const quoted=quoteBuyAll(a,"source","expensive");
  assert.equal(quoted.ok,true);
  const actual=buyAll(b,"source","expensive");
  assert.equal(actual.ok,true);
  assert.equal(actual.count,quoted.count);
  assert.equal(A(actual.spent).cmp(quoted.spent),0);
  assert.equal(A(b.orbs).cmp(quoted.remaining),0);
  assert.equal(validateState(b,"normal").purchaseMode,"1");
});
test("selection snapshot is immutable across quote after state changes",()=>{
  const s=fixture();
  const earlier=quoteBuyAll(s,"moment","cheap",["tap"]);
  assert.equal(earlier.ok,true);
  s.orbs="400";
  const changed=quoteBuyAll(s,"moment","cheap",["tap"]);
  assert.equal(changed.ok,true);
  assert.ok(A(changed.remaining).cmp(earlier.remaining)!==0||
    changed.count!==earlier.count||A(changed.spent).cmp(earlier.spent)!==0);
});
test("U-10 controls and confirmation are wired in the UI",()=>{
  const app=readFileSync(new URL("../app.mjs",import.meta.url),"utf8");
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.ok(app.includes("G.quoteBuyAll"));
  assert.ok(app.includes("一括購入の金額確認"));
  assert.ok(app.includes("toggle-bulk-scope"));
  assert.ok(html.includes('id="bulkScopeButton"'));
  assert.ok(html.includes('data-action="buy-all"'));
});
console.log("PASS "+n+" Ver3.19 U-10 selected bulk purchase and live quote checks");
