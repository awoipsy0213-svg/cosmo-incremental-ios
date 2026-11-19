/*
 * 《理》 confirmed time concepts (TC/TD/TE rounds, B options).
 * Stable TC001..TC077 IDs from CONTENT; never use localized names as save keys.
 * Values: fractional bonuses per level, capped individually before stacking.
 * Individual multi-principle effects are active only while all needed directions
 * are selected; permanent levels and residues remain saved regardless of setup.
 */
const rows=[
/* 12 one-direction concepts */
["event",.005,.25],["direction",.005,.50],["direction",.005,.50],
["all",.0025,.25],["all",.001,.10],["weakest",.005,.50],
["event",.0025,.25],["weight",.002,.20],["direction",.005,.50],
["all",.002,.20],["direction",.005,.50],["weight",.002,.20],
/* 45 two-direction concepts */
["direction",.003,.30],["weakest",.004,.40],["time",.002,.20],
["event",.002,.20],["direction",.004,.40],["offlineEfficiency",.001,.10],
["weight",.0025,.25],["all",.0008,.08],["event",.0015,.15],
["event",.002,.20],["direction",.003,.30],["all",.002,.20],
["weight",.002,.20],["weight",.0025,.25],["time",.003,.30],
["direction",.003,.30],["event",.0025,.25],["all",.002,.20],
["direction",.003,.30],["weight",.002,.20],["event",.002,.20],
["direction",.0025,.25],["weakest",.004,.40],["all",.001,.10],
["direction",.003,.30],["weight",.0025,.25],["time",.0025,.25],
["direction",.0025,.25],["event",.002,.20],["weakest",.004,.40],
["direction",.003,.30],["offlineEfficiency",.001,.10],["weight",.002,.20],
["weight",.002,.20],["weight",.003,.30],["event",.002,.20],
["direction",.003,.30],["offlineGrowth",.002,.20],["weight",.002,.20],
["event",.002,.20],["weight",.002,.20],["time",.001,.10],
["event",.002,.20],["weakest",.0035,.35],["all",.002,.20],
/* 20 three-direction concepts */
["direction",.004,.4],["event",.0025,.25],["balanced",.004,.4],
["weakest",.005,.5],["time",.004,.4],
["offlineGrowth",.002,.2],["event",.0025,.25],["weight",.003,.3],
["weight",.002,.2],["world",.001,.1],
["weight",.002,.2],["direction",.0035,.35],["weakest",.006,.6],
["weight",.0035,.35],["weight",.003,.3],["offlineEfficiency",.0015,.15],
["direction",.003,.3],["time",.0025,.25],["weakest",.005,.5],
["world",.0012,.12]
];
if(rows.length!==77)throw Error("TIME effect table must contain exactly 77 effects");
export const TIME_EFFECTS=Object.freeze(Object.fromEntries(rows.map(([type,perLevel,max],index)=>{
  const id="TC"+String(index+1).padStart(3,"0");
  return [id,Object.freeze({id,type,perLevel,max})];
})));
export function conceptLevelCost(nextLevel){
  if(!Number.isSafeInteger(nextLevel)||nextLevel<1||nextLevel>100)return null;
  return nextLevel*10;
}
export function conceptActive(s,c){
  const selected=s.time?.selected||[];
  const all=(c.principles||[]).map(p=>["流動","空間","変化","因果","秩序","可能性"].indexOf(p));
  if(all.some(i=>i<0))return false;
  const effect=TIME_EFFECTS[c.id];if(!effect)return false;
  if(c.id==="TC004")return selected.length>=2&&selected.includes(1)&&Number(s.time?.weights?.[1])>0;
  if(c.id==="TC010")return selected.length>=2;
  if(c.id==="TC006")return selected.length>0;
  if(all.length===1 && ["event","all","weight"].includes(effect.type))return true;
  return all.every(i=>selected.includes(i)&&Number(s.time?.weights?.[i])>0);
}
export function conceptBonuses(s,conceptContent){
  const selected=s.time?.selected||[],weights=s.time?.weights||[];
  const bonus={event:0,time:0,world:0,offlineEfficiency:0,offlineGrowth:0,
    all:0,directions:Array(6).fill(0),candidateWeights:Object.create(null)};
  for(const c of conceptContent){
    const rule=TIME_EFFECTS[c.id],lv=Math.min(100,Math.max(0,Math.floor(s.time?.concepts?.[c.id]||0)));
    if(!rule||!lv||!conceptActive(s,c))continue;
    let b=Math.min(rule.max,lv*rule.perLevel);
    const ids=c.principles.map(x=>["流動","空間","変化","因果","秩序","可能性"].indexOf(x));
    if(rule.type==="balanced"){
      b*=Math.min(1,3*Math.min(...ids.map(i=>weights[i]||0))/100);
    }else if(rule.type==="weakest"){
      const chosen=c.id==="TC006"?selected.filter(i=>(weights[i]||0)>0):ids.filter(i=>selected.includes(i));
      if(chosen.length) {
        const target=chosen.reduce((a,i)=>weights[i]<weights[a]?i:a,chosen[0]);
        bonus.directions[target]+=b;
      }
      continue;
    }else if(rule.type==="direction"){
      for(const i of ids)bonus.directions[i]+=b;
      continue;
    }
    if(rule.type==="balanced"){
      for(const i of ids)bonus.directions[i]+=b;
    }else if(rule.type==="weight"){
      for(const p of ids)bonus.candidateWeights[p]=(bonus.candidateWeights[p]||0)+b;
    }else if(rule.type in bonus)bonus[rule.type]+=b;
  }
  return bonus;
}
export function residueWeights(s,conceptContent){
  const selected=s.time.selected,weights=s.time.weights;
  if(selected.length===1&&selected[0]===0)
    return [{id:"TC001",prob:.25},{id:"TC002",prob:.25},{id:"common",prob:.5}];
  const common = selected.length >= 3 ? .30 : .40;
  const mods=conceptBonuses(s,conceptContent);
  const eligible=conceptContent.filter(c=>c.principles.every(p=>{
    const i=["流動","空間","変化","因果","秩序","可能性"].indexOf(p);
    return selected.includes(i)&&weights[i]>0;
  }));
  const values=eligible.map(c=>{
    let base=c.principles.reduce((a,p)=>a*Math.max(0,weights[["流動","空間","変化","因果","秩序","可能性"].indexOf(p)]/100),1);
    const extra=c.principles.reduce((a,p)=>a+(mods.candidateWeights[["流動","空間","変化","因果","秩序","可能性"].indexOf(p)]||0),0);
    return base*(1+extra);
  });
  const sum=values.reduce((a,b)=>a+b,0);
  if(!(sum>0))return [{id:"common",prob:1}];
  return [...eligible.map((c,i)=>({id:c.id,prob:Math.min(.5,(1-common)*values[i]/sum)})),{id:"common",prob:common}];
}
