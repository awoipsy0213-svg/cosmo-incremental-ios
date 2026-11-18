import assert from 'node:assert/strict';
import {A,formatAmount,seriesCost} from '../numbers.mjs';
import {CONFIG} from '../balance-config.mjs';
import {CONTENT} from '../content.mjs';
import {createState,validateState,tapPower,production,sourceProduction,sourceNextGain,buy,buyAll,purchaseQuote,existenceMultiplier,converge,convergenceQuote} from '../game.mjs';
import {encode,decode} from '../save.mjs';
let checks=0;const equal=(x,y,msg)=>{assert.deepEqual(x,y,msg);checks++};const yes=(x,msg)=>{assert.ok(x,msg);checks++};
equal(CONFIG.version,'3.7.0','version');equal(CONFIG.schemaVersion,31,'existing save version');
equal(CONTENT.moment.length,6,'six independent moment upgrade lines');
const cfg=CONFIG.provisional.moment;
const taps=CONTENT.moment.filter(x=>x.id!=='amplify');
equal(taps.map(x=>cfg[x.id].amount),[1,3,9,27,81],'exponential tier increment');
for(const item of CONTENT.moment){yes(item.name.length>0&&cfg[item.id].growth>1,'each moment independent '+item.id)}
const initial=createState(Date.now());initial.intro.complete=true;
for(const x of CONTENT.moment)equal(initial.moment[x.id],0,'independent initial level '+x.id);
// Standard purchase and exponential unit prices.
initial.orbs='100000000';initial.purchaseMode='1';
for(const x of taps){const q=purchaseQuote(initial,'moment',x.id);const old=tapPower(initial);const before=initial.orbs;const bought=buy(initial,'moment',x.id);yes(bought.ok&&initial.moment[x.id]===1,'purchased '+x.id);yes(tapPower(initial).cmp(old)>0,'tap grows '+x.id);yes(A(initial.orbs).cmp(before)<0,'debits wallet '+x.id);const after=purchaseQuote(initial,'moment',x.id);yes(A(after.cost).cmp(q.cost)>0,'growth cost '+x.id);}
equal(tapPower(initial).cmp(1+1+3+9+27+81),0,'all tiers stack correctly');
const oldPower=tapPower(initial);yes(buy(initial,'moment','amplify').ok,'amplify purchase');yes(tapPower(initial).cmp(oldPower)>0,'amplifier increases combined tiers');
const prevSource=sourceProduction(initial,'SOURCE_01');initial.sources.SOURCE_01.level=3;
equal(sourceProduction(initial,'SOURCE_01').cmp('0.399'),0,'source total at lv3 with exponential level increments');
equal(sourceNextGain(initial,'SOURCE_01').cmp('0.2197'),0,'source next increment at Lv3');
// Existence 1 is protected. Only surplus contributes.
initial.surplusExistence='0.02';equal(existenceMultiplier(initial).cmp('1.02'),0,'surplus 0.02 -> x1.02');
equal(sourceProduction(initial,'SOURCE_01').cmp('0.40698'),0,'source total includes bonus');
initial.surplusExistence='1';equal(existenceMultiplier(initial).cmp('2'),0,'surplus 1 -> x2');
const received=validateState(JSON.parse(JSON.stringify(initial)),'normal');
equal(received.moment.tap5,1,'new level preserved');
const legacy=JSON.parse(JSON.stringify(initial));legacy.moment={tap:7,amplify:2};const upgraded=validateState(legacy,'normal');equal(upgraded.moment.tap,7,'old tap preserved');equal(upgraded.moment.amplify,2,'old amplifier preserved');for(const id of ['tap2','tap3','tap4','tap5'])equal(upgraded.moment[id],0,'new tier zero migrated '+id);
const round=decode(encode(initial,'test'),'normal');equal(round.moment.tap5,1,'round-trip new tier');
const fresh=createState(Date.now());fresh.intro.complete=true;fresh.orbs='2000';fresh.settings.bulkOrder='cheap';const beforeBulk=A(fresh.orbs);const bulk=buyAll(fresh,'moment','cheap');yes(bulk.ok&&bulk.count>1,'bulk buys multiple levels');yes(A(fresh.orbs).cmp(beforeBulk)<0,'bulk debits');yes(CONTENT.moment.some(x=>fresh.moment[x.id]>0),'bulk changes tier');
const other=createState(Date.now());other.intro.complete=true;other.orbs='2000';const high=buyAll(other,'moment','expensive');yes(high.ok,'high-price priority works');
yes(JSON.stringify(other.moment)!==JSON.stringify(fresh.moment),'priority direction changes allocation');
const s=createState(Date.now());s.intro.complete=true;s.orbs='12000';const quot=convergenceQuote(s);yes(quot.steps>0,'convergence possible');const result=converge(s);yes(result.ok,'converge');equal(s.surplusExistence,quot.reward,'converge gains surplus');equal(existenceMultiplier(s).cmp(A(1).add(quot.reward)),0,'converge instantly increases rate');
for(const id of CONTENT.moment.map(x=>x.id))equal(s.moment[id],0,'converge resets '+id);
for(const [v,expect] of [['1000000','1,000,000'],['999999','999,999'],['1000001','1.00e6']])equal(formatAmount(v,2,'auto'),expect,'standard number '+v);
equal(formatAmount('1e12',2,'auto'),'1.00e12','no billion suffix');equal(formatAmount('1e12',2,'exponent'),'1.00E+12','uppercase exponent');yes(formatAmount('1e12',2,'zeros').includes('0が12個'),'zeros counter');
console.log('PASS '+checks+' Ver.3.7 Setsuna independent upgrades, bulk purchasing, bonuses, formatting and migration');
