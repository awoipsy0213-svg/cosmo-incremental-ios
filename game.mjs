import {CONFIG} from "./balance-config.mjs";
import {CONTENT} from "./content.mjs";
import {PROPOSED,resourcePrototype,trialResourceWeights,naturalGrowthFactors,boostTrialCost} from "./design-proposals.mjs";
import {A,str,seriesCost,maxAffordable} from "./numbers.mjs";

const clone=x=>JSON.parse(JSON.stringify(x));
const finite=(n,fallback=0)=>typeof n==="number"&&Number.isFinite(n)?n:fallback;
const integer=(n,max=Number.MAX_SAFE_INTEGER)=>Math.max(0,Math.min(max,Math.floor(finite(n))));
const STAT_IDS=CONTENT.stats.map(x=>x.id);
const SOURCE_IDS=CONTENT.sources.map(x=>x.id);
const CONCEPT_IDS=CONTENT.concepts.map(x=>x.id);
const RESOURCE_IDS=CONTENT.resources.map(x=>x.id);
const modeSet=new Set(["1","10","NEXT","MAX"]);
const add=(a,b)=>A(a).add(b).toString();
const sub=(a,b)=>A(a).sub(b).toString();
const unknown="仕様が未決定のため、通常プレイではまだ適用しません。";

export function createState(now=Date.now(),mode="normal") {
  return {
    schemaVersion:CONFIG.schemaVersion,version:CONFIG.version,mode,
    createdAt:now,lastWall:now,revision:0,
    intro:{touches:0,complete:false},
    orbs:"0",totalOrbs:"0",surplusExistence:"0",totalExistenceEarned:"0",
    moment:{tap:0,amplify:0},
    sources:Object.fromEntries(SOURCE_IDS.map(id=>[id,{level:0,plus:0,effects:[]}])),
    convergenceCount:0,purchaseMode:"1",
    time:{unlocked:false,revealedDirections:1,selected:[0],weights:[100,0,0,0,0,0],
      elapsed:0,worldSeconds:0,eventHappened:false,residues:{},concepts:{},common:0,
      residueAccumulator:0},
    universe:{unlocked:false,planets:[],nextPlanetId:1,selectedPlanetId:null,
      maxPlanets:1,collapseCount:0,resources:{},discoveredResources:[],
      receiptMode:null,resourceAccumulator:0,unlockedRanks:[1]},
    life:{unlocked:false},
    // Separate experiment flag; never active in normal saves.
    trial:{enabled:false},
    engraving:{active:[],draft:null,observationUnlocked:false},
    boost:{seconds:0,active:false,upgrades:[0,0,0,0,0]},
    counters:{taps:0,orbsSpent:"0",sourcePurchases:0,conversions:0,onlineSeconds:0,offlineSeconds:0},
    achievements:[],events:[],settings:{compact:true,showPurchaseHints:true,affordableOnly:false,holdToBuy:true,reducedMotion:false,highContrast:false,
      lowPower:false,confirmConvergence:true,showOffline:true,notation:"auto"},
    migration:null
  };
}
export function event(s,text,now=Date.now()) {
  s.events.push({at:now,text:String(text).slice(0,500)});
  s.events=s.events.slice(-150);
}
function achievement(s,id,text) {
  if(s.achievements.includes(id))return false;
  s.achievements.push(id);if(text)event(s,text);
  return true;
}
export function existence(s) {
  return s.intro.complete?A(1).add(s.surplusExistence):A(0);
}
export function addOrbs(s,amount) {
  if(A(amount).cmp(0)<=0)return;
  s.orbs=add(s.orbs,amount);s.totalOrbs=add(s.totalOrbs,amount);
}
function spendOrbs(s,amount) {
  if(A(s.orbs).cmp(amount)<0)return false;
  s.orbs=sub(s.orbs,amount);
  s.counters.orbsSpent=add(s.counters.orbsSpent,amount);
  return true;
}
export function tapPower(s) {
  const cfg=CONFIG.provisional;
  return A(cfg.tapBase+s.moment.tap*cfg.moment.tap.amount)
    .mul(A(cfg.moment.amplify.multiplier).pow(s.moment.amplify));
}
export function production(s) {
  const cfg=CONFIG.provisional.source;
  return CONTENT.sources.reduce((sum,x,i)=>{
    const v=s.sources[x.id];
    // +倍率は設計未決定。通常では値を保護するだけ、検証のみ仮倍率。
    const plus=s.mode==="lab"?A(2).pow(v.plus):A(1);
    return sum.add(A(v.level).mul(cfg.productionPerLevel*(i+1)).mul(plus));
  },A(0));
}
export function criticalMultiplier(percent,multiplier,rng=Math.random,allowSub100=false) {
  if(!Number.isFinite(percent)||percent<0||!Number.isFinite(multiplier)||multiplier<1)throw Error("Crit設定が不正");
  if(percent>=100)return percent/100*multiplier;
  if(!allowSub100)return percent===0?1:null;
  return rng()<percent/100?multiplier:1;
}
export function tap(s) {
  s.counters.taps++;
  if(!s.intro.complete) {
    s.intro.touches++;
    if(s.intro.touches>=CONFIG.provisional.introTouches) {
      s.intro.complete=true;s.moment={tap:0,amplify:0};s.orbs="0";
      achievement(s,"foundation","最初の《存在》1が成立した。");
      return {ok:true,foundation:true,gain:"0"};
    }
    return {ok:true,intro:true,progress:s.intro.touches/CONFIG.provisional.introTouches};
  }
  const gain=tapPower(s);addOrbs(s,gain);
  return {ok:true,gain:gain.toString()};
}
function purchaseData(s,kind,id) {
  if(kind==="source"){
    const i=SOURCE_IDS.indexOf(id);if(i<0)throw Error("源IDが不正です");
    const cfg=CONFIG.provisional.source;
    return {level:s.sources[id].level,max:CONFIG.confirmed.sourceMaxLevel,
      base:A(cfg.baseCost).mul(A(cfg.tierScale).pow(i)),growth:cfg.costGrowth,
      milestones:CONFIG.confirmed.sourceMilestones};
  }
  const c=CONFIG.provisional.moment[id];
  if(!c)throw Error("刹那IDが不正です");
  return {level:s.moment[id],max:c.maxLevel,base:A(c.baseCost),growth:c.growth,
    // 刹那の節目は未定。NEXTを10固定へ置換しない。
    milestones:[]};
}
export function purchaseQuote(s,kind,id,mode=s.purchaseMode) {
  if(!modeSet.has(mode))throw Error("購入モードが不正です");
  const p=purchaseData(s,kind,id),remain=Math.max(0,p.max-p.level);
  let n=mode==="MAX"?maxAffordable(s.orbs,p.base,p.growth,p.level,remain)
    :mode==="10"?maxAffordable(s.orbs,p.base,p.growth,p.level,Math.min(10,remain))
    :Math.min(1,remain);
  if(mode==="NEXT"){
    const next=p.milestones.find(x=>x>p.level);
    if(!next)return {count:0,cost:"0",enabled:false,reason:kind==="source"?"上限到達":"刹那の節目は？？？"};
    n=next-p.level;
  }
  if(!n)return {count:0,cost:remain?seriesCost(p.base,p.growth,p.level,1).toString():"0",enabled:false,reason:remain?"資源不足":"上限到達"};
  const cost=seriesCost(p.base,p.growth,p.level,n);
  return {count:n,cost:cost.toString(),enabled:s.intro.complete&&A(s.orbs).cmp(cost)>=0,
    reason:A(s.orbs).cmp(cost)>=0?"":"資源不足"};
}
export function buy(s,kind,id) {
  const q=purchaseQuote(s,kind,id);
  if(!q.enabled)return {ok:false,reason:q.reason||"導入が未完了です"};
  spendOrbs(s,q.cost);
  if(kind==="source"){
    s.sources[id].level+=q.count;s.counters.sourcePurchases+=q.count;
    if(!s.time.unlocked && CONFIG.provisional.timeUnlock==="firstSource"){
      s.time.unlocked=true;event(s,"操作しなくても、光が生まれ始めた。《時》の兆しを観測した。");
    }
  } else s.moment[id]+=q.count;
  return {ok:true,...q};
}
export function breakthrough(s,id) {
  if(!s.sources[id])return {ok:false,reason:"源IDが不正です"};
  if(s.sources[id].level<CONFIG.confirmed.sourceMaxLevel)return {ok:false,reason:"Lv.1,000,000で限界突破"};
  if(s.mode!=="lab" && CONFIG.unresolved.sourceBreakthroughGate===null)
    return {ok:false,reason:"個別突破と30源一巡の関係は要確認です"};
  const x=s.sources[id];x.plus++;x.level=1;
  // 解放済み効果のフラグは保持。新規取得・重複加算は行わない。
  event(s,`${CONTENT.sources.find(x=>x.id===id).name} ＋${x.plus}（検証用の個別突破）`);
  return {ok:true};
}
export function convergenceQuote(s) {
  const c=CONFIG.provisional.convergence;
  const steps=maxAffordable(s.orbs,c.baseCost,c.costGrowth,0,1000000000);
  const spent=seriesCost(c.baseCost,c.costGrowth,0,steps);
  const next=seriesCost(c.baseCost,c.costGrowth,0,steps+1);
  return {steps,reward:A(c.existencePerStep).mul(steps).toString(),
    nextRequired:next.toString(),nextRemaining:next.sub(s.orbs).toString(),spent:spent.toString()};
}
export function converge(s) {
  if(!s.intro.complete)return {ok:false,reason:"最初の存在は失えません"};
  const q=convergenceQuote(s);
  if(!q.steps)return {ok:false,reason:"収束に必要なオーブが不足しています"};
  s.surplusExistence=add(s.surplusExistence,q.reward);
  s.totalExistenceEarned=add(s.totalExistenceEarned,q.reward);
  const retain=s.mode==="lab"&&s.engraving.active.includes("retain");
  if(!retain){
    s.moment={tap:0,amplify:0};
    Object.values(s.sources).forEach(x=>x.level=0);
  }
  // 仮設定の全消費。源の+と能力はデータ保護のため維持し、正式保持規則と断定しない。
  spendOrbs(s,CONFIG.provisional.convergence.spend==="all"?s.orbs:q.spent);
  s.convergenceCount++;achievement(s,"convergence","最初の通常収束を観測した。");
  event(s,`収束：存在 +${A(q.reward).toNumber().toLocaleString("ja-JP",{maximumFractionDigits:6})}`);
  return {ok:true,...q};
}
export function setPurchaseMode(s,mode) {
  if(!modeSet.has(mode))return false;s.purchaseMode=mode;return true;
}
export function setDirection(s,index,on) {
  if(!Number.isInteger(index)||index<0||index>=s.time.revealedDirections)return {ok:false,reason:"まだ認識していない方向です"};
  const a=s.time.selected;
  if(on&&!a.includes(index)){
    if(a.length>=CONFIG.confirmed.maxDirections)return {ok:false,reason:"同時に選べる方向は3つまでです"};
    a.push(index);s.time.weights[index]=20;
  } else if(!on&&a.includes(index)){
    if(a.length===1)return {ok:false,reason:"少なくとも1方向を残してください"};
    s.time.selected=a.filter(x=>x!==index);s.time.weights[index]=0;
  }
  normalizeWeights(s);return {ok:true};
}
export function normalizeWeights(s) {
  const selected=s.time.selected;
  const sum=selected.reduce((v,i)=>v+s.time.weights[i],0);
  for(let i=0;i<6;i++)s.time.weights[i]=selected.includes(i)?(sum>0?s.time.weights[i]/sum*100:100/selected.length):0;
}
export function setWeight(s,index,value){
  if(!s.time.selected.includes(index)||!Number.isFinite(value)||value<0||value>100)return false;
  s.time.weights[index]=value;normalizeWeights(s);return true;
}
export function residueDistribution(s) {
  // Flow-only 25/25/50 is in the source. Other ratios are explicitly lab-only.
  if(s.time.selected.length===1&&s.time.selected[0]===0)
    return [{id:"TC001",prob:.25},{id:"TC002",prob:.25},{id:"common",prob:.5}];
  if(s.mode!=="lab")return null;
  const eligible=CONTENT.concepts.filter(c=>c.principles.every(p=>s.time.selected.includes(CONTENT.principles.indexOf(p))));
  const weights=eligible.map(c=>c.principles.reduce((w,p)=>w*s.time.weights[CONTENT.principles.indexOf(p)]/100,1));
  const sum=weights.reduce((a,b)=>a+b,0);
  if(!sum)return [{id:"common",prob:1}];
  // Leave >=50% as common: no individual concept can exceed 50%.
  return [...eligible.map((x,i)=>({id:x.id,prob:.5*weights[i]/sum})),{id:"common",prob:.5}];
}
export function rollResidue(s,rng=Math.random) {
  const dist=residueDistribution(s);
  if(!dist)return {ok:false,reason:"この配分の確率表は？？？"};
  let r=rng(),pick=dist.at(-1).id;
  for(const x of dist){r-=x.prob;if(r<0){pick=x.id;break;}}
  if(pick==="common")s.time.common++;
  else {
    const first=!s.time.residues[pick]&&!s.time.concepts[pick];
    s.time.residues[pick]=(s.time.residues[pick]||0)+1;
    if(first)event(s,"？？？の残滓が発見されました。同じものが集まると、何かが起こるようです。");
  }
  return {ok:true,id:pick};
}
export function formConcept(s,id) {
  const c=CONTENT.concepts.find(x=>x.id===id);
  if(!c)return {ok:false,reason:"概念IDが不正です"};
  if(s.time.concepts[id])return {ok:false,reason:"Lv.2以降の必要数は？？？"};
  if((s.time.residues[id]||0)<10)return {ok:false,reason:"同じ残滓が10個必要です"};
  const notRevealed=c.principles.some(p=>CONTENT.principles.indexOf(p)>=s.time.revealedDirections);
  if(notRevealed&&s.mode!=="lab")return {ok:false,reason:"未解放方向の概念形成条件は要確認です"};
  s.time.residues[id]-=10;s.time.concepts[id]=1;
  event(s,`《${c.name}》を認識した。効果は未決定。`);
  return {ok:true};
}
export function convertCommon(s,rng=Math.random) {
  if(s.time.common<100)return {ok:false,reason:"共通の？？？が100個必要です"};
  // Equal weighting/manual trigger are configurable trial choices, NOT approved game balance.
  const id=CONCEPT_IDS[Math.min(76,Math.floor(rng()*77))];
  s.time.common-=100;s.time.residues[id]=(s.time.residues[id]||0)+1;s.counters.conversions++;
  event(s,"形になれなかった？？？から、ひとつの残滓が生まれた。");
  return {ok:true,id};
}
export function checkUniverse(s) {
  if(s.time.eventHappened)return false;
  if(s.time.revealedDirections===6&&s.time.worldSeconds>=CONFIG.confirmed.worldGoalSeconds){
    s.time.eventHappened=true;s.universe.unlocked=true;
    event(s,"《無の終焉》：増え続けた存在が干渉し、世界に初めて物質が誕生した。");
    return true;
  }
  return false;
}
export function createPlanet(s,now=Date.now()) {
  if(!s.universe.unlocked)return {ok:false,reason:"宇宙はまだ解放されていません"};
  if(s.universe.planets.length>=s.universe.maxPlanets)return {ok:false,reason:"同時生成数の上限です"};
  const id="PLANET_"+s.universe.nextPlanetId++;
  const stats=Object.fromEntries(STAT_IDS.filter(x=>x!=="age").map(x=>[x,"0"]));
  stats.mass=str(CONFIG.provisional.universe.startingMass);
  const planet={id,bornAt:now,stats,observed:[],pendingResources:{},receiptMode:null};
  s.universe.planets.push(planet);s.universe.selectedPlanetId=id;
  event(s,"ひとつの惑星が形を持ち始めた。数値の意味は、まだ分からない。",now);
  return {ok:true,id};
}
export function planet(s,id=s.universe.selectedPlanetId) {
  return s.universe.planets.find(p=>p.id===id)||null;
}
export function ageSeconds(p,now=Date.now()) {return Math.max(0,(now-p.bornAt)/1000);}
export function trialEnabled(s) {return s.mode==="lab"&&s.trial?.enabled===true;}
export function setTrialEnabled(s,enabled) {
  if(s.mode!=="lab")return {ok:false,reason:"別セーブの検証モードでのみ変更できます"};
  s.trial={enabled:!!enabled};event(s,`【検証】未決定効果の候補を${s.trial.enabled?"有効":"停止"}にした。`);
  return {ok:true,enabled:s.trial.enabled};
}
export function invest(s,id,count=1) {
  if(!RESOURCE_IDS.includes(id))return {ok:false,reason:"資源IDが不正です"};
  const p=planet(s);if(!p)return {ok:false,reason:"先に惑星を生成してください"};
  if(!Number.isSafeInteger(count)||count<1)return {ok:false,reason:"投入個数が不正です"};
  if(A(s.universe.resources[id]||0).cmp(count)<0)return {ok:false,reason:"所持数が不足しています"};
  s.universe.resources[id]=sub(s.universe.resources[id],count);
  const basic=A(count).mul(CONFIG.provisional.universe.massPerResource);
  p.stats.mass=add(p.stats.mass,basic);
  // All resources still grant mass. The extra specialization is opt-in, lab only.
  const resource=CONTENT.resources.find(x=>x.id===id);
  const special=trialEnabled(s)?resourcePrototype(resource):null;
  if(special){
    p.stats[special.stat]=add(p.stats[special.stat],A(count).mul(special.perUnit));
    if(special.stat2)p.stats[special.stat2]=add(p.stats[special.stat2],A(count).mul(special.perUnit/2));
  }
  return {ok:true,massAdded:basic.toString(),trialSpecial:special?{stat:special.stat,added:A(count).mul(special.perUnit).toString()}:null};
}
export function distributeResources(total,ids,rng=Math.random) {
  const result={};
  if(!ids.length)return result;
  const amount=A(total);
  const n=amount.toNumber();
  if(n<=10000 && Number.isFinite(n)) {
    for(let i=0;i<Math.floor(n);i++){
      const id=ids[Math.min(ids.length-1,Math.floor(rng()*ids.length))];
      result[id]=add(result[id]||0,1);
    }
  } else {
    // Technical aggregate approximation for large draws, disclosed in test mode.
    const share=amount.div(ids.length);
    ids.forEach(id=>result[id]=share.toString());
  }
  return result;
}
// Weighted lab draws can only pick already eligible resources. The proposal
// never grants a locked rank, creates synthesis, or adds a hidden pity system.
export function distributeTrialResources(total,resources,stats,rng=Math.random) {
  if(!resources.length)return {};
  const weights=trialResourceWeights(resources,stats);
  const sum=weights.reduce((a,b)=>a+b,0);
  if(!(sum>0))return {};
  const shares=weights.map(w=>w/sum);
  const amount=A(total),n=amount.toNumber(),result={};
  if(Number.isFinite(n)&&n>=0&&n<=10000){
    for(let i=0;i<Math.floor(n);i++){
      let a=Math.max(0,Math.min(.999999999999,Number(rng()))),pick=resources.at(-1).id;
      for(let j=0;j<shares.length;j++){a-=shares[j];if(a<0){pick=resources[j].id;break;}}
      result[pick]=add(result[pick]||"0",1);
    }
  }else{
    for(let i=0;i<resources.length;i++)result[resources[i].id]=amount.mul(shares[i]).toString();
  }
  return result;
}
function receive(s,bag) {
  for(const [id,v] of Object.entries(bag)){
    s.universe.resources[id]=add(s.universe.resources[id]||0,v);
    if(!s.universe.discoveredResources.includes(id))s.universe.discoveredResources.push(id);
  }
}
export function labCollapse(s,id=s.universe.selectedPlanetId,rng=Math.random) {
  if(s.mode!=="lab")return {ok:false,reason:unknown};
  const p=planet(s,id);if(!p)return {ok:false,reason:"惑星がありません"};
  if(!["A","B"].includes(s.universe.receiptMode))return {ok:false,reason:"検証用の受取方式 A / B を選んでください"};
  const ids=CONTENT.resources.filter(r=>s.universe.unlockedRanks.includes(r.rank)).map(x=>x.id);
  const units=Math.min(100000,Math.floor(A(p.stats.pressure).toNumber()/CONFIG.lab.pressureUnit));
  const reward=A(p.stats.mass).mul(A(1.1).pow(units));
  // Experimental full collapse only. Stability retention is NOT guessed/applied.
  const bag=trialEnabled(s)?distributeTrialResources(reward,CONTENT.resources.filter(r=>s.universe.unlockedRanks.includes(r.rank)),p.stats,rng):distributeResources(reward,ids,rng);
  if(s.universe.receiptMode==="A")receive(s,p.pendingResources);
  receive(s,bag);
  s.universe.planets=s.universe.planets.filter(x=>x.id!==id);
  s.universe.selectedPlanetId=s.universe.planets[0]?.id||null;
  s.universe.collapseCount++;
  s.universe.maxPlanets=Math.max(s.universe.maxPlanets,2);
  achievement(s,"planetRuin","《惑星の破滅》：最初の崩壊を観測した。2つの惑星を生成できる。");
  event(s,"【検証】惑星が崩壊し、資源を受け取った。残留処理は未決定のため未適用。");
  return {ok:true,reward:reward.toString(),bag};
}
export function stabilityPreview(value,percent) {
  if(!Number.isFinite(percent)||percent<0||percent>100)return null;
  return A(value).mul(percent/100).toString();
}
export function beginEngraving(s) {
  s.engraving.draft=[...s.engraving.active];return {ok:true};
}
export function toggleDraft(s,id) {
  if(!CONTENT.engravings.some(x=>x.id===id))return {ok:false,reason:"刻印IDが不正です"};
  if(s.engraving.draft===null)return {ok:false,reason:"編集を開始してください"};
  if(s.mode!=="lab")return {ok:false,reason:"このノードの条件・費用は？？？です"};
  const d=s.engraving.draft;s.engraving.draft=d.includes(id)?d.filter(x=>x!==id):[...d,id];
  return {ok:true};
}
export function engravingQuote(s) {
  const active=s.engraving.active, draft=s.engraving.draft||active;
  const added=draft.filter(x=>!active.includes(x));
  const removed=active.filter(x=>!draft.includes(x));
  return {added,removed,cost:A(CONFIG.lab.engravingCost).mul(added.length).toString()};
}
export function confirmEngraving(s) {
  if(s.engraving.draft===null)return {ok:false,reason:"編集中ではありません"};
  const q=engravingQuote(s);
  if(!q.added.length&&!q.removed.length){s.engraving.draft=null;return {ok:true,unchanged:true};}
  if(s.mode!=="lab")return {ok:false,reason:"再編の費用と条件は要確認です"};
  if(q.removed.length)return {ok:false,reason:"再編の返却額・消費優先順は未決定です。検証版も追加取得のみ対応。"};
  if(A(s.surplusExistence).cmp(q.cost)<0)return {ok:false,reason:"存在はなくせません。保護された1を除く余剰が必要です。"};
  s.surplusExistence=sub(s.surplusExistence,q.cost);
  s.engraving.active=[...s.engraving.draft];s.engraving.draft=null;
  event(s,"【検証】刻印の仮振りを確定した。");
  return {ok:true};
}
export function cancelEngraving(s) {s.engraving.draft=null;return {ok:true};}
export function boostValues(s) {
  // Five paths have no approved costs. Extra effects are sandbox-only.
  const u=s.mode==="lab"?s.boost.upgrades:[0,0,0,0,0],c=CONFIG.confirmed;
  // v3.5 candidate progression applies only to the isolated lab balance.
  const b=PROPOSED.boost;
  return {capacity:Math.min(b.maxCapacitySeconds,c.boostCapacitySeconds+u[4]*b.capacityStepSeconds),
    onlineRate:c.boostOnlineSecondsPerHour*(1+u[2]*b.basicGainRateStep)/3600,
    offlineRate:c.boostOfflineSecondsPerHour*(1+u[2]*b.basicGainRateStep)*(1+u[3]*b.offlineGainMultiplierStep)/3600,
    efficiency:Math.min(b.maxOfflineEfficiency,c.offlineEfficiency+u[0]*b.offlineEfficiencyStep),
    offlineCap:Math.min(b.maxOfflineCapSeconds,c.offlineCapSeconds+u[1]*b.offlineCapStepSeconds)};
}
export function labBoostUpgrade(s,index){
  if(s.mode!=="lab")return {ok:false,reason:"費用・増加幅・上限は？？？です"};
  if(!Number.isInteger(index)||index<0||index>4)return {ok:false,reason:"強化IDが不正です"};
  if(s.boost.upgrades[index]>=PROPOSED.boost.limits[index])return {ok:false,reason:"検証上限に到達しました"};
  const cost=boostTrialCost(s.boost.upgrades[index]);
  if(s.boost.seconds<cost)return {ok:false,reason:"BOOST時間が不足しています"};
  s.boost.seconds-=cost;s.boost.upgrades[index]++;return {ok:true,cost};
}
export function advance(s,now=Date.now(),{offline=false,rng=Math.random}={}) {
  const dt=Math.max(0,(now-s.lastWall)/1000);
  if(!Number.isFinite(dt)||dt<=0)return {elapsed:0,gameSeconds:0,orbs:"0",boost:0};
  s.lastWall=now;
  const b=boostValues(s),boostBefore=s.boost.seconds;
  let gameSeconds=offline?Math.min(dt,b.offlineCap)*b.efficiency:dt;
  s.boost.seconds=Math.min(b.capacity,s.boost.seconds+dt*(offline?b.offlineRate:b.onlineRate));
  if(!offline&&s.boost.active){
    const m=CONFIG.provisional.boost.multiplier;
    const extra=Math.min(s.boost.seconds,dt*(m-1));
    s.boost.seconds-=extra;gameSeconds+=extra;
    if(s.boost.seconds<=0)s.boost.active=false;
  }
  // No automatic offline BOOST spend.
  if(offline)s.boost.active=false;
  s.counters[offline?"offlineSeconds":"onlineSeconds"]+=dt;
  const gained=s.intro.complete?production(s).mul(gameSeconds):A(0);
  addOrbs(s,gained);
  if(s.time.unlocked){
    s.time.elapsed+=gameSeconds;
    // Time -> world seconds and random event interval are undefined.
    if(s.mode==="lab"){
      s.time.residueAccumulator+=gameSeconds*CONFIG.lab.residueEventsPerSecond;
      const events=Math.min(500,Math.floor(s.time.residueAccumulator));
      s.time.residueAccumulator-=events;
      for(let i=0;i<events;i++)rollResidue(s,rng);
      if(s.time.revealedDirections===6)s.time.worldSeconds+=gameSeconds*CONFIG.lab.worldSecondsPerSecond;
    }
    checkUniverse(s);
  }
  if(s.universe.unlocked){
    for(const p of s.universe.planets){
      const m=trialEnabled(s)?naturalGrowthFactors(p.stats):{activity:1,gravity:1};
      const growth=A(gameSeconds).mul(CONFIG.provisional.universe.massGrowthPerSecond).mul(m.gravity*m.activity);
      p.stats.mass=add(p.stats.mass,growth);
    }
    // Receipt timing and collapse are only simulated in isolated lab data.
    if(s.mode==="lab"&&["A","B"].includes(s.universe.receiptMode)){
      s.universe.resourceAccumulator+=gameSeconds;
      const draws=Math.min(360,Math.floor(s.universe.resourceAccumulator/CONFIG.lab.resourceInterval));
      s.universe.resourceAccumulator-=draws*CONFIG.lab.resourceInterval;
      const eligible=CONTENT.resources.filter(x=>s.universe.unlockedRanks.includes(x.rank));
      const ids=eligible.map(x=>x.id);
      for(let i=0;i<draws;i++)for(const p of s.universe.planets){
        const bag=trialEnabled(s)?distributeTrialResources(p.stats.mass,eligible,p.stats,rng):distributeResources(p.stats.mass,ids,rng);
        if(s.universe.receiptMode==="B")receive(s,bag);
        else for(const [id,v]of Object.entries(bag))p.pendingResources[id]=add(p.pendingResources[id]||0,v);
      }
      // Aggregate hazard, no predicted death timer. Offline collapse remains unimplemented.
      if(!offline){
        for(const p of [...s.universe.planets]){
          if(rng()<1-Math.exp(-CONFIG.lab.collapseHazardPerSecond*gameSeconds))labCollapse(s,p.id,rng);
        }
      }
    }
  }
  if(s.mode==="lab"&&!offline&&s.intro.complete){
    if(s.engraving.active.includes("autoTap"))addOrbs(s,tapPower(s).mul(gameSeconds));
    if(s.engraving.active.includes("autoSource")){
      const mode=s.purchaseMode;s.purchaseMode="1";
      const ids=[...SOURCE_IDS].sort((a,b)=>A(purchaseQuote(s,"source",a).cost).cmp(purchaseQuote(s,"source",b).cost));
      if(ids[0])buy(s,"source",ids[0]);s.purchaseMode=mode;
    }
    if(s.engraving.active.includes("autoConverge")&&A(s.orbs).cmp(CONFIG.lab.autoConvergeOrbs)>=0)converge(s);
  }
  return {elapsed:dt,gameSeconds,orbs:gained.toString(),boost:s.boost.seconds-boostBefore};
}
export function labAction(s,action,now=Date.now()) {
  if(s.mode!=="lab")return {ok:false,reason:"検証用セーブでのみ利用できます"};
  if(action==="orbs"){addOrbs(s,"1e12");return {ok:true};}
  if(action==="existence"){if(!s.intro.complete){s.intro.complete=true;s.intro.touches=CONFIG.provisional.introTouches;}s.surplusExistence=add(s.surplusExistence,10);return {ok:true};}
  if(action==="directions"){s.time.unlocked=true;s.time.revealedDirections=6;return {ok:true};}
  if(action==="common"){s.time.common+=100;return {ok:true};}
  if(action==="concept"){s.time.residues.TC001=(s.time.residues.TC001||0)+10;return {ok:true};}
  if(action==="world"){s.time.unlocked=true;s.time.revealedDirections=6;s.time.worldSeconds=1;checkUniverse(s);return {ok:true};}
  if(action==="sourceMax"){s.sources.SOURCE_01.level=1000000;return {ok:true};}
  if(action==="observe"){const p=planet(s);if(p)p.observed=[...STAT_IDS];s.engraving.observationUnlocked=true;achievement(s,"engravingObservation","【検証】《刻印の観測》表示を解放した。");return {ok:true};}
  if(action==="resources"){CONTENT.resources.forEach(x=>{s.universe.resources[x.id]=add(s.universe.resources[x.id]||0,100);if(!s.universe.discoveredResources.includes(x.id))s.universe.discoveredResources.push(x.id);});return {ok:true};}
  if(action==="mass"){const p=planet(s);if(!p)return {ok:false,reason:"先に惑星を生成してください"};p.stats.mass="1e2";p.stats.pressure="0";return {ok:true};}
  if(action==="collapse")return labCollapse(s);
  if(action==="life"){s.life.unlocked=true;return {ok:true};}
  if(action==="boost"){s.boost.seconds=boostValues(s).capacity;return {ok:true};}
  if(action==="offline"){s.lastWall=now-8*3600*1000;return {ok:true,report:advance(s,now,{offline:true})};}
  return {ok:false,reason:"不明な検証操作です"};
}
// Legacy migration is deliberately conservative: particles -> ordinary orbs, NOT existence.
// Unmappable dust, permanent levels and rank mechanics stay in an archived original.
export function migrateLegacy(raw,now=Date.now(),boostRaw=null) {
  const g=raw?.kind==="kotowari-backup"?raw.game:raw;
  if(!g||typeof g!=="object"||Array.isArray(g)||!Number.isFinite(g.particles)||!Number.isFinite(g.stage))
    throw Error("旧セーブ形式として認識できません");
  const s=createState(now,"normal");
  const stage=integer(g.stage,4);
  const hadProgress=stage>=1||g.particles>0||finite(g.total)>0||finite(g.clickLevel)>0||finite(g.autoLevel)>0;
  // 旧版には演出型の序章がないため、操作済みデータは導入を省略して保護する。
  s.intro.complete=hadProgress;s.intro.touches=s.intro.complete?CONFIG.provisional.introTouches:0;
  s.orbs=str(Math.max(0,g.particles));s.totalOrbs=str(Math.max(0,finite(g.total)));
  s.moment.tap=integer(g.clickLevel,1000000);
  // The old multLevel affected both tap and auto; retain it only in archive, not a guessed equivalent.
  const k=g.kotowari||{};
  SOURCE_IDS.forEach((id,i)=>s.sources[id].level=integer(k.sourceLevels?.[i],1000000));
  s.time.unlocked=stage>=2||Object.values(s.sources).some(x=>x.level>0);
  s.time.revealedDirections=stage>=2?6:1; // Old UI exposed all six; do not revoke known information.
  if(Array.isArray(k.selectedPrinciples)&&stage>=2){
    s.time.selected=[...new Set(k.selectedPrinciples.filter(x=>Number.isInteger(x)&&x>=0&&x<6))].slice(0,3);
    if(!s.time.selected.length)s.time.selected=[0];
    s.time.weights=Array.from({length:6},(_,i)=>Math.max(0,finite(k.principleWeights?.[i])));
    normalizeWeights(s);
  }
  for(const id of CONCEPT_IDS){
    if(integer(k.residues?.[id]))s.time.residues[id]=integer(k.residues[id]);
    if(integer(k.concepts?.[id]))s.time.concepts[id]=integer(k.concepts[id]);
  }
  s.time.worldSeconds=Math.max(0,finite(k.worldTime));
  s.time.eventHappened=stage>=3;s.universe.unlocked=stage>=3;s.life.unlocked=stage>=4;
  for(const r of CONTENT.resources){
    const old=`R${r.rank}-${r.id.split("_")[1]}`;
    const value=k.material?.[old]??k.material?.[r.id];
    if(typeof value==="number"&&Number.isFinite(value)&&value>=0){
      s.universe.resources[r.id]=str(value);
      if(value>0 || (k.unlockedResources||[]).includes(old))s.universe.discoveredResources.push(r.id);
    }
  }
  if(stage>=3&&k.planetStats){
    const res=createPlanet(s,now);
    const p=planet(s,res.id);
    for(const stat of CONTENT.stats.filter(x=>x.id!=="age")){
      const v=k.planetStats[stat.name];
      if(Number.isFinite(v)&&v>=0)p.stats[stat.id]=str(v);
    }
    p.bornAt=now-Math.max(0,finite(k.planetStats["星齢"]))*1000;
    p.observed=[...STAT_IDS];
  }
  if(s.intro.complete)s.achievements.push("foundation");
  const boost=boostRaw||raw.boost;
  if(boost&&Number.isFinite(boost.seconds))s.boost.seconds=Math.max(0,Math.min(3600,boost.seconds));
  s.settings={...s.settings,...Object.fromEntries(Object.entries(raw.settings||{}).filter(([k,v])=>k in s.settings && typeof v===typeof s.settings[k]))};
  s.migration={from:"legacy-v01-v30",at:now,legacyStage:stage,
    preserved:["オーブ","累計オーブ","タップ効率レベル","源レベル","残滓・概念","宇宙資源","既知ステージ"],
    archived:["星屑","旧永続強化","旧増幅器","自動生成装置","惑星ランク・欠片","旧崩壊回数"],
    note:"旧版の数値を新しい存在値へ推測変換していません。旧キー・旧版プレイは残ります。"};
  if(Array.isArray(g.events))s.events=g.events.filter(x=>x&&Number.isFinite(x.at)&&typeof x.text==="string").slice(-100).map(x=>({at:x.at,text:"【旧版】"+x.text.slice(0,450)}));
  event(s,"Ver.3.1へ安全に移行。対応が未決定の旧値は旧版に保管しています。",now);
  // Offline accounting uses new rules once, at load, not every refresh.
  s.lastWall=Math.min(now,Math.max(s.createdAt-31536000000,finite(g.lastSave,now)));
  return s;
}
export function validateState(input,expectedMode=null) {
  if(!input||typeof input!=="object"||Array.isArray(input)||input.schemaVersion!==31)
    throw Error("この版で扱えないセーブ形式です");
  const s=clone(input),fail=msg=>{throw Error("セーブが不正です："+msg);};
  if(!["normal","lab"].includes(s.mode))fail("モード");
  if(expectedMode&&s.mode!==expectedMode)fail("通常データと検証データは混ぜられません");
  for(const k of ["createdAt","lastWall"])if(!Number.isFinite(s[k])||s[k]<0||s[k]>1e15)fail(k);
  for(const k of ["orbs","totalOrbs","surplusExistence","totalExistenceEarned"])s[k]=str(s[k]);
  if(typeof s.intro?.complete!=="boolean"||!Number.isSafeInteger(s.intro.touches)||s.intro.touches<0)fail("導入");
  if(!Number.isSafeInteger(s.revision)||s.revision<0)fail("保存世代");
  for(const k of ["tap","amplify"])if(!Number.isInteger(s.moment?.[k])||s.moment[k]<0||s.moment[k]>1000000)fail("刹那");
  for(const id of SOURCE_IDS){
    const x=s.sources?.[id];
    if(!x||!Number.isInteger(x.level)||x.level<0||x.level>1000000||!Number.isInteger(x.plus)||x.plus<0||x.plus>1000000)fail("源 "+id);
    if(!Array.isArray(x.effects)||x.effects.length>7||x.effects.some(y=>typeof y!=="string"))fail("源効果");
  }
  if(!modeSet.has(s.purchaseMode))fail("購入モード");
  if(!Number.isInteger(s.convergenceCount)||s.convergenceCount<0)fail("収束回数");
  const t=s.time;if(!t||typeof t.unlocked!=="boolean"||!Number.isInteger(t.revealedDirections)||t.revealedDirections<1||t.revealedDirections>6)fail("時");
  if(!Array.isArray(t.selected)||!t.selected.length||t.selected.length>3||new Set(t.selected).size!==t.selected.length||t.selected.some(i=>!Number.isInteger(i)||i<0||i>=t.revealedDirections))fail("配分");
  if(!Array.isArray(t.weights)||t.weights.length!==6||t.weights.some(v=>!Number.isFinite(v)||v<0||v>100))fail("比率");
  for(const k of ["elapsed","worldSeconds","common","residueAccumulator"])if(!Number.isFinite(t[k])||t[k]<0)fail("時の数値");
  if(!Number.isSafeInteger(t.common))fail("共通残滓");
  for(const key of ["residues","concepts"]){
    if(!t[key]||typeof t[key]!=="object"||Array.isArray(t[key]))fail("概念データ");
    for(const [id,v] of Object.entries(t[key]))if(!CONCEPT_IDS.includes(id)||!Number.isSafeInteger(v)||v<0)fail("概念ID・数量");
  }
  const u=s.universe;if(!u||!Array.isArray(u.planets)||u.planets.length>20)fail("宇宙");
  if(!Number.isInteger(u.maxPlanets)||u.maxPlanets<1||u.maxPlanets>20||!Number.isInteger(u.nextPlanetId)||u.nextPlanetId<1)fail("惑星数");
  if(new Set(u.planets.map(p=>p.id)).size!==u.planets.length)fail("惑星ID重複");
  for(const p of u.planets){
    if(typeof p.id!=="string"||!/^PLANET_\d+$/.test(p.id)||!Number.isFinite(p.bornAt)||p.bornAt<0)fail("惑星ID・星齢");
    for(const id of STAT_IDS.filter(x=>x!=="age"))p.stats[id]=str(p.stats?.[id]);
    if(!Array.isArray(p.observed)||p.observed.some(x=>!STAT_IDS.includes(x)))fail("観測");
    for(const [id,v]of Object.entries(p.pendingResources||{})){if(!RESOURCE_IDS.includes(id))fail("報酬ID");p.pendingResources[id]=str(v);}
  }
  if(!u.resources||typeof u.resources!=="object"||Array.isArray(u.resources))fail("資源");
  for(const [id,v] of Object.entries(u.resources)){if(!RESOURCE_IDS.includes(id))fail("資源ID");u.resources[id]=str(v);}
  if(!Array.isArray(u.discoveredResources)||u.discoveredResources.some(id=>!RESOURCE_IDS.includes(id)))fail("資源発見");
  if(!Array.isArray(u.unlockedRanks)||u.unlockedRanks.some(x=>!Number.isInteger(x)||x<1||x>6))fail("Rank");
  if(![null,"A","B"].includes(u.receiptMode))fail("受取方式");
  const e=s.engraving;if(!e||!Array.isArray(e.active)||e.active.some(x=>!CONTENT.engravings.some(y=>y.id===x)))fail("刻印");
  if(e.draft!==null&&(!Array.isArray(e.draft)||e.draft.some(x=>!CONTENT.engravings.some(y=>y.id===x))))fail("仮振り");
  const b=s.boost;if(!b||!Number.isFinite(b.seconds)||b.seconds<0||!Array.isArray(b.upgrades)||b.upgrades.length!==5||b.upgrades.some(x=>!Number.isInteger(x)||x<0||x>10000))fail("BOOST");
  if(typeof b.active!=="boolean")fail("BOOST状態");
  if(s.trial===undefined)s.trial={enabled:false};
  if(!s.trial||typeof s.trial!=="object"||Array.isArray(s.trial)||typeof s.trial.enabled!=="boolean")fail("検証設定");
  if(s.mode==="normal"&&s.trial.enabled)fail("試案設定が通常データへ混入しています");
  if(s.mode==="normal" && (u.receiptMode!==null||e.active.length||b.upgrades.some(x=>x!==0)))fail("検証専用値が通常データへ混入しています");
  if(!s.counters||!s.settings||!s.life)fail("基本情報");
  for(const key of ["taps","sourcePurchases","conversions","onlineSeconds","offlineSeconds"])if(!Number.isFinite(s.counters[key])||s.counters[key]<0)fail("カウンター");
  s.counters.orbsSpent=str(s.counters.orbsSpent);
  if(!Array.isArray(s.events)||s.events.length>150||s.events.some(x=>!Number.isFinite(x.at)||typeof x.text!=="string"||x.text.length>500))fail("年表");
  if(!Array.isArray(s.achievements)||s.achievements.some(x=>typeof x!=="string"))fail("実績");
  const defaults=createState();
  s.settings={...defaults.settings,...Object.fromEntries(Object.entries(s.settings).filter(([k,v])=>k in defaults.settings&&typeof v===typeof defaults.settings[k]))};
  if(!["auto","scientific"].includes(s.settings.notation))s.settings.notation="auto";
  s.boost.seconds=Math.min(s.boost.seconds,boostValues(s).capacity);
  normalizeWeights(s);
  return s;
}
