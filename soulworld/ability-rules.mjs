// Soul World: confirmed ability slot mechanics (decisions 143-147, 153-162).
// Pure rules; no save-key changes. Rarity odds, point costs and unique abilities
// remain unspecified and must be supplied by a future, approved ruleset.
export const MAX_ABILITY_SLOTS = 6;
export const AUTO_REROLL_INTERVAL_SECONDS = 2.75;
export const NORMAL_ABILITY_RANGES = Object.freeze({
  low: Object.freeze({min: 1, max: 4}),
  mid: Object.freeze({min: 3, max: 6}),
  high: Object.freeze({min: 5, max: 10}),
});

export function unlockedAbilitySlots(breakthroughs) {
  if (!Number.isInteger(breakthroughs) || breakthroughs < 0) {
    throw new RangeError('Breakthrough count must be a nonnegative integer.');
  }
  return Math.min(MAX_ABILITY_SLOTS, breakthroughs);
}

export function assertNormalAbility(ability) {
  if (!ability || typeof ability.type !== 'string' || !ability.type.trim()) {
    throw new TypeError('A rolled ability needs a type.');
  }
  const band = NORMAL_ABILITY_RANGES[ability.quality];
  if (!band || !Number.isFinite(ability.percent) ||
      ability.percent < band.min || ability.percent > band.max) {
    throw new RangeError('Ability quality and percent must match its confirmed range.');
  }
  return ability;
}

function rollSlot(roll) {
  if (typeof roll !== 'function') throw new TypeError('A roll callback is required.');
  const ability = assertNormalAbility(roll());
  return {type: ability.type, quality: ability.quality,
    percent: ability.percent, locked: false};
}

export function unlockAbilitySlot(slots, roll) {
  if (!Array.isArray(slots)) throw new TypeError('Slots must be an array.');
  if (slots.length >= MAX_ABILITY_SLOTS) return slots.map(x => ({...x}));
  return [...slots.map(x => ({...x})), rollSlot(roll)];
}

export function setAbilitySlotLock(slots, index, locked) {
  if (!Array.isArray(slots) || !Number.isInteger(index) ||
      index < 0 || index >= slots.length) throw new RangeError('Invalid slot.');
  return slots.map((slot, i) => i === index ? {...slot, locked: Boolean(locked)} : {...slot});
}

export function rerollUnlockedAbilitySlots(slots, roll) {
  if (!Array.isArray(slots)) throw new TypeError('Slots must be an array.');
  // All unprotected slots are replaced together; protected abilities are preserved.
  return slots.map(slot => slot.locked ? {...slot} : rollSlot(roll));
}

export function meetAutoRerollTargets(slots, targets) {
  if (!Array.isArray(targets) || targets.length === 0) return false;
  return targets.every(target => slots.some(slot =>
    slot.type === target.type &&
    (!target.quality || slot.quality === target.quality) &&
    Number.isFinite(target.minPercent) && slot.percent >= target.minPercent));
}

export function advanceAutoReroll(slots, auto, seconds, roll) {
  if (!Array.isArray(slots) || !auto || !Number.isFinite(seconds) || seconds < 0) {
    throw new TypeError('Invalid auto-reroll arguments.');
  }
  let result = slots.map(slot => ({...slot}));
  const state = {...auto, elapsed: Math.max(0, auto.elapsed || 0), rolls: Math.max(0, auto.rolls || 0)};
  if (!state.enabled || meetAutoRerollTargets(result, state.targets)) {
    if (state.enabled && meetAutoRerollTargets(result, state.targets)) state.enabled = false;
    return {slots: result, auto: state};
  }
  if (!result.some(slot => !slot.locked)) return {slots: result, auto: state};
  state.elapsed += seconds;
  while (state.elapsed >= AUTO_REROLL_INTERVAL_SECONDS) {
    state.elapsed -= AUTO_REROLL_INTERVAL_SECONDS;
    result = rerollUnlockedAbilitySlots(result, roll);
    state.rolls++;
    if (meetAutoRerollTargets(result, state.targets)) {
      state.enabled = false;
      break;
    }
  }
  return {slots: result, auto: state};
}
