import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ABILITY_SLOTS, AUTO_REROLL_INTERVAL_SECONDS,
  NORMAL_ABILITY_RANGES, unlockedAbilitySlots, assertNormalAbility,
  unlockAbilitySlot, setAbilitySlotLock, rerollUnlockedAbilitySlots,
  meetAutoRerollTargets, advanceAutoReroll
} from '../ability-rules.mjs';
const first = () => ({type:'strength', quality:'low', percent:2});
const second = () => ({type:'agility', quality:'high', percent:8});

test('six breakthroughs unlock at most six ability slots; each unlock receives an ability', () => {
  assert.equal(MAX_ABILITY_SLOTS,6);
  for(let i=0;i<=9;i++)assert.equal(unlockedAbilitySlots(i),Math.min(6,i));
  let slots=[];
  for(let i=0;i<6;i++)slots=unlockAbilitySlot(slots,first);
  assert.equal(slots.length,6);
  assert.ok(slots.every(x=>x.type==='strength'&&x.percent===2&&!x.locked));
  assert.equal(unlockAbilitySlot(slots,second).length,6);
});
test('ordinary ability ranks have the three confirmed overlapping value bands', () => {
  assert.deepEqual(NORMAL_ABILITY_RANGES.low,{min:1,max:4});
  assert.deepEqual(NORMAL_ABILITY_RANGES.mid,{min:3,max:6});
  assert.deepEqual(NORMAL_ABILITY_RANGES.high,{min:5,max:10});
  for(const quality of ['low','mid','high']){
    assertNormalAbility({type:'str',quality,percent:NORMAL_ABILITY_RANGES[quality].min});
    assertNormalAbility({type:'str',quality,percent:NORMAL_ABILITY_RANGES[quality].max});
  }
  assert.throws(()=>assertNormalAbility({type:'str',quality:'high',percent:11}));
});
test('full reroll preserves any number of locked abilities and replaces unlocked ones', () => {
  let slots=[first(),first(),first(),first()].map(x=>({...x,locked:false}));
  slots=setAbilitySlotLock(slots,0,true);
  slots=setAbilitySlotLock(slots,1,true);
  slots=setAbilitySlotLock(slots,2,true);
  const rolled=rerollUnlockedAbilitySlots(slots,second);
  assert.deepEqual(rolled.slice(0,3),slots.slice(0,3));
  assert.equal(rolled[3].type,'agility');
  assert.equal(slots[3].type,'strength');
  assert.equal(setAbilitySlotLock(rolled,2,false)[2].locked,false);
});
test('auto-reroll operates every 2.75 seconds and stops at target',()=>{
  assert.equal(AUTO_REROLL_INTERVAL_SECONDS,2.75);
  let rolls=0;
  const roll=()=>{rolls++;return rolls>=2?second():first()};
  const auto={enabled:true,elapsed:0,rolls:0,targets:[{type:'agility',quality:'high',minPercent:8}]};
  const initial=[first()];
  const a=advanceAutoReroll(initial,auto,2.7,roll);
  assert.equal(a.auto.rolls,0);
  const b=advanceAutoReroll(a.slots,a.auto,.05,roll);
  assert.equal(b.auto.rolls,1);
  const c=advanceAutoReroll(b.slots,b.auto,2.75,roll);
  assert.equal(c.auto.rolls,2);
  assert.equal(c.auto.enabled,false);
  assert.equal(meetAutoRerollTargets(c.slots,auto.targets),true);
  assert.equal(advanceAutoReroll(c.slots,c.auto,25,roll).auto.rolls,2);
});
test('no reroll is performed when every slot is locked',()=>{
  const slots=[{...first(),locked:true}];
  const result=advanceAutoReroll(slots,{enabled:true,elapsed:0,rolls:0,targets:[]},20,()=>{throw Error('should not roll')});
  assert.deepEqual(result.slots,slots);
  assert.equal(result.auto.rolls,0);
});
