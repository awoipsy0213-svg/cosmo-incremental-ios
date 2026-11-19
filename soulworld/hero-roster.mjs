// Soul World: hero-house assignment and battle registration domain.
// Q7-9, Q363-372: one hero per house, maximum three houses, 1-3 registered heroes.
// Additional houses require rank/material rules that remain to be defined.
import {STARTER_HERO_ID, ensureHeroProgression} from './hero-progression.mjs';
export const MAX_HERO_HOUSES = 3;
export const MAX_REGISTERED_HEROES = 3;

export function builtHeroHouses(world) {
  if(!world || !Array.isArray(world.buildings)) throw new TypeError('World buildings required');
  return world.buildings
    .filter(b=>b?.type==='heroHouse' && b.progress>=1 && Number.isInteger(b.id))
    .sort((a,b)=>a.id-b.id)
    .slice(0,MAX_HERO_HOUSES);
}
export function ensureHeroRoster(world) {
  ensureHeroProgression(world);
  const houses=builtHeroHouses(world);
  if (!world.heroRoster || typeof world.heroRoster!=='object' || Array.isArray(world.heroRoster)){
    world.heroRoster={assignments:{},deployments:[]};
  }
  const roster=world.heroRoster;
  if (!roster.assignments || typeof roster.assignments!=='object' || Array.isArray(roster.assignments))
    roster.assignments={};
  if(!Array.isArray(roster.deployments))roster.deployments=[];
  const validIds=new Set(Object.keys(world.heroProgression.profiles));
  const houseIds=new Set(houses.map(b=>String(b.id)));
  const seen=new Set();
  for(const [houseId,heroId] of Object.entries(roster.assignments)){
    if(!houseIds.has(houseId)||!validIds.has(heroId)||seen.has(heroId)){
      delete roster.assignments[houseId];
    } else seen.add(heroId);
  }
  if(!seen.has(STARTER_HERO_ID) && houses.length && !Object.keys(roster.assignments).length) {
    roster.assignments[String(houses[0].id)]=STARTER_HERO_ID;
  }
  const assigned=new Set(Object.values(roster.assignments));
  roster.deployments=[...new Set(roster.deployments)].filter(id=>assigned.has(id) &&
     world.heroProgression.profiles[id]?.status!=='pending_soul').slice(0,MAX_REGISTERED_HEROES);
  // Legacy saves did not have a deployment roster.
  if(!roster.deployments.length && assigned.has(STARTER_HERO_ID) &&
    world.heroProgression.profiles[STARTER_HERO_ID]?.status!=='pending_soul') {
    roster.deployments=[STARTER_HERO_ID];
  }
  return roster;
}
export function heroRosterRows(world) {
  const roster=ensureHeroRoster(world);
  const houses=builtHeroHouses(world);
  const assigned=new Set(Object.values(roster.assignments));
  return {
    houses:houses.map(h=>({
      id:h.id,heroId:roster.assignments[String(h.id)]||null,
      hero:world.heroProgression.profiles[roster.assignments[String(h.id)]]||null
    })),
    standby:Object.values(world.heroProgression.profiles)
      .filter(hero=>!assigned.has(hero.id))
      .map(hero=>({id:hero.id,name:hero.name,level:hero.level,status:hero.status,type:hero.type,rarity:hero.rarity})),
    deployments:[...roster.deployments],
    lockedHouses:Math.max(0,MAX_HERO_HOUSES-houses.length)
  };
}
export function assignHeroHouse(world, heroId, houseId) {
  if(world?.stage!=='base')return {ok:false,reason:'base-only'};
  const roster=ensureHeroRoster(world);
  if (!world.heroProgression.profiles[heroId])return {ok:false,reason:'hero-not-owned'};
  if (!builtHeroHouses(world).some(h=>h.id===houseId))return {ok:false,reason:'house-not-built'};
  const destination=String(houseId);
  const previous=Object.entries(roster.assignments).find(([,id])=>id===heroId)?.[0];
  const displaced=roster.assignments[destination]||null;
  if(previous && previous!==destination)delete roster.assignments[previous];
  roster.assignments[destination]=heroId;
  if(displaced && displaced!==heroId)roster.deployments=roster.deployments.filter(id=>id!==displaced);
  roster.deployments=roster.deployments.filter(id=>
    Object.values(roster.assignments).includes(id) &&
    world.heroProgression.profiles[id]?.status!=='pending_soul'
  );
  return {ok:true,displaced:displaced===heroId?null:displaced};
}
export function toggleHeroDeployment(world,heroId) {
  if(world?.stage!=='base')return {ok:false,reason:'base-only'};
  const roster=ensureHeroRoster(world);
  const hero=world.heroProgression.profiles[heroId];
  if(!hero || hero.status==='pending_soul')return {ok:false,reason:'hero-unavailable'};
  if(!Object.values(roster.assignments).includes(heroId))return {ok:false,reason:'hero-not-assigned'};
  if(roster.deployments.includes(heroId)){
    if(roster.deployments.length<=1)return {ok:false,reason:'one-hero-required'};
    roster.deployments=roster.deployments.filter(id=>id!==heroId);
    return {ok:true,deployed:false};
  }
  if(roster.deployments.length>=MAX_REGISTERED_HEROES)return {ok:false,reason:'max-heroes'};
  roster.deployments.push(heroId);
  return {ok:true,deployed:true};
}
export function registeredHeroIds(world) {
  return [...ensureHeroRoster(world).deployments];
}
