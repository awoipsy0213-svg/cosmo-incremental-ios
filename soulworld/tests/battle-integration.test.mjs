import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState, gotoStage, updateGame} from '../core.mjs';

test('prototype battle starts with zero mana and regenerates at the agreed pace', () => {
  const s=createInitialState();
  gotoStage(s,'battle');
  assert.equal(s.battle.mana,0);
  updateGame(s,1);
  assert.equal(s.battle.mana,0);
  updateGame(s,1);
  assert.equal(s.battle.mana,1);
  assert.equal(s.battle.elapsed,2);
});
test('prototype battle reaches its 300 second time limit', () => {
  const s=createInitialState();
  gotoStage(s,'battle');
  // Keep the mock HP pools above simulated damage so the timer decides.
  s.battle.enemyHp=Number.MAX_VALUE;
  s.battle.allyHp=Number.MAX_VALUE;
  for(let i=0;i<299;i++)updateGame(s,1);
  assert.equal(s.battle.won,null);
  updateGame(s,1);
  assert.equal(s.battle.elapsed,300);
  assert.equal(s.battle.won,false);
});
