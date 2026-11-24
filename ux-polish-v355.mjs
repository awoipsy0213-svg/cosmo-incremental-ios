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
