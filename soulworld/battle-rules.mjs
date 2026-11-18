// Soul World: confirmed battle timing and mana rules.
// This module is intentionally pure and does not change save keys.
export const BATTLE_LIMIT_SECONDS = 300;
export const MANA_MAX = 100;
export const MANA_REGEN_SECONDS = 2;
export const MANA_REGEN_AMOUNT = 1;
export const ENEMY_KILL_MANA = Object.freeze({sub: 1, main: 20, summon: 5});
export const MAIN_REVIVE_WAIT_SECONDS = 20;

export function createBattleManaState() {
  return {mana: 0, manaRegenSeconds: 0, reviveCount: 0};
}
export function addBattleMana(battle, amount) {
  if (!Number.isFinite(amount) || amount <= 0) return battle.mana;
  battle.mana = Math.min(MANA_MAX, Math.max(0, battle.mana || 0) + amount);
  return battle.mana;
}
export function advanceBattleMana(battle, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return battle.mana;
  battle.manaRegenSeconds = (battle.manaRegenSeconds || 0) + seconds;
  const ticks = Math.floor((battle.manaRegenSeconds + 1e-9) / MANA_REGEN_SECONDS);
  if (ticks > 0) {
    battle.manaRegenSeconds -= ticks * MANA_REGEN_SECONDS;
    addBattleMana(battle, ticks * MANA_REGEN_AMOUNT);
  }
  return battle.mana;
}
export function manaForEnemyDefeat(battle, enemyKind) {
  return addBattleMana(battle, ENEMY_KILL_MANA[enemyKind] || 0);
}
export function nextMainReviveCost(battle) {
  return Math.min(100, 20 + Math.max(0, Math.floor(battle.reviveCount || 0)) * 10);
}
export function canReviveMain(battle, secondsSinceDefeat, templeIntact) {
  return templeIntact === true && secondsSinceDefeat >= MAIN_REVIVE_WAIT_SECONDS && (battle.mana || 0) >= nextMainReviveCost(battle);
}
export function spendForMainRevive(battle, secondsSinceDefeat, templeIntact) {
  if (!canReviveMain(battle, secondsSinceDefeat, templeIntact)) return false;
  battle.mana -= nextMainReviveCost(battle);
  battle.reviveCount = Math.max(0, Math.floor(battle.reviveCount || 0)) + 1;
  return true;
}
