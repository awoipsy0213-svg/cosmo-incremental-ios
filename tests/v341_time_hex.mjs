import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {TIME_DIRECTIONS,timeHexNodes,timeHexMarkup,timeHexFlowPanel,timeHexMiraclesPanel} from "../time-hex-v341.mjs";
import {CONTENT} from "../content.mjs";
import * as G from "../game.mjs";
import {CONFIG} from "../balance-config.mjs";
import {encode,decode,KEYS} from "../save.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

assert.deepEqual(TIME_DIRECTIONS,["流動","空間","変化","因果","秩序","可能性"]);
const base=G.createState(1800000000000);
const t=base.time;
const before=JSON.stringify(base);
let nodes=timeHexNodes(t);
assert.equal(nodes.length,6);
assert.equal(nodes[0].unlocked,true);
assert.equal(nodes[0].active,true);
assert.equal(nodes[0].percentage,100);
assert.equal(nodes[0].disabled,true,"last selected direction cannot be cleared");
for(const n of nodes.slice(1)){
  assert.equal(n.name,"？","future direction name remains hidden");
  assert.equal(n.unlocked,false);
  assert.equal(n.disabled,true);
}
assert.equal(JSON.stringify(base),before,"UI projection must not mutate saved state");

const markup=timeHexMarkup();
assert.equal((markup.match(/data-time-direction="/g)||[]).length,6);
assert.equal((markup.match(/data-hex-line="/g)||[]).length,6);
for(const tab of ["flow","concepts","miracles"])assert.ok(markup.includes('data-time-open="'+tab+'"'));
assert.equal((markup.match(/<strong data-hex-name>？<\/strong>/g)||[]).length,6,"unrevealed direction names remain concealed in node labels");
assert.match(markup,/aria-label="六角形の方向選択"/);
assert.match(markup,/data-time-open="flow"/);

t.unlocked=true;t.revealedDirections=4;
assert.equal(G.setDirection(base,1,true).ok,true);
assert.equal(G.setDirection(base,2,true).ok,true);
nodes=timeHexNodes(t);
assert.deepEqual(nodes.filter(n=>n.active).map(n=>n.name),["流動","空間","変化"]);
assert.equal(nodes[3].disabled,true,"fourth selected direction is blocked");
assert.equal(nodes[4].unlocked,false);
assert.equal(G.setDirection(base,3,true).ok,false,"engine still enforces max 3");
assert.equal(G.setDirection(base,2,false).ok,true);
assert.equal(timeHexNodes(t)[3].disabled,false,"freed capacity enables another known direction");
assert.equal(G.setWeight(base,0,60),true);
assert.equal(Math.round(t.weights.reduce((a,b)=>a+b,0)),100,"existing percentage normalization stays intact");

const readOnly=timeHexNodes(t,{readOnly:true});
assert.ok(readOnly.every(n=>n.disabled),"read-only protects all direction buttons");
assert.equal(CONFIG.schemaVersion,31);
assert.equal(KEYS.normal,"kotowari_v31_normal");
const restored=decode(encode(base,"time-hex-v341"),"normal");
assert.deepEqual(restored.time.selected,base.time.selected);
assert.equal(restored.time.revealedDirections,base.time.revealedDirections);
assert.ok(restored.time.weights.every((value,i)=>Math.abs(value-base.time.weights[i])<1e-10),"existing normalization tolerates floating-point rounding on reload");

const first=CONTENT.concepts[0];
const unformed={...t,revealedDirections:1,selected:[0],weights:[100,0,0,0,0,0],
  residues:{[first.id]:7},concepts:{},common:12,miracles:[],worldSeconds:0.34};
const svg=()=>'<svg aria-hidden="true"></svg>';
const flow=timeHexFlowPanel(unformed,CONTENT.concepts,CONTENT.principles,svg);
assert.match(flow,/方向の配分/);
assert.match(flow,/共通の？？？/);
assert.match(flow,/7 \/ 10個/);
assert.doesNotMatch(flow,/空間|可能性/);
assert.doesNotMatch(flow,new RegExp(first.name),"unformed concept remains unnamed");
const miracles=timeHexMiraclesPanel(unformed,CONTENT.principles);
assert.match(miracles,/認識した方向 1 \/ 6/);
assert.doesNotMatch(miracles,/世界時間 0\.34/,"world second not prematurely explained");
assert.doesNotMatch(miracles,/空間|可能性/);
const endgame=timeHexMiraclesPanel({...t,revealedDirections:6,worldSeconds:.5,eventHappened:false},CONTENT.principles);
assert.match(endgame,/世界時間 0\.500000 \/ 1秒/);

const app=read("app.mjs"),html=read("index.html"),style=read("time-hex-v341.css"),sw=read("sw.js");
for(const fragment of [
  'import {timeHexMarkup,patchTimeHex,timeHexFlowPanel,timeHexMiraclesPanel}',
  'classList.toggle("time-hex-world",isTime)',
  'patchTimeHex(timeRoot,state.time',
  'b.dataset.timeDirection',
  'b.dataset.timeOpen',
  'miracles:miraclesHTML',
  't.dataset.direction!==undefined'
])assert.ok(app.includes(fragment),"missing app integration: "+fragment);
assert.ok(html.includes('id="timeHexRoot"'));
assert.ok(html.includes('time-hex-v341.css'));
assert.ok(style.includes("body.time-hex-world"));
assert.ok(style.includes("prefers-reduced-motion"));
assert.ok(style.includes("body.sheet-open.time-hex-world"));
assert.ok(sw.includes('const UI_REVISION = "-engraving-v342"'));
for(const asset of ["engraving-v342.css","engraving-v342.mjs","engraving-v342-ui.mjs"])assert.ok(sw.includes('"'+asset+'"'),"cache v342 "+asset);
for(const asset of ["time-hex-v341.css","time-hex-v341.mjs"])
  assert.equal((sw.match(new RegExp('"'+asset.replaceAll(".","\\.")+'"',"g"))||[]).length,2,"precache core and relative list");
for(const file of ["index.html","app.mjs","sw.js","time-hex-v341.css","time-hex-v341.mjs"])
  assert.equal(read(file),read("www/"+file),file+" Web/Capacitor parity");
console.log("PASS v341 hex direction projection, selection max, unlocked secrecy, residue/miracle panels, save integrity, PWA assets and Web/iOS parity");
