// Soul World base progression -- Q463-472, Q500 review, Q511.
// Confirmed: Rank2 cumulative 100 XP, Rank4 cumulative 600 XP,
// sizes 10x10 -> 20x20 -> 30x30; 200 resource max via upgrades.
// Rank3 threshold and XP earned per building/mission are provisional and
// MUST be revisited in the next decision batch. We never silently
// spend resources on upgrades with undecided prices.
export const BASE_MAX_RANK=4;
export const CONFIRMED_RANK_THRESHOLDS=Object.freeze({1:0,2:100,4:600});
export const PROVISIONAL_RANK3_THRESHOLD=300;
export const BASE_RANK_THRESHOLDS=Object.freeze([0,100,PROVISIONAL_RANK3_THRESHOLD,600]);
export const BASE_MAP_SIZES=Object.freeze([10,20,20,30]);
export const WAREHOUSE_CAPACITIES=Object.freeze([10,50,100,150,200]);
export const PROVISIONAL_BUILDING_XP=20;
export const MAX_BASE_SIZE=30;
const isNonnegativeNumber=x=>Number.isFinite(x)&&x>=0;
export function rankForBaseXp(xp){
 if(!isNonnegativeNumber(xp))throw new RangeError('Nonnegative base XP required');
 if(xp>=600)return 4;
 if(xp>=PROVISIONAL_RANK3_THRESHOLD)return 3;
 if(xp>=100)return 2;
 return 1;
}
export function mapSizeForBaseRank(rank){
 if(!Number.isInteger(rank)||rank<1||rank>BASE_MAX_RANK)throw new RangeError('Invalid base rank');
 return BASE_MAP_SIZES[rank-1];
}
export function storageCapacityFromLevel(level){
 if(!Number.isInteger(level)||level<0||level>=WAREHOUSE_CAPACITIES.length)
   throw new RangeError('Storage upgrade level must be 0-4');
 return WAREHOUSE_CAPACITIES[level];
}
export function baseResourceCapacity(world){
 const builtStorage=Array.isArray(world?.buildings) &&
    world.buildings.some(b=>b.type==='storage' && b.progress>=1);
 if(!builtStorage)return 10;
 // Existing completed storage building already gave 50: level 1.
 const value=Math.max(1,Number.isInteger(world?.warehouseLevel)?world.warehouseLevel:1);
 return storageCapacityFromLevel(Math.min(4,value));
}
function createAddedTile(x,z){
 // Newly revealed tiles are deterministic; old terrain is never regenerated.
 const seed=(x*31+z*47)%17;
 const feature=seed===2||seed===9?'tree':seed===6?'stone':null;
 return {x,z,terrain:'grass',feature,quantity:feature?6:0,regrow:0};
}
export function growBaseGridPreservingTiles(world,size){
 if(!Array.isArray(world?.tiles))throw new TypeError('World tiles array required');
 if(!Number.isInteger(size)||size<5||size>MAX_BASE_SIZE)
   throw new RangeError('Map size outside supported range');
 const found=new Set();
 for(const t of world.tiles){
  if(!Number.isInteger(t.x)||!Number.isInteger(t.z)||
    t.x<0||t.z<0||t.x>=size||t.z>=size||
    found.has(t.x+','+t.z))throw new RangeError('Invalid or duplicate existing map tile');
  found.add(t.x+','+t.z);
 }
 let added=0;
 for(let z=0;z<size;z++)for(let x=0;x<size;x++){
  if(found.has(x+','+z))continue;
  world.tiles.push(createAddedTile(x,z));
  added++;
 }
 world.mapSize=size;
 return added;
}
export function ensureBaseProgression(world){
 if(!world||typeof world!=='object'||!Array.isArray(world.tiles))
   throw new TypeError('World with tiles required');
 if(!isNonnegativeNumber(world.baseXp))world.baseXp=0;
 const rank=rankForBaseXp(world.baseXp);
 world.baseRank=rank;
 const targetSize=mapSizeForBaseRank(rank);
 // Previous 5x5 worlds or prior rank saves are converted additively.
 growBaseGridPreservingTiles(world,targetSize);
 if(!Number.isInteger(world.warehouseLevel)||world.warehouseLevel<0){
   world.warehouseLevel=Array.isArray(world.buildings)&&
     world.buildings.some(b=>b.type==='storage'&&b.progress>=1)?1:0;
 }
 world.warehouseLevel=Math.min(4,world.warehouseLevel);
 return {rank,size:targetSize,xp:world.baseXp};
}
export function awardBaseXp(world,xp,{source='unspecified'}={}){
 if(!isNonnegativeNumber(xp)||xp===0)return {ok:false,reason:'invalid-xp'};
 const before=ensureBaseProgression(world);
 world.baseXp+=xp;
 const after=ensureBaseProgression(world);
 return {ok:true,source,xpEarned:xp,beforeRank:before.rank,afterRank:after.rank,
   addedTiles:after.size*after.size-before.size*before.size};
}
// No warehouse upgrade transaction is exposed yet: Q513+ must define
// costs and rank requirements. This helper only previews the potential cap.
export function previewNextWarehouseCapacity(world){
 ensureBaseProgression(world);
 const built=world.buildings?.some(b=>b.type==='storage'&&b.progress>=1);
 if(!built)return {available:false,reason:'build-storage-first',current:10,next:50};
 const level=Math.max(1,world.warehouseLevel);
 if(level>=4)return {available:false,reason:'max-level',current:200,next:null};
 return {available:false,reason:'upgrade-price-undecided',
   current:storageCapacityFromLevel(level),
   next:storageCapacityFromLevel(level+1)};
}
