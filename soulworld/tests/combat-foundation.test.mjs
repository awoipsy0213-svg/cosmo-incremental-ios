import test from 'node:test';
import assert from 'node:assert/strict';
import {createStarterHero} from '../hero-progression.mjs';
import {
  calculateBasicCombatStats,calculateHeroCombatStats,combatDisplayStats,
  mitigateDamage,capHitChance,capEvadeChance,recoverRestStamina,
  BASE_HIT_CHANCE,HIT_CHANCE_LIMITS,EVADE_CHANCE_CAP,BASE_STAMINA
} from '../combat-foundation.mjs';

test('Q493-496: 80/20 sqrt formula provides +100 HP at 100 vitality/100 durability',()=>{
 const hero=createStarterHero();
 for(const key of ['vitality','durability','strength','dexterity','magic','intelligence','spirit'])
   hero.attributes[key]=100;
 const stats=calculateBasicCombatStats(hero.attributes);
 assert.equal(stats.hp,200);
 assert.equal(stats.physicalAttack,50);
 assert.equal(stats.physicalDefense,50);
 assert.equal(stats.magicAttack,50);
 assert.equal(stats.magicDefense,50);
});
test('Q347/Q446/Q499: role +10% only for favored final stats before low-rarity bonuses',()=>{
 const h=createStarterHero();
 for(const key of Object.keys(h.attributes)) h.attributes[key]=100;
 h.type='combat';h.rarity='common';h.breakthroughCount=6;
 const out=calculateHeroCombatStats(h);
 assert.ok(Math.abs(out.physicalAttack-60.5)<1e-9);
 assert.equal(out.magicAttack,55);
 h.type='defense';
 const def=calculateHeroCombatStats(h);
 assert.ok(Math.abs(def.hp-242)<1e-9);
 assert.ok(Math.abs(def.physicalDefense-60.5)<1e-9);
 assert.equal(def.physicalAttack,55);
 h.type='support';h.breakthroughCount=0;
 assert.equal(calculateHeroCombatStats(h).magicAttack,55);
});
test('internal float precision is preserved; UI rounds only the final number',()=>{
 const h=createStarterHero();
 h.type='combat';
 const values=combatDisplayStats(h);
 assert.equal(values.physicalAttack.display,Math.round(values.physicalAttack.exact));
 assert.ok(values.physicalAttack.exact>0);
 assert.equal(typeof values.physicalAttack.label,'string');
});
test('Q447/Q450/Q502: physical and magic damage share proportionate armor mitigation',()=>{
 assert.equal(mitigateDamage(100,100),50);
 assert.equal(mitigateDamage(100,0),100);
 assert.equal(mitigateDamage(0,99999),1);
 assert.throws(()=>mitigateDamage(10,-1));
});
test('Q448/Q497 and stamina values: clamp hit to 5-95%, dodge to 70%',()=>{
 assert.equal(BASE_HIT_CHANCE,.75);
 assert.deepEqual(HIT_CHANCE_LIMITS,{min:.05,max:.95});
 assert.equal(EVADE_CHANCE_CAP,.7);
 assert.equal(capHitChance(.99),.95);
 assert.equal(capHitChance(0),.05);
 assert.equal(capEvadeChance(.9),.7);
 assert.equal(BASE_STAMINA,100);
 assert.equal(recoverRestStamina(60,5),85);
 assert.equal(recoverRestStamina(90,10),100);
});
