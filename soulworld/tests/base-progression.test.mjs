import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,serialize,deserialize,reserveBuild,updateGame,cap,SAVE_KEY} from '../core.mjs';
import {builtHeroHouses,nextHeroHouseUnlock} from '../hero-roster.mjs';
import {needsHeroLearningMigration} from '../save-migration.mjs';
import {
  BASE_RANK_THRESHOLDS,CONFIRMED_RANK_THRESHOLDS,BASE_MAP_SIZES,
  PROVISIONAL_BUILDING_XP,WAREHOUSE_CAPACITIES,rankForBaseXp,
  mapSizeForBaseRank,storageCapacityFromLevel,ensureBaseProgression,
  awardBaseXp,growBaseGridPreservingTiles,previewNextWarehouseCapacity
} from '../base-progression.mjs';

test('initial playable grid is 10x10 and retains exact legacy 5x5 locations',()=>{
  const s=createInitialState();
  assert.equal(SAVE_KEY,'soul_world_browser_proto_v001');
  assert.equal(s.schema,1);
  assert.equal(s.saveFormatRevision,4);
  assert.equal(s.baseRank,1);
  assert.equal(s.baseXp,0);
  assert.equal(s.mapSize,10);
  assert.equal(s.tiles.length,100);
  assert.equal(s.buildings.find(b=>b.type==='mainTown').x,1);
  assert.equal(s.buildings.find(b=>b.type==='heroHouse').z,3);
  assert.equal(s.buildings.find(b=>b.type==='temple').x,2);
  assert.equal(s.actors.filter(a=>a.kind==='main').length,1);
  assert.ok(s.tiles.some(t=>t.x===9&&t.z===9));
});
test('legacy 5x5 JSON expands additively and never shifts resources, buildings or hero positions',()=>{
  const old=createInitialState();
  old.tiles=old.tiles.filter(t=>t.x<5&&t.z<5);
  old.tiles.find(t=>t.x===0&&t.z===0).quantity=2;
  old.resources.wood=9;
  old.heroProgression.profiles['starter-hero'].attributes.strength=24;
  const oldMain=old.actors.find(a=>a.kind==='main');
  const where=[oldMain.x,oldMain.z];
  delete old.baseXp;delete old.baseRank;delete old.mapSize;delete old.warehouseLevel;
  old.saveFormatRevision=3;
  const before=serialize(old);
  assert.equal(needsHeroLearningMigration(before),true);
  const migrated=deserialize(before);
  assert.equal(migrated.mapSize,10);
  assert.equal(migrated.tiles.length,100);
  assert.equal(migrated.tiles.find(t=>t.x===0&&t.z===0).quantity,2);
  assert.equal(migrated.resources.wood,9);
  assert.equal(migrated.heroProgression.profiles['starter-hero'].attributes.strength,24);
  assert.deepEqual([migrated.actors[0].x,migrated.actors[0].z],where);
  assert.equal(migrated.buildings.find(b=>b.type==='heroHouse').id,2);
  assert.equal(needsHeroLearningMigration(serialize(migrated)),false);
  assert.equal(ensureBaseProgression(migrated).size,10);
  assert.equal(migrated.tiles.length,100);
  assert.equal(deserialize(serialize(migrated)).tiles.length,100);
});
test('confirmed Rank2 and Rank4 milestones expand 10 to 20 and 30 without changing old tiles',()=>{
  assert.deepEqual(CONFIRMED_RANK_THRESHOLDS,{1:0,2:100,4:600});
  assert.deepEqual(BASE_MAP_SIZES,[10,20,20,30]);
  assert.equal(rankForBaseXp(99.9),1);
  assert.equal(rankForBaseXp(100),2);
  assert.equal(rankForBaseXp(600),4);
  assert.equal(mapSizeForBaseRank(2),20);
  assert.equal(mapSizeForBaseRank(4),30);
  const s=createInitialState();
  s.tiles.find(t=>t.x===4&&t.z===0).quantity=3;
  const before=JSON.stringify(s.tiles.find(t=>t.x===4&&t.z===0));
  const p=awardBaseXp(s,100,{source:'test'});
  assert.equal(p.ok,true);
  assert.equal(s.baseRank,2);
  assert.equal(s.mapSize,20);
  assert.equal(s.tiles.length,400);
  assert.equal(JSON.stringify(s.tiles.find(t=>t.x===4&&t.z===0)),before);
  awardBaseXp(s,500,{source:'test'});
  assert.equal(s.baseRank,4);
  assert.equal(s.mapSize,30);
  assert.equal(s.tiles.length,900);
  assert.equal(JSON.stringify(s.tiles.find(t=>t.x===4&&t.z===0)),before);
  assert.equal(ensureBaseProgression(s).size,30);
  assert.equal(s.tiles.length,900);
});
test('warehouse capacity rules preserve first storage 50, max 200; upgrade costs not invented',()=>{
  const s=createInitialState();
  assert.deepEqual(WAREHOUSE_CAPACITIES,[10,50,100,150,200]);
  assert.equal(cap(s,'wood'),10);
  s.buildings.push({id:7,type:'storage',progress:1,x:5,z:5,hp:35});
  assert.equal(cap(s,'wood'),50);
  assert.equal(cap(s,'stone'),50);
  assert.equal(storageCapacityFromLevel(4),200);
  s.warehouseLevel=4;
  assert.equal(cap(s,'wood'),200);
  assert.equal(cap(s,'stone'),200);
  assert.deepEqual(previewNextWarehouseCapacity(s),
    {available:false,reason:'max-level',current:200,next:null});
});
test('second hero house is Rank2 gated, costs wood50 stone30 and becomes assignable only when built',()=>{
  const s=createInitialState();
  assert.equal(reserveBuild(s,'heroHouse',8,8).ok,false);
  awardBaseXp(s,100,{source:'test'});
  assert.equal(nextHeroHouseUnlock(s).rank,2);
  s.resources.wood=50;s.resources.stone=30;
  const r=reserveBuild(s,'heroHouse',8,8);
  assert.equal(r.ok,true);
  assert.equal(s.resources.wood,0);
  assert.equal(s.resources.stone,0);
  assert.equal(builtHeroHouses(s).length,1);
  const pending=s.buildings.find(b=>b.type==='heroHouse'&&b.progress<1);
  assert.equal(pending.requiredWork,30);
  const duplicate=reserveBuild(s,'heroHouse',7,8);
  assert.equal(duplicate.ok,false);
  assert.equal(duplicate.reason,'現在の英雄の家が完成してから建築できます');
  pending.work=1;
  const worker=s.actors[0];worker.job='building';worker.phase='work';
  worker.target={x:pending.x,z:pending.z,id:pending.id};worker.timer=0;
  const previousXp=s.baseXp;
  updateGame(s,1);
  assert.equal(pending.progress,1);
  assert.equal(builtHeroHouses(s).length,2);
  assert.equal(s.baseXp,previousXp+PROVISIONAL_BUILDING_XP);
  assert.equal(nextHeroHouseUnlock(s).rank,4);
});
test('third hero house requires Rank4 and 150/100, with 60 units of work',()=>{
  const s=createInitialState();
  const second={id:5,type:'heroHouse',progress:1,x:8,z:8,hp:60};
  s.buildings.push(second);s.buildSeq=5;
  awardBaseXp(s,600,{source:'test'});
  assert.equal(s.baseRank,4);
  assert.equal(s.mapSize,30);
  const info=nextHeroHouseUnlock(s);
  assert.equal(info.rank,4);
  assert.deepEqual(info.costs,{wood:150,stone:100});
  s.resources.wood=150;s.resources.stone=100;
  assert.equal(reserveBuild(s,'heroHouse',12,12).ok,true);
  assert.equal(s.buildings.find(b=>b.id===6).requiredWork,60);
  assert.equal(reserveBuild(s,'heroHouse',14,14).ok,false);
});
test('invalid/duplicate imported map coordinates are not overwritten silently',()=>{
  const s=createInitialState();
  s.tiles.push({...s.tiles[0]});
  assert.throws(()=>ensureBaseProgression(s),/duplicate/);
  const t=createInitialState();
  t.tiles.push({x:40,z:0,terrain:'grass',feature:null,quantity:0});
  assert.throws(()=>growBaseGridPreservingTiles(t,10),/Invalid/);
});

test('corrupt resources or rank in imported JSON are rejected without deleting saves',()=>{
  const s=createInitialState();
  const raw=JSON.parse(serialize(s));
  raw.state.resources.wood=-10;
  assert.throws(()=>deserialize(JSON.stringify(raw)),/資源データが不正/);
  raw.state.resources.wood=1;
  raw.state.baseXp=-5;
  assert.throws(()=>deserialize(JSON.stringify(raw)),/拠点経験値が不正/);
  raw.state.baseXp=0;
  raw.state.mapSize=13;
  assert.throws(()=>deserialize(JSON.stringify(raw)),/マップサイズが不正/);
  raw.state.mapSize=10;
  raw.state.tiles.push({...raw.state.tiles[0]});
  assert.throws(()=>deserialize(JSON.stringify(raw)),/duplicate/);
});
