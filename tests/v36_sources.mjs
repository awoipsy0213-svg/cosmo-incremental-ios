import assert from 'node:assert/strict';
import {A,maxAffordable,seriesCost} from '../numbers.mjs';
import {CONTENT} from '../content.mjs';
import {CONFIG} from '../balance-config.mjs';
import {createState,production,sourceProductionPerLevel,purchaseQuote,buy,validateState,advance,converge} from '../game.mjs';
import {encode,decode,KEYS} from '../save.mjs';
let checks=0;
function ok(expr, message){assert.ok(expr,message);checks++}
function equals(actual,expected,message){assert.equal(actual,expected,message);checks++}
function near(actual,expected,message,tol=1e-11){const ratio=A(actual).div(expected).toNumber();assert.ok(Number.isFinite(ratio) && Math.abs(1-ratio)<tol, `${message}: relative ratio ${ratio}`); checks++}
const cfg=CONFIG.provisional.source;
const rates=cfg.perSecondPerLevel.map(x=>A(x));
const prices=cfg.baseCosts.map(x=>A(x));
ok(/^3\.[67]\.0$/.test(CONFIG.version),'source balance version or compatible successor');
equals(CONFIG.schemaVersion,31,'save structure unchanged');
equals(KEYS.normal,'kotowari_v31_normal','normal key stable');
equals(KEYS.lab,'kotowari_v31_lab','lab key stable');
equals(CONTENT.sources.length,30,'30 source slots retained');
equals(CONTENT.sources.reduce((n,s)=>n+s.effects.length,0),210,'210 unresolved effect slots retained');
ok(CONTENT.sources.every(s=>s.effects.every(x=>x===null)),'special effects unchanged and unresolved');
equals(cfg.costGrowth,1.35,'per-level 1.35 multiplication');
equals(rates.length,30,'30 rates');equals(prices.length,30,'30 prices');
for(const [i,yieldRate,price] of [[0,'0.1','30'],[1,'0.5','120'],[2,'1','300'],[3,'5','1500'],[4,'25','7500'],[5,'100','30000'],[6,'400','120000'],[7,'1600','480000']]){
 equals(rates[i].cmp(yieldRate),0,`source ${i+1} yield`);
 equals(prices[i].cmp(price),0,`source ${i+1} price`);
}
for(let i=6;i<30;i++){
 near(rates[i],rates[i-1].mul(4),`source ${i+1} yield x4`);
 near(prices[i],prices[i-1].mul(4),`source ${i+1} initial cost x4`);
}
for(let i=0;i<30;i++){
 const id=CONTENT.sources[i].id;
 equals(sourceProductionPerLevel(id).cmp(rates[i]),0,`source ${i+1} in-game unit yield`);
 const payback=prices[i].div(rates[i]).toNumber();
 ok(payback>=240-1e-8 && payback<=300+1e-8,`source ${i+1} initial payback 240~300s`);
}
assert.throws(()=>sourceProductionPerLevel('SOURCE_999'),/源ID/);checks++;
const s=createState(Date.now(),'normal'); s.intro.complete=true;
for(let i=0;i<30;i++){
 const id=CONTENT.sources[i].id; const q=purchaseQuote(s,'source',id,'1');
 near(q.cost,prices[i],`source ${i+1} price quoted lvl0`);
}
ok(A(cfg.perSecondPerLevel.at(-1)).cmp('1e16')>0,'source30 huge-rate support');
s.sources.SOURCE_01.level=1;
equals(production(s).cmp('0.1'),0,'source1 Lv1 0.1 per second');
s.sources.SOURCE_02.level=1;
equals(production(s).cmp('0.6'),0,'source1 + 2 equals 0.6 per second');
s.sources.SOURCE_03.level=2;
equals(production(s).cmp('2.9'),0,'source3 lv2 adds 2.3 per second with exponential level curve');
s.sources.SOURCE_30.level=1;
equals(production(s).cmp(rates[29].add('2.9')),0,'source30 amount and all-tier sum');
s.sources.SOURCE_30.level=0;
for(let i=0;i<30;i++) s.sources[CONTENT.sources[i].id].level=0;
s.orbs='1000000000000000000000000000';
for(let i=0;i<6;i++){
 const id=CONTENT.sources[i].id;
 const q=purchaseQuote(s,'source',id,'1');
 ok(q.enabled,`source ${i+1} can be purchased`);
 const old=sourceProductionPerLevel(id);
 const result=buy(s,'source',id);
 ok(result.ok && s.sources[id].level===1,`source ${i+1} purchased once`);
 ok(production(s).cmp(old)>=0,`source ${i+1} contributes`);
 const next=purchaseQuote(s,'source',id,'1');
 const expected=prices[i].mul('1.35');
 ok(Math.abs(A(next.cost).div(expected).toNumber()-1)<1e-10,`source ${i+1} level2 price is x1.35`);
}
for(const lvl of [0,1,2,5,10,24,25,50,100,1000,1000000]){
 const quoted=seriesCost('30',1.35,lvl,1);
 const expected=A(30).mul(A('1.35').pow(lvl));
 ok(Math.abs(quoted.div(expected).toNumber()-1)<1e-10,`source cost ratio consistent at lvl ${lvl}`);
}
s.orbs='1000000'; s.purchaseMode='10';
const old=s.sources.SOURCE_01.level;
const buyTen=buy(s,'source','SOURCE_01');
ok(buyTen.ok && s.sources.SOURCE_01.level===old+Math.min(10,buyTen.count),'bulk purchase keeps levels');
s.purchaseMode='NEXT';s.orbs='1e1000';
const milestone=CONFIG.confirmed.sourceMilestones.find(x=>x>s.sources.SOURCE_01.level);
const q=purchaseQuote(s,'source','SOURCE_01');
ok(q.enabled && q.count===milestone-s.sources.SOURCE_01.level,'NEXT targets confirmed milestone');
s.purchaseMode='MAX';s.orbs='1000000';
const qm=purchaseQuote(s,'source','SOURCE_02');
equals(qm.count,maxAffordable(s.orbs,prices[1],1.35,s.sources.SOURCE_02.level,CONFIG.confirmed.sourceMaxLevel-s.sources.SOURCE_02.level),'MAX uses geometric sum');
ok(qm.count>=0,'MAX no negative quantities');
const before=A(s.orbs); const rate=production(s);
advance(s,s.lastWall+5000,{offline:false});
ok(A(s.orbs).cmp(before.add(rate.mul('5')))>-1,'5 sec production increases currency');
validateState(s,'normal');checks++;
const restored=decode(encode(s,'source-v36'),'normal');
equals(restored.sources.SOURCE_01.level,s.sources.SOURCE_01.level,'save migration preserves source levels');
equals(restored.version,s.version,'save version preserved');
equals(CONFIG.unresolved.sourceEffectAssignment,null,'source effects not filled in');
equals(CONFIG.unresolved.sourceBreakthroughGate,null,'source breakthrough still unresolved');
console.log(`PASS ${checks} checks — source tiers, balance prices, all levels, MAX/NEXT, incremental/sec, existing save schema`);
