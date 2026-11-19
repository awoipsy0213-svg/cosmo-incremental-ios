import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_BACKUP_GENERATIONS,LEGACY_BACKUP_SUFFIX,backupBeforeSaveMigration,
  needsHeroLearningMigration
} from '../save-migration.mjs';
import {createInitialState,serialize,deserialize,SAVE_KEY} from '../core.mjs';

const fakeStorage=()=>{
  const m=new Map();
  return {getItem:key=>m.has(key)?m.get(key):null,
    setItem:(key,value)=>m.set(key,value),
    contents:()=>new Map(m)};
};
test('create 3 generations of backups, newest first, original remains intact',()=>{
  const db=fakeStorage();
  const key=SAVE_KEY;
  db.setItem(key,'original-v1');
  for(const data of ['old-a','old-b','old-c','old-d']){
    backupBeforeSaveMigration(db,key,data);
    assert.equal(db.getItem(key),'original-v1');
  }
  assert.equal(LEGACY_BACKUP_GENERATIONS,3);
  assert.equal(db.getItem(key+LEGACY_BACKUP_SUFFIX+'1'),'old-d');
  assert.equal(db.getItem(key+LEGACY_BACKUP_SUFFIX+'2'),'old-c');
  assert.equal(db.getItem(key+LEGACY_BACKUP_SUFFIX+'3'),'old-b');
  const before=db.contents();
  assert.equal(backupBeforeSaveMigration(db,key,'old-d').created,false);
  assert.deepEqual(db.contents(),before);
});
test('backup failure must be propagated so game can prevent overwrite',()=>{
  const m=new Map();
  const db={getItem:key=>m.get(key)??null,setItem:(key,val)=>{
    if(key.endsWith('_legacy_backup_1'))throw new Error('quota-exceeded');
    m.set(key,val);
  }};
  db.setItem(SAVE_KEY,'protected-save');
  assert.throws(()=>backupBeforeSaveMigration(db,SAVE_KEY,'protected-save'),/quota-exceeded/);
  assert.equal(db.getItem(SAVE_KEY),'protected-save');
});
test('detect hero learning migration without disturbing existing schema 1 fields',()=>{
  const first=createInitialState();
  const raw=serialize(first);
  assert.equal(needsHeroLearningMigration(raw),false);
  const before=JSON.parse(raw);
  delete before.state.heroProgression.profiles['starter-hero'].actionSuccessCounts;
  assert.equal(needsHeroLearningMigration(JSON.stringify(before)),true);
  assert.equal(needsHeroLearningMigration('{invalid'),true);
  const after=deserialize(JSON.stringify(before));
  assert.equal(typeof after.heroProgression.profiles['starter-hero'].actionSuccessCounts,'object');
  assert.equal(SAVE_KEY,'soul_world_browser_proto_v001');
  assert.equal(after.schema,1);
});

test('Q405 roster change requires backup of previous hero-learning save',()=>{
  const old=createInitialState();
  delete old.heroRoster;
  delete old.saveFormatRevision;
  const raw=serialize(old);
  assert.equal(needsHeroLearningMigration(raw),true);
  const db=fakeStorage();
  db.setItem(SAVE_KEY,raw);
  const result=backupBeforeSaveMigration(db,SAVE_KEY,raw);
  assert.equal(result.created,true);
  assert.equal(db.getItem(SAVE_KEY),raw);
  assert.equal(db.getItem(SAVE_KEY+'_legacy_backup_1'),raw);
  const upgraded=deserialize(raw);
  assert.equal(upgraded.saveFormatRevision,4);
  assert.ok(upgraded.heroRoster.assignments);
  assert.equal(needsHeroLearningMigration(serialize(upgraded)),false);
});
