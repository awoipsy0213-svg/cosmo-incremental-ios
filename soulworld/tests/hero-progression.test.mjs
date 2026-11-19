import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_ABILITY_KEYS, BASE_ABILITY_CAP, SOUL_SKILL_CAP,
  LEVEL_STAT_POINTS, LEVEL_SKILL_POINTS, STARTER_HERO_ID,
  createStarterHero, createHeroProgression, ensureHeroProgression,
  xpNeededForNextAbility, grantAbilityExperience, grantHeroLevelExperience,
  grantHeroActionExperience, allocateStatPoint,
  awardRerollPointsForCollectedXP
} from '../hero-progression.mjs';
import {
  SAVE_KEY, createInitialState, updateGame, addSoul, die,
  collectTemple, serialize, deserialize
} from '../core.mjs';

test('17 basic abilities use cap 1000, shared soul skills cap 100', () => {
  const labels=new Set(BASE_ABILITY_KEYS);
  assert.equal(labels.size,17);
  assert.equal(BASE_ABILITY_CAP,1000);
  assert.equal(SOUL_SKILL_CAP,100);
  const hero=createStarterHero();
  assert.deepEqual(Object.keys(hero.attributes),BASE_ABILITY_KEYS);
  assert.ok(Object.values(hero.attributes).every(n=>n>=1&&n<=5));
  assert.equal(hero.level,1);
});
test('an action gives main attribute 80% and auxiliary 20% XP, lower XP on failure',()=>{
  const hero=createStarterHero();
  const result=grantHeroActionExperience(hero,'wood',10);
  assert.equal(result.ok,true);
  assert.equal(hero.attributeXp.gathering,8);
  assert.equal(hero.attributeXp.strength,2);
  assert.equal(hero.personalMasteryXp.wood,10);
  const failed=createStarterHero();
  const failedResult=grantHeroActionExperience(failed,'wood',10,{success:false});
  assert.equal(failedResult.ok,true);
  assert.equal(failed.attributeXp.gathering,2);
  assert.equal(failed.attributeXp.strength,.5);
  assert.equal(failed.learnedActions.wood,undefined);
  assert.equal(hero.learnedActions.wood,true);
});
test('higher abilities require more XP and growth stops at the cap',()=>{
  assert.ok(xpNeededForNextAbility(100)>xpNeededForNextAbility(10));
  const hero=createStarterHero();
  hero.attributes.strength=999;
  grantAbilityExperience(hero,'strength',100000);
  assert.equal(hero.attributes.strength,1000);
  assert.equal(hero.attributeXp.strength,0);
  assert.equal(grantAbilityExperience(hero,'strength',1000),0);
});
test('each hero level grants three stat points and one skill point',()=>{
  const hero=createStarterHero();
  assert.equal(LEVEL_STAT_POINTS,3);
  assert.equal(LEVEL_SKILL_POINTS,1);
  assert.ok(grantHeroLevelExperience(hero,100)>0);
  assert.ok(hero.freeStatPoints>=3);
  assert.ok(hero.freeSkillPoints>=1);
  const before=hero.attributes.vitality;
  assert.equal(allocateStatPoint(hero,'vitality'),true);
  assert.equal(hero.attributes.vitality,before+1);
});
test('new world contains temple and main shares a stable hero identity',()=>{
  const s=createInitialState();
  assert.equal(s.buildings.filter(b=>b.type==='temple').length,1);
  assert.equal(s.actors.find(a=>a.kind==='main').heroId,STARTER_HERO_ID);
  assert.equal(s.heroProgression.profiles[STARTER_HERO_ID].name,'英雄（試作）');
});
test('main training updates personal XP without battle-mode XP',()=>{
  const s=createInitialState();
  const main=s.actors.find(a=>a.kind==='main');
  main.job='training';
  main.lastSkill='fight';
  main.phase='work';
  main.timer=0;
  updateGame(s,1);
  const hero=s.heroProgression.profiles[STARTER_HERO_ID];
  assert.ok(hero.personalMasteryXp.fight>0);
  assert.ok(hero.attributeXp.strength>0);
});
test('main death sends identity to temple, blocks automatic respawn, and collection revives same hero',()=>{
  const s=createInitialState();
  const first=s.actors.find(a=>a.kind==='main');
  const originalId=first.heroId;
  const hero=s.heroProgression.profiles[originalId];
  grantHeroActionExperience(hero,'wood',100);
  const before=hero.attributes.gathering;
  addSoul(first,'wood',10);
  assert.equal(die(s,first,'寿命'),true);
  assert.equal(hero.status,'pending_soul');
  assert.deepEqual(s.heroProgression.pendingSouls,[originalId]);
  for(let i=0;i<30;i++)updateGame(s,1);
  assert.equal(s.actors.filter(a=>a.kind==='main').length,0);
  assert.equal(collectTemple(s),10);
  const second=s.actors.find(a=>a.kind==='main');
  assert.ok(second);
  assert.equal(second.heroId,originalId);
  assert.equal(s.heroProgression.profiles[originalId].attributes.gathering,before);
  assert.equal(hero.status,'alive');
  assert.equal(hero.lifeCount,2);
  assert.equal(collectTemple(s),0);
  assert.equal(s.actors.filter(a=>a.kind==='main').length,1);
});
test('hero also recovers when no shared XP was earned',()=>{
  const s=createInitialState();
  const main=s.actors[0];
  die(s,main,'寿命');
  assert.equal(collectTemple(s),0);
  assert.equal(s.actors.filter(a=>a.kind==='main').length,1);
});
test('collected soul XP yields one reroll point per ten with carry',()=>{
  const s=createInitialState();
  assert.equal(awardRerollPointsForCollectedXP(s,7),0);
  assert.equal(awardRerollPointsForCollectedXP(s,7),1);
  assert.equal(s.progressionEconomy.rerollPoints,1);
  assert.equal(s.progressionEconomy.rerollXpCarry,4);
});
test('save and restore keeps learned actions, pending identity, XP and original save key',()=>{
  assert.equal(SAVE_KEY,'soul_world_browser_proto_v001');
  const s=createInitialState();
  const hero=s.heroProgression.profiles[STARTER_HERO_ID];
  grantHeroActionExperience(hero,'wood',30);
  const original=s.actors[0];
  die(s,original,'寿命');
  const restored=deserialize(serialize(s));
  const reHero=restored.heroProgression.profiles[STARTER_HERO_ID];
  assert.equal(reHero.status,'pending_soul');
  assert.deepEqual(reHero.learnedActions,hero.learnedActions);
  assert.equal(reHero.attributes.gathering,hero.attributes.gathering);
  assert.equal(restored.actors.filter(a=>a.kind==='main').length,0);
  collectTemple(restored);
  assert.equal(restored.actors.filter(a=>a.kind==='main').length,1);
});
test('old schema 1 save receives only missing fields and a temple without losing resources',()=>{
  const s=createInitialState();
  s.resources.stone=7;
  s.temple.pending.wood=9;
  delete s.heroProgression;
  delete s.progressionEconomy;
  s.actors.forEach(a=>delete a.heroId);
  s.buildings=s.buildings.filter(b=>b.type!=='temple');
  const old=serialize(s);
  const restored=deserialize(old);
  assert.equal(restored.resources.stone,7);
  assert.equal(restored.temple.pending.wood,9);
  assert.equal(restored.buildings.filter(b=>b.type==='temple').length,1);
  assert.equal(restored.heroProgression.profiles[STARTER_HERO_ID].level,1);
  assert.equal(restored.actors[0].heroId,STARTER_HERO_ID);
  assert.equal(deserialize(serialize(restored)).buildings.filter(b=>b.type==='temple').length,1);
});

test('no individual hero XP in exploration stage, but life progression remains',()=>{
  const s=createInitialState();
  const hero=s.heroProgression.profiles[STARTER_HERO_ID];
  s.stage='explore';
  const main=s.actors[0];
  const t=s.exploreTiles.find(q=>q.feature==='tree'&&q.quantity>0);
  main.job='wood';
  main.lastSkill='wood';
  main.phase='work';
  main.target={x:t.x,z:t.z};
  main.timer=0;
  const before=JSON.stringify(hero.attributeXp);
  const levelBefore=hero.levelXp;
  updateGame(s,1);
  assert.equal(JSON.stringify(hero.attributeXp),before);
  assert.equal(hero.levelXp,levelBefore);
});
