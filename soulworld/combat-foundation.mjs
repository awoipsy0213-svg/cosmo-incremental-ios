// Combat number foundation confirmed by Q393-402 and Q443-502.
// This is for previewing final base combat stats; full hit/evasion,
// skill modifiers, equipment and battle simulation require further design.
import {applyBattleRarityBonus} from './rules-213-262.mjs';

export const BASE_HIT_CHANCE = .75;
export const HIT_CHANCE_LIMITS = Object.freeze({min:.05,max:.95});
export const EVADE_CHANCE_CAP = .70;
export const BASE_STAMINA = 100;
export const REST_STAMINA_REGEN_PER_SECOND = 5;
export const TYPE_BONUS = .10;
const labels=Object.freeze({
  hp:'HP',physicalAttack:'物理攻撃',physicalDefense:'物理防御',
  magicAttack:'魔法攻撃',magicDefense:'魔法防御'
});
const keys=Object.keys(labels);
const weighted=(major,minor)=>{
  if(!Number.isFinite(major)||!Number.isFinite(minor) || major<0||minor<0)
    throw new RangeError('Invalid basic ability value');
  return major*.8+minor*.2;
};
export function calculateBasicCombatStats(attributes) {
 if(!attributes || typeof attributes!=='object')throw new TypeError('Basic abilities required');
 const a=attributes;
 return {
  hp:100+10*Math.sqrt(weighted(a.vitality,a.durability)),
  physicalAttack:5*Math.sqrt(weighted(a.strength,a.dexterity)),
  physicalDefense:5*Math.sqrt(weighted(a.durability,a.vitality)),
  magicAttack:5*Math.sqrt(weighted(a.magic,a.intelligence)),
  magicDefense:5*Math.sqrt(weighted(a.spirit,a.magic)),
 };
}
function isFavored(type,key){
 return (type==='combat' && key==='physicalAttack') ||
   (type==='defense' && ['hp','physicalDefense','magicDefense'].includes(key)) ||
   (type==='support' && key==='magicAttack');
}
export function calculateHeroCombatStats(hero){
 if(!hero || !hero.attributes)throw new TypeError('Hero with base abilities required');
 const stats=calculateBasicCombatStats(hero.attributes);
 const rarity=hero.rarity||'common';
 const breakthroughCount=hero.breakthroughCount||0;
 const output={};
 for(const key of keys){
   let stat=stats[key];
   if(isFavored(hero.type,key))stat*=1+TYPE_BONUS;
   stat=applyBattleRarityBonus(stat,rarity,breakthroughCount);
   output[key]=stat;
 }
 // Q348/Q451: equipment is a direct numeric addition at the very end.
 // Skip equipment, final-stat skill multipliers, and buffs until these fields
 // have confirmed/save-compatible specs. Unknown values are never guessed.
 return output;
}
export function combatDisplayStats(hero){
 const stats=calculateHeroCombatStats(hero);
 return Object.fromEntries(keys.map(key=>[key,{label:labels[key],
    exact:stats[key],display:Math.round(stats[key])}]));
}
export function mitigateDamage(attack,defense){
 if(!Number.isFinite(attack)||attack<0||!Number.isFinite(defense)||defense<0)
   throw new RangeError('Attack and defense must be nonnegative');
 // Q447/Q450 and Q502. This is conditional on the attack landing.
 return Math.max(1,attack*100/(100+defense));
}
export function capHitChance(raw){
 if(!Number.isFinite(raw))throw new RangeError('Hit chance must be finite');
 return Math.max(HIT_CHANCE_LIMITS.min,Math.min(HIT_CHANCE_LIMITS.max,raw));
}
export function capEvadeChance(raw){
 if(!Number.isFinite(raw))throw new RangeError('Evade chance must be finite');
 return Math.max(0,Math.min(EVADE_CHANCE_CAP,raw));
}
export function recoverRestStamina(current,seconds,maximum=BASE_STAMINA){
 if(!Number.isFinite(current)||current<0||!Number.isFinite(seconds)||seconds<0||
    !Number.isFinite(maximum)||maximum<0)throw new RangeError('Invalid stamina');
 return Math.min(maximum,current+seconds*REST_STAMINA_REGEN_PER_SECOND);
}
