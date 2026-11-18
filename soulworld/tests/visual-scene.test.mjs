import test from 'node:test';
import assert from 'node:assert/strict';
import {PremiumScene} from '../premium-scene.mjs';
import {createInitialState,gotoStage,updateGame} from '../core.mjs';
function sceneMock(){
 const scene=Object.create(PremiumScene.prototype);
 scene.draws=[];scene.reduced=false;scene.clock=1.7;scene.selectedId=null;scene.previewTile=null;
 return scene;
}
test('premium geometry cannot mutate saved game state',()=>{
 const state=createInitialState();for(let i=0;i<150;i++)updateGame(state,.08);
 const before=JSON.stringify(state),scene=sceneMock();scene.fillScene(state);
 assert.ok(scene.draws.length>100);assert.equal(JSON.stringify(state),before);
 for(const d of scene.draws){assert.ok(d.mat.every(Number.isFinite));assert.ok(d.color.every(Number.isFinite))}
});
test('all stages have procedural 3D geometry',()=>{
 for(const stage of ['explore','battle']){
  const state=createInitialState();gotoStage(state,stage);
  const scene=sceneMock();scene.fillScene(state);
  assert.ok(scene.draws.length>100,stage);
 }
});
test('low quality mode preserves all simulation data',()=>{
 const state=createInitialState();for(let i=0;i<200;i++)updateGame(state,.08);
 const before=JSON.stringify(state),scene=sceneMock();
 scene.reduced=true;scene.fillScene(state);
 assert.ok(scene.draws.length>0);assert.equal(JSON.stringify(state),before);
});
