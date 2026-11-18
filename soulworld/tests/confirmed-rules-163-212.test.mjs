import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UNIQUE_CHANCES, UNIQUE_KINDS, STAR_REVELATION_RANGE,
  classifyUniqueRoll, rollUniqueCandidate, validateUniqueAbilitySlots,
  validateStarRevelationBoost, starBoostAffectsSlot,
  GACHA_PITY_LIMIT, HERO_RARITIES, createGachaPityState,
  isNextDrawGuaranteedLegendary, registerGachaDraw,
  BATTLE_DURATION_SECONDS, resolveBattleOutcome
} from '../confirmed-rules-163-212.mjs';
import {SAVE_KEY,createInitialState,serialize,deserialize} from '../core.mjs';

const side=(templeHp,mainBaseHp,main=0,sub=0)=>({
  templeHp, templeMaxHp:100, mainBaseHp, mainBaseMaxHp:200, kills:{main,sub}
});

test('unique chances, ranks and slot-by-slot independent probability thresholds',()=>{
  assert.deepEqual(UNIQUE_CHANCES,{epic:.001,legendary:.0005,mythic:.0001});
  assert.deepEqual(UNIQUE_KINDS,{
    epic:'high-quality-rate',legendary:'high-value-rate',mythic:'star-revelation',
  });
  assert.equal(classifyUniqueRoll(0),'mythic');
  assert.equal(classifyUniqueRoll(.0001),'legendary');
  assert.equal(classifyUniqueRoll(.0006),'epic');
  assert.equal(classifyUniqueRoll(.002),null);
  assert.deepEqual(rollUniqueCandidate(()=>.00001),{
    category:'unique',rarity:'mythic',kind:'star-revelation'
  });
  assert.equal(rollUniqueCandidate(()=>.8),null);
  assert.throws(()=>classifyUniqueRoll(1));
});
test('one unique kind per character; star boost spans 1-50 and affects other slots',()=>{
  const slots=[
    {category:'unique',rarity:'mythic',kind:'star-revelation'},
    {category:'unique',rarity:'epic',kind:'high-quality-rate'},
    {category:'normal',type:'strength',percent:4},
  ];
  assert.equal(validateUniqueAbilitySlots(slots),true);
  assert.throws(()=>validateUniqueAbilitySlots([...slots,slots[0]]));
  assert.deepEqual(STAR_REVELATION_RANGE,{min:1,max:50});
  assert.equal(validateStarRevelationBoost(1),1);
  assert.equal(validateStarRevelationBoost(50),50);
  assert.throws(()=>validateStarRevelationBoost(51));
  assert.equal(starBoostAffectsSlot(0,0,slots),false);
  assert.equal(starBoostAffectsSlot(0,1,slots),true);
  assert.equal(starBoostAffectsSlot(0,2,slots),true);
});
test('100 pulls without legendary cause the 100th pull to guarantee legendary+',()=>{
  assert.equal(GACHA_PITY_LIMIT,100);
  assert.equal(HERO_RARITIES.length,6);
  let pity=createGachaPityState();
  for(let i=0;i<99;i++){
    assert.equal(isNextDrawGuaranteedLegendary(pity),false);
    pity=registerGachaDraw(pity,'common').state;
  }
  assert.equal(isNextDrawGuaranteedLegendary(pity),true);
  const r=registerGachaDraw(pity,'rare');
  assert.equal(r.rarity,'legendary');
  assert.equal(r.wasGuaranteed,true);
  assert.deepEqual(r.state,{pullsSinceLegendary:0});
  assert.equal(registerGachaDraw({pullsSinceLegendary:5},'mythic').state.pullsSinceLegendary,0);
  assert.equal(registerGachaDraw({pullsSinceLegendary:37},'rare').state.pullsSinceLegendary,38);
});
test('destroying both temple and main base wins instantly, one facility alone does not',()=>{
  assert.equal(BATTLE_DURATION_SECONDS,300);
  assert.deepEqual(resolveBattleOutcome({
    ally:side(100,200), enemy:side(0,0), elapsed:19
  }),{result:'ally',reason:'structures-destroyed'});
  assert.equal(resolveBattleOutcome({
    ally:side(100,200),enemy:side(0,200),elapsed:19
  }).result,'ongoing');
  assert.equal(resolveBattleOutcome({
    ally:side(0,0),enemy:side(0,0),elapsed:40
  }).result,'undecided');
});
test('time limit compares each building remaining HP ratio, then only main/sub kills',()=>{
  assert.equal(resolveBattleOutcome({
    ally:side(60,100), enemy:side(50,80), elapsed:300
  }).result,'ally');
  assert.deepEqual(resolveBattleOutcome({
    ally:side(80,40,1,3),enemy:side(40,120,1,2),elapsed:300
  }),{result:'ally',reason:'character-defeats'});
  assert.deepEqual(resolveBattleOutcome({
    ally:side(80,40,1,3), enemy:side(40,120,1,3),elapsed:300
  }),{result:'draw',reason:'full-tie'});
});
test('save key and old player save remain compatible with new independent rules',()=>{
  assert.equal(SAVE_KEY,'soul_world_browser_proto_v001');
  const existing=createInitialState();
  existing.resources.wood=7;
  const saved=serialize(existing);
  const loaded=deserialize(saved,Date.now());
  assert.equal(loaded.resources.wood,7);
  assert.equal(loaded.schema,existing.schema);
});
