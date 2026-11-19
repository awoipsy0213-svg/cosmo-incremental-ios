/*
 * 《理》 Ver.3.19 telemetry.
 * Confirmed U-31/U-33/U-34: use actual awarded orbs, sample online
 * in 5-second buckets for the last 10 minutes (max 120 real samples),
 * retain up to 10 offline reports and 20 convergence entries.
 * Do not invent values for elapsed periods without a recorded sample.
 */
import {A,str} from "./numbers.mjs";

export const TELEMETRY_LIMITS=Object.freeze({
  sampleIntervalMs:5000,onlineWindowMs:600000,onlineSamples:120,
  offlineReports:10,convergences:20
});
export const freshTelemetry=()=>({
  onlineSamples:[],offlineReports:[],convergences:[]
});
function assertTime(n){
  return typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=1e15;
}
export function sampleActualOrbs(t,now,totalOrbs){
  if(!assertTime(now))return false;
  const at=Math.floor(now/TELEMETRY_LIMITS.sampleIntervalMs)*TELEMETRY_LIMITS.sampleIntervalMs;
  const total=str(totalOrbs);
  const last=t.onlineSamples.at(-1);
  // Device clocks sometimes move backwards. Never rewrite historic observations.
  if(last&&at<last.at)return false;
  if(last&&at===last.at)last.total=total;
  else t.onlineSamples.push({at,total});
  t.onlineSamples=t.onlineSamples.filter(x=>x.at>at-TELEMETRY_LIMITS.onlineWindowMs)
    .slice(-TELEMETRY_LIMITS.onlineSamples);
  return true;
}
export function recordOfflineReport(t,{at,seconds,effectiveSeconds,orbs,boostEarned}){
  if(!assertTime(at)||!Number.isFinite(seconds)||seconds<0||
     !Number.isFinite(effectiveSeconds)||effectiveSeconds<0||
     !Number.isFinite(boostEarned)||boostEarned<0)
    throw new Error("オフラインの測定値が不正");
  t.offlineReports.push({
    at,seconds,effectiveSeconds,orbs:str(orbs),boostEarned
  });
  t.offlineReports=t.offlineReports.slice(-TELEMETRY_LIMITS.offlineReports);
}
export function recordConvergence(t,{at,reward,steps}){
  if(!assertTime(at)||!Number.isSafeInteger(steps)||steps<1)
    throw new Error("収束履歴が不正");
  t.convergences.push({at,reward:str(reward),steps});
  t.convergences=t.convergences.slice(-TELEMETRY_LIMITS.convergences);
}
export function consecutiveOrbGains(t){
  const rows=t.onlineSamples;
  return rows.slice(1).map((row,i)=>{
    const previous=rows[i];
    return {at:row.at,seconds:(row.at-previous.at)/1000,
      // No synthetic interpolation across sleep/throttling/offline gaps.
      gain:row.at-previous.at===TELEMETRY_LIMITS.sampleIntervalMs?
        A(row.total).sub(previous.total).toString():null};
  });
}
export function validateTelemetry(value){
  if(!value||typeof value!=="object"||Array.isArray(value)||
     !Array.isArray(value.onlineSamples)||
     !Array.isArray(value.offlineReports)||
     !Array.isArray(value.convergences)||
     value.onlineSamples.length>TELEMETRY_LIMITS.onlineSamples||
     value.offlineReports.length>TELEMETRY_LIMITS.offlineReports||
     value.convergences.length>TELEMETRY_LIMITS.convergences)
    throw new Error("統計履歴の形式が不正");
  const clean=freshTelemetry();
  let prior=-1;
  for(const entry of value.onlineSamples){
    if(!entry||!assertTime(entry.at)||entry.at%5000!==0||
       entry.at<=prior)throw new Error("統計の測定時刻が不正");
    prior=entry.at;
    clean.onlineSamples.push({at:entry.at,total:str(entry.total)});
  }
  if(clean.onlineSamples.length&&
    clean.onlineSamples.at(-1).at-clean.onlineSamples[0].at>TELEMETRY_LIMITS.onlineWindowMs)
    throw new Error("統計の保持期間が不正");
  for(const entry of value.offlineReports){
    if(!entry||!assertTime(entry.at)||!Number.isFinite(entry.seconds)||entry.seconds<0||
       !Number.isFinite(entry.effectiveSeconds)||entry.effectiveSeconds<0||
       !Number.isFinite(entry.boostEarned)||entry.boostEarned<0)
      throw new Error("オフライン履歴が不正");
    clean.offlineReports.push({at:entry.at,seconds:entry.seconds,
      effectiveSeconds:entry.effectiveSeconds,orbs:str(entry.orbs),
      boostEarned:entry.boostEarned});
  }
  for(const entry of value.convergences){
    if(!entry||!assertTime(entry.at)||!Number.isSafeInteger(entry.steps)||entry.steps<1)
      throw new Error("収束の履歴が不正");
    clean.convergences.push({at:entry.at,reward:str(entry.reward),steps:entry.steps});
  }
  return clean;
}
