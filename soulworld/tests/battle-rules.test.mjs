import test from 'node:test';
import assert from 'node:assert/strict';
import {BATTLE_LIMIT_SECONDS,MANA_MAX,createBattleManaState,addBattleMana,advanceBattleMana,manaForEnemyDefeat,nextMainReviveCost,canReviveMain,spendForMainRevive} from '../battle-rules.mjs';

test('five minute battle, zero starting mana, regeneration every 2 seconds', () => {
  const b=createBattleManaState();
  assert.equal(BATTLE_LIMIT_SECONDS,300);
  assert.equal(b.mana,0);
  advanceBattleMana(b,1.5);
  assert.equal(b.mana,0);
  advanceBattleMana(b,.5);
  assert.equal(b.mana,1);
  advanceBattleMana(b,198);
  assert.equal(b.mana,MANA_MAX);
});
test('kills grant confirmed mana amounts without exceeding 100', () => {
  const b=createBattleManaState();
  manaForEnemyDefeat(b,'sub');
  manaForEnemyDefeat(b,'main');
  manaForEnemyDefeat(b,'summon');
  assert.equal(b.mana,26);
  addBattleMana(b,1000);
  assert.equal(b.mana,100);
});
test('main revive waits 20s and spends shared increasing mana',()=>{
  const b=createBattleManaState();
  addBattleMana(b,100);
  assert.equal(canReviveMain(b,19.9,true),false);
  assert.equal(canReviveMain(b,20,false),false);
  assert.equal(spendForMainRevive(b,20,true),true);
  assert.equal(b.mana,80);
  assert.equal(nextMainReviveCost(b),30);
  assert.equal(spendForMainRevive(b,20,true),true);
  assert.equal(b.mana,50);
  for(let i=0;i<12;i++)b.reviveCount++;
  assert.equal(nextMainReviveCost(b),100);
  assert.equal(spendForMainRevive(b,20,true),false);
});
