import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_ABILITY_KEYS, BASE_ABILITY_CAP, SOUL_SKILL_CAP,
  LEVEL_STAT_POINTS, LEVEL_SKILL_POINTS, STARTER_HERO_ID,
  createStarterHero, createHeroProgression, ensureHeroProgression,
  xpNeededForNextAbility, grantAbilityExperience, grantHeroLevelExperience,
  grantHeroActionExperience, allocateStatPoint,
  awardRerollPointsForCollectedXP,
  HERO_LEVEL_CAP, ACTION_SUCCESS_REQUIREMENT, LIFE_ATTEMPT_HISTORY_CAP,
  BASE_ACTION_XP, FAILED_ACTION_XP_FACTOR,
  createLifeMemory, ensureLifeMemory, recordLifeAttempt,recordWalkAttempt,
  recordDangerWarning,fadeLifeDangerWarnings,recordHeroWalkProgress
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
  assert.equal(hero.learnedActions.wood,undefined);
  grantHeroActionExperience(hero,'wood',10);
  assert.equal(hero.learnedActions.wood,undefined);
  grantHeroActionExperience(hero,'wood',10);
  assert.equal(hero.learnedActions.wood,true);
  assert.equal(hero.actionSuccessCounts.wood,3);
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


test('level cap 200, smooth XP growth, baseline 10 and failure 25%, limit difficulty range',()=>{
  assert.equal(HERO_LEVEL_CAP,200);
  assert.equal(BASE_ACTION_XP,10);
  assert.equal(FAILED_ACTION_XP_FACTOR,.25);
  const hero=createStarterHero();
  grantHeroLevelExperience(hero,1e10);
  assert.equal(hero.level,200);
  assert.equal(hero.levelXp,0);
  const p=hero.freeStatPoints;
  assert.equal(grantHeroLevelExperience(hero,100),0);
  assert.equal(hero.freeStatPoints,p);
  const h=createStarterHero();
  grantHeroActionExperience(h,'wood',10,{difficulty:3});
  assert.equal(h.attributeXp.gathering,16); // 10 XP * max 2.0 * 80%
  const f=createStarterHero();
  grantHeroActionExperience(f,'wood',10,{difficulty:0.1,success:false});
  assert.equal(f.attributeXp.gathering,1); // 10 * min 0.5 * 0.25 * 80%
});
test('training action is learned after 3 successes, failed actions do not count',()=>{
  assert.equal(ACTION_SUCCESS_REQUIREMENT,3);
  const h=createStarterHero();
  for(let i=0;i<2;i++)grantHeroActionExperience(h,'food',10);
  grantHeroActionExperience(h,'food',10,{success:false});
  assert.equal(h.learnedActions.food,undefined);
  assert.equal(h.actionSuccessCounts.food,2);
  grantHeroActionExperience(h,'food',10);
  assert.equal(h.learnedActions.food,true);
  assert.equal(h.actionSuccessCounts.food,3);
});
test('migrate old acquired learned flags without removing achievements',()=>{
  const s=createInitialState();
  const h=s.heroProgression.profiles[STARTER_HERO_ID];
  h.learnedActions.food=true;
  delete h.actionSuccessCounts;
  ensureHeroProgression(s);
  assert.equal(h.actionSuccessCounts.food,3);
  assert.equal(h.learnedActions.food,true);
});
test('life attempts keep at most 20 and danger warnings fade, life memory is separate from soul',()=>{
  assert.equal(LIFE_ATTEMPT_HISTORY_CAP,20);
  const actor={lifeMemory:createLifeMemory()};
  for(let i=0;i<40;i++)recordLifeAttempt(actor,'walk',i%2===0,i);
  assert.equal(actor.lifeMemory.attempts.length,20);
  assert.equal(actor.lifeMemory.attempts[0].time,20);
  const a=recordDangerWarning(actor,'river',1);
  assert.equal(a,1);
  fadeLifeDangerWarnings(actor,60,1/120);
  assert.equal(actor.lifeMemory.dangerWarnings.river,.5);
  fadeLifeDangerWarnings(actor,120,1/120);
  assert.equal(actor.lifeMemory.dangerWarnings.river,undefined);
  const fresh=ensureLifeMemory({lifeMemory:{}});
  assert.deepEqual(fresh.attempts,[]);
  assert.deepEqual(fresh.dangerWarnings,{});
});
test('five stages of walking practice spread over approx 30 attempts',()=>{
  const actor={lifeMemory:createLifeMemory()};
  for(let i=0;i<30;i++){
    const stage=recordWalkAttempt(actor,true,i);
    assert.equal(stage,Math.min(5,Math.floor((i+1)/6)));
  }
  assert.equal(actor.lifeMemory.walking.stage,5);
  assert.equal(actor.lifeMemory.walking.attempts,30);
});
test('after death and collection a newly spawned actor has no detailed life history',()=>{
  const s=createInitialState();
  const a=s.actors.find(x=>x.kind==='main');
  const h=s.heroProgression.profiles[STARTER_HERO_ID];
  recordLifeAttempt(a,'swim',false,17);
  recordDangerWarning(a,'water',1);
  grantHeroActionExperience(h,'wood',10);
  die(s,a,'寿命');
  collectTemple(s);
  const next=s.actors.find(x=>x.kind==='main');
  assert.notEqual(next.id,a.id);
  assert.equal(next.heroId,a.heroId);
  assert.deepEqual(ensureLifeMemory(next).attempts,[]);
  assert.equal(h.actionSuccessCounts.wood,1);
});


test('hero walking proficiency has five milestones in 30 attempts and persists across lives',()=>{
  const s=createInitialState();
  const hero=s.heroProgression.profiles[STARTER_HERO_ID];
  const first=s.actors.find(a=>a.kind==='main');
  for(let i=0;i<30;i++){
    assert.equal(recordHeroWalkProgress(hero,true),Math.min(5,Math.floor((i+1)/6)));
  }
  assert.equal(hero.walkPracticeCount,30);
  assert.equal(hero.walkStage,5);
  assert.equal(hero.learnedActions.walk,true);
  die(s,first,'寿命');
  collectTemple(s);
  const next=s.actors.find(a=>a.kind==='main');
  assert.equal(hero.walkStage,5);
  assert.equal(hero.walkPracticeCount,30);
  assert.deepEqual(next.lifeMemory.attempts,[]);
});
test('main field travel records walking attempts and action success separately',()=>{
  const s=createInitialState();
  const a=s.actors.find(x=>x.kind==='main');
  const hero=s.heroProgression.profiles[STARTER_HERO_ID];
  a.target={x:a.x,z:a.z};
  a.phase='move';
  updateGame(s,1);
  assert.equal(hero.walkPracticeCount,1);
  assert.equal(a.lifeMemory.walking.attempts,1);
  assert.equal(a.lifeMemory.attempts.at(-1).action,'walk');
});
