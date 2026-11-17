// Non-authoritative UI-only shopping insights for Kotowari.
// Never changes currency, game effects, reset rules, or unlock conditions.
import {A} from './numbers.mjs';

export function shortDuration(seconds) {
  if (!Number.isFinite(seconds)) return '計測範囲外';
  if (seconds <= 0) return '今すぐ';
  if (seconds < 1) return '1秒未満';
  const s = Math.ceil(seconds);
  if (s < 60) return `${s}秒`;
  if (s < 3600) return `${Math.floor(s / 60)}分${String(s % 60).padStart(2, '0')}秒`;
  if (s < 86400) return `${Math.floor(s / 3600)}時間${Math.floor(s % 3600 / 60)}分`;
  return `${Math.floor(s / 86400)}日${Math.floor(s % 86400 / 3600)}時間`;
}

export function purchaseInsight(quote, owned, rate, tapPower) {
  const cost = A(quote.cost || 0);
  const budget = A(owned);
  // Cost=0 in quotes represents a non-purchasable state, not a free upgrade.
  const hasTarget = cost.cmp(0) > 0 && (quote.count > 0 || quote.reason === '資源不足');
  if (!hasTarget) return {hasTarget:false, ready:false, progress:0, missing:'0', seconds:null, taps:null};
  const ready = !!quote.enabled && budget.cmp(cost) >= 0;
  const missing = budget.cmp(cost) >= 0 ? A(0) : cost.sub(budget);
  const ratio = budget.div(cost).toNumber();
  const progress = Math.max(0, Math.min(100, Number.isFinite(ratio) ? ratio * 100 : budget.cmp(cost)>=0 ? 100 : 0));
  const rateA = A(rate);
  const tapA = A(tapPower);
  const seconds = ready ? 0 : rateA.cmp(0)>0 ? missing.div(rateA).toNumber() : null;
  const taps = ready ? 0 : tapA.cmp(0)>0 ? missing.div(tapA).toNumber() : null;
  return {hasTarget:true, ready, progress, missing:missing.toString(), seconds, taps};
}
export function formatTaps(n) {
  if (n === null) return '計算不可';
  if (!Number.isFinite(n)) return '非常に多い';
  if (n > 1e12) return `${n.toExponential(1)}回`;
  return `${Math.max(0, Math.ceil(n)).toLocaleString('ja-JP')}回`;
}
