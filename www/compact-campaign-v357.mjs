// Compact campaign integration. No access to localStorage or trial grants.
import {G as C} from "./compact-economy-v357.mjs";
import {A,Amount,seriesCost} from "./numbers.mjs";
export {C};
export const isCompact=s=>!!s&&Object.prototype.hasOwnProperty.call(s,"compactEconomy");
export const fromLog=x=>Amount.fromLog10(x);
export const toLog=x=>{const n=A(x);return n.m?Math.log10(n.m)+n.e:C.Z;};
export const pack=c=>JSON.parse(C.encode(c));
export const unpack=s=>C.decode(JSON.stringify(s.compactEconomy));
export const freshCompact=()=>pack(C.fresh());
export function mirrors(c){return {orbs:fromLog(c.orbs).toString(),runOrbsEarned:fromLog(c.runEarned).toString(),surplusExistence:fromLog(c.existence).toString(),totalExistenceEarned:fromLog(c.lifetime).toString(),convergenceCount:c.convergenceCount};}
export function validateCompact(s){
 if(s.mode!=="normal")throw Error("新経済版とテストデータは混ぜられません");
 const c=unpack(s),m=mirrors(c);
 for(const k of ["orbs","runOrbsEarned","surplusExistence","totalExistenceEarned"])if(A(s[k]).cmp(m[k])!==0)throw Error("新経済資源の不一致: "+k);
 if(s.convergenceCount!==c.convergenceCount||s.time.unlocked!==c.sourceUnlocked||
  c.engravingUnlocked!==(c.convergenceCount>0)||s.settings.automationEnabled!==c.settings.master||
  s.runOrbsEvidence!=="verified")throw Error("新経済の解放・設定不一致");
 if(Object.values(s.moment).some(Boolean)||Object.values(s.sources).some(x=>x.level||x.plus||x.effects.length)||s.engraving.owned.length||Object.values(s.engraving.levels).some(Boolean))
  throw Error("旧経済の強化が新経済へ混入しています");
 if(!s.intro.complete&&(c.sourceUnlocked||c.engravingUnlocked||c.orbs!==C.Z||c.moment.some(Boolean)))throw Error("序章の新経済進行が不正");
 s.compactEconomy=pack(c);
 return s;
}
export function executeCompact(s,fn){
 const c=unpack(s),report={gained:A(0),spent:A(0),sources:0,convergences:[]};
 const result=C.observe(c,()=>fn(c),{
  earned:v=>{report.gained=report.gained.add(fromLog(v));},
  spent:v=>{report.spent=report.spent.add(fromLog(v));},
  sources:n=>{report.sources+=n;},
  convergence:q=>{report.convergences.push({steps:q.steps,reward:fromLog(q.reward).toString()});}
 });
 // Validate the full proposed economy before mutating the host state.
 const canonical=C.decode(C.encode(c)),m=mirrors(canonical),data=pack(canonical);
 return {result,c:canonical,m,data,...report};
}
export function compactQuote(s,kind,id,mode=s.purchaseMode){
 const c=unpack(s),card=C.cards(c,kind).find(x=>C.key(x)===id);
 if(!card)return {count:0,cost:"0",enabled:false};
 const chosen=card.fresh&&card.breakthrough?"1":mode,q=C.quote(c,card,chosen);
 const cost=fromLog(q.cost).toString();
 return {count:q.count,cost,enabled:q.count>0,kind,id,breakthrough:!!(card.fresh&&card.breakthrough),level:card.level,
  name:kind==="source"?"源"+String(card.i+1).padStart(2,"0")+(card.rank>=30?" ＋"+Math.floor(card.rank/30):""):(kind==="moment"?C.M:C.E)[card.i][0]};
}
export function compactBulkQuote(s,kind){
 const c=unpack(s);
 if(!C.own(c,"bulk"))return {ok:false,count:0,spent:"0"};
 const q=C.buyAll(c,kind,c.settings.priority[kind]);return {ok:q.count>0,count:q.count,spent:fromLog(q.spent).toString()};
}
export function compactConvergenceQuote(s){
 const c=unpack(s),q=C.convergenceQuote(c),spent=seriesCost("1000000",1.2,0,q.steps),next=seriesCost("1000000",1.2,0,q.steps+1);
 return {steps:q.steps,reward:fromLog(q.reward).toString(),nextRequired:next.toString(),nextRemaining:next.sub(s.runOrbsEarned).toString(),spent:spent.toString(),basis:"run-earned",historyVerified:true,runOrbsEarned:s.runOrbsEarned};
}
export function compactAdvance(c,gameSeconds,wallSeconds,sourceFactor=1){
 if(!Number.isFinite(gameSeconds)||gameSeconds<0||!Number.isFinite(wallSeconds)||wallSeconds<0)throw Error("時間が不正");
 // When purchases are off, one large span can be accrued without iterating
 // individual seconds. Otherwise split at the auto-buy boundary.
 let remain=gameSeconds;
 const auto=()=>c.settings.master&&["moment","source","engraving"].some(k=>c.settings[k]&&C.own(c,k+"Auto"));
 while(remain>1e-9){
  if(!auto()&&remain>1){
   // No upgrade or reset can occur inside this span. Production rates are constant.
   const p=C.production(c),r=C.autoRate(c);
   if(p!==C.Z)C.earn(c,p+Math.log10(remain*sourceFactor));
   if(r>0)C.earn(c,C.expectedTap(c)+Math.log10(remain*r*sourceFactor));
   c.runAge+=remain;c.lastManualAge+=remain;if(c.lastManualAge>1.2)c.combo=0;
   c.autoCredit=(c.autoCredit+remain)%1;remain=0;break;
  }
  const step=Math.min(remain,Math.max(1e-9,1-c.autoCredit),1);
  C.tick(c,step,{sourceFactor,wallSeconds:0,skipConvergence:true});
  remain-=step;
 }
 C.autoConvergence(c,wallSeconds);
}
export function compactSetting(c,key,value,kind){
 if(key==="priority"){
  if(!["moment","source","engraving"].includes(kind)||!["cheap","grade"].includes(value))throw Error("購入順が不正");
  c.settings.priority[kind]=value;return;
 }
 if(key==="master"){if(typeof value!=="boolean")throw Error("設定が不正");c.settings.master=value;return;}
 if(["moment","source","engraving","converge"].includes(key)){
  if(typeof value!=="boolean"||value&&!C.own(c,key==="converge"?"convergeAuto":key+"Auto"))throw Error("自動化は未解放です");
  c.settings[key]=value;if(key==="converge")c.autoAge=0;return;
 }
 if(!C.own(c,"convergeAuto"))throw Error("自動収束は未解放です");
 if(key==="condition"&&["time","earned"].includes(value)){c.settings.condition=value;c.autoAge=0;return;}
 if(key==="threshold"){
  if(c.settings.condition==="time"){const x=Number(value);if(!Number.isFinite(x)||x<.1)throw Error("0.1秒以上を入力してください");c.settings.seconds=x;}
  else{const x=C.parse(value);if(x===C.Z)throw Error("正の獲得数を入力してください");c.settings.target=x;}
  c.autoAge=0;return;
 }
 throw Error("設定が不正です");
}
export function compactProjection(s){
 const c=unpack(s);
 return {...s,moment:Object.fromEntries(c.moment.map((v,i)=>[i,v])),
  sources:Object.fromEntries(c.sources.map((v,i)=>[i,{level:v.level,plus:v.rank<0?0:Math.floor(v.rank/30)}])),
  engraving:{...s.engraving,owned:[...(C.own(c,"bulk")?["ENG-05"]:[]),...(c.engraving.some(Boolean)?["compact"]:[])],levels:Object.fromEntries(c.engraving.map((v,i)=>[i,v]))}};
}

// DEC-20261126-014/015: display decomposition of the canonical wallet.
// No quantization of balances, quotes, lifetime, time input, or saved data.
// Bound scientific labels using the normalized decimal mantissa. A displayed
// balance/reward is never above the internal value; a displayed cost never below.
function scientificShardBound(n,roundUp){
 const [head,tail=""]=String(n.m).split(".");
 const digits=BigInt(head+tail),shift=2-tail.length;
 const divisor=shift<0?10n**BigInt(-shift):1n;
 let units=shift>=0?digits*10n**BigInt(shift):digits/divisor;
 const remainder=shift<0&&digits%divisor!==0n;
 if(roundUp&&remainder)units++;
 let exponent=n.e;
 if(units>=1000n){units/=10n;exponent++;}
 return (remainder?"約":"")+(Number(units)/100).toFixed(2)+"e"+(exponent>=0?"+":"")+exponent;
}
export function splitExistenceShards(value,{roundUp=false}={}){
 const n=A(value),nf=x=>x.toLocaleString("ja-JP");
 if(!n.m)return {whole:"0",shards:0,subShard:false};
 if(n.e>6)return {whole:scientificShardBound(n,roundUp),shards:null,subShard:false};
 if(n.e< -3)return {whole:"0",shards:roundUp?1:0,subShard:!roundUp};
 // Amount is normalized to 14 significant decimal digits. Use those
 // digits, not binary multiplication, to avoid losing a boundary shard.
 const [head,tail=""]=String(n.m).split(".");
 const digits=BigInt(head+tail),shift=n.e+3-tail.length;
 const divisor=shift<0?10n**BigInt(-shift):1n;
 let units=shift>=0?digits*10n**BigInt(shift):digits/divisor;
 const remainder=shift<0&&digits%divisor!==0n;
 if(roundUp&&remainder)units++;
 const whole=units/1000n,shards=Number(units%1000n);
 if(whole>1000000n)return {whole:scientificShardBound(n,roundUp),shards:null,subShard:false};
 return {whole:nf(whole),shards,subShard:remainder&&!roundUp};
}
export function formatShardAmount(value,{roundUp=false,full=false}={}){
 const p=splitExistenceShards(value,{roundUp});
 const fragments=p.shards===null?"":p.shards===0&&p.subShard?"かけら1未満":"かけら"+p.shards.toLocaleString("ja-JP");
 if(full)return "存在"+p.whole+(fragments?"・"+fragments:"");
 if(p.whole==="0")return fragments||"かけら0";
 return "存在"+p.whole+(p.shards||p.subShard?"・"+fragments:"");
}
