import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,serialize,deserialize,die,collectTemple,gotoStage,validateHeroSavePayload} from '../core.mjs';
import {createStarterHero,STARTER_HERO_ID} from '../hero-progression.mjs';
import {
  MAX_HERO_HOUSES,MAX_REGISTERED_HEROES,builtHeroHouses,ensureHeroRoster,
  heroRosterRows,assignHeroHouse,toggleHeroDeployment,registeredHeroIds
} from '../hero-roster.mjs';

function addTestHero(world,id){
  const hero=createStarterHero();
  hero.id=id;hero.name='検証用の英雄 '+id;
  hero.status='ready';
  world.heroProgression.profiles[id]=hero;
  return hero;
}
function addTestHouse(world,id,x,z){
  world.buildings.push({id,type:'heroHouse',x,z,progress:1,hp:60});
}
test('initial distribution gives one common starter, one built hero house and one registered hero',()=>{
  const s=createInitialState();
  assert.equal(MAX_HERO_HOUSES,3);
  assert.equal(MAX_REGISTERED_HEROES,3);
  assert.equal(builtHeroHouses(s).length,1);
  assert.deepEqual(registeredHeroIds(s),[STARTER_HERO_ID]);
  const rows=heroRosterRows(s);
  assert.equal(rows.lockedHouses,2);
  assert.equal(rows.standby.length,0);
  assert.equal(rows.houses[0].hero.id,STARTER_HERO_ID);
});
test('multiple house assignments reject duplicates, support standby and 1-3 registrations',()=>{
  const s=createInitialState();
  addTestHouse(s,5,2,1);
  addTestHouse(s,6,0,2);
  addTestHero(s,'hero-b');
  addTestHero(s,'hero-c');
  addTestHero(s,'hero-d');
  assert.equal(assignHeroHouse(s,'hero-b',5).ok,true);
  assert.equal(assignHeroHouse(s,'hero-c',6).ok,true);
  assert.equal(toggleHeroDeployment(s,'hero-b').deployed,true);
  assert.equal(toggleHeroDeployment(s,'hero-c').deployed,true);
  assert.deepEqual(registeredHeroIds(s),['starter-hero','hero-b','hero-c']);
  assert.equal(heroRosterRows(s).standby.length,1);
  const r=assignHeroHouse(s,'hero-d',5);
  assert.equal(r.ok,true);
  assert.equal(r.displaced,'hero-b');
  const roster=ensureHeroRoster(s);
  assert.equal(roster.deployments.includes('hero-b'),false);
  assert.equal(heroRosterRows(s).standby.some(h=>h.id==='hero-b'),true);
  assert.equal(Object.values(roster.assignments).length,new Set(Object.values(roster.assignments)).size);
  assert.deepEqual(registeredHeroIds(s),['starter-hero','hero-c']);
  assert.equal(toggleHeroDeployment(s,'hero-d').deployed,true);
  assert.equal(toggleHeroDeployment(s,'hero-d').deployed,false);
});
test('unbuilt houses or non-owned heroes cannot be assigned, and switching is base-only',()=>{
  const s=createInitialState();
  const id=builtHeroHouses(s)[0].id;
  assert.equal(assignHeroHouse(s,'nonexistent',id).ok,false);
  assert.equal(assignHeroHouse(s,STARTER_HERO_ID,99).ok,false);
  addTestHero(s,'hero-b');
  s.stage='explore';
  assert.equal(assignHeroHouse(s,'hero-b',id).reason,'base-only');
  assert.equal(toggleHeroDeployment(s,STARTER_HERO_ID).reason,'base-only');
  s.stage='base';
  assert.equal(toggleHeroDeployment(s,STARTER_HERO_ID).reason,'one-hero-required');
});
test('pending hero gives a temporary place to another hero and recovers as standby',()=>{
  const s=createInitialState();
  const id=builtHeroHouses(s)[0].id;
  const a=s.actors.find(a=>a.kind==='main');
  addTestHero(s,'hero-b');
  die(s,a,'寿命');
  assert.equal(registeredHeroIds(s).length,0);
  const r=assignHeroHouse(s,'hero-b',id);
  assert.equal(r.ok,true);
  assert.equal(r.displaced,STARTER_HERO_ID);
  assert.equal(toggleHeroDeployment(s,'hero-b').deployed,true);
  collectTemple(s);
  assert.equal(s.heroProgression.profiles[STARTER_HERO_ID].status,'ready');
  assert.equal(heroRosterRows(s).standby.some(h=>h.id===STARTER_HERO_ID),true);
  assert.deepEqual(s.actors.filter(a=>a.kind==='main').map(a=>a.heroId),['hero-b']); // displaced starter remains on standby
});
test('combat mock receives registered IDs as an informational snapshot, not extra actors',()=>{
  const s=createInitialState();
  gotoStage(s,'battle');
  assert.deepEqual(s.battle.plannedHeroIds,[STARTER_HERO_ID]);
  assert.equal(s.actors.filter(a=>a.kind==='main').length,1);
});
test('old schema 1 saves migrate additively and do not lose worlds or souls',()=>{
  const s=createInitialState();
  s.resources.wood=9;
  s.temple.pending.stone=7;
  delete s.heroRoster;
  delete s.saveFormatRevision;
  const r=deserialize(serialize(s));
  assert.equal(r.saveFormatRevision,4);
  assert.equal(r.resources.wood,9);
  assert.equal(r.temple.pending.stone,7);
  assert.deepEqual(registeredHeroIds(r),[STARTER_HERO_ID]);
  assert.equal(deserialize(serialize(r)).heroRoster.deployments.length,1);
});
test('reject malformed hero payloads rather than silently replacing or deleting them',()=>{
  const s=createInitialState();
  const raw=JSON.parse(serialize(s));
  raw.state.heroProgression.profiles[STARTER_HERO_ID].attributes.strength=5000;
  assert.throws(()=>deserialize(JSON.stringify(raw)),/英雄能力値が不正/);
  raw.state.heroProgression.profiles[STARTER_HERO_ID].attributes.strength=1;
  raw.state.heroProgression.profiles[STARTER_HERO_ID].id='mismatched-id';
  assert.throws(()=>deserialize(JSON.stringify(raw)),/識別情報/);
  raw.state.heroProgression.profiles[STARTER_HERO_ID]=null;
  assert.throws(()=>validateHeroSavePayload(raw.state),/識別情報/);
});

test('malformed persisted roster identities are rejected without deleting hero data',()=>{
  const s=createInitialState();
  const raw=JSON.parse(serialize(s));
  raw.state.heroRoster.assignments['2']='missing-hero';
  assert.throws(()=>deserialize(JSON.stringify(raw)),/英雄編成の識別情報が不正/);
});
