import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NORMAL_QUALITY_RATES, GACHA_RARITY_RATES, GACHA_DRAW_COST, GACHA_TEN_PULL_COST,
  REROLL_POINT_COST, BREAKTHROUGH_INCREMENTS, MAX_LOW_RARITY_BONUS_PERCENT,
  REVIVE_INVULNERABILITY_SECONDS, sampleNormalQuality, sampleGachaRarity,
  breakthroughBonusPercent, applyBattleRarityBonus, applyStarRevelation,
  createGachaAccount, drawGacha, rerollWithPoints, advancePaidAutoReroll,
  resolveSimultaneousStructureDestruction
} from '../rules-213-262.mjs';
import {SAVE_KEY,createInitialState,serialize,deserialize} from '../core.mjs';

test('normal quality tiers and rarity odds equal confirmed percentages and sum to 100%',()=>{
  assert.deepEqual(NORMAL_QUALITY_RATES,{low:.6,mid:.3,high:.1});
  assert.deepEqual(GACHA_RARITY_RATES,{common:.50,uncommon:.25,rare:.16,epic:.07,legendary:.018,mythic:.002});
  assert.ok(Math.abs(Object.values(NORMAL_QUALITY_RATES).reduce((a,b)=>a+b,0)-1)<1e-12);
  assert.ok(Math.abs(Object.values(GACHA_RARITY_RATES).reduce((a,b)=>a+b,0)-1)<1e-12);
  assert.equal(sampleNormalQuality(()=>0),'low');
  assert.equal(sampleNormalQuality(()=>.7),'mid');
  assert.equal(sampleNormalQuality(()=>.95),'high');
  assert.equal(sampleGachaRarity(()=>0),'common');
  assert.equal(sampleGachaRarity(()=>.74),'uncommon');
  assert.equal(sampleGachaRarity(()=>.75),'rare');
  assert.equal(sampleGachaRarity(()=>.91),'epic');
  assert.equal(sampleGachaRarity(()=>.98),'legendary');
  assert.equal(sampleGachaRarity(()=>.999),'mythic');
  assert.throws(()=>sampleGachaRarity(()=>1));
});
test('low rarity breakthrough bonuses are applied to final combat stats, not basic attributes',()=>{
  assert.deepEqual(BREAKTHROUGH_INCREMENTS,[.05,.1,.15,.2,.25,.25]);
  assert.deepEqual(MAX_LOW_RARITY_BONUS_PERCENT,{common:10,uncommon:5,rare:2.5});
  assert.equal(breakthroughBonusPercent('common',0),0);
  assert.equal(breakthroughBonusPercent('common',1),.5);
  assert.equal(breakthroughBonusPercent('common',3),3);
  assert.equal(breakthroughBonusPercent('common',6),10);
  assert.equal(breakthroughBonusPercent('uncommon',6),5);
  assert.equal(breakthroughBonusPercent('rare',6),2.5);
  assert.equal(breakthroughBonusPercent('mythic',6),0);
  assert.equal(applyBattleRarityBonus(100,'common',6),110);
  assert.equal(applyBattleRarityBonus(100,'mythic',6),100);
  assert.throws(()=>breakthroughBonusPercent('common',7));
});
test('star revelation enhances a target ability by a multiplicative bonus',()=>{
  assert.equal(applyStarRevelation(10,50),15);
  assert.equal(applyStarRevelation(100,1),101);
  assert.throws(()=>applyStarRevelation(1,51));
});
test('gacha one and ten draws spend same per-pull amount and preserve duplicate material counts',()=>{
  assert.equal(GACHA_DRAW_COST,100);
  assert.equal(GACHA_TEN_PULL_COST,1000);
  const pools=Object.fromEntries(['common','uncommon','rare','epic','legendary','mythic'].map(r=>[r,[{id:'hero-'+r}]]));
  const one=drawGacha(createGachaAccount(1200),1,pools,()=>0);
  assert.equal(one.ok,true);
  assert.equal(one.state.currency,1100);
  assert.deepEqual(one.state.ownedHeroIds,['hero-common']);
  const ten=drawGacha(one.state,10,pools,()=>0);
  assert.equal(ten.state.currency,100);
  assert.equal(ten.results.length,10);
  assert.equal(ten.state.duplicateMaterials['hero-common'],10);
  const denied=drawGacha(ten.state,10,pools,()=>0);
  assert.equal(denied.ok,false);
  assert.deepEqual(denied.state,ten.state);
});
test('100th gacha draw guarantees at least legendary, and pity persists across separate calls',()=>{
  const pools=Object.fromEntries(['common','uncommon','rare','epic','legendary','mythic'].map(r=>[r,[{id:'hero-'+r}]]));
  let account=createGachaAccount(10000);
  for(let i=0;i<9;i++) account=drawGacha(account,10,pools,()=>0).state;
  assert.equal(account.pity.pullsSinceLegendary,90);
  const next=drawGacha(account,10,pools,()=>0);
  assert.equal(next.results[9].rarity,'legendary');
  assert.equal(next.results[9].wasGuaranteed,true);
  assert.equal(next.state.pity.pullsSinceLegendary,0);
  assert.equal(next.state.currency,0);
});
test('all-unlocked reroll costs one point; protected slots unchanged; no negative points',()=>{
  assert.equal(REROLL_POINT_COST,1);
  let original=[{category:'normal',type:'power',quality:'low',percent:2,locked:true},
    {category:'normal',type:'agility',quality:'low',percent:1,locked:false}];
  const out=rerollWithPoints(original,1,()=>({type:'power',quality:'high',percent:8}));
  assert.equal(out.ok,true);assert.equal(out.points,0);
  assert.deepEqual(out.slots[0],original[0]);
  assert.equal(out.slots[1].percent,8);
  assert.equal(original[1].percent,1);
  assert.equal(rerollWithPoints(original,0,()=>{throw Error('must not roll');}).ok,false);
});
test('auto reroll ticks at 2.75s, stops on target or on insufficient points without auto restart',()=>{
  const original=[{type:'speed',quality:'low',percent:2,locked:false}];
  const auto={enabled:true,elapsed:0,rolls:0,targets:[{type:'power',quality:'high',minPercent:10}]};
  const first=advancePaidAutoReroll(original,auto,1,2.75,()=>({type:'power',quality:'high',percent:8}));
  assert.equal(first.points,0);assert.equal(first.auto.rolls,1);assert.equal(first.auto.enabled,true);
  const second=advancePaidAutoReroll(first.slots,first.auto,0,2.75,()=>{throw Error('must not roll');});
  assert.equal(second.auto.enabled,false);
  assert.equal(second.auto.rolls,1);
  const final=advancePaidAutoReroll(second.slots,second.auto,5,20,()=>{throw Error('must not auto restart');});
  assert.equal(final.auto.rolls,1);
  const done=advancePaidAutoReroll(original,auto,1,2.75,()=>({type:'power',quality:'high',percent:10}));
  assert.equal(done.auto.enabled,false);
  assert.equal(done.auto.rolls,1);
});
test('simultaneous destruction and revival invulnerability are explicitly defined',()=>{
  assert.equal(REVIVE_INVULNERABILITY_SECONDS,2);
  assert.deepEqual(resolveSimultaneousStructureDestruction(),{result:'draw',reason:'simultaneous-destruction'});
});
test('current Save Key and old save export/restore unchanged by these pure functions',()=>{
  assert.equal(SAVE_KEY,'soul_world_browser_proto_v001');
  const s=createInitialState();
  s.resources.wood=7;
  s.temple.pending.wood=4;
  const restored=deserialize(serialize(s),Date.now());
  assert.equal(restored.resources.wood,7);
  assert.equal(restored.temple.pending.wood,4);
});
