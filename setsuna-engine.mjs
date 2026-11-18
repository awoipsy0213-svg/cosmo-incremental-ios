// Kotowari Setsuna 30: isolated v2 trial model. Not an approved production balance.
import {A,seriesCost,maxAffordable,formatAmount} from './numbers.mjs';

export const KEY='kotowari_setsuna_playtest_v1'; // preserve old lab saves; NEVER the main-game key.
export const COUNT=30;
export const ROM=['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ','Ⅷ','Ⅸ','Ⅹ','Ⅺ','Ⅻ','ⅩⅢ','ⅩⅣ','ⅩⅤ','ⅩⅥ','ⅩⅦ','ⅩⅧ','ⅩⅨ','ⅩⅩ','ⅩⅪ','ⅩⅫ','ⅩⅩⅢ','ⅩⅩⅣ','ⅩⅩⅤ','ⅩⅩⅥ','ⅩⅩⅦ','ⅩⅩⅧ','ⅩⅩⅨ','ⅩⅩⅩ'];
export const GROUPS=[
  ['基礎干渉','タップの基本性能'],['連続干渉','連撃と蓄積'],['確率干渉','クリティカルと幸運'],
  ['自律干渉','放置中も働く'],['源泉共鳴','刹那と源の相互強化'],['超越干渉','複合・上位効果']
];
export const EFFECTS=[
 ['原初の接触','基本タップ +1/Lv','基礎獲得'],
 ['干渉増幅','基本タップ倍率 ×(1+0.02×Lv)','基礎倍率'],
 ['余波','タップ直後に基本獲得×0.5%×Lvを追加','追加獲得'],
 ['反響','5タップごとに基本獲得×(0.1+0.01×Lv)を追加','周期ボーナス'],
 ['集中','1秒以上間隔のあるタップを ×(1+0.03×√Lv)','間隔ボーナス'],
 ['連撃','コンボごとに+0.5%、最大倍率2+0.02×Lv','連撃倍率'],
 ['残響維持','コンボ猶予を1.2秒+0.02秒×Lv（最大5秒）に延長','継続補助'],
 ['加速','10コンボごとに源生産+2%（最大+100%）、5秒維持','源生産'],
 ['蓄積','タップ報酬の一部を蓄積し20タップごとに1.2倍放出','蓄積放出'],
 ['連鎖','10コンボごとに基本獲得×(1+0.05×Lv)を追加','連撃ボーナス'],
 ['幸運','クリティカル率1%+0.02%×Lv（100%超も有効）','クリティカル率'],
 ['会心','クリティカル倍率2+0.05×Lv（試験上限20倍）','会心倍率'],
 ['二重干渉','追加タップ判定率1%+0.01%×Lv','追加判定'],
 ['連鎖会心','クリティカル発生後、追加クリティカルを再判定（最大1回）','再抽選'],
 ['奇跡','低確率で基本タップの50倍を追加','低確率報酬'],
 ['自動接触','10/(1+0.1×Lv)秒ごとに自動タップ','自動獲得'],
 ['自律増幅','自動タップの獲得量 ×(1+0.03×Lv)','自動倍率'],
 ['自律連撃','自動タップの一部がコンボへ寄与','自動連撃'],
 ['余剰回収','10秒ごとに源の基礎生産×(0.1+0.01×Lv)を追加','定期報酬'],
 ['自律同期','自動タップへ確率効果を一部適用','自動確率'],
 ['源の反映','源の基礎毎秒生産の一部をタップに追加（最大25%）','源→刹那'],
 ['干渉供給','10手動タップごとに5秒間、源生産を強化','刹那→源'],
 ['源の共振','源の試験レベルと刹那Lvに応じてタップ倍率を強化','源→刹那'],
 ['循環','手動タップ獲得の一部を5秒に分けて追加生産','刹那→源'],
 ['共鳴暴走','100コンボで10秒間、刹那と源を同時強化','双方向'],
 ['強化共鳴','レベルの低い強化5項目の効果量を増幅','下位支援'],
 ['時の圧縮','60秒ごとに源の基礎生産×√Lvを即時獲得','定期獲得'],
 ['限界突破','コンボ上限・自動タップ速度・二重判定上限を拡張','上限拡張'],
 ['刹那の覚醒','累計手動1000タップごとに10秒間、刹那と源を強化','一時覚醒'],
 ['原初回帰','収束回数に応じ基本タップ ×(1+0.01×収束回数×√Lv)','周回連携']
];
export const MILESTONES=[10,25,50,100,250,500,1000,2500,5000,10000,25000,50000,100000,250000,500000,1000000];
// Retain v1 trial prices and purchase behavior. Milestone multipliers remain trial-only.
export const BASE_GAIN=[A(1)],BASE_COST=[A(10)];
for(let i=1;i<COUNT;i++){
 const multi=i<5?3:i<10?5:i<20?7:10;
 BASE_GAIN.push(BASE_GAIN[i-1].mul(multi));
 BASE_COST.push(BASE_GAIN[i].mul(10*(.8-(i-1)*.4/28)));
}
const safe=(v,lo=0,hi=1000000)=>Math.min(hi,Math.max(lo,Number.isFinite(Number(v))?Number(v):lo));
const finiteInt=(v,hi=1000000)=>Math.floor(safe(v,0,hi));
const gain=(s,v)=>{const a=A(v);if(a.cmp(0)>0)s.wallet=A(s.wallet).add(a).toString();return a;};
const amount=(v,fallback='0')=>{try{return A(v).toString()}catch{return fallback}};
export function fresh(now=Date.now()){
 return {schema:2,levels:Array(COUNT).fill(0),earned:Array(COUNT).fill(0),wallet:'0',cycles:0,permanent:0,
  sourceLevel:0,mode:'1',notation:'normal',taps:0,combo:0,lastTap:0,lastTick:now,
  comboUntil:0,sourceBuffUntil:0,synergyUntil:0,awakenUntil:0,
  autoCredit:0,recoverCredit:0,compressCredit:0,flowQueue:[],stored:'0',
  autoTaps:0,sourceEarned:'0',tapEarned:'0',lastEvent:'待機中',lastGrant:0};
}
export function normalize(input,now=Date.now()){
 const s=fresh(now);
 if(!input||typeof input!=='object'||!Array.isArray(input.levels)||input.levels.length!==COUNT)return s;
 s.levels=input.levels.map(x=>finiteInt(x,100000000));
 s.earned=(Array.isArray(input.earned)&&input.earned.length===COUNT?input.earned:s.levels).map((v,i)=>Math.max(s.levels[i],finiteInt(v,100000000)));
 for(const k of ['cycles','permanent','sourceLevel','taps','combo','autoTaps'])s[k]=finiteInt(input[k],100000000);
 for(const k of ['lastTap','lastTick','comboUntil','sourceBuffUntil','synergyUntil','awakenUntil'])s[k]=safe(input[k],0,Number.MAX_SAFE_INTEGER);
 for(const k of ['autoCredit','recoverCredit','compressCredit'])s[k]=safe(input[k],0,3600);
 for(const k of ['wallet','stored','sourceEarned','tapEarned'])s[k]=amount(input[k]);
 s.mode=['1','10','NEXT','MAX'].includes(input.mode)?input.mode:'1';
 s.notation=['normal','scientific','japanese'].includes(input.notation)?input.notation:'normal';
 if(Array.isArray(input.flowQueue))s.flowQueue=input.flowQueue.slice(0,120).filter(x=>x&&x.left!==undefined).map(x=>({left:amount(x.left),remaining:safe(x.remaining,0,5)}));
 s.schema=2;
 s.lastEvent=typeof input.lastEvent==='string'?input.lastEvent.slice(0,120):s.lastEvent;
 s.lastGrant=safe(input.lastGrant,0,Number.MAX_SAFE_INTEGER);
 // A missing v1 tick time never grants arbitrary offline rewards.
 if(!input.lastTick)s.lastTick=now;
 return s;
}
export function level(s,i){
 const raw=s.levels[i]||0;
 const amp=s.levels[25]||0;
 if(!amp||i===25||!raw)return raw;
 const targets=s.levels.map((lv,j)=>({lv,j})).filter(x=>x.j!==25&&x.lv>0).sort((a,b)=>a.lv-b.lv||a.j-b.j).slice(0,5);
 const boosted=targets.some(x=>x.j===i)?raw*(1+.01*Math.sqrt(amp)):raw;
 return boosted*milestone(i,s.earned[i]).toNumber();
}
export function baseSource(s){return A(s.sourceLevel).mul(2)};
export function sourceMultiplier(s,now=Date.now()){
 const haste=level(s,7)>0&&now<s.comboUntil?Math.min(1,.02*Math.floor(s.combo/10)):0;
 const supply=level(s,21)>0&&now<s.sourceBuffUntil?Math.min(.5,.01*Math.sqrt(level(s,21))):0;
 const synergy=level(s,24)>0&&now<s.synergyUntil?Math.min(1,.05*Math.sqrt(level(s,24))):0;
 const awaken=level(s,28)>0&&now<s.awakenUntil?.02*Math.sqrt(level(s,28)):0;
 return (1+haste)*(1+supply)*(1+synergy)*(1+awaken);
}
export function sourceRate(s,now=Date.now()){return baseSource(s).mul(sourceMultiplier(s,now))}
export function critRate(s){return level(s,10)>0?.01+.0002*level(s,10):0}; // >100% yields proportional multiplier.
export function critMulti(s){return level(s,11)>0?Math.min(20,2+.05*level(s,11)):2};
export function probability(s,i){
 if(i===12)return level(s,12)>0?Math.min(.2+Math.min(.1,.001*Math.sqrt(level(s,27))),.01+.0001*level(s,12)):0;
 if(i===13)return level(s,13)>0?Math.min(.1,.005+.0001*level(s,13)):0;
 if(i===14)return level(s,14)>0?Math.min(.01,.0001+.000001*level(s,14)):0;
 return 0;
}
export function milestone(i,earned){let mult=A(1);for(const m of MILESTONES){if(m>earned)break;mult=mult.mul(m<100?2:m<1000?3:5+Math.max(0,Math.floor(Math.log10(m/1000))))}return mult}
function globalMilestoneBonus(s){
 let bonus=1;for(let i=0;i<COUNT;i++)for(const m of MILESTONES){if(m>s.earned[i])break;if(m>=100)bonus+=m<1000?.02:.05;}return bonus;
}
export function tapBase(s,now=Date.now()){
 // Only Ⅰ is a flat generator: all remaining items have independent behaviors.
 const l0=level(s,0),l1=level(s,1),l22=level(s,22),l29=level(s,29);
 let base=A(1).add(A(l0).mul(milestone(0,s.earned[0])));
 if(l1>0)base=base.mul(1+.02*l1);
 if(l22>0)base=base.mul(1+.001*Math.sqrt(s.sourceLevel)*Math.sqrt(l22));
 if(l29>0)base=base.mul(1+.01*s.cycles*Math.sqrt(l29));
 if(level(s,20)>0)base=base.add(baseSource(s).mul(Math.min(.25,.01+.001*level(s,20))));
 return base.mul((1+s.permanent*.05)*globalMilestoneBonus(s));
}
function comboFactor(s){if(level(s,5)<=0)return 1;return Math.min(2+.02*level(s,5)+.05*Math.sqrt(level(s,27)),1+.005*Math.max(0,s.combo-1))}
function timedFactor(s,now){const surge=level(s,24)>0&&now<s.synergyUntil?Math.min(1,.05*Math.sqrt(level(s,24))):0;const awake=level(s,28)>0&&now<s.awakenUntil?.02*Math.sqrt(level(s,28)):0;return (1+surge)*(1+awake)}
export function tapPreview(s,now=Date.now()){
 return tapBase(s,now).mul(comboFactor(s)*timedFactor(s,now));
}
const random01=rng=>{const v=Number(rng());return Number.isFinite(v)?Math.min(1,Math.max(0,v)):1};
// Deterministic, capped expectation for synthetic auto clicks and offline progression.
function autoExpected(s,now){
 let v=tapBase(s,now).mul(1+.03*level(s,16)).mul(timedFactor(s,now));
 const sync=level(s,19)>0?Math.min(1,.01*level(s,19)):0;
 if(sync>0){
  const cr=critRate(s),cm=critMulti(s);
  const critFactor=cr>=1?cr*cm:1+cr*(cm-1);
  const double=probability(s,12),miracle=probability(s,14);
  v=v.mul(1+sync*((critFactor-1)+double+50*miracle));
 }
 return v;
}
export function tap(s,now=Date.now(),rng=Math.random){
 advance(s,now);
 const gap=now-s.lastTap;
 const windowMs=Math.min(5000,1200+20*level(s,6));
 s.combo=gap>=0&&gap<=windowMs?Math.min(1000000,s.combo+1):1;
 s.comboUntil=now+5000;
 s.lastTap=now;s.taps++;
 let base=tapBase(s,now),v=base.mul(comboFactor(s)*timedFactor(s,now));
 if(level(s,4)>0&&gap>=1000)v=v.mul(1+.03*Math.sqrt(level(s,4)));
 if(level(s,2)>0)v=v.add(base.mul(.005*level(s,2)));
 if(level(s,3)>0&&s.taps%5===0)v=v.add(base.mul(.1+.01*level(s,3)));
 if(level(s,9)>0&&s.combo%10===0)v=v.add(base.mul(1+.05*level(s,9)));
 const cr=critRate(s),cm=critMulti(s);let didCrit=false;
 if(cr>=1){v=v.mul(cr*cm);didCrit=true}else if(random01(rng)<cr){v=v.mul(cm);didCrit=true}
 if(didCrit&&random01(rng)<probability(s,13))v=v.add(base.mul(cm));
 if(random01(rng)<probability(s,12))v=v.add(base);
 if(random01(rng)<probability(s,14))v=v.add(base.mul(50));
 if(level(s,8)>0){
  const keep=v.mul(Math.min(.5,.01*Math.sqrt(level(s,8))));
  s.stored=A(s.stored).add(keep).toString();v=v.sub(keep);
  if(s.taps%20===0){v=v.add(A(s.stored).mul(1.2));s.stored='0'}
 }
 if(level(s,21)>0&&s.taps%10===0)s.sourceBuffUntil=now+5000;
 if(level(s,24)>0&&s.combo%100===0)s.synergyUntil=now+10000;
 if(level(s,28)>0&&s.taps%1000===0)s.awakenUntil=now+10000;
 if(level(s,23)>0){const part=Math.min(.1,.001*level(s,23));
  const newValue=v.mul(part);
  if(s.flowQueue.length>=120){const last=s.flowQueue[s.flowQueue.length-1];last.left=A(last.left).add(newValue).toString();last.remaining=5;}
  else s.flowQueue.push({left:newValue.toString(),remaining:5});
 }
 gain(s,v);s.tapEarned=A(s.tapEarned).add(v).toString();s.lastEvent=`手動タップ +${formatAmount(v)}`;
 return {amount:v,crit:didCrit,combo:s.combo};
}
// No simulation loop proportional to auto tap counts: safe during long background intervals.
export function advance(s,now=Date.now()){
 const prev=s.lastTick||now,dt=Math.min(1800,Math.max(0,(now-prev)/1000));
 s.lastTick=now;
 if(!dt)return {seconds:0,auto:0,source:A(0)};
 const mid=prev+Math.min((now-prev)/2,30000);
 let source=sourceRate(s,mid).mul(dt);
 // Timeline overlap: temporary buffs cannot apply to an entire offline interval.
 if(dt>5){source=baseSource(s).mul(dt);}
 let extra=A(0);
 for(const b of s.flowQueue){if(b.remaining<=0)continue;const elapsed=Math.min(dt,b.remaining);
  const paid=A(b.left).mul(elapsed/b.remaining);extra=extra.add(paid);b.left=A(b.left).sub(paid).toString();b.remaining-=elapsed;
 }
 s.flowQueue=s.flowQueue.filter(b=>b.remaining>0&&A(b.left).cmp(0)>0);
 s.recoverCredit+=dt;
 if(level(s,18)>0){const n=Math.floor(s.recoverCredit/10);if(n){s.recoverCredit-=n*10;extra=extra.add(baseSource(s).mul((.1+.01*level(s,18))*n));}}
 else s.recoverCredit=s.recoverCredit%10;
 s.compressCredit+=dt;
 if(level(s,26)>0){const n=Math.floor(s.compressCredit/60);if(n){s.compressCredit-=n*60;extra=extra.add(baseSource(s).mul(Math.sqrt(level(s,26))*n));}}
 else s.compressCredit=s.compressCredit%60;
 let auto=0;
 if(level(s,15)>0){
  const minInterval=level(s,27)>0?.25:.5;
  const interval=Math.max(minInterval,10/(1+.1*level(s,15)));
  const accumulated=s.autoCredit+dt;auto=Math.floor(accumulated/interval);
  s.autoCredit=accumulated-auto*interval;
  if(auto){
   extra=extra.add(autoExpected(s,now).mul(auto));s.autoTaps=Math.min(100000000,s.autoTaps+auto);
   if(level(s,17)>0){const count=Math.floor(auto*Math.min(1,.01*level(s,17)));s.combo=Math.min(1000000,s.combo+count);s.comboUntil=Math.max(s.comboUntil,now+Math.min(5000,1200+20*level(s,6)));}
  }
 }else s.autoCredit=0;
 const total=source.add(extra);gain(s,total);s.sourceEarned=A(s.sourceEarned).add(total).toString();
 return {seconds:dt,auto,source:total};
}
function affordable(wallet,base,level,limit){
 const first=seriesCost(base,1.75,level,1);if(A(wallet).cmp(first)<0)return 0;
 const w=A(wallet),delta=(Math.log10(w.m)+w.e)-(Math.log10(first.m)+first.e),growth=Math.log(1.75);
 const bound=delta<12?Math.ceil(Math.log1p(.75*10**delta)/growth)+2:Math.ceil((delta*Math.LN10+Math.log(.75))/growth)+2;
 return maxAffordable(w,base,1.75,level,Math.max(0,Math.min(limit,bound)));
}
export function quote(s,i){
 if(!Number.isInteger(i)||i<0||i>=COUNT)throw Error('強化番号が不正です');
 const lv=s.levels[i];const limit=100000000-lv;
 if(limit<=0)return {count:0,cost:A(0),next:A(0)};
 const next=seriesCost(BASE_COST[i],1.75,lv,1);
 const max=s.mode==='1'?1:s.mode==='10'?10:s.mode==='NEXT'?(MILESTONES.find(m=>m>lv)||lv+100000)-lv:limit;
 const count=affordable(s.wallet,BASE_COST[i],lv,Math.max(0,Math.min(limit,max)));
 return {count,cost:count?seriesCost(BASE_COST[i],1.75,lv,count):A(0),next};
}
export function buy(s,i,now=Date.now()){
 advance(s,now);const q=quote(s,i);if(!q.count)return {ok:false,count:0};
 s.wallet=A(s.wallet).sub(q.cost).toString();s.levels[i]+=q.count;s.earned[i]=Math.max(s.earned[i],s.levels[i]);
 s.lastEvent=`${ROM[i]} ${EFFECTS[i][0]} +${q.count}Lv`;
 return {ok:true,count:q.count,cost:q.cost};
}
export function sourceQuote(s){return A(100).mul(A(2).pow(s.sourceLevel))}
export function buySource(s,now=Date.now()){
 advance(s,now);if(s.sourceLevel>=1000000)return false;const cost=sourceQuote(s);
 if(A(s.wallet).cmp(cost)<0)return false;
 s.wallet=A(s.wallet).sub(cost).toString();s.sourceLevel++;s.lastEvent='源の試験生産 +1Lv';return true;
}
export function converge(s,now=Date.now()){
 advance(s,now);if(A(s.wallet).cmp('1e6')<0)return false;
 s.wallet='0';s.levels=Array(COUNT).fill(0);s.earned=Array(COUNT).fill(0);s.sourceLevel=0;
 s.cycles++;s.permanent++;s.combo=0;s.autoCredit=0;s.recoverCredit=0;s.compressCredit=0;
 s.sourceBuffUntil=s.synergyUntil=s.awakenUntil=0;s.flowQueue=[];s.stored='0';s.lastEvent='収束完了（試験用永続倍率 +5%）';return true;
}
export function fmt(s,x){const a=A(x);if(s.notation==='scientific')return formatAmount(a,2,'exponent');
 if(s.notation==='japanese'&&a.e>=4){const units=['','万','億','兆','京','垓','秭','穣','溝','澗','正','載','極'];const ix=Math.floor(a.e/4);if(ix<units.length)return (a.m*10**(a.e-ix*4)).toFixed(2)+units[ix];}
 return formatAmount(a,2,'auto');
}
