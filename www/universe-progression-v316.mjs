/*
 * 《理》宇宙 — observation/core/life progression.
 * Pure progression helpers; no DOM or storage. Values are additive to v31 saves.
 * The known heat/pressure phenomena are required before core construction.
 */
export const KNOWLEDGE_IDS=Object.freeze(["heat","pressure","pulse","surface","collision","transfer","collapse","stability"]);
export const KNOWLEDGE_NAMES=Object.freeze({
  heat:"熱の循環",pressure:"内部圧力",pulse:"脈動",
  surface:"地表の変化",collision:"惑星衝突",transfer:"成長の移転",
  collapse:"惑星崩壊",stability:"安定化"
});
const num=v=>{const n=Number(v||0);return Number.isNaN(n)?0:Math.max(0,n);};
export function knowledgeLevel(universe,id){return Math.min(100,num(universe?.knowledge?.[id]));}
export function addKnowledge(universe,id,points=10){
  if(!KNOWLEDGE_IDS.includes(id))return false;
  if(!universe.knowledge||typeof universe.knowledge!=="object")universe.knowledge={};
  const old=knowledgeLevel(universe,id);
  universe.knowledge[id]=Math.min(100,old+Math.max(0,points));
  return old<100 && universe.knowledge[id]===100;
}
export function coreRequirements(p,universe){
  if(!p)return {ok:false,reason:"惑星が存在しません"};
  if(p.core?.formed||p.core?.started)return {ok:false,reason:"コア形成は既に進行中、または完成済みです"};
  const require={energy:2000,pressure:1000,temperature:1000};
  for(const [key,min] of Object.entries(require)){
    if(num(p.stats?.[key])<min)return {ok:false,reason:"エネルギー2000・圧力1000・温度1000が必要です"};
  }
  if(knowledgeLevel(universe,"heat")<100||knowledgeLevel(universe,"pressure")<100)
    return {ok:false,reason:"熱の循環と内部圧力の理解度100が必要です"};
  return {ok:true};
}
export function makeCoreState(old={}){
  const core={formed:false,started:false,progress:0,pulses:0,pulseAccumulator:0,surfaceCount:0,lifeStage:0,lifeEvidence:0,...old};
  if(core.formed)core.progress=100;
  return core;
}
/* Advance over effective game seconds; only pass event summaries on milestones.
 * This intentionally does not grant free resources or force a life purchase.
 * A planet losing its thresholds pauses construction.
 */
export function advanceCore(p,universe,seconds,announce=()=>{}){
  const core=p.core=makeCoreState(p.core);
  const report={formed:false,pulses:0,surface:0,life:false};
  if(!(seconds>0)||!Number.isFinite(seconds))return report;
  if(core.started&&!core.formed){
    const ready= num(p.stats.energy)>=2000 && num(p.stats.pressure)>=1000 &&
      num(p.stats.temperature)>=1000 && knowledgeLevel(universe,"heat")>=100 &&
      knowledgeLevel(universe,"pressure")>=100;
    if(ready){
      core.progress=Math.min(100,core.progress+seconds/1800*100);
      if(core.progress>=100){
        core.formed=true;core.started=false;report.formed=true;
        announce("惑星内部にコアが形成された。脈動が始まる。");
      }
    }
  }
  if(!core.formed)return report;
  const oldPulses=core.pulses;
  const total=core.pulseAccumulator+seconds;
  report.pulses=Math.floor(total/60);
  core.pulseAccumulator=total-report.pulses*60;
  core.pulses+=report.pulses;
  // Only once each five pulses; qualifying internal conditions apply.
  if(report.pulses>0&&core.pulses>=5){
    const oldSurface=oldPulses>=5?Math.floor((oldPulses-5)/5)+1:0;
    const newSurface=core.pulses>=5?Math.floor((core.pulses-5)/5)+1:0;
    const amount=Math.max(0,newSurface-oldSurface);
    if(amount>0&&num(p.stats.temperature)>=1000&&num(p.stats.energy)>=2000){
      core.surfaceCount+=amount;report.surface=amount;
      addKnowledge(universe,"surface",amount*10);
      addKnowledge(universe,"pulse",amount*10);
      announce("脈動が地表へ伝わり、新たな変化が観測された。");
    }
  }
  if(core.pulses>=10&&core.surfaceCount>=3&&core.lifeStage===0){
    core.lifeStage=1;core.lifeEvidence=0;
    announce("未知の変化が、地表で繰り返され始めた。");
  }
  if(core.lifeStage===1&&report.surface>0){
    core.lifeEvidence+=report.surface;
    if(core.lifeEvidence>=20){
      core.lifeStage=2;core.lifeEvidence=0;
      announce("変化の中に、自己を保つ構造が現れた。");
    }
  }else if(core.lifeStage===2&&report.surface>0){
    core.lifeEvidence+=report.surface;
    if(core.lifeEvidence>=3){
      core.lifeStage=3;report.life=true;
      announce("似た構造が増え続ける。理は《生命》を認識した。");
    }
  }
  return report;
}
export function autoPlanetAvailable(universe){
  return universe.collapseCount>=20&&universe.maxPlanets>=5 &&
    knowledgeLevel(universe,"collapse")>=100;
}
