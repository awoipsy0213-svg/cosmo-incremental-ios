// Confirmed economic and progression rules through Q262.
// Pure module: not imported by live game until the full hero/roster UI exists.
// Currency values here are game-only units; real money is not supported.
import {registerGachaDraw, createGachaPityState, HERO_RARITIES, validateStarRevelationBoost} from './confirmed-rules-163-212.mjs';
import {rerollUnlockedAbilitySlots, meetAutoRerollTargets, AUTO_REROLL_INTERVAL_SECONDS} from './ability-rules.mjs';

export const NORMAL_QUALITY_RATES = Object.freeze({low: 0.60, mid: 0.30, high: 0.10});
export const GACHA_RARITY_RATES = Object.freeze({
  common: 0.50, uncommon: 0.25, rare: 0.16,
  epic: 0.07, legendary: 0.018, mythic: 0.002
});
export const GACHA_DRAW_COST = 100;
export const GACHA_TEN_PULL_COST = 1000;
export const REROLL_POINT_COST = 1;
export const BREAKTHROUGH_INCREMENTS = Object.freeze([0.05, 0.10, 0.15, 0.20, 0.25, 0.25]);
export const MAX_LOW_RARITY_BONUS_PERCENT = Object.freeze({common: 10, uncommon: 5, rare: 2.5});
export const REVIVE_INVULNERABILITY_SECONDS = 2;

function validateRandom(random) {
  if (typeof random !== 'function') throw new TypeError('A seeded random callback is required');
  const u = random();
  if (!Number.isFinite(u) || u < 0 || u >= 1) throw new RangeError('Random draw outside [0, 1)');
  return u;
}
function sampleWeightedWithBasisPoints(random, entries) {
  const u = validateRandom(random) * 10000;
  let threshold = 0;
  for (const [name, basisPoints] of entries) {
    threshold += basisPoints;
    if (u < threshold) return name;
  }
  throw new RangeError('Probability table does not sum to 100%');
}
export function sampleNormalQuality(random) {
  return sampleWeightedWithBasisPoints(random, [
    ['low', 6000], ['mid', 3000], ['high', 1000]
  ]);
}
export function sampleGachaRarity(random) {
  return sampleWeightedWithBasisPoints(random, [
    ['common', 5000], ['uncommon', 2500], ['rare', 1600],
    ['epic', 700], ['legendary', 180], ['mythic', 20]
  ]);
}
export function breakthroughBonusPercent(rarity, count) {
  if (!Number.isInteger(count) || count < 0 || count > 6) throw new RangeError('Breakthrough count must be 0-6');
  const max = MAX_LOW_RARITY_BONUS_PERCENT[rarity] ?? 0;
  const share = BREAKTHROUGH_INCREMENTS.slice(0,count).reduce((sum,x)=>sum+x,0);
  return Math.round(max * share * 1000000) / 1000000;
}
export function applyBattleRarityBonus(finalStat, rarity, count) {
  if (!Number.isFinite(finalStat) || finalStat < 0) throw new RangeError('Invalid final combat stat');
  return finalStat + (finalStat * breakthroughBonusPercent(rarity,count) / 100);
}
export function applyStarRevelation(value, percent) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('Invalid ability value');
  return value * (1 + validateStarRevelationBoost(percent) / 100);
}

export function createGachaAccount(currency = 0) {
  if (!Number.isSafeInteger(currency) || currency < 0) throw new RangeError('Invalid currency');
  return {currency, pity:createGachaPityState(), ownedHeroIds:[], duplicateMaterials:{}};
}
function copyAccount(account) {
  if (!account || !Number.isSafeInteger(account.currency) || account.currency < 0 ||
    !Array.isArray(account.ownedHeroIds) || !account.pity ||
    !account.duplicateMaterials || typeof account.duplicateMaterials !== 'object') {
    throw new TypeError('Invalid gacha account state');
  }
  return {
    currency:account.currency, pity:{...account.pity},
    ownedHeroIds:[...account.ownedHeroIds], duplicateMaterials:{...account.duplicateMaterials}
  };
}
export function drawGacha(account, count, characterPoolByRarity, random) {
  if (count !== 1 && count !== 10) throw new RangeError('Gacha draws must be 1 or 10');
  const next = copyAccount(account);
  const cost = count * GACHA_DRAW_COST;
  if (next.currency < cost) return {ok:false,reason:'insufficient-currency',state:next,results:[]};
  if (!characterPoolByRarity || typeof characterPoolByRarity !== 'object') {
    throw new TypeError('A hero catalog is required');
  }
  // Operate on a copy: invalid catalog/random input must never debit the player.
  next.currency -= cost;
  const results = [];
  for (let i=0;i<count;i++) {
    const rarity = sampleGachaRarity(random);
    const picked = registerGachaDraw(next.pity,rarity);
    const pool = characterPoolByRarity[picked.rarity];
    if (!Array.isArray(pool) || pool.length === 0) {
      throw new RangeError('Missing named character pool for a rolled rarity');
    }
    const hero = pool[Math.floor(validateRandom(random) * pool.length)];
    if (typeof hero?.id !== 'string' || !hero.id.trim()) {
      throw new TypeError('Character must have a stable nonempty ID');
    }
    const duplicate = next.ownedHeroIds.includes(hero.id);
    if (duplicate) next.duplicateMaterials[hero.id] = (next.duplicateMaterials[hero.id] || 0) + 1;
    else next.ownedHeroIds.push(hero.id);
    next.pity = picked.state;
    results.push({heroId:hero.id,rarity:picked.rarity,duplicate,wasGuaranteed:picked.wasGuaranteed});
  }
  return {ok:true,reason:null,state:next,results};
}

export function rerollWithPoints(slots, points, roll) {
  if (!Number.isSafeInteger(points) || points < 0 || !Array.isArray(slots)) {
    throw new TypeError('Invalid reroll balance or slots');
  }
  const before = slots.map(slot=>({...slot}));
  if (!before.some(slot=>!slot.locked)) return {ok:false,reason:'all-locked',slots:before,points};
  if (points < REROLL_POINT_COST) return {ok:false,reason:'insufficient-points',slots:before,points};
  return {ok:true,reason:null,
    slots:rerollUnlockedAbilitySlots(before,roll),points:points-REROLL_POINT_COST};
}
export function advancePaidAutoReroll(slots, auto, points, seconds, roll) {
  if (!auto || !Number.isFinite(seconds) || seconds < 0) throw new TypeError('Invalid auto-reroll timing');
  let result = slots.map(x=>({...x}));
  let nextPoints = points;
  const state = {...auto, elapsed: Math.max(0,auto.elapsed || 0), rolls:Math.max(0,auto.rolls || 0)};
  if (!state.enabled) return {slots:result,auto:state,points:nextPoints};
  if (meetAutoRerollTargets(result,state.targets)) {
    state.enabled=false;
    return {slots:result,auto:state,points:nextPoints};
  }
  if (result.every(x=>x.locked)) return {slots:result,auto:state,points:nextPoints};
  state.elapsed += seconds;
  while(state.elapsed + 1e-9 >= AUTO_REROLL_INTERVAL_SECONDS) {
    if (nextPoints < REROLL_POINT_COST) {
      state.enabled = false; // Q179: player must manually switch back ON.
      state.elapsed = 0;
      break;
    }
    state.elapsed = Math.max(0,state.elapsed-AUTO_REROLL_INTERVAL_SECONDS);
    const attempt = rerollWithPoints(result,nextPoints,roll);
    if (!attempt.ok) {
      state.enabled = false;
      state.elapsed = 0;
      break;
    }
    result = attempt.slots;
    nextPoints = attempt.points;
    state.rolls++;
    if (meetAutoRerollTargets(result,state.targets)) {
      state.enabled=false;
      break;
    }
  }
  return {slots:result,auto:state,points:nextPoints};
}

export function resolveSimultaneousStructureDestruction() {
  // Q252: if both factions lose temple and main base in the same event, draw.
  return {result:'draw',reason:'simultaneous-destruction'};
}
