// Soul World confirmed rule engine, questions 163-212.
// Pure functions only. The prototype's existing save data and unrelated game are untouched.

export const UNIQUE_CHANCES = Object.freeze({
  epic: 0.001,       // 0.1%
  legendary: 0.0005, // 0.05%
  mythic: 0.0001,    // 0.01%
});
export const UNIQUE_KINDS = Object.freeze({
  epic: 'high-quality-rate',
  legendary: 'high-value-rate',
  mythic: 'star-revelation',
});
export const STAR_REVELATION_RANGE = Object.freeze({min: 1, max: 50});

// Each candidate slot uses an independent random draw. Probabilities are
// mutually exclusive; the normal candidate has the remaining probability.
export function classifyUniqueRoll(value) {
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('Random draw must be a number in [0, 1).');
  }
  if (value < UNIQUE_CHANCES.mythic) return 'mythic';
  if (value < UNIQUE_CHANCES.mythic + UNIQUE_CHANCES.legendary) return 'legendary';
  if (value < UNIQUE_CHANCES.mythic + UNIQUE_CHANCES.legendary + UNIQUE_CHANCES.epic) return 'epic';
  return null;
}

export function rollUniqueCandidate(random) {
  if (typeof random !== 'function') throw new TypeError('Random callback required.');
  const rarity = classifyUniqueRoll(random());
  return rarity ? {category: 'unique', rarity, kind: UNIQUE_KINDS[rarity]} : null;
}

export function validateUniqueAbilitySlots(slots) {
  if (!Array.isArray(slots)) throw new TypeError('Expected ability slots array.');
  const uniqueKinds = new Set();
  for (const slot of slots) {
    if (slot?.category !== 'unique') continue;
    const kind = UNIQUE_KINDS[slot.rarity];
    if (!kind || slot.kind !== kind) throw new RangeError('Invalid unique ability.');
    if (uniqueKinds.has(slot.kind)) throw new RangeError('Same unique kind occurs twice in one character.');
    uniqueKinds.add(slot.kind);
  }
  return true;
}

export function validateStarRevelationBoost(percent) {
  if (!Number.isFinite(percent) || percent < STAR_REVELATION_RANGE.min ||
      percent > STAR_REVELATION_RANGE.max) {
    throw new RangeError('Star revelation must be within 1-50%.');
  }
  return percent;
}
export function starBoostAffectsSlot(sourceIndex, targetIndex, slots) {
  if (!Array.isArray(slots) || !Number.isInteger(sourceIndex) ||
      !Number.isInteger(targetIndex) || sourceIndex < 0 || targetIndex < 0 ||
      sourceIndex >= slots.length || targetIndex >= slots.length) return false;
  return sourceIndex !== targetIndex &&
    slots[sourceIndex]?.kind === 'star-revelation' &&
    (slots[targetIndex]?.category === 'unique' || slots[targetIndex]?.category === 'normal');
}

// The exact calculation for the epic/legendary rate buffs and the mythic
// percentage multiplier are deliberately NOT invented here.

export const GACHA_PITY_LIMIT = 100;
export const HERO_RARITIES = Object.freeze([
  'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic',
]);

export function createGachaPityState() {
  return {pullsSinceLegendary: 0};
}

export function isNextDrawGuaranteedLegendary(state) {
  return Math.max(0, Math.floor(state?.pullsSinceLegendary || 0)) >= GACHA_PITY_LIMIT - 1;
}

export function registerGachaDraw(state, rolledRarity) {
  if (!HERO_RARITIES.includes(rolledRarity)) throw new RangeError('Unknown gacha rarity.');
  const guaranteed = isNextDrawGuaranteedLegendary(state);
  const rarity = guaranteed && HERO_RARITIES.indexOf(rolledRarity) < HERO_RARITIES.indexOf('legendary')
    ? 'legendary' : rolledRarity;
  const high = rarity === 'legendary' || rarity === 'mythic';
  return {
    rarity,
    wasGuaranteed: guaranteed && rarity !== rolledRarity,
    state: {pullsSinceLegendary: high ? 0 : Math.max(0, Math.floor(state?.pullsSinceLegendary || 0)) + 1},
  };
}

export const BATTLE_DURATION_SECONDS = 300;
function structureRatio(current, maximum) {
  if (!Number.isFinite(maximum) || maximum <= 0 || !Number.isFinite(current) ||
    current < 0 || current > maximum) throw new RangeError('Invalid building HP.');
  return current / maximum;
}
function parseSide(side) {
  if (!side) throw new TypeError('Both battle sides required.');
  const temple = structureRatio(side.templeHp,side.templeMaxHp);
  const main = structureRatio(side.mainBaseHp,side.mainBaseMaxHp);
  const mainKills = side.kills?.main ?? 0;
  const subKills = side.kills?.sub ?? 0;
  if (![mainKills,subKills].every(n => Number.isInteger(n) && n >= 0)) {
    throw new RangeError('Invalid character defeat counts.');
  }
  return {temple,main,total:temple+main,kills:mainKills+subKills,bothDestroyed:temple===0&&main===0};
}

// Each side's kills are enemy main/sub defeats. Summon defeats do not count.
// When simultaneous destruction occurs, the adjudication remains undecided.
export function resolveBattleOutcome({ally,enemy,elapsed}) {
  if (!Number.isFinite(elapsed) || elapsed < 0) throw new RangeError('Invalid battle time.');
  const a = parseSide(ally), e = parseSide(enemy);
  if (a.bothDestroyed && e.bothDestroyed) return {result:'undecided',reason:'simultaneous-destruction'};
  if (e.bothDestroyed) return {result:'ally',reason:'structures-destroyed'};
  if (a.bothDestroyed) return {result:'enemy',reason:'structures-destroyed'};
  if (elapsed < BATTLE_DURATION_SECONDS) return {result:'ongoing',reason:'time-left'};
  const difference = a.total - e.total;
  if (Math.abs(difference) > 1e-9) {
    return {result:difference > 0 ? 'ally' : 'enemy',reason:'remaining-building-ratio'};
  }
  if (a.kills !== e.kills) return {result:a.kills > e.kills ? 'ally' : 'enemy',reason:'character-defeats'};
  return {result:'draw',reason:'full-tie'};
}
