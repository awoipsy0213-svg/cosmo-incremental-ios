import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,updateGame,synchronizeHeroActors,serialize,deserialize,
  die,collectTemple
} from '../core.mjs';
import {
  createStarterHero,STARTER_HERO_ID,grantExplorationBasicAbilityExperience,
  EXPLORATION_ABILITY_ACTIONS
} from '../hero-progression.mjs';
import {
  assignHeroHouse,toggleHeroDeployment,heroRosterRows,
  HERO_HOUSE_UNLOCKS,nextHeroHouseUnlock
} from '../hero-roster.mjs';

function addHero(world,id,level=1){
  const hero=createStarterHero();
  hero.id=id;hero.name='テスト英雄 '+id;hero.level=level;hero.status='ready';
  world.heroProgression.profiles[id]=hero;
  return hero;
}
function addHouse(world,id,x,z){
  world.buildings.push({id,type:'heroHouse',x,z,progress:1,hp:60});
}
test('second and third house unlock ranks and resource costs match confirmed rules',()=>{
  const s=createInitialState();
  assert.deepEqual(HERO_HOUSE_UNLOCKS.map(x=>[x.rank,x.costs.wood,x.costs.stone]),
    [[1,0,0],[2,50,30],[4,150,100]]);
  const next=nextHeroHouseUnlock(s);
  assert.equal(next.rank,2);
  assert.equal(next.available,false);
  assert.equal(next.rankMet,false);
});
test('three assigned named heroes act concurrently with separate XP and lifetimes',()=>{
  const s=createInitialState();
  addHouse(s,5,0,1);
  addHouse(s,6,4,1);
  const b=addHero(s,'hero-b');
  const c=addHero(s,'hero-c');
  assert.equal(assignHeroHouse(s,'hero-b',5).ok,true);
  assert.equal(assignHeroHouse(s,'hero-c',6).ok,true);
  synchronizeHeroActors(s);
  const actors=s.actors.filter(a=>a.kind==='main');
  assert.deepEqual(new Set(actors.map(a=>a.heroId)),new Set([STARTER_HERO_ID,'hero-b','hero-c']));
  assert.equal(actors.length,3);
  for(const a of actors){
    a.phase='work';
    a.job='training';
    a.lastSkill='fight';
    a.timer=0;
  }
  updateGame(s,1);
  for(const id of [STARTER_HERO_ID,'hero-b','hero-c']){
    assert.ok(s.heroProgression.profiles[id].levelXp>0);
    assert.ok(s.actors.find(a=>a.heroId===id).remaining<300);
  }
  assert.notEqual(s.actors.find(a=>a.heroId===STARTER_HERO_ID).id,
    s.actors.find(a=>a.heroId==='hero-b').id);
  assert.equal(b.levelXp,c.levelXp);
  const restored=deserialize(serialize(s));
  assert.equal(restored.actors.filter(a=>a.kind==='main').length,3);
});
test('house swap pauses lifetime, personal growth and per-life memory without soul collection',()=>{
  const s=createInitialState();
  const standby=addHero(s,'hero-b');
  const starter=s.heroProgression.profiles[STARTER_HERO_ID];
  const first=s.actors.find(a=>a.kind==='main');
  first.remaining=123;
  first.age=177;
  first.soul={wood:17};
  first.lifeMemory={attempts:[{action:'wood',success:false,time:10}],dangerWarnings:{fire:0.6},walking:{attempts:4,stage:0}};
  starter.attributes.strength=19;
  assert.equal(assignHeroHouse(s,'hero-b',2).ok,true);
  synchronizeHeroActors(s);
  assert.equal(starter.status,'ready');
  assert.equal(starter.fieldLife.remaining,123);
  assert.equal(starter.fieldLife.age,177);
  assert.equal(starter.fieldLife.soul.wood,17);
  assert.deepEqual(s.actors.filter(a=>a.kind==='main').map(a=>a.heroId),['hero-b']);
  for(let i=0;i<12;i++)updateGame(s,1);
  assert.equal(starter.fieldLife.remaining,123);
  assert.equal(starter.attributes.strength,19);
  assert.equal(standby.status,'alive');
  assert.equal(assignHeroHouse(s,STARTER_HERO_ID,2).ok,true);
  synchronizeHeroActors(s);
  const returned=s.actors.find(a=>a.heroId===STARTER_HERO_ID);
  assert.equal(returned.remaining,123);
  assert.equal(returned.age,177);
  assert.equal(returned.soul.wood,17);
  assert.equal(returned.lifeMemory.attempts.length,1);
  assert.equal(standby.status,'ready');
  assert.ok(standby.fieldLife.remaining<300);
  const restored=deserialize(serialize(s));
  assert.equal(restored.actors.find(a=>a.heroId===STARTER_HERO_ID).soul.wood,17);
  assert.equal(restored.heroProgression.profiles['hero-b'].fieldLife.remaining,standby.fieldLife.remaining);
});
test('unassigned hero becomes standby if their house is destroyed or removed',()=>{
  const s=createInitialState();
  const old=s.actors.find(a=>a.kind==='main');
  old.remaining=79;
  s.buildings=s.buildings.filter(b=>b.type!=='heroHouse');
  synchronizeHeroActors(s);
  assert.equal(s.actors.filter(a=>a.kind==='main').length,0);
  const hero=s.heroProgression.profiles[STARTER_HERO_ID];
  assert.equal(hero.status,'ready');
  assert.equal(hero.fieldLife.remaining,79);
  assert.equal(hero.attributes.vitality,2);
});
test('exploration survey earns relevant basic XP only; level XP and mastery remain unchanged',()=>{
  const s=createInitialState();
  const hero=s.heroProgression.profiles[STARTER_HERO_ID];
  assert.deepEqual(EXPLORATION_ABILITY_ACTIONS,['survey','swim']);
  assert.equal(grantExplorationBasicAbilityExperience(hero,'wood',10).ok,false);
  const beforeLevel=hero.levelXp,beforeMastery=JSON.stringify(hero.personalMasteryXp);
  s.stage='explore';
  const a=s.actors.find(x=>x.kind==='main');
  a.x=0.5;a.z=0.5;
  a.job='survey';a.phase='work';a.lastSkill='swim';a.timer=0;
  updateGame(s,1);
  assert.ok(hero.attributeXp.exploration>0||hero.attributeXp.stamina>0);
  assert.equal(hero.levelXp,beforeLevel);
  assert.equal(JSON.stringify(hero.personalMasteryXp),beforeMastery);
});
test('pending souls remain pending and recovered assigned heroes keep identity; unassigned ones wait',()=>{
  const s=createInitialState();
  addHero(s,'hero-b');
  const first=s.actors[0];
  die(s,first,'寿命');
  assert.equal(s.heroProgression.profiles[STARTER_HERO_ID].status,'pending_soul');
  assignHeroHouse(s,'hero-b',2);
  synchronizeHeroActors(s);
  assert.deepEqual(s.actors.filter(a=>a.kind==='main').map(a=>a.heroId),['hero-b']);
  collectTemple(s);
  assert.equal(s.heroProgression.profiles[STARTER_HERO_ID].status,'ready');
  assert.equal(heroRosterRows(s).standby[0].id,STARTER_HERO_ID);
  assert.equal(s.actors.filter(a=>a.kind==='main').length,1);
});
test('v2 save migrates to v3 additively without changing legacy key or collapsing distinct profiles',()=>{
  const s=createInitialState();
  addHero(s,'hero-b');
  s.resources.stone=8;
  s.saveFormatRevision=2;
  delete s.heroProgression.profiles['hero-b'].fieldLife;
  const restored=deserialize(serialize(s));
  assert.equal(restored.saveFormatRevision,3);
  assert.equal(restored.resources.stone,8);
  assert.equal(restored.heroProgression.profiles['hero-b'].name,'テスト英雄 hero-b');
  assert.equal(restored.heroProgression.profiles['hero-b'].fieldLife,null);
});
