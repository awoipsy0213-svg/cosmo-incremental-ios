import {A} from "./numbers.mjs";
// Presentation only. Read engine state; never grant resources or modify progression.
export const UNLOCK_COPY=Object.freeze({
  time:{title:"《時》と《源》解放",condition:"当周回の累計獲得オーブ 1,000,000 に到達",lines:["《源》を購入すると、時間経過でオーブを生み出せます。","《時》では方向を選択し、残滓から概念を認識します。","収束しても解放した機能は残ります。"],target:"time",icon:"時"},
  engraving:{title:"《刻印》解放",condition:"初めての収束を完了",lines:["収束で得た余剰存在を使い、永続的に強化できます。","便利な操作や自動化も、対応する刻印で解放されます。","最初の存在1は失われません。"],target:"engraving",icon:"刻"},
  universe:{title:"《宇宙》解放",condition:"世界に初めて物質が誕生",lines:["惑星を生み、時間とともに変化を観測します。","資源を獲得し、惑星への干渉に利用します。"],target:"universe",icon:"宇"},
  life:{title:"《生命》解放",condition:"生命の兆しを認識",lines:["新しい段階に到達しました。","生命の世界を観測できます。"],target:"life",icon:"生"},
  bulk:{title:"一括購入 解放",condition:"対応する刻印を取得",lines:["刹那・源の一括ボタンで、複数の強化を購入できます。","対象と購入順を選択できます。"],target:"moment",icon:"⟲"},
  auto:{title:"自動購入 解放",condition:"対応する刻印を取得",lines:["自動化メニューで、解放済みの機能を設定できます。","個別のON/OFFや購入順を選択できます。"],target:"automation",icon:"⟳"}
});
export function uxSnapshot(s,engravingReady,milestones,autoReady=false){
  const moment=Object.values(s.moment||{}).map(Number);
  const sources=Object.values(s.sources||{});
  const levels=moment.reduce((a,b)=>a+(Number.isFinite(b)?b:0),0)+sources.reduce((a,b)=>a+(Number(b.level)||0),0);
  const kinds=moment.filter(v=>v>0).length+sources.filter(v=>v.level>0).length;
  const owned=s.engraving?.owned||[];
  return {intro:!!s.intro?.complete,time:!!s.time?.unlocked,engraving:!!engravingReady,
    universe:!!s.universe?.unlocked,life:!!s.life?.unlocked,bulk:owned.includes("ENG-05"),auto:!!autoReady,
    convergence:Number(s.convergenceCount)||0,levels,
    engravingLevels:Object.values(s.engraving?.levels||{}).reduce((a,b)=>a+(Number(b)||0),0),
    milestones:sources.reduce((a,b)=>a+milestones.filter(n=>b.level>=n).length+(Number(b.plus)||0)*milestones.length,0),
    growth:Math.min(1,Math.log10(1+Math.max(0,levels))/6+kinds/120+(Number(s.convergenceCount)||0)/100)};
}
export function uxChanges(before,after){
  if(!before||!after||!before.intro||!after.intro)return {unlocks:[],feedback:null};
  const unlocks=Object.keys(UNLOCK_COPY).filter(id=>!before[id]&&after[id]);
  const feedback=after.convergence>before.convergence?"convergence":
    after.milestones>before.milestones?"milestone":
    after.levels>before.levels||after.engravingLevels>before.engravingLevels?"purchase":null;
  return {unlocks,feedback};
}
export function unlockRatio(earned,target){
  const n=Number(earned),d=Number(target);
  return Number.isFinite(d)&&d>0?Math.max(0,Math.min(1,Number.isNaN(n)?0:n/d)):0;
}

/** UI-only grouping: resource accounting is already committed by the engine. */
export function accumulateTapGain(previous,gain,at,labels=[]){
  const value=A(gain);
  if(value.cmp(0)<=0)return previous;
  const same=previous&&at>=previous.startedAt&&at-previous.startedAt<250;
  return {
    startedAt:same?previous.startedAt:at,
    amount:(same?A(previous.amount).add(value):value).toString(),
    count:same?previous.count+1:1,
    labels:[...new Set([...(same?previous.labels:[]),...labels])]
  };
}
/** Optional next actions. Never change state, promise an optimal route or reveal locked names. */
export function guideSteps(s,engravingReady,canConverge){
  const items=[];
  const add=(target,title,description)=>items.push({target,title,description});
  if(!s.intro?.complete){
    add("touch","光に触れる","最初の存在を生み出す。");
    return items;
  }
  if(!s.time?.unlocked){
    add("moment","刹那を確認","購入できる強化からタップの効果を高める。");
    add("touch","？？？の解放を目指す","当周回の累計獲得オーブを増やす。強化に使っても累計は減らない。");
    if(canConverge)add("convergence","収束を確認","獲得予定の存在を確認する。");
    return items;
  }
  const owned=s.engraving?.owned||[];
  if(engravingReady&&!owned.length)add("engraving","刻印を確認","余剰存在で永続的な強化を取得できる。");
  if(!Object.values(s.sources||{}).some(x=>x.level>0))add("sources","源を確認","購入できる源から自動生成を始める。");
  if(s.life?.unlocked)add("life","生命を観測","解放された世界を確認する。");
  else if(s.universe?.unlocked)add("universe","宇宙を観測","惑星と資源の進行を確認する。");
  else add("time","時を観測","六角形の方向を選び、残滓から概念を認識する。");
  if(canConverge)add("convergence","収束を確認","獲得予定の存在とリセット内容を確認する。実行は任意。");
  if(!items.some(x=>x.target==="sources"))add("sources","源を強化","現在の生成能力と購入できる強化を確認する。");
  if(engravingReady&&owned.length)add("engraving","刻印を確認","永続強化と便利機能を確認する。");
  return items.slice(0,3);
}


/** Presentation snapshots of already earned counts. Never infer legacy purchases. */
export function residueSnapshot(t){
  return {unlocked:!!t?.unlocked,totals:{...t?.growth?.totals},
    recognized:{...t?.concepts,...t?.growth?.recognized},
    common:String(t?.common||0),converted:String(t?.growth?.converted||0)};
}
export function residueGains(before,after){
  if(!before||!after?.unlocked)return [];
  const out=[];
  const conversions=after.converted===before.converted?0n:BigInt(after.converted)-BigInt(before.converted);
  if(conversions<0n)return [];
  const common=BigInt(after.common)-BigInt(before.common)+100n*conversions;
  if(common>0n)out.push({id:"common",count:common,first:false,recognized:false});
  for(const [id,value] of Object.entries(after.totals)){
    const prior=before.totals[id]||"0";
    if(value===prior)continue;
    const count=BigInt(value)-BigInt(prior);
    if(count>0n)out.push({id,count,first:BigInt(prior)===0n,
      recognized:!before.recognized[id]&&!!after.recognized[id]});
  }
  return out;
}
export function mergeResidueFeedback(pending,gains){
  const map=new Map(pending);
  for(const g of gains){
    const old=map.get(g.id);
    map.set(g.id,{id:g.id,count:(old?.count||0n)+g.count,
      first:!!(old?.first||g.first),recognized:!!(old?.recognized||g.recognized)});
  }
  return map;
}
export function residueFeedbackRows(pending){
  // Common gains must remain separate from individual/converted residues.
  const rows=[...pending.values()].sort((a,b)=>Number(b.id==="common")-Number(a.id==="common")||
    Number(b.recognized)-Number(a.recognized)||Number(b.first)-Number(a.first));
  if(rows.length<=4)return rows;
  const tail=rows.slice(3);
  return [...rows.slice(0,3),{id:"aggregate",count:tail.reduce((n,g)=>n+g.count,0n),kinds:tail.length,
    first:tail.some(g=>g.first),recognized:tail.some(g=>g.recognized)}];
}
