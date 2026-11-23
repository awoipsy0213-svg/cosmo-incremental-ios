/*
 * 《理》 TIME-RESIDUE-GROWTH-001 (2026-11-24)
 * Native cumulative residue progress. Never infer purchased legacy residues.
 * All numerical constants below are PROVISIONAL PLAYTEST values.
 * Does not affect BOOST consumption, offline progression or resource drop RNG.
 */
import {A} from "./numbers.mjs";

export const GROWTH_CAPS=Object.freeze([100000000n,10000000n,1000000n]);
export const GROWTH_TRIAL=Object.freeze({
  baseChancePerExistence:1e-7,existenceKnee:1e7,aboveKneePower:.25,
  firstIntervalSeconds:30,minIntervalSeconds:1,worldSecondsPerGameSecond:1/(48*3600),
  commonTwo:.40,commonThree:.30,selectionBonus:.05,miracleMeanGameSeconds:300
});
const DIR=["流動","空間","変化","因果","秩序","可能性"];
const CATEGORIES=[
  "event","interval","time","time","source","observation","event","weight","observation","auto","planetGrowth","observation",
  "weight","weight","planetGrowth","interference","time","pending","event","interference","event","auto","source","auto","weight","weight","observation",
  "pending","pending","planetGrowth","interference","observation","interference","pending","planetGrowth","pending","weight","observation","resource",
  "planetGrowth","interference","planetGrowth","planetGrowth","pending","planetGrowth","pending","planetGrowth","observation","event","planetGrowth","resource","observation","observation","resource","weight","source","planetGrowth",
  "planetGrowth","interference","world","weight","event","planetGrowth","observation","observation","interference","observation","observation","planetGrowth","planetGrowth","resource","observation","observation","planetGrowth","observation","observation","observation"
];
if(CATEGORIES.length!==77)throw Error("time growth effects: expected 77");
const LIMITS=Object.freeze({event:1,interval:1,time:.08,world:.05,source:.10,
  planetGrowth:.20,observation:.20,resource:.30,interference:.15,weight:.15,auto:.10,pending:0});
const INDIVIDUAL=Object.freeze({event:.035,time:.015,world:.025,source:.018,
  planetGrowth:.015,observation:.012,resource:.025,interference:.020,weight:.025,auto:.018,pending:0,interval:1});
const idIndex=id=>/^TC0\d\d$/.test(id)?Number(id.slice(2))-1:-1;
const toBig=v=>{
  if(typeof v==="bigint")return v>=0n?v:(()=>{throw Error("負の残滓")})();
  if(typeof v==="number"){
    if(!Number.isSafeInteger(v)||v<0)throw Error("残滓は安全な整数で指定");
    return BigInt(v);
  }
  const s=String(v);
  const m=/^(\d+)(?:\.(\d+))?(?:e\+?(\d+))?$/i.exec(s);
  if(!m)throw Error("残滓の形式が不正");
  const fraction=m[2]||"", exp=m[3]===undefined?0:Number(m[3]);
  if(!Number.isSafeInteger(exp)||exp>12000||exp<fraction.length)throw Error("残滓の指数が不正");
  const digits=m[1]+fraction+"0".repeat(exp-fraction.length);
  if(digits.length>12001)throw Error("残滓の桁数上限を超過");
  return BigInt(digits);
};
export function formatGrowthInt(v){
  const s=toBig(v).toString();
  if(s.length<=6)return Number(s).toLocaleString("ja-JP");
  const head=Number(s.slice(0,3))/100;
  return head.toFixed(2)+"e+"+(s.length-1);
}
export function growthCap(c){return GROWTH_CAPS[(c.principles?.length||1)-1];}
export function freshTimeGrowth(){
  return {version:1,totals:{},recognized:{},masteryUnits:Array(6).fill("0"),
    intervalProgress:0,converted:"0",legacyUnverified:false};
}
export function ensureTimeGrowth(t,concepts=[]){
  if(t.growth===undefined){
    const g=freshTimeGrowth();
    for(const [id,n] of Object.entries(t.residues||{})){
      if(idIndex(id)>=0&&Number.isSafeInteger(n)&&n>0)g.totals[id]=String(n);
    }
    for(const [id,level] of Object.entries(t.concepts||{})){
      if(idIndex(id)>=0&&level>0)g.recognized[id]=true;
    }
    g.legacyUnverified=Object.values(t.concepts||{}).some(level=>level>0);
    t.growth=g;
  }
  const g=t.growth;
  if(!g||g.version!==1||typeof g.totals!=="object"||!g.totals||
     typeof g.recognized!=="object"||!g.recognized||!Array.isArray(g.masteryUnits)||
     g.masteryUnits.length!==6||typeof g.legacyUnverified!=="boolean"||
     !Number.isFinite(g.intervalProgress)||g.intervalProgress<0)throw Error("時の成長データが不正");
  for(const [id,n] of Object.entries(g.totals)){
    if(idIndex(id)<0||idIndex(id)>76)throw Error("概念累計IDが不正");
    g.totals[id]=toBig(n).toString();
  }
  g.masteryUnits=g.masteryUnits.map(n=>toBig(n).toString());
  g.converted=toBig(g.converted||"0").toString();
  for(const id of Object.keys(g.recognized))if(idIndex(id)<0||idIndex(id)>76||g.recognized[id]!==true)
    throw Error("概念認識フラグが不正");
  return g;
}
export function conceptRecognized(t,c){
  if(t.growth?.recognized?.[c.id])return true;
  return Number(t.concepts?.[c.id]||0)>0;
}
export function resolveRecognitions(t,concepts){
  const g=ensureTimeGrowth(t,concepts),added=[];
  for(const c of concepts){
    if(conceptRecognized(t,c))continue;
    if(toBig(g.totals[c.id]||"0")<10n)continue;
    if(c.principles.some(p=>DIR.indexOf(p)>=t.revealedDirections))continue;
    g.recognized[c.id]=true;
    t.concepts[c.id]=Math.max(1,t.concepts[c.id]||0);
    added.push(c.id);
  }
  return added;
}
export function addTimeResidue(t,c,count,concepts){
  const g=ensureTimeGrowth(t,concepts),n=toBig(count);
  if(n===0n)return[];
  const prev=toBig(g.totals[c.id]||"0"),after=prev+n,cap=growthCap(c);
  g.totals[c.id]=after.toString();
  const prevExcess=prev>cap?prev-cap:0n,afterExcess=after>cap?after-cap:0n;
  const excess=afterExcess-prevExcess;
  if(excess>0n){
    const indices=c.principles.map(p=>DIR.indexOf(p));
    if(indices.some(i=>i<0))throw Error("未知の方向");
    const share=6n/BigInt(indices.length);
    for(const i of indices)g.masteryUnits[i]=(toBig(g.masteryUnits[i])+excess*share).toString();
  }
  // Legacy consumable inventory is a non-authoritative compatibility mirror.
  const old=Number(t.residues[c.id]||0);
  t.residues[c.id]=Number(n>BigInt(Number.MAX_SAFE_INTEGER)?BigInt(Number.MAX_SAFE_INTEGER):n);
  t.residues[c.id]=Math.min(Number.MAX_SAFE_INTEGER,old+t.residues[c.id]);
  return resolveRecognitions(t,concepts);
}
export function growthProgress(t,c){
  const n=toBig(t.growth?.totals?.[c.id]||"0"),cap=growthCap(c);
  if(n===0n)return 0;
  if(n>=cap)return 1;
  return Math.pow(Math.log10(1+Number(n))/Math.log10(1+Number(cap)),1.5);
}
function masteryScale(units){
  const s=toBig(units).toString(),lg=s==="0"?-Infinity:s.length-1+Math.log10(Number(s.slice(0,Math.min(12,s.length)))/10**(Math.min(12,s.length)-1));
  if(!Number.isFinite(lg))return 0;
  const lgRatio=lg-Math.log10(600000);
  const inner=lgRatio>8?lgRatio:Math.log10(1+10**lgRatio);
  return Math.max(0,Math.log10(1+Math.max(0,inner)));
}
export function growthBonuses(s,concepts){
  const t=s.time;ensureTimeGrowth(t,concepts);
  const effect={event:0,interval:0,time:0,world:0,source:0,planetGrowth:0,
    observation:0,resource:0,interference:0,weight:0,auto:0,pending:0};
  for(const c of concepts){
    const index=idIndex(c.id);if(index<0||index>76)continue;
    const type=CATEGORIES[index],f=growthProgress(t,c);if(!f)continue;
    const ids=c.principles.map(p=>DIR.indexOf(p)),selected=ids.every(i=>i>=0&&t.selected.includes(i)&&(t.weights[i]||0)>0);
    const min=selected?Math.min(...ids.map(i=>t.weights[i])):0;
    const selectedBonus=selected&&ids.length>1?1+GROWTH_TRIAL.selectionBonus*Math.min(1,min*ids.length/100):1;
    let max=INDIVIDUAL[type]||0;
    if(c.id==="TC001")max=.5;
    effect[type]+=max*f*selectedBonus;
  }
  for(let i=0;i<6;i++){
    const h=masteryScale(t.growth.masteryUnits[i]);
    // Trial role mapping. BOOST acquisition/cost remains independent.
    if(i===0)effect.time+=.005*h;
    if(i===1)effect.resource+=.005*h;
    if(i===2)effect.planetGrowth+=.005*h;
    if(i===3)effect.event+=.005*h;
    if(i===4)effect.auto+=.005*h;
    if(i===5)effect.observation+=.005*h;
  }
  for(const k of Object.keys(effect))effect[k]=Math.max(0,Math.min(LIMITS[k],effect[k]));
  return effect;
}
export function growthEffect(s,c){
  const index=idIndex(c.id),t=s.time;
  if(index<0||index>76)return null;
  const type=CATEGORIES[index],progress=growthProgress(t,c),max=c.id==="TC001"?0.5:(INDIVIDUAL[type]||0);
  const stage=["planetGrowth","observation","resource","interference","pending"].includes(type)?"宇宙":"時";
  return {type,progress,max,bonus:progress*max,recognized:conceptRecognized(t,c),
    active:type!=="pending"&&(stage!=="宇宙"||s.universe.unlocked),stage};
}
export function growthWeights(t,concepts){
  const positive=t.selected.filter(i=>(t.weights[i]||0)>0).sort((a,b)=>a-b);
  if(!positive.length)throw Error("方向配分率が0");
  if(positive.length===1&&positive[0]===0)
    return [{id:"TC001",prob:.25},{id:"TC002",prob:.25},{id:"common",prob:.5}];
  const cardinality=positive.length,common=cardinality===1?0.5:cardinality===2?GROWTH_TRIAL.commonTwo:GROWTH_TRIAL.commonThree;
  const portions=cardinality===1?[1]:cardinality===2?[.6,.4]:[.55,.35,.1];
  const eligible=concepts.filter(c=>c.principles.every(p=>{
    const i=DIR.indexOf(p);return positive.includes(i);
  }));
  const answer=[];
  for(let n=1;n<=cardinality;n++){
    const subset=eligible.filter(c=>c.principles.length===n);
    if(!subset.length)continue;
    const weights=subset.map(c=>{
      const product=c.principles.reduce((v,p)=>v*(t.weights[DIR.indexOf(p)]/100),1);
      return Math.pow(product,1/n);
    });
    const total=weights.reduce((a,b)=>a+b,0);
    for(let i=0;i<subset.length;i++)answer.push({id:subset[i].id,prob:(1-common)*portions[n-1]*weights[i]/total});
  }
  answer.push({id:"common",prob:common});
  const sum=answer.reduce((a,b)=>a+b.prob,0);
  return answer.map(x=>({id:x.id,prob:x.prob/sum}));
}
function drawNormal(rng){
  const u=Math.max(1e-12,Math.min(1-1e-12,rng()));
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rng());
}
function drawPoisson(lambda,rng){
  if(lambda<30){
    const stop=Math.exp(-lambda);let p=1,k=0;
    do{p*=rng();k++;}while(p>stop&&k<10000);
    return Math.max(0,k-1);
  }
  return Math.max(0,Math.round(lambda+Math.sqrt(lambda)*drawNormal(rng)));
}
function amountToInteger(x){
  const amount=A(x);
  if(amount.m===0)return 0n;
  if(amount.e<0)return 0n;
  const s=String(amount.m),pieces=s.split("."),digits=(pieces[0]+(pieces[1]||"")).replace(/^0+/,"")||"0";
  const shift=amount.e-(pieces[1]||"").length;
  if(shift>=0)return BigInt(digits+"0".repeat(shift));
  return BigInt(digits.slice(0,Math.max(0,digits.length+shift))||"0");
}
function sampleEvents(expected,rng){
  const x=A(expected),n=x.toNumber();
  if(Number.isFinite(n)&&n<1000000)return BigInt(drawPoisson(n,rng));
  if(Number.isFinite(n)&&n<1e14)return BigInt(Math.max(0,Math.round(n+Math.sqrt(n)*drawNormal(rng))));
  return amountToInteger(x);
}
function splitTotal(total,dist,rng){
  const output=[],sum=dist.reduce((a,x)=>a+x.prob,0);
  let rest=total,remainingP=sum;
  for(let i=0;i<dist.length;i++){
    let count;
    if(i===dist.length-1)count=rest;
    else {
      const p=Math.max(0,Math.min(1,dist[i].prob/remainingP));
      if(rest<=10000n){
        const n=Number(rest);let draw;
        if(n<64){draw=0;for(let k=0;k<n;k++)if(rng()<p)draw++;}
        else draw=Math.round(n*p+Math.sqrt(n*p*(1-p))*drawNormal(rng));
        count=BigInt(Math.max(0,Math.min(n,draw)));
      }else{
        // Fixed-denominator allocation with exact conservation at huge scale.
        count=rest*BigInt(Math.max(0,Math.min(1000000000,Math.round(p*1e9))))/1000000000n;
      }
    }
    output.push({id:dist[i].id,count});
    rest-=count;remainingP-=dist[i].prob;
  }
  return output;
}
export function advanceTimeResidues(s,concepts,gameSeconds,rng=Math.random){
  const t=s.time,g=ensureTimeGrowth(t,concepts);
  if(!(gameSeconds>0))return {events:"0",converted:"0",recognized:[]};
  const interval=Math.max(GROWTH_TRIAL.minIntervalSeconds,
    GROWTH_TRIAL.firstIntervalSeconds/(1+29*growthProgress(t,concepts[1])));
  const elapsed=g.intervalProgress+gameSeconds;
  const cycles=Math.floor(elapsed/interval);
  g.intervalProgress=elapsed-cycles*interval;
  if(!cycles)return {events:"0",converted:"0",recognized:[]};
  const e=A(s.totalExistenceEarned||"0").add(1);
  const logE=e.e+Math.log10(e.m);
  const rateLog=logE<=7?logE-7:(logE-7)*GROWTH_TRIAL.aboveKneePower;
  const eventBonus=growthBonuses(s,concepts).event;
  const expected=A.fromLog10(rateLog).mul(cycles).mul(1+eventBonus);
  const events=sampleEvents(expected,rng);
  if(events===0n)return {events:"0",converted:"0",recognized:[]};
  const dist=growthWeights(t,concepts),draws=splitTotal(events,dist,rng);
  const recognized=[];
  let common=toBig(t.common||0);
  for(const d of draws){
    if(!d.count)continue;
    if(d.id==="common")common+=d.count;
    else recognized.push(...addTimeResidue(t,concepts[idIndex(d.id)],d.count,concepts));
  }
  const conversions=common/100n;
  t.common=Number(common%100n);
  if(conversions>0n){
    const all=concepts.map(c=>({id:c.id,prob:1/concepts.length}));
    for(const x of splitTotal(conversions,all,rng))
      if(x.count)recognized.push(...addTimeResidue(t,concepts[idIndex(x.id)],x.count,concepts));
    g.converted=(toBig(g.converted)+conversions).toString();
    if(s.counters)s.counters.conversions=Math.min(Number.MAX_SAFE_INTEGER,
      (s.counters.conversions||0)+Number(conversions>BigInt(Number.MAX_SAFE_INTEGER)?BigInt(Number.MAX_SAFE_INTEGER):conversions));
  }
  return {events:events.toString(),converted:g.converted,recognized:[...new Set(recognized)]};
}
