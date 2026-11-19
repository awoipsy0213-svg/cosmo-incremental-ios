// 《理》刹那30: 210 approved choices, seven rounds (2026-11-19).
// Main-game engine only. Standalone setsuna-playtest.html retains its own v3.8 engine.
// Every base output here excludes 存在倍率; the game applies it exactly once.
import {A,formatAmount} from "./numbers.mjs";

export const COUNT=30;
export const GROUPS=["基礎干渉","連続干渉","確率干渉","自律干渉","源泉共鳴","超越干渉"];
export const NAMES=["原初の接触","干渉増幅","余波","反響","集中","連撃","残響維持","加速","蓄積","連鎖","幸運","会心","二重干渉","連鎖会心","奇跡","自動接触","自律増幅","自律連撃","余剰回収","自律同期","源の反映","干渉供給","源の共振","循環","共鳴暴走","強化共鳴","時の圧縮","限界突破","刹那の覚醒","原初回帰"];
const COMBO_MARKS=[10,50,100,250,500,1000];
export const RUNTIME_KEYS=["combo","lastTap","comboUntil","comboExpire","hasteUntil","sourceBuffUntil",
  "synergyUntil","awakenUntil","autoCredit","comboAutoCredit","recoverCredit","compressCredit",
  "activeSeconds","lastManualActive","cycleTaps","supplyCount","offlineCombo",
  "autoTaps","stored","flowQueue","miracleHistory"];
export function runtimeDefaults(){
 const r=Object.fromEntries(RUNTIME_KEYS.map(k=>[k,k==="stored"?"0":k==="flowQueue"||k==="miracleHistory"?[]:0]));
 return r;
}
export function fresh(now=Date.now()){
 return {levels:Array(COUNT).fill(0),earned:Array(COUNT).fill(0),cycles:0,sourceLevel:0,
  sourceMilestones:0,sourceBase:"0",wallet:"0",lastTick:now,taps:0,...runtimeDefaults()};
}
const lv=(s,i)=>Math.max(0,Math.min(1000000,Math.floor(Number(s.levels[i])||0)));
const root=x=>Math.sqrt(Math.max(0,x));
const clamp=(x,max)=>Math.min(max,Math.max(0,x));
const active=(s,i)=>lv(s,i)>0;
function resonance(s,i){
 if(i===25||!active(s,i)||!active(s,25))return 1;
 return 1+clamp(.005*root(lv(s,25)),1);
}
function boosted(s,i,x){return x*resonance(s,i)}
export function fixedIncrement(level){
 return level<100?1:level<1000?10:100;
}
export function fixedTotal(level){
 const l=Math.max(0,Math.floor(level));
 return Math.min(99,l)+10*Math.max(0,Math.min(999,l)-99)+100*Math.max(0,l-999);
}
export function milestone(i,earned){
 let v=A(1);for(const m of [10,25,50,100,250,500,1000,2500,5000,10000,25000,50000,100000,250000,500000,1000000]){
  if(earned<m)break;v=v.mul(m<100?2:m<1000?3:5+Math.max(0,Math.floor(Math.log10(m/1000))));
 }return v;
}
function legacyMilestone(s){
 let v=1;const ms=[100,250,500,1000,2500,5000,10000,25000,50000,100000,250000,500000,1000000];
 for(let i=0;i<COUNT;i++){for(const m of ms){if((s.earned[i]||0)<m)break;v+=m<1000?.02:.05;}}
 return v;
}
export function baseSource(s){return A(s.sourceBase===undefined?"0":s.sourceBase)}
export function sourceMilestoneCount(s){return Math.max(0,Math.min(630,Math.floor(s.sourceMilestones||0)))}
export function tapBase(s){
 const l0=lv(s,0),l1=lv(s,1),l22=lv(s,22),l29=lv(s,29);
 let flat=1+boosted(s,0,fixedTotal(l0));
 let base=A(flat).mul(A(1.02).pow(l1*resonance(s,1)));
 if(active(s,20))base=base.add(baseSource(s).mul(clamp(boosted(s,20,.0002*lv(s,20)),.25)));
 if(l22)base=base.mul(1+clamp(boosted(s,22,.002*sourceMilestoneCount(s)*root(l22)),2));
 if(l29)base=base.mul(1+.002*(s.cycles||0)*root(s.levels.reduce((a,b)=>a+b,0))*root(l29)*resonance(s,29));
 // Old pre-3.9 moment milestone gains remain a separate trial layer.
 return base.mul(legacyMilestone(s));
}
export function comboWindow(s){return (1.2+clamp(.02*lv(s,6),8.8))*1000}
export function comboCap(s){
 return 5*(active(s,27)?1+.03*root(lv(s,27))*resonance(s,27):1);
}
export function comboFactor(s){
 if(!active(s,5)||s.combo<=0)return 1;
 return 1+clamp(boosted(s,5,.002*root(lv(s,5))*s.combo),comboCap(s)-1);
}
export function focusFactor(s){
 if(!active(s,4))return 1;
 const gap=Math.max(0,(s.activeSeconds||0)-(s.lastManualActive||0));
 return 1+clamp(boosted(s,4,.10*root(lv(s,4))*root(Math.max(0,gap-1))),4);
}
export function critRate(s){return active(s,10)?boosted(s,10,.0005*lv(s,10)):0}
export function critMulti(s){
 if(!active(s,11))return A(2);
 const m=A(2).mul(A(1.02).pow(lv(s,11)));
 return A(1).add(m.sub(1).mul(resonance(s,11)));
}
export function probability(s,i){
 if(i===12)return active(s,12)?clamp(boosted(s,12,.0005*lv(s,12)),.25):0;
 if(i===13)return active(s,13)?clamp(boosted(s,13,.0005*lv(s,13)),.25):0;
 if(i===14)return active(s,14)?clamp(boosted(s,14,.00002*lv(s,14)),.002):0;
 return 0;
}
export function autoSync(s){
 return active(s,19)?clamp(boosted(s,19,.0005*lv(s,19)),.5):0;
}
export function autoInterval(s,now=Date.now()){
 if(!active(s,15))return Infinity;
 const base=10/(1+.05*root(lv(s,15)));
 const haste=hasteLevel(s,now);
 const floor=active(s,27)?.25:.5;
 return Math.max(floor,base/(1+haste));
}
function hasteLevel(s,now){
 if(!active(s,7)||now>=(s.hasteUntil||0))return 0;
 return clamp(boosted(s,7,.004*root(lv(s,7))*Math.floor((s.combo||0)/10)),1);
}
function supplyLevel(s,now){
 return active(s,21)&&now<(s.sourceBuffUntil||0)?clamp(boosted(s,21,.01*root(lv(s,21))),.5):0;
}
function synergyLevel(s,now){
 return active(s,24)&&now<(s.synergyUntil||0)?clamp(boosted(s,24,.05*root(lv(s,24))),1):0;
}
function awakeningLevel(s,now){
 return active(s,28)&&now<(s.awakenUntil||0)?clamp(boosted(s,28,.02*root(lv(s,28))),1):0;
}
export function sourceMultiplier(s,now=Date.now()){
 return (1+hasteLevel(s,now))*(1+supplyLevel(s,now))*
   (1+synergyLevel(s,now))*(1+awakeningLevel(s,now));
}
export function tapPreview(s,now=Date.now()){
 return tapBase(s).mul(comboFactor(s)*(1+synergyLevel(s,now))*(1+awakeningLevel(s,now)));
}
const rnd=(rng)=>{const x=Number(rng());return Number.isFinite(x)?Math.max(0,Math.min(1,x)):1};
function crit(s,value,rng){
 const rate=critRate(s),multi=critMulti(s);
 const success=rate>=1||rnd(rng)<rate;
 if(!success)return {amount:value,crit:false,chain:0};
 let v=value.mul(rate>=1?multi.mul(rate):multi),chain=0;
 const p=probability(s,13);
 while(chain<3&&p>0&&rnd(rng)<p){v=v.mul(multi);chain++;}
 return {amount:v,crit:true,chain};
}
function critExpected(s){
 const rate=critRate(s),multi=critMulti(s);
 const base=rate>=1?multi.mul(rate):A(1).add(multi.sub(1).mul(rate));
 const p=probability(s,13);
 // At most three repeated critical multiplications; stop at the first failure.
 const one=A(1), q=A(p), chain=one;
 if(!p)return base;
 let power=A(1),success=1;
 for(let k=1;k<=3;k++){
  power=power.mul(multi);success*=p;
  chain=chain.add(power.sub(1).mul(success*(k===3?1:1-p)));
 }
 return base.mul(chain);
}
function addWallet(s,a){if(A(a).cmp(0)>0)s.wallet=A(s.wallet).add(a).toString();}
function queuePay(s,value){
 if(A(value).cmp(0)<=0)return;
 if(!Array.isArray(s.flowQueue))s.flowQueue=[];
 const existing=s.flowQueue.find(x=>Math.abs(x.remaining-5)<.1);
 if(existing){existing.left=A(existing.left).add(value).toString();return;}
 if(s.flowQueue.length>=120){
  const nearest=s.flowQueue.reduce((a,b)=>Math.abs(a.remaining-5)<Math.abs(b.remaining-5)?a:b);
  nearest.left=A(nearest.left).add(value).toString();return;
 }
 s.flowQueue.push({left:A(value).toString(),remaining:5});
}
function closeCombo(s){
 let award=A(0);
 if(A(s.stored||"0").cmp(0)>0)award=A(s.stored).mul(1.2);
 s.stored="0";s.combo=0;s.comboExpire=0;
 return award;
}
function comboMarks(s,oldValue,newValue,now){
 let bonus=A(0);
 if(active(s,9)){
  for(let i=0;i<COMBO_MARKS.length;i++){
   const m=COMBO_MARKS[i];
   if(oldValue<m&&newValue>=m)
    bonus=bonus.add(tapBase(s).mul(clamp(boosted(s,9,(i+1)*.5*root(lv(s,9))),30)));
  }
 }
 if(active(s,24)&&Math.floor(newValue/100)>Math.floor(oldValue/100))
  s.synergyUntil=now+10000;
 if(active(s,7)&&Math.floor(newValue/10)>Math.floor(oldValue/10))
  s.hasteUntil=now+5000;
 return bonus;
}
export function tap(s,now=Date.now(),rng=Math.random){
 // In the main game time advance is performed by game.advance, not here.
 let released=A(0);
 const inCombo=(s.combo||0)>0 && now<=(s.comboExpire||0);
 if((s.combo||0)>0&&!inCombo)released=closeCombo(s);
 const previous=s.combo||0;
 s.combo=Math.min(100000000,previous+1);
 s.lastTap=now;s.comboExpire=now+comboWindow(s);s.comboUntil=s.comboExpire;
 s.cycleTaps=(s.cycleTaps||0)+1;s.taps=(s.taps||0)+1;
 const base=tapBase(s);
 let primary=base.mul(comboFactor(s)*focusFactor(s)*(1+synergyLevel(s,now))*(1+awakeningLevel(s,now)));
 s.lastManualActive=s.activeSeconds||0;
 const wave=active(s,2)?base.mul(clamp(boosted(s,2,.005*lv(s,2)),1)):A(0);
 const echo=active(s,3)&&s.cycleTaps%5===0?
  base.mul(clamp(boosted(s,3,.1*lv(s,3)),25)):A(0);
 const hit=crit(s,primary,rng);primary=hit.amount;
 const miracle=active(s,14)&&rnd(rng)<probability(s,14);
 if(miracle)primary=primary.mul(200);
 let double=A(0),doubleCrit=false;
 if(active(s,12)&&rnd(rng)<probability(s,12)){
  const extra=crit(s,base.mul(comboFactor(s)*focusFactor(s)*(1+synergyLevel(s,now))*(1+awakeningLevel(s,now))),rng);
  double=extra.amount;doubleCrit=extra.crit;
 }
 // A 100-combo surge takes effect from the following tap, not the triggering tap.
 const chainBonus=comboMarks(s,previous,s.combo,now);
 const reward=primary.add(wave).add(echo).add(chainBonus).add(double);
 // Deposits are extra: they never reduce the current-tap payout.
 if(active(s,8)){
  const part=reward.mul(clamp(boosted(s,8,.05*root(lv(s,8))),.5));
  s.stored=A(s.stored).add(part).toString();
 }
 if(active(s,23))queuePay(s,reward.mul(clamp(boosted(s,23,.01*root(lv(s,23))),.5)));
 if(active(s,21)){
  s.supplyCount=(s.supplyCount||0)+1;
  if(s.supplyCount>=10){s.supplyCount%=10;s.sourceBuffUntil=now+5000;}
 }
 if(active(s,28)&&s.cycleTaps%1000===0)s.awakenUntil=now+10000;
 if(miracle){
  s.miracleHistory=[...(s.miracleHistory||[]),{at:now,amount:primary.toString()}].slice(-10);
 }
 const total=reward.add(released);
 addWallet(s,total);
 return {amount:total,crit:hit.crit,doubleCrit,combo:s.combo,chain:hit.chain,miracle,
  components:{wave:wave.toString(),echo:echo.toString(),chain:chainBonus.toString(),
   double:double.toString(),released:released.toString()}};
}
export function autoExpected(s,now=Date.now()){
 if(!active(s,15))return A(0);
 const autoFactor=active(s,16)?A(1.02).pow(lv(s,16)):A(1);
 let base=tapBase(s).mul(autoFactor).mul((1+synergyLevel(s,now))*(1+awakeningLevel(s,now)));
 const sync=autoSync(s);
 if(sync){
  const critFactor=critExpected(s);
  const expected=critFactor.mul(1+probability(s,12)); // secondary critical, no further double.
  base=base.mul(A(1).add(expected.sub(1).mul(sync)));
 }
 return base;
}
function autoOnce(s,now,rng){
 let v=tapBase(s).mul(active(s,16)?A(1.02).pow(lv(s,16)):1);
 v=v.mul((1+synergyLevel(s,now))*(1+awakeningLevel(s,now)));
 if(autoSync(s)>0&&rnd(rng)<autoSync(s)){
  v=crit(s,v,rng).amount;
  if(rnd(rng)<probability(s,12))v=v.add(crit(s,tapBase(s),rng).amount);
 }
 return v;
}
function integratedSource(s,from,to,effective){
 const wall=to-from;if(effective<=0||wall<=0)return A(0);
 const cuts=[from,to];
 for(const k of ["hasteUntil","sourceBuffUntil","synergyUntil","awakenUntil"]){
  const x=s[k]||0;if(x>from&&x<to)cuts.push(x);
 }
 cuts.sort((a,b)=>a-b);
 let earned=A(0);
 for(let i=1;i<cuts.length;i++){
  const a=cuts[i-1],b=cuts[i];if(a>=b)continue;
  const t=a+(b-a)/2;
  earned=earned.add(baseSource(s).mul(effective*((b-a)/wall)*sourceMultiplier(s,t)));
 }
 return earned;
}
export function advance(s,now=Date.now(),{seconds=null,offline=false,rng=Math.random}={}){
 const prev=s.lastTick||now;
 const wall=Math.max(0,(now-prev)/1000);
 const effective=seconds===null?Math.min(1800,wall):Math.max(0,Math.min(1800,Number(seconds)||0));
 s.lastTick=now;
 if(!offline)s.activeSeconds=(s.activeSeconds||0)+wall;
 if(!wall)return {seconds:0,auto:0,source:A(0)};
 if(!effective){
   const released=s.combo>0&&now>s.comboExpire?closeCombo(s):A(0);
   addWallet(s,released);
   return {seconds:0,auto:0,source:released};
 }
 let total=integratedSource(s,prev,now,effective);
 // Existing 5-second distributions: preserve unpaid balances across save/restart.
 const pending=[];
 for(const x of s.flowQueue||[]){
  const part=Math.min(effective,Math.max(0,x.remaining));
  const earned=x.remaining>0?A(x.left).mul(part/x.remaining):A(0);
  total=total.add(earned);
  const remaining=Math.max(0,x.remaining-part),left=A(x.left).sub(earned);
  if(remaining>1e-9&&left.cmp(0)>0)pending.push({left:left.toString(),remaining});
 }
 s.flowQueue=pending;
 if(active(s,18)){
  s.recoverCredit=(s.recoverCredit||0)+effective;
  const n=Math.floor(s.recoverCredit/10);
  s.recoverCredit%=10;
  if(n)total=total.add(baseSource(s).mul(.02*root(lv(s,18))*resonance(s,18)*n));
 }else s.recoverCredit=0;
 if(active(s,26)){
  s.compressCredit=(s.compressCredit||0)+effective;
  const n=Math.floor(s.compressCredit/120);s.compressCredit%=120;
  if(n)total=total.add(baseSource(s).mul(Math.min(60,5+.1*lv(s,26)*resonance(s,26))*n));
 }else s.compressCredit=0;
 let auto=0;
 if(active(s,15)){
  const points=[prev,now];
  if(s.hasteUntil>prev&&s.hasteUntil<now)points.push(s.hasteUntil);
  points.sort((a,b)=>a-b);
  let taps=(s.autoCredit||0);
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i];
   taps+=effective*((b-a)/(now-prev))/autoInterval(s,(a+b)/2);
  }
  auto=Math.max(0,Math.floor(taps+1e-9));
  s.autoCredit=Math.max(0,Math.min(.999999999,taps-auto));
  if(auto){
   let earned=A(0);
   if(offline||auto>200)earned=autoExpected(s,now).mul(auto);
   else for(let i=0;i<auto;i++)earned=earned.add(autoOnce(s,now,rng));
   total=total.add(earned);s.autoTaps=Math.min(1000000000,(s.autoTaps||0)+auto);
   if(active(s,17)){
    s.comboAutoCredit=(s.comboAutoCredit||0)+auto*clamp(boosted(s,17,.0005*lv(s,17)),.25);
    const progress=Math.floor(s.comboAutoCredit);
    s.comboAutoCredit-=progress;
    if(progress){
     if(offline)s.offlineCombo=Math.min(300,(s.offlineCombo||0)+progress);
     else {
      const old=now<=(s.comboExpire||0)?s.combo:0;
      s.combo=Math.min(100000000,old+progress);
      s.comboExpire=now+comboWindow(s);
      total=total.add(comboMarks(s,old,s.combo,now));
     }
    }
   }
  }
 }
 if((s.combo||0)>0&&now>(s.comboExpire||0))total=total.add(closeCombo(s));
 addWallet(s,total);
 return {seconds:effective,auto,source:total};
}
export function effectInfo(s,i){
 const l=lv(s,i),f=n=>Number.isFinite(n)?n.toLocaleString("ja-JP",{maximumFractionDigits:3}):String(n);
 const p=v=>f(v*100)+"%";
 const effect=(n)=>{
  const k=Math.max(0,n);
  switch(i){
   case 0:return "+"+f(fixedTotal(k))+" /tap（次の1Lv +"+f(fixedIncrement(k+1))+"）";
   case 1:return "×"+formatAmount(A(1.02).pow(k))+"（×1.02/Lv）";
   case 2:return "追加 "+p(Math.min(1,.005*k));
   case 3:return "5タップごと ×"+f(Math.min(25,.1*k));
   case 4:return "最大×5 / 1秒以上待機";
   case 5:return "1コンボ +"+p(.002*root(k))+" / 最大×"+f(5*(1+.03*root(lv(s,27))));
   case 6:return "猶予 "+f(Math.min(10,1.2+.02*k))+"秒";
   case 7:return "10コンボごと双方 +"+p(Math.min(1,.004*root(k)));
   case 8:return "追加蓄積 "+p(Math.min(.5,.05*root(k)))+" / 放出×1.2";
   case 9:return "節目順位×"+f(.5*root(k))+" / 最大×30";
   case 10:return "会心率 "+p(.0005*k)+"（100%超も有効）";
   case 11:return "会心倍率 ×"+formatAmount(A(2).mul(A(1.02).pow(k)));
   case 12:return "二重確率 "+p(Math.min(.25,.0005*k));
   case 13:return "追加会心 "+p(Math.min(.25,.0005*k))+" / 最大3回";
   case 14:return "奇跡確率 "+p(Math.min(.002,.00002*k))+" / ×200";
   case 15:return "自動1回 / "+f(k?Math.max(.5,10/(1+.05*root(k))):10)+"秒";
   case 16:return "自動倍率 ×"+formatAmount(A(1.02).pow(k));
   case 17:return "自動コンボ率 "+p(Math.min(.25,.0005*k));
   case 18:return "源の1秒分×"+p(.02*root(k))+" / 10秒";
   case 19:return "確率効果同期 "+p(Math.min(.5,.0005*k));
   case 20:return "源の基礎生産 "+p(Math.min(.25,.0002*k))+" を反映";
   case 21:return "源生産 +"+p(Math.min(.5,.01*root(k)))+" / 5秒";
   case 22:return "節目"+sourceMilestoneCount(s)+"件 ×"+p(Math.min(2,.002*sourceMilestoneCount(s)*root(k)));
   case 23:return "5秒分散 +"+p(Math.min(.5,.01*root(k)));
   case 24:return "双方 +"+p(Math.min(1,.05*root(k)))+" / 10秒";
   case 25:return "6系統の効果量 +"+p(Math.min(1,.005*root(k)));
   case 26:return "120秒ごと源の"+f(Math.min(60,5+.1*k))+"秒分";
   case 27:return "コンボ上限×"+f(1+.03*root(k))+" / 最短0.25秒";
   case 28:return "1000タップごと +"+p(Math.min(1,.02*root(k)))+" / 10秒";
   case 29:return "周回補正 ×"+formatAmount(A(1+.002*(s.cycles||0)*root(s.levels.reduce((a,b)=>a+b,0))*root(k)));
   default:return "？？？";
  }
 };
 return {name:NAMES[i],current:l?effect(l):"未購入",next:effect(Math.min(1000000,l+1)),
  detail:NAMES[i]+"（第1〜7回の確定仕様）",group:GROUPS[Math.floor(i/5)]};
}
