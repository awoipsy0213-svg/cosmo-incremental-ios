// 《理》刹那30 — 7 rounds of approved effects and edge-case rules.
// Uses the main game's Amount and state; does not read/write browser storage.
import {A,formatAmount} from './numbers.mjs';
import {CONFIG} from './balance-config.mjs';

export const IDS=['tap','tap2','tap3','tap4','tap5','amplify',...Array.from({length:24},(_,i)=>'setsuna'+String(i+7).padStart(2,'0'))];
export const NAMES=['原初の接触','干渉増幅','余波','反響','集中','連撃','残響維持','加速','蓄積','連鎖','幸運','会心','二重干渉','連鎖会心','奇跡','自動接触','自律増幅','自律連撃','余剰回収','自律同期','源の反映','干渉供給','源の共振','循環','共鳴暴走','強化共鳴','時の圧縮','限界突破','刹那の覚醒','原初回帰'];
export const GROUPS=['基礎干渉','連続干渉','確率干渉','自律干渉','源泉共鳴','超越干渉'];
const COMBO_STEPS=[10,50,100,250,500,1000];
const minmax=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const sqrt=n=>Math.sqrt(Math.max(0,n));
const sum=(arr)=>arr.reduce((a,b)=>a+b,0);
const rawLevel=(s,i)=>Math.max(0,Math.min(1000000,Math.floor(s.moment[IDS[i]]||0)));
const clock=(now)=>Math.max(0,now);
export function runtimeDefaults(){
 return {combo:0,lastTap:0,comboUntil:0,sourceBuffUntil:0,synergyUntil:0,awakenUntil:0,
   hasteUntil:0,hasteSteps:0,autoCredit:0,autoProgress:0,lastAutoInterval:10,
   comboAutoCredit:0,recoverCredit:0,compressCredit:0,flowQueue:[],stored:'0',
   autoTaps:0,roundTaps:0,comboMilestone:0,sourceTriggerTaps:0,
   miracleLog:[],lastEffects:[],lastComboEnded:0,convergenceEpoch:0};
}
const R=s=>s.momentRuntime||(s.momentRuntime=runtimeDefaults());
const lvl=(s,i)=>rawLevel(s,i);
const resonance=s=>lvl(s,25)?1+minmax(.005*sqrt(lvl(s,25)),0,1):1;
const eff=(s,i)=>i===25?1:(lvl(s,i)?resonance(s):1);
const active=(until,now)=>until>now;
const finite=(v)=>Number.isFinite(v)?v:0;
const positiveA=v=>A(v);
function factor(s,i){return eff(s,i)}
function scaled(s,i,value,cap=Infinity){return lvl(s,i)?Math.min(cap,value*factor(s,i)):0}
function upperA(n){return A(Math.max(0,finite(n)))}
function sourceLevels(s){return Object.values(s.sources||{}).reduce((a,x)=>a+(x?.level||0),0)}
function reachedSourceMilestones(s){
 const ms=CONFIG.confirmed.sourceMilestones||[];
 return Object.values(s.sources||{}).reduce((count,x)=>count+ms.filter(v=>v<=(x?.level||0)).length,0);
}
export function primitive(s){
 const n=lvl(s,0);
 return A(1+Math.min(99,n)+Math.max(0,Math.min(999,n)-99)*10+Math.max(0,n-999)*100);
}
function returnFactor(s){
 const c=Math.max(0,s.convergenceCount||0),r=lvl(s,29);
 return r?1+.002*c*sqrt(IDS.reduce((a,_,i)=>a+lvl(s,i),0))*sqrt(r)*factor(s,29):1;
}
export function sourceRawBasis(s){return A(1)}
export function criticalRate(s){return lvl(s,10)?scaled(s,10,.0005*lvl(s,10)):0}
export function criticalFactor(s){return lvl(s,11)?A(2).mul(A(1.02).pow(lvl(s,11))).mul(factor(s,11)):A(2)}
export function doubleRate(s){return lvl(s,12)?scaled(s,12,.0005*lvl(s,12),.25):0}
export function chainRate(s){return lvl(s,13)?scaled(s,13,.0005*lvl(s,13),.25):0}
export function miracleRate(s){return lvl(s,14)?scaled(s,14,.00002*lvl(s,14),.002):0}
export function autoSyncRate(s){return lvl(s,19)?scaled(s,19,.0005*lvl(s,19),.5):0}
export function critExpected(s){
 const r=criticalRate(s),mult=criticalFactor(s);
 const chain=chainRate(s);
 // Three consecutive independent successful chain checks; stop on first failure.
 let chains=A(1),step=A(1);
 for(let i=0;i<3;i++){step=step.mul(chain).mul(mult);chains=chains.add(step.mul(1-chain));}
 // Add the successful third link, which has no next failure check.
 chains=chains.add(step.mul(chain));
 // Equivalent 1 + p*cm + p²*cm² + p³*cm³ weighted by stop chances.
 const crit=r>=1?mult.mul(r):A(1).mul(1-r).add(mult.mul(r));
 return crit.mul(chain>0?chains:A(1));
}
export function comboWindow(s){return Math.min(10,1.2+.02*lvl(s,6));}
export function comboBonus(s){return lvl(s,5)?1+minmax(.002*sqrt(lvl(s,5))*Math.max(1,R(s).combo)*factor(s,5),0,4):1}
function concentrate(s,now){
 if(!lvl(s,4)||!R(s).lastTap)return 1;
 const gap=(now-R(s).lastTap)/1000;
 return gap>=1?1+Math.min(4,.1*sqrt(lvl(s,4))*sqrt(gap-1)*factor(s,4)):1;
}
function sourceMilestoneBonus(s){
 return lvl(s,22)?1+scaled(s,22,.002*sqrt(lvl(s,22))*reachedSourceMilestones(s),2):1;
}
function sourceReflected(s,rawSource){
 return lvl(s,20)?A(rawSource).mul(scaled(s,20,.0002*lvl(s,20),.25)):A(0);
}
function tapRoot(s,rawSource){
 let v=primitive(s);
 if(lvl(s,1))v=v.mul(A(1.02).pow(lvl(s,1)).mul(factor(s,1)));
 v=v.add(sourceReflected(s,rawSource));
 v=v.mul(sourceMilestoneBonus(s)*returnFactor(s));
 return v;
}
function manualTimed(s,now){
 let m=1,rt=R(s);
 if(lvl(s,24)&&active(rt.synergyUntil,now))m*=1+scaled(s,24,.05*sqrt(lvl(s,24)),1);
 if(lvl(s,28)&&active(rt.awakenUntil,now))m*=1+scaled(s,28,.02*sqrt(lvl(s,28)),1);
 return m;
}
function sourceTimed(s,now){
 const r=R(s);
 let m=1;
 if(lvl(s,7)&&active(r.hasteUntil,now))m*=1+Math.min(1,r.hasteSteps*.004*sqrt(lvl(s,7))*factor(s,7));
 if(lvl(s,21)&&active(r.sourceBuffUntil,now))m*=1+scaled(s,21,.01*sqrt(lvl(s,21)),.5);
 if(lvl(s,24)&&active(r.synergyUntil,now))m*=1+scaled(s,24,.05*sqrt(lvl(s,24)),1);
 if(lvl(s,28)&&active(r.awakenUntil,now))m*=1+scaled(s,28,.02*sqrt(lvl(s,28)),1);
 return m;
}
function autoInterval(s,now){
 if(!lvl(s,15))return Infinity;
 const r=R(s);
 const min= lvl(s,27)? .25 : .5;
 let interval=10/(1+.05*sqrt(lvl(s,15)));
 if(lvl(s,7)&&active(r.hasteUntil,now))
  interval/=1+Math.min(1,r.hasteSteps*.004*sqrt(lvl(s,7))*factor(s,7));
 return Math.max(min,interval);
}
export function sourceMultiplier(s,now=Date.now()){return sourceTimed(s,now)}
export function tapPreview(s,now=Date.now(),rawSource=A(0)){
 let v=tapRoot(s,rawSource).mul(comboBonus(s)*manualTimed(s,now));
 if(lvl(s,4))v=v.mul(concentrate(s,now));
 return v;
}
const dice=rng=>minmax(finite(Number(rng())),0,1);
function critOnce(s,amount,rng){
 let result=A(amount),did=false,chainCount=0;
 const rate=criticalRate(s),mult=criticalFactor(s);
 if(rate>=1){result=result.mul(mult).mul(rate);did=true}
 else if(rate>0&&dice(rng)<rate){result=result.mul(mult);did=true}
 if(did){
  const prob=chainRate(s);
  for(let k=0;k<3;k++){if(dice(rng)>=prob)break;result=result.mul(mult);chainCount++;}
 }
 return {amount:result,crit:did,chainCount};
}
function appendEffect(effects,name,amount){if(A(amount).cmp(0)>0)effects.push({name,amount:A(amount).toString()})}
function queueFlow(s,amount){
 const r=R(s),v=A(amount);if(v.cmp(0)<=0)return;
 // Bucket remaining time to 0.1s: merge without dropping pending value.
 const entry=r.flowQueue.find(x=>Math.abs(x.remaining-5)<.10001);
 if(entry)entry.left=A(entry.left).add(v).toString();
 else if(r.flowQueue.length<120)r.flowQueue.push({left:v.toString(),remaining:5});
 else {const e=r.flowQueue[r.flowQueue.length-1];e.left=A(e.left).add(v).toString();}
}
function endCombo(s,now){
 const r=R(s);
 let payout=A(0);
 if(r.combo>0){
  payout=A(r.stored).mul(1.2);
  r.stored='0';r.combo=0;r.comboMilestone=0;r.comboUntil=0;r.hasteSteps=0;
  r.lastComboEnded=now;
 }
 return payout;
}
function levelMilestones(oldValue,newValue){
 return COMBO_STEPS.filter(v=>v>oldValue&&v<=newValue);
}
function comboThreshold(s,oldValue,newValue,root,now,effects){
 const r=R(s);let bonus=A(0);
 for(const target of levelMilestones(oldValue,newValue)){
  if(lvl(s,9)){
   const rank=COMBO_STEPS.indexOf(target)+1;
   const m=scaled(s,9,.5*rank*sqrt(lvl(s,9)),30);
   const part=root.mul(m);bonus=bonus.add(part);appendEffect(effects,'連鎖',part);
  }
 }
 // ×10 haste refresh and scaling, including jumps across several decadal steps.
 if(lvl(s,7)&&Math.floor(newValue/10)>Math.floor(oldValue/10)){
  r.hasteSteps=Math.floor(newValue/10);r.hasteUntil=now+5000;
 }
 // 100 combo means starts after the triggering tap, never retroactive.
 if(lvl(s,24)&&Math.floor(newValue/100)>Math.floor(oldValue/100)){
  r.synergyUntil=now+10000;
 }
 return bonus;
}
export function tap(s,now=Date.now(),rng=Math.random,rawSource=A(0)){
 const r=R(s);
 let released=A(0);
 if(r.combo && (now>r.comboUntil|| (r.lastTap&&now-r.lastTap>comboWindow(s)*1000)))released=endCombo(s,now);
 const gap=r.lastTap? (now-r.lastTap)/1000:0,old=r.combo;
 r.combo=minmax(old+1,1,1000000);r.comboUntil=now+comboWindow(s)*1000;
 // calculate concentration using last tap before resetting it
 const ready=concentrate(s,now);
 r.lastTap=now;r.roundTaps++;r.sourceTriggerTaps++;
 let effects=[],root=tapRoot(s,rawSource);
 let main=root.mul(comboBonus(s)*manualTimed(s,now)*ready);
 if(lvl(s,2))appendEffect(effects,'余波',root.mul(scaled(s,2,.005*lvl(s,2),1)));
 if(lvl(s,3)&&r.roundTaps%5===0)appendEffect(effects,'反響',root.mul(scaled(s,3,.1*lvl(s,3),25)));
 // Combo thresholds are not recursively amplified.
 const thresholds=comboThreshold(s,old,r.combo,root,now,effects);
 if(thresholds.cmp(0)>0){} // also kept as a named effect
 let crit=critOnce(s,main,rng);main=crit.amount;
 if(lvl(s,12)&&dice(rng)<doubleRate(s)){
   const other=critOnce(s,root.mul(comboBonus(s)*manualTimed(s,now)),rng);
   appendEffect(effects,'二重干渉',other.amount);
 }
 let miracle=false;
 if(lvl(s,14)&&dice(rng)<miracleRate(s)){
   main=main.mul(200);miracle=true;
   r.miracleLog=(r.miracleLog||[]).concat([{at:now,amount:main.toString()}]).slice(-10);
 }
 // Stored amount is BONUS and never subtracted from immediate payout.
 if(lvl(s,8)){
  r.stored=A(r.stored).add(main.mul(scaled(s,8,.05*sqrt(lvl(s,8)),.5))).toString();
 }
 if(lvl(s,23))queueFlow(s,main.mul(scaled(s,23,.01*sqrt(lvl(s,23)),.5)));
 // 10 manual taps since acquisition — never retroactively grant old taps.
 if(lvl(s,21)&&r.sourceTriggerTaps>0&&r.sourceTriggerTaps%10===0)r.sourceBuffUntil=now+5000;
 if(lvl(s,28)&&r.roundTaps>0&&r.roundTaps%1000===0)r.awakenUntil=now+10000;
 const extra=effects.reduce((a,x)=>a.add(x.amount),A(0));
 const total=main.add(extra).add(released);
 if(released.cmp(0)>0)appendEffect(effects,'蓄積放出',released);
 r.lastEffects=effects.slice(0,10);
 return {amount:total,main,extra,crit:crit.crit,chain:crit.chainCount,miracle,combo:r.combo,effects,roundTaps:r.roundTaps};
}
function autoExpected(s,now,rawSource){
 if(!lvl(s,15))return A(0);
 let v=tapRoot(s,rawSource).mul(A(1.02).pow(lvl(s,16))* (lvl(s,16)?factor(s,16):1));
 if(lvl(s,24)&&active(R(s).synergyUntil,now))v=v.mul(1+scaled(s,24,.05*sqrt(lvl(s,24)),1));
 if(lvl(s,28)&&active(R(s).awakenUntil,now))v=v.mul(1+scaled(s,28,.02*sqrt(lvl(s,28)),1));
 const sync=autoSyncRate(s);
 if(sync){
  const critical=critExpected(s);
  const double=doubleRate(s);
  // Independent extra click can critically succeed; it cannot recurse into a double click.
  const avg=A(1).add(critical.sub(1).add(critical.mul(double)).mul(sync));
  v=v.mul(avg);
 }
 return v;
}
function temporalBonus(s,start,end,rawSource,offline){
 // integrate active buffs only during their true overlap with the elapsed wall interval.
 const moments=[start,end];
 const r=R(s);
 for(const t of [r.hasteUntil,r.sourceBuffUntil,r.synergyUntil,r.awakenUntil])if(t>start&&t<end)moments.push(t);
 moments.sort((a,b)=>a-b);
 let sumGain=A(0);
 for(let i=1;i<moments.length;i++){
  const mid=(moments[i]+moments[i-1])/2;
  sumGain=sumGain.add(A(rawSource).mul(sourceTimed(s,mid)).mul((moments[i]-moments[i-1])/1000));
 }
 return sumGain;
}
function flowPayout(s,dt){
 const r=R(s);let paid=A(0),next=[];
 for(const x of r.flowQueue){
  const duration=Math.max(0,x.remaining);
  if(!duration){paid=paid.add(x.left);continue;}
  const time=Math.min(dt,duration);
  const cut=A(x.left).mul(time/duration);
  paid=paid.add(cut);
  const left=A(x.left).sub(cut),remaining=duration-time;
  if(remaining>1e-8&&left.cmp(0)>0)next.push({left:left.toString(),remaining});
 }
 r.flowQueue=next;
 return paid;
}
// Main game calls this once for each real-time advance. It already applies the
// global BOOST/offline cap and efficiency before passing effectiveSeconds.
export function tick(s,start,now,effectiveSeconds,rawSource=A(0),{offline=false,rng=Math.random}={}){
 const r=R(s),dt=Math.max(0,effectiveSeconds);
 if(!dt)return {amount:A(0),auto:0,periods:0};
 // Project the effective game clock over the true elapsed wall interval. Temporary
 // boosts may expire at any point, but only the valid overlap is applied.
 const elapsed=Math.max(1,now-start);
 const ratio=dt/(elapsed/1000);
 const ts=[start,now];
 for(const t of [r.hasteUntil,r.sourceBuffUntil,r.synergyUntil,r.awakenUntil])if(t>start&&t<now)ts.push(t);
 ts.sort((a,b)=>a-b);
 let produced=A(0),auto=0;
 for(let j=1;j<ts.length;j++){
  const mid=(ts[j]+ts[j-1])/2,sec=(ts[j]-ts[j-1])/1000*ratio;
  produced=produced.add(A(rawSource).mul(sourceTimed(s,mid)).mul(sec));
  if(lvl(s,15)){
   const interval=autoInterval(s,mid);
   r.autoProgress+=sec/interval;
   const count=Math.floor(r.autoProgress+1e-10);
   r.autoProgress=Math.max(0,r.autoProgress-count);
   auto+=count;
   if(count){
    produced=produced.add(autoExpected(s,mid,rawSource).mul(count));
    r.autoTaps=(r.autoTaps||0)+count;
    const chance=scaled(s,17,.0005*lvl(s,17),.25);
    if(chance){
     let gained=0;
     if(offline||count>32){r.comboAutoCredit+=count*chance;gained=Math.floor(r.comboAutoCredit);r.comboAutoCredit-=gained;}
     else for(let i=0;i<count;i++)if(dice(rng)<chance)gained++;
     if(gained){
       const before=r.combo,cap=offline?300:1000000;
       r.combo=Math.min(cap,r.combo+gained);
       if(!offline){
        r.comboUntil=now+comboWindow(s)*1000;
        const effects=[];produced=produced.add(comboThreshold(s,before,r.combo,tapRoot(s,rawSource),now,effects));
        r.lastEffects=effects.slice(0,10);
       }
     }
    }
   }
  }
 }
 // On suspended screens normal manual combo expires; don't keep a phantom buff.
 if(r.combo>0&&(offline||now>r.comboUntil)){
   produced=produced.add(endCombo(s,now));
 }
 produced=produced.add(flowPayout(s,dt));
 // The periodic production is independent of auto clicks and manual taps.
 r.recoverCredit+=dt;
 if(lvl(s,18)){
  const periods=Math.floor(r.recoverCredit/10);
  r.recoverCredit-=periods*10;
  if(periods)produced=produced.add(A(rawSource).mul(scaled(s,18,.02*sqrt(lvl(s,18)))).mul(periods));
 }else r.recoverCredit%=10;
 r.compressCredit+=dt;
 let periods=0;
 if(lvl(s,26)){
  periods=Math.floor(r.compressCredit/120);
  r.compressCredit-=periods*120;
  if(periods)produced=produced.add(A(rawSource).mul(Math.min(60,5+.1*lvl(s,26))*factor(s,26)).mul(periods));
 }else r.compressCredit%=120;
 if(offline){r.lastTap=now;r.combo=0;r.comboUntil=0;r.hasteUntil=0;r.hasteSteps=0;}
 return {amount:produced,auto,periods};
}
export function afterPurchase(s,kind,id,previous=0,now=Date.now()){
 if(kind!=='moment')return;
 const i=IDS.indexOf(id),r=R(s);if(i<0)return;
 if(i===15&&!previous){r.autoProgress=0;r.autoCredit=0;}
 if(i===6&&r.combo)r.comboUntil=r.lastTap+comboWindow(s)*1000;
 if(i===18&&!previous)r.recoverCredit=0;
 if(i===26&&!previous)r.compressCredit=0;
 if(i===21&&!previous)r.sourceTriggerTaps=0;
 if(i===4&&!previous)r.lastTap=now; // Newly owned concentration cannot count hidden time.
}
export function describe(s,i,now=Date.now(),rawSource=A(0)){
 const lv=lvl(s,i),name=NAMES[i];
 if(!lv)return {name,summary:'未購入',detail:'Lv1以上で効果を解放'};
 let value='';
 switch(i){
 case 0:value='基本獲得 '+formatAmount(primitive(s))+' / 次Lv +'+(lv+1<100?1:lv+1<1000?10:100);break;
 case 1:value='基本倍率 ×'+formatAmount(A(1.02).pow(lv))+'（毎Lv×1.02）';break;
 case 2:value='余波 +'+Math.min(100,.5*lv)+'%（上限100%）';break;
 case 3:value='5タップごと ×'+Math.min(25,.1*lv)+' / 残り'+(5-(R(s).roundTaps%5))+'回';break;
 case 4:value='待機倍率 ×'+concentrate(s,now).toFixed(2)+' / 最大×5';break;
 case 5:value='コンボ倍率 ×'+comboBonus(s).toFixed(2)+' / 最大×5';break;
 case 6:value='コンボ猶予 '+comboWindow(s).toFixed(2)+'秒';break;
 case 7:value='10コンボごと生産と自動速度加速 / 最大+100%';break;
 case 8:value='蓄積中 '+formatAmount(R(s).stored)+' / 終了時×1.2';break;
 case 9:value='節目10・50・100・250・500・1000 / 最大×30';break;
 case 10:value='会心率 '+(criticalRate(s)*100).toFixed(2)+'%（100%超過有効）';break;
 case 11:value='会心倍率 ×'+formatAmount(criticalFactor(s));break;
 case 12:value='追加タップ判定 '+(doubleRate(s)*100).toFixed(2)+'%';break;
 case 13:value='追加会心率 '+(chainRate(s)*100).toFixed(2)+'% / 最大3連鎖';break;
 case 14:value='奇跡率 '+(miracleRate(s)*100).toFixed(4)+'% / ×200';break;
 case 15:value='自動タップ '+(1/autoInterval(s,now)).toFixed(2)+'回/秒';break;
 case 16:value='自動倍率 ×'+formatAmount(A(1.02).pow(lv));break;
 case 17:value='自動連撃率 '+(scaled(s,17,.0005*lv,.25)*100).toFixed(2)+'%';break;
 case 18:value='10秒ごと源 '+(2*sqrt(lv)*factor(s,18)).toFixed(2)+'%分';break;
 case 19:value='自律確率連動率 '+(autoSyncRate(s)*100).toFixed(2)+'% / 最大50%';break;
 case 20:value='源の基礎生産反映 '+(scaled(s,20,.0002*lv,.25)*100).toFixed(2)+'%';break;
 case 21:value='10手動タップごと5秒 +'+(scaled(s,21,.01*sqrt(lv),.5)*100).toFixed(1)+'%';break;
 case 22:value='源の達成節目 '+reachedSourceMilestones(s)+'/630 / 倍率×'+sourceMilestoneBonus(s).toFixed(2);break;
 case 23:value='獲得の '+(scaled(s,23,.01*sqrt(lv),.5)*100).toFixed(1)+'% を5秒に分配';break;
 case 24:value='100コンボごと10秒 +'+(scaled(s,24,.05*sqrt(lv),1)*100).toFixed(1)+'%';break;
 case 25:value='6系統共鳴 +'+((resonance(s)-1)*100).toFixed(1)+'%';break;
 case 26:value='120秒ごと 源の'+Math.min(60,5+.1*lv).toFixed(1)+'秒分';break;
 case 27:value='コンボ倍率上限拡張 / 自動最短0.25秒';break;
 case 28:value='周回1000タップごと10秒 +'+(scaled(s,28,.02*sqrt(lv),1)*100).toFixed(1)+'%';break;
 case 29:value='恒久収束補正 ×'+returnFactor(s).toFixed(3);break;
 }
 return {name,summary:value,detail:value+' / Lv.'+lv};
}
