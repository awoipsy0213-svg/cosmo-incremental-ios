import test from 'node:test';
import assert from 'node:assert/strict';
import {SceneFallback} from '../fallback.mjs';

function sceneFor(width,height,stage='base'){
 const scene=Object.create(SceneFallback.prototype);
 scene.canvas={clientWidth:width,clientHeight:height};
 scene.stage=stage;
 scene.target=[0,0,0];
 scene.zoom=1;
 return scene;
}

test('compact landscape field tile centers fit without horizontal distortion',()=>{
 for(const [w,h] of [[932,430],[844,390],[667,375],[640,360]]){
  const s=sceneFor(w,h),d=s.dimensions('base');
  assert.ok(Number.isFinite(d.ux)&&d.ux>0);
  assert.ok(Math.abs(d.uy/d.ux-.57)<1e-9);
  for(let x=0;x<5;x++)for(let z=0;z<5;z++){
   const [px,py]=s.iso(x,z);
   assert.ok(px>0&&px<w);
   assert.ok(py>0&&py<h);
   const hit=s.locateTile(px,py,'base');
   assert.ok(hit&&hit.x===x&&hit.z===z);
  }
 }
});
test('portrait-to-landscape resizing preserves tile coordinates',()=>{
 const s=sceneFor(430,932);
 assert.deepEqual(s.locateTile(...s.iso(4,4),'base'),{x:4,z:4});
 s.canvas.clientWidth=932;s.canvas.clientHeight=430;
 assert.deepEqual(s.locateTile(...s.iso(4,4),'base'),{x:4,z:4});
 assert.ok(s.dimensions('base').ux>s.dimensions('explore').ux*.7);
});
