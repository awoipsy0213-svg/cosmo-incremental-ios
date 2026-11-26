import {C,unpack,fromLog,compactQuote,formatShardAmount} from "./compact-campaign-v357.mjs";
const esc=x=>String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nf=x=>x.toLocaleString("ja-JP");
// Visual icons use the same resource identity as the wallet. The full Japanese
// label remains in textContent, the accessible name and the tooltip.
export function patchCompactAmount(node,label){
 if(node.dataset.currencyLabel===label&&node.textContent===label)return;
 node.dataset.currencyLabel=label;
 const prefix=label.startsWith("+")?"+":"",raw=prefix?label.slice(1):label;
 const segments=raw.split("・").map(part=>part.match(/^(存在|かけら)(.+)$/));
 if(segments.every(Boolean)){
  node.classList.add("compact-resource-amount");
  node.innerHTML=(prefix?'<span class="compact-amount-plus">+</span>':"")+segments.map((m,i)=>(i?'<span class="compact-resource-sr">・</span>':"")+'<span class="compact-amount-segment"><span class="compact-resource-glyph '+(m[1]==="存在"?"existence":"shard")+'" aria-hidden="true"></span><span class="compact-resource-sr">'+m[1]+'</span><span class="compact-amount-value">'+esc(m[2])+'</span></span>').join("");
 }else{
  node.classList.remove("compact-resource-amount");node.textContent=label;
 }
 node.title=label;node.setAttribute("aria-label",label);
}
export const compactKind=sub=>({moment:"moment",sources:"source",engraving:"engraving"})[sub];
const cardName=(k,c)=>k==="source"?"源"+String(c.i+1).padStart(2,"0")+(c.rank>=30?" ＋"+nf(Math.floor(c.rank/30)):""):(k==="moment"?C.M:C.E)[c.i][0];
const description=(k,c)=>k==="source"?"実質グレード "+nf(c.rank+1):(k==="moment"?C.M:C.E)[c.i][1];
const roleLabel=(k,c)=>k==="source"?"":k==="moment"?["基礎タップ","タップ倍率","コンボ","会心率","会心倍率","追加獲得","自動タップ","生産転写"][c.i]:["タップ倍率","源倍率","収束報酬","","自動タップ","費用軽減","","","成長鈍化","初期Lv","",""][c.i];
function rows(c,kind){return C.cards(c,kind).sort((a,b)=>Number(!!b.fresh)-Number(!!a.fresh)||b.rank-a.rank);}
function markup(row,kind){return '<article class="compact-campaign-card" data-compact-card="'+esc(C.key(row))+'" data-compact-card-kind="'+kind+'"><div class="compact-campaign-info"><div class="compact-campaign-name"><div class="compact-name-label"><strong data-c-name></strong><small data-c-role></small></div><small data-c-level></small><small data-c-meta></small></div><div class="compact-campaign-effects"><span data-c-effect></span><span data-c-delta></span></div></div><button type="button" class="compact-campaign-buy" data-compact-buy="'+esc(C.key(row))+'" data-compact-kind="'+kind+'"><strong data-c-cost></strong><small data-c-count></small></button></article>';}
export function patchCompactCards(root,s,kind,blocked=false,_force=false,decoded=null){
 const c=decoded??unpack(s),cards=rows(c,kind),signature=kind+":"+cards.map(row=>C.key(row)+":"+(row.fresh?1:0)).join(",");
 const active=root.contains(document.activeElement)?document.activeElement?.dataset.compactBuy:null;
 let rebuilt=false;
 if(root.dataset.compactSignature!==signature||!root.querySelector("[data-compact-list]")){
  rebuilt=true;
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
 const set=(el,selector,value)=>{const n=el.querySelector(selector);if(n.textContent!==value)n.textContent=value;if(n.title!==value)n.title=value;};
 let ready=0;
 for(const row of cards){
  const node=byKey.get(C.key(row));if(!node)continue;
  const visible=!row.fresh||row.ready&&C.quote(c,row,"1").count>0;
  const q=visible?C.quote(c,row,row.fresh&&row.breakthrough?"1":s.purchaseMode):{count:0};
  const done=row.level===row.max,feature=kind==="engraving"&&C.E[row.i][3]==="feature";
  const name=visible?cardName(kind,row):"？？？";
  const lv=visible?"Lv."+nf(row.level)+"/"+(kind==="source"?"10,000":feature?"1":"∞"):"？？？";
  const effect=visible?C.effectPreview(c,row,q.count):{current:"？？？",delta:"？？？"};
  const next=done||feature?null:kind==="source"?(row.fresh&&row.breakthrough?1:C.marks.find(v=>v>row.level)):Math.min(row.max,row.level+10-row.level%10);
  const meta=visible?(next===null||next===undefined?"—":"N "+nf(next)):"？？？";
  node.classList.toggle("compact-campaign-locked",!visible);
  set(node,"[data-c-name]",name);set(node,"[data-c-role]",visible?roleLabel(kind,row):"");set(node,"[data-c-level]",lv);set(node,"[data-c-effect]",effect.current);set(node,"[data-c-delta]",effect.delta);set(node,"[data-c-meta]",meta);
  const detail=visible?name+" "+lv+" "+(kind==="source"?"次の節目":feature?"":"次の購入境界")+" "+meta+" / "+description(kind,row)+" / "+effect.current+" → 増分 "+effect.delta:"次の解放";
  if(node.title!==detail)node.title=detail;
  const b=node.querySelector("button");
  const disabled=!!(blocked||!visible||!q.count);if(b.disabled!==disabled)b.disabled=disabled;
  if(!b.disabled)ready++;
  const costLabel=!visible?"？？？":done?"—":(kind==="engraving"?formatShardAmount(fromLog(q.count?q.cost:C.cost(c,row,1)),{roundUp:true}):C.fmt(q.count?q.cost:C.cost(c,row,1),false,true));
  if(kind==="engraving")patchCompactAmount(node.querySelector("[data-c-cost]"),costLabel);
  else set(node,"[data-c-cost]",costLabel);
  set(node,"[data-c-count]",!visible?"？？？":done?"—":"×"+nf(q.count));
  const label=visible?detail+" / "+(row.fresh&&row.breakthrough?"限界突破":"購入 "+nf(q.count)+"Lv")+" "+costLabel:"？？？。未解放";
  if(b.getAttribute("aria-label")!==label)b.setAttribute("aria-label",label);
 }
 if(rebuilt&&active){const focused=byKey.get(active)?.querySelector("button");if(focused&&!focused.disabled)focused.focus({preventScroll:true});}
 return {ready,total:cards.length};
}
export const compactThresholdText=c=>c.settings.condition==="time"?String(c.settings.seconds):fromLog(c.settings.target).toString();
const autoKeys=["moment","source","engraving","converge"];
const autoOwned=(c,key)=>C.own(c,key==="converge"?"convergeAuto":key+"Auto");
export function compactAutomationHTML(s,blocked,decoded=null){
 const c=decoded??unpack(s),disabled=blocked?" disabled":"";
 const switchHTML=(key,on,locked=false)=>'<span class="automation-toggle"><input type="checkbox" role="switch" data-compact-auto="'+key+'" aria-label="'+(locked?"未解放の自動化":{moment:"刹那",source:"源",engraving:"刻印",converge:"自動収束"}[key])+'"'+(on?" checked":"")+(blocked||locked?" disabled":"")+'></span>';
 const options=(kind)=>[["cheap","安い順"],["grade","高グレード順"]].map(([k,v])=>'<option value="'+k+'"'+(c.settings.priority[kind]===k?" selected":"")+'>'+v+'</option>').join("");
 const row=(k,label)=>{
  const unlocked=C.own(c,k+"Auto");
  return '<div class="compact-campaign-auto-row"><strong>'+(unlocked?label:"？？？")+'</strong><select class="input-select" data-compact-priority="'+k+'" aria-label="'+(unlocked?label+"の購入順":"未解放の購入順")+'"'+(blocked||!unlocked?" disabled":"")+'>'+options(k)+'</select>'+switchHTML(k,c.settings[k],!unlocked)+'</div>';
 };
 const con=C.own(c,"convergeAuto"),cond=c.settings.condition;
 const target=compactThresholdText(c);
 const master='<section class="automation-overview"><label class="automation-master-line" title="個別設定を保持したまま自動化を一時停止・再開"><strong>全体自動化</strong><span class="automation-toggle automation-master-toggle"><input type="checkbox" role="switch" data-auto-master aria-label="全体自動化"'+(c.settings.master?" checked":"")+disabled+'></span></label></section>';
 return master+row("moment","刹那")+row("source","源")+row("engraving","刻印")+
 '<div class="compact-campaign-auto-row compact-converge-row"><strong>'+(con?"自動収束":"？？？")+'</strong>'+switchHTML("converge",c.settings.converge,!con)+'</div>'+
 (con?'<div class="compact-campaign-condition"><select class="input-select" data-compact-condition aria-label="収束条件"'+disabled+'><option value="time"'+(cond==="time"?" selected":"")+'>時間（秒）</option><option value="earned"'+(cond==="earned"?" selected":"")+'>累計獲得数</option></select><label class="compact-threshold-field"><input class="input-select" data-compact-threshold type="text" inputmode="'+(cond==="time"?"decimal":"text")+'" autocomplete="off" spellcheck="false" aria-label="'+(cond==="time"?"収束間隔（秒）":"収束までの当周回獲得オーブ")+'" title="'+(cond==="time"?"0.1秒以上":"正の数値・指数表記可")+'" value="'+esc(target)+'"'+disabled+'><span aria-hidden="true">'+(cond==="time"?"秒":"オーブ")+'</span></label></div>':"");
}

// Only rebuild on an actual structure change (unlock or condition kind).
// Keep focus and in-progress edits on passive refreshes; settings are saved
// solely by the existing change handlers.
export function patchCompactAutomation(root,s,blocked){
 const c=unpack(s),shape=autoKeys.map(k=>autoOwned(c,k)?1:0).join("")+":"+c.settings.condition;
 if(root.dataset.sub!=="auto-existence"||root.dataset.compactAutoShape!==shape||!root.querySelector("[data-auto-master]")){
  const active=root.contains(document.activeElement)?document.activeElement:null;
  const selector=active?.matches("[data-compact-condition]")?"[data-compact-condition]":active?.matches("[data-compact-threshold]")?"[data-compact-threshold]":null;
  const top=root.dataset.sub==="auto-existence"?root.scrollTop:0;
  root.innerHTML=compactAutomationHTML(s,blocked,c);
  root.dataset.sub="auto-existence";root.dataset.compactAutoShape=shape;root.scrollTop=top;
  if(selector){const n=root.querySelector(selector);if(n&&!n.disabled)n.focus({preventScroll:true});}
 }
 const set=(node,prop,value)=>{if(node&&node[prop]!==value)node[prop]=value;};
 const master=root.querySelector("[data-auto-master]");
 set(master,"checked",c.settings.master);set(master,"disabled",!!blocked);
 for(const k of autoKeys){
  const locked=!autoOwned(c,k),sw=root.querySelector('[data-compact-auto="'+k+'"]'),priority=root.querySelector('[data-compact-priority="'+k+'"]');
  set(sw,"checked",c.settings[k]);set(sw,"disabled",!!blocked||locked);
  set(priority,"value",c.settings.priority[k]);set(priority,"disabled",!!blocked||locked);
 }
 const condition=root.querySelector("[data-compact-condition]"),threshold=root.querySelector("[data-compact-threshold]");
 set(condition,"value",c.settings.condition);set(condition,"disabled",!!blocked);
 set(threshold,"disabled",!!blocked);
 if(threshold&&document.activeElement!==threshold)set(threshold,"value",compactThresholdText(c));
}
