import {C,unpack,fromLog,compactQuote} from "./compact-campaign-v357.mjs";
const esc=x=>String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nf=x=>x.toLocaleString("ja-JP");
export const compactKind=sub=>({moment:"moment",sources:"source",engraving:"engraving"})[sub];
const cardName=(k,c)=>k==="source"?"源"+String(c.i+1).padStart(2,"0")+(c.rank>=30?" ＋"+nf(Math.floor(c.rank/30)):""):(k==="moment"?C.M:C.E)[c.i][0];
const description=(k,c)=>k==="source"?"実質グレード "+nf(c.rank+1):(k==="moment"?C.M:C.E)[c.i][1];
function rows(c,kind){return C.cards(c,kind).sort((a,b)=>Number(!!b.fresh)-Number(!!a.fresh)||b.rank-a.rank);}
function markup(row,kind){return '<article class="compact-campaign-card" data-compact-card="'+esc(C.key(row))+'"><div class="compact-campaign-info"><div class="compact-campaign-name"><strong data-c-name></strong><small data-c-level></small></div><div data-c-effect></div><small data-c-meta></small></div><button type="button" class="compact-campaign-buy" data-compact-buy="'+esc(C.key(row))+'" data-compact-kind="'+kind+'"><strong data-c-cost></strong><small data-c-count></small></button></article>';}
export function patchCompactCards(root,s,kind,blocked=false,force=false){
 const c=unpack(s),cards=rows(c,kind),signature=kind+":"+cards.map(C.key).join(",");
 if(force||root.dataset.compactSignature!==signature||!root.querySelector("[data-compact-list]")){
  const top=root.dataset.compactSignature?.startsWith(kind+":")?root.scrollTop:0;
  root.innerHTML='<div class="compact-campaign-list" data-compact-list>'+(
   kind==="engraving"&&c.engravingUnlocked?
    (cards.filter(x=>x.fresh).map(x=>markup(x,kind)).join("")+
      [["growth","数値強化"],["feature","機能解放"]].map(([type,label])=>{
       const items=cards.filter(x=>!x.fresh&&C.E[x.i][3]===type);
       return items.length?'<div class="compact-campaign-section">'+label+'</div>'+items.map(x=>markup(x,kind)).join(""):"";
      }).join("")):
     cards.map(x=>markup(x,kind)).join(""))+
    (!cards.length?'<div class="automation-empty">'+(kind==="engraving"?"初回収束で解放":"未解放")+'</div>':"")+'</div>';
  root.dataset.compactSignature=signature;root.scrollTop=top;
 }
 const byKey=new Map([...root.querySelectorAll("[data-compact-card]")].map(n=>[n.dataset.compactCard,n]));
 const set=(el,selector,value)=>{const n=el.querySelector(selector);if(n.textContent!==value)n.textContent=value;};
 let ready=0;
 for(const row of cards){
  const node=byKey.get(C.key(row));if(!node)continue;
  const visible=!row.fresh||row.ready&&C.quote(c,row,"1").count>0;
  const q=C.quote(c,row,row.fresh&&row.breakthrough?"1":s.purchaseMode);
  const done=row.level===row.max,feature=kind==="engraving"&&C.E[row.i][3]==="feature";
  const name=visible?cardName(kind,row):"？？？";
  const lv=visible?(feature?(done?"解放済":"未取得"):"Lv."+nf(row.level)+(kind==="source"?"/10,000":"")):"？？？";
  const effect=visible?(row.fresh?description(kind,row):C.effect(c,row)):"？？？";
  const meta=visible?(kind==="source"?(row.fresh&&row.breakthrough?"限界突破 · Lv1":done?"完成":("次の節目 "+nf(C.marks.find(v=>v>row.level)||10000))):description(kind,row)):"次の解放";
  node.classList.toggle("compact-campaign-locked",!visible);
  set(node,"[data-c-name]",name);set(node,"[data-c-level]",lv);set(node,"[data-c-effect]",effect);set(node,"[data-c-meta]",meta);
  const b=node.querySelector("button");
  b.disabled=blocked||!visible||!q.count;
  if(!b.disabled)ready++;
  set(node,"[data-c-cost]",!visible?"？？？":done?"—":C.fmt(q.count?q.cost:C.cost(c,row,1),kind==="engraving",true));
  set(node,"[data-c-count]",!visible?"？？？":done?(feature?"解放済":"完成"):row.fresh&&row.breakthrough?"限界突破":"購入 ×"+nf(q.count));
  b.setAttribute("aria-label",name+" "+(row.fresh&&row.breakthrough?"限界突破":"購入 "+nf(q.count)+"Lv"));
 }
 return {ready,total:cards.length};
}
export function compactAutomationHTML(s,blocked){
 const c=unpack(s),disabled=blocked?" disabled":"";
 const switchHTML=(key,on,locked=false)=>'<span class="automation-toggle"><input type="checkbox" role="switch" data-compact-auto="'+key+'" aria-label="'+({moment:"刹那",source:"源",engraving:"刻印",converge:"自動収束"}[key])+'"'+(on?" checked":"")+(blocked||locked?" disabled":"")+'></span>';
 const options=(kind)=>[["cheap","安い順"],["grade","高グレード順"]].map(([k,v])=>'<option value="'+k+'"'+(c.settings.priority[kind]===k?" selected":"")+'>'+v+'</option>').join("");
 const row=(k,label)=>{
  const unlocked=C.own(c,k+"Auto");
  return '<div class="compact-campaign-auto-row"><strong>'+(unlocked?label:"？？？")+'</strong><select class="input-select" data-compact-priority="'+k+'" aria-label="'+label+'の購入順"'+(blocked||!unlocked?" disabled":"")+'>'+options(k)+'</select>'+switchHTML(k,c.settings[k],!unlocked)+'</div>';
 };
 const con=C.own(c,"convergeAuto"),cond=c.settings.condition;
 const target=cond==="time"?String(c.settings.seconds):fromLog(c.settings.target).toString();
 const master='<section class="automation-overview"><label class="automation-master-line"><strong>全体自動化</strong><span class="automation-toggle automation-master-toggle"><input type="checkbox" role="switch" data-auto-master aria-label="全体自動化"'+(c.settings.master?" checked":"")+disabled+'></span></label></section>';
 return master+row("moment","刹那")+row("source","源")+row("engraving","刻印")+
 '<div class="compact-campaign-auto-row compact-converge-row"><strong>'+(con?"自動収束":"？？？")+'</strong>'+switchHTML("converge",c.settings.converge,!con)+'</div>'+
 (con?'<div class="compact-campaign-condition"><select class="input-select" data-compact-condition aria-label="収束条件"'+disabled+'><option value="time"'+(cond==="time"?" selected":"")+'>時間（秒）</option><option value="earned"'+(cond==="earned"?" selected":"")+'>累計獲得数</option></select><input class="input-select" data-compact-threshold type="text" inputmode="decimal" aria-label="収束しきい値" value="'+esc(target)+'"'+disabled+'></div>':"");
}
