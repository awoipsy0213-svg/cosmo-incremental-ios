// Soul World - persistent hero progression scaffold (Q73-112, Q123-142, Q263-282).
// The XP thresholds and action-to-attribute mappings are test-only provisional
// tuning parameters. They are NOT additional confirmed design decisions.
export const BASE_ABILITY_CAP = 1000;
export const SOUL_SKILL_CAP = 100;
export const LEVEL_STAT_POINTS = 3;
export const LEVEL_SKILL_POINTS = 1;
export const BASE_ABILITY_KEYS = Object.freeze([
  'strength', 'vitality', 'durability', 'agility', 'dexterity',
  'intelligence', 'spirit', 'magic', 'gathering', 'building',
  'crafting', 'exploration', 'adaptation', 'creativity',
  'perseverance', 'stamina', 'learning'
]);
export const BASE_ABILITY_LABELS = Object.freeze({
  strength:'筋力', vitality:'体力', durability:'耐久',
  agility:'敏捷', dexterity:'器用', intelligence:'知力',
  spirit:'精神', magic:'魔力', gathering:'採集',
  building:'建築', crafting:'製作', exploration:'探索',
  adaptation:'適応', creativity:'発想', perseverance:'忍耐',
  stamina:'持久力', learning:'学習力'
});
// Provisional action mappings: Q233 confirms one primary (80%) and
// one secondary (20%), but the exact action mappings are not settled.
export const PROVISIONAL_ACTION_ATTRIBUTES = Object.freeze({
  wood:['gathering','strength'],
  stone:['gathering','durability'],
  food:['gathering','stamina'],
  build:['building','dexterity'],
  swim:['stamina','adaptation'],
  fight:['strength','agility'],
  pray:['spirit','learning']
});
export const STARTER_HERO_ID = 'starter-hero';

// The demo's deterministic 1..5 spread is a placeholder for fixed-character
// authored defaults; it does not roll by rarity.
function starterAttributes() {
  const attributes = {};
  BASE_ABILITY_KEYS.forEach((key,index) => {attributes[key] = 1 + (index % 5);});
  return attributes;
}
export function createStarterHero() {
  const xp = Object.fromEntries(BASE_ABILITY_KEYS.map(key=>[key,0]));
  return {
    id:STARTER_HERO_ID, name:'英雄（試作）', type:'combat', rarity:'common',
    status:'alive', lifeCount:1, level:1, levelXp:0,
    freeStatPoints:0, freeSkillPoints:0,
    attributes:starterAttributes(), attributeXp:xp, personalMasteryXp:{},
    learnedActions:{}, skillTree:{}
  };
}
export function createHeroProgression() {
  return {profiles:{[STARTER_HERO_ID]:createStarterHero()}, pendingSouls:[]};
}
export function ensureHeroProgression(state) {
  if (!state || typeof state !== 'object') throw new TypeError('Invalid world state');
  if (!state.heroProgression || typeof state.heroProgression !== 'object') {
    state.heroProgression = createHeroProgression();
    const hasMain = Array.isArray(state.actors) && state.actors.some(a=>a.kind==='main');
    if (!hasMain) {
      state.heroProgression.profiles[STARTER_HERO_ID].status='pending_soul';
      state.heroProgression.pendingSouls.push(STARTER_HERO_ID);
    }
  }
  const roster=state.heroProgression;
  if (!roster.profiles || typeof roster.profiles !== 'object') roster.profiles={};
  if (!Array.isArray(roster.pendingSouls)) roster.pendingSouls=[];
  if (!roster.profiles[STARTER_HERO_ID]) roster.profiles[STARTER_HERO_ID]=createStarterHero();
  for (const hero of Object.values(roster.profiles)) {
    if (!hero.attributes || typeof hero.attributes!=='object') hero.attributes=starterAttributes();
    if (!hero.attributeXp || typeof hero.attributeXp!=='object') hero.attributeXp={};
    for(const key of BASE_ABILITY_KEYS) {
      if (!Number.isFinite(hero.attributes[key])) hero.attributes[key]=1;
      hero.attributes[key]=Math.min(BASE_ABILITY_CAP,Math.max(1,Math.floor(hero.attributes[key])));
      if (!Number.isFinite(hero.attributeXp[key])||hero.attributeXp[key]<0) hero.attributeXp[key]=0;
    }
    if (!hero.personalMasteryXp) hero.personalMasteryXp={};
    if (!hero.learnedActions) hero.learnedActions={};
    if (!hero.skillTree) hero.skillTree={};
    if (!Number.isInteger(hero.level)||hero.level<1) hero.level=1;
    if (!Number.isFinite(hero.levelXp)||hero.levelXp<0) hero.levelXp=0;
    if (!Number.isInteger(hero.freeStatPoints)||hero.freeStatPoints<0) hero.freeStatPoints=0;
    if (!Number.isInteger(hero.freeSkillPoints)||hero.freeSkillPoints<0) hero.freeSkillPoints=0;
  }
  if (Array.isArray(state.actors)) for(const actor of state.actors) {
    if (actor.kind==='main'&&!actor.heroId) actor.heroId=STARTER_HERO_ID;
  }
  if (!state.progressionEconomy || typeof state.progressionEconomy!=='object') {
    state.progressionEconomy={rerollPoints:0,rerollXpCarry:0};
  }
  if (!Number.isSafeInteger(state.progressionEconomy.rerollPoints)||state.progressionEconomy.rerollPoints<0)
    state.progressionEconomy.rerollPoints=0;
  if (!Number.isFinite(state.progressionEconomy.rerollXpCarry)||state.progressionEconomy.rerollXpCarry<0)
    state.progressionEconomy.rerollXpCarry=0;
  return roster;
}

// These growth curve values are provisional. Exact calibration remains TBD.
export function xpNeededForNextAbility(current) {
  if (!Number.isInteger(current)||current<1||current>=BASE_ABILITY_CAP) return Infinity;
  return Math.ceil(10 + 0.12 * Math.pow(current,1.35));
}
export function xpNeededForNextHeroLevel(current) {
  if (!Number.isInteger(current)||current<1) throw new RangeError('Hero level must be >= 1');
  return Math.ceil(50+12*Math.pow(current,1.25));
}
export function grantAbilityExperience(hero,key,experience) {
  if (!BASE_ABILITY_KEYS.includes(key)) throw new RangeError('Unknown base ability');
  if (!Number.isFinite(experience)||experience<=0) return 0;
  const before=hero.attributes[key];
  if(before>=BASE_ABILITY_CAP) {hero.attributeXp[key]=0;return 0;}
  hero.attributeXp[key]=(hero.attributeXp[key]||0)+experience;
  let value=before;
  while(value<BASE_ABILITY_CAP&&hero.attributeXp[key]>=xpNeededForNextAbility(value)) {
    hero.attributeXp[key]-=xpNeededForNextAbility(value);
    value++;
  }
  if (value===BASE_ABILITY_CAP)hero.attributeXp[key]=0;
  hero.attributes[key]=value;
  return value-before;
}
export function grantHeroLevelExperience(hero,amount) {
  if (!Number.isFinite(amount)||amount<=0) return 0;
  hero.levelXp=(hero.levelXp||0)+amount;
  let ups=0;
  while(hero.levelXp>=xpNeededForNextHeroLevel(hero.level)) {
    hero.levelXp-=xpNeededForNextHeroLevel(hero.level);
    hero.level++;
    hero.freeStatPoints+=LEVEL_STAT_POINTS;
    hero.freeSkillPoints+=LEVEL_SKILL_POINTS;
    ups++;
    if(ups>200)break; // guard against corrupt user-supplied data
  }
  return ups;
}
export function allocateStatPoint(hero,key) {
  if(!BASE_ABILITY_KEYS.includes(key))return false;
  if((hero.freeStatPoints||0)<1 || hero.attributes[key]>=BASE_ABILITY_CAP)return false;
  hero.attributes[key]++;
  if(hero.attributes[key]>=BASE_ABILITY_CAP)hero.attributeXp[key]=0;
  hero.freeStatPoints--;
  return true;
}
export function grantHeroActionExperience(hero,action,baseExperience,{success=true,difficulty=1}={}) {
  const names=PROVISIONAL_ACTION_ATTRIBUTES[action];
  if (!names || !Number.isFinite(baseExperience) || baseExperience<=0 ||
    !Number.isFinite(difficulty) || difficulty<=0) return {ok:false,levelUps:0};
  const amount=baseExperience*difficulty*(success?1:0.25);
  const changes={};
  changes[names[0]]=grantAbilityExperience(hero,names[0],amount*0.8);
  changes[names[1]]=grantAbilityExperience(hero,names[1],amount*0.2);
  hero.personalMasteryXp[action]=(hero.personalMasteryXp[action]||0)+amount;
  if(success)hero.learnedActions[action]=true;
  const levelUps=grantHeroLevelExperience(hero,amount);
  return {ok:true,levelUps,abilityGrowth:changes};
}
export function markHeroSoulPending(state,heroId) {
  const roster=ensureHeroProgression(state);
  const hero=roster.profiles[heroId];
  if (!hero || hero.status==='pending_soul') return false;
  hero.status='pending_soul';
  if (!roster.pendingSouls.includes(heroId))roster.pendingSouls.push(heroId);
  return true;
}
export function collectAllHeroSouls(state) {
  const roster=ensureHeroProgression(state);
  const recovered=[];
  for(const id of roster.pendingSouls) {
    const hero=roster.profiles[id];
    if(!hero)continue;
    hero.status='ready';
    hero.lifeCount=(hero.lifeCount||1)+1;
    recovered.push(id);
  }
  roster.pendingSouls=[];
  return recovered;
}
export function awardRerollPointsForCollectedXP(state,points) {
  ensureHeroProgression(state);
  if(!Number.isFinite(points)||points<=0)return 0;
  const wallet=state.progressionEconomy;
  const total=wallet.rerollXpCarry+points;
  const award=Math.floor(total/10);
  wallet.rerollXpCarry=total-award*10;
  wallet.rerollPoints+=award;
  return award;
}
