/*
 * 《理》3.41 Time hexagonal presentation.
 * UI projection only: reads existing Time state, never mutates game rules/save data.
 */
import {formatGrowthInt,growthCap} from "./time-growth-v350.mjs";
export const TIME_DIRECTIONS = Object.freeze(["流動","空間","変化","因果","秩序","可能性"]);
const TONES = Object.freeze(["#75d9ff","#9da9ff","#ef9fd9","#f3c46f","#98e1b4","#cba4ff"]);
const SLOTS = Object.freeze([
  {x:160,y:32,left:"50%",top:"10%"},
  {x:271,y:95,left:"84.7%",top:"29.7%"},
  {x:271,y:225,left:"84.7%",top:"70.3%"},
  {x:160,y:288,left:"50%",top:"90%"},
  {x:49,y:225,left:"15.3%",top:"70.3%"},
  {x:49,y:95,left:"15.3%",top:"29.7%"}
]);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function timeHexNodes(t,{readOnly=false}={}){
  const revealed=clamp(Number(t?.revealedDirections)||1,1,6);
  const selected=Array.isArray(t?.selected)?t.selected:[0];
  return TIME_DIRECTIONS.map((name,index)=>{
    const unlocked=index<revealed,active=unlocked&&selected.includes(index);
    const disabled=readOnly||!unlocked||(active?selected.length<=1:selected.length>=3);
    return {index,name:unlocked?name:"？",unlocked,active,disabled,
      percentage:active?clamp(Math.round(Number(t.weights?.[index])||0),0,100):0,
      color:TONES[index]};
  });
}
export function timeHexMarkup(){
  const lines=SLOTS.map((p,i)=>'<line data-hex-line="'+i+'" x1="160" y1="160" x2="'+p.x+'" y2="'+p.y+'"/>').join("");
  const nodes=SLOTS.map((p,i)=>'<button type="button" class="time-hex-node" data-time-direction="'+i+'" style="left:'+p.left+';top:'+p.top+';--node-glow:'+TONES[i]+'" aria-pressed="false" aria-label="未認識の方向" disabled>'+
    '<span class="time-hex-node-symbol" aria-hidden="true">'+["≈","◇","✦","⟡","❖","✧"][i]+'</span>'+
    '<strong data-hex-name>？</strong><small data-hex-weight></small></button>').join("");
  return '<section class="time-hex-stage" aria-label="時の六方向と配分">'+
    '<div class="time-hex-elapsed"><small>経過時間</small><strong data-hex-elapsed>0 秒</strong></div><div class="time-hex-caption"><span data-hex-discovery>認識 1 / 6</span><span data-hex-selection>配分 1 / 3</span></div>'+
    '<div class="time-hex-canvas" role="group" aria-label="六角形の方向選択">'+
    '<svg class="time-hex-svg" viewBox="0 0 320 320" aria-hidden="true" focusable="false">'+
    '<circle class="time-hex-halo" cx="160" cy="160" r="133"/>'+
    '<polygon class="time-hex-frame" points="160,32 271,95 271,225 160,288 49,225 49,95"/>'+
    '<polygon class="time-hex-inset" points="160,65 239,111 239,209 160,255 81,209 81,111"/>'+
    '<g class="time-hex-rays">'+lines+'</g>'+
    '<circle class="time-hex-center-halo" cx="160" cy="160" r="58"/>'+
    '</svg>'+
    '<div class="time-hex-core" aria-label="選択した方向"><span class="time-hex-core-symbol" aria-hidden="true">◈</span>'+
    '<strong data-hex-core>流動</strong><small data-hex-core-hint>選択中</small></div>'+
    nodes+'</div>'+
    '<p class="time-hex-help">方向をタップして選択 · 最大3方向</p>'+
    '<div class="time-hex-actions"><button type="button" class="time-hex-adjust" data-time-open="flow">配分調整</button>'+
    '<nav class="time-hex-shortcuts" aria-label="時の詳細">'+
    '<button type="button" data-time-open="flow">残滓</button>'+
    '<button type="button" data-time-open="concepts">概念</button>'+
    '<button type="button" data-time-open="miracles">奇跡</button></nav></div>'+
    '<p class="time-hex-world-progress" data-hex-world-status aria-live="off">世界は変化を続けている</p>'+
    '</section>';
}
export function patchTimeHex(root,t,{readOnly=false}={}){
  if(!root)return;
  const nodes=timeHexNodes(t,{readOnly});
  nodes.forEach(n=>{
    const button=root.querySelector('[data-time-direction="'+n.index+'"]');
    if(!button)return;
    button.disabled=n.disabled;
    button.classList.toggle("is-active",n.active);
    button.classList.toggle("is-locked",!n.unlocked);
    button.classList.toggle("is-available",n.unlocked&&!n.active&&!n.disabled);
    button.setAttribute("aria-pressed",String(n.active));
    button.setAttribute("aria-label",!n.unlocked?"未認識の方向":n.name+"、"+(n.active?"選択中、配分 "+n.percentage+"%":"未選択")+(n.disabled?"、操作できません":"、タップで切替"));
    const name=button.querySelector("[data-hex-name]");
    if(name&&name.textContent!==n.name)name.textContent=n.name;
    const weight=button.querySelector("[data-hex-weight]");
    const label=n.active?n.percentage+"%":"";
    if(weight&&weight.textContent!==label)weight.textContent=label;
    const ray=root.querySelector('[data-hex-line="'+n.index+'"]');
    if(ray){
      ray.classList.toggle("is-active",n.active);
      ray.style.stroke=n.color;
    }
  });
  const active=nodes.filter(n=>n.active);
  const update=(selector,value)=>{
    const element=root.querySelector(selector);
    if(element&&element.textContent!==value)element.textContent=value;
  };
  update("[data-hex-elapsed]",Math.floor(Number(t.elapsed)||0).toLocaleString("ja-JP")+" 秒");
  update("[data-hex-discovery]","認識 "+clamp(Number(t.revealedDirections)||1,1,6)+" / 6");
  update("[data-hex-selection]","配分 "+active.length+" / 3");
  update("[data-hex-core]",active.map(n=>n.name).join("・")||"流動");
  update("[data-hex-core-hint]",active.length===1?"配分 "+active[0].percentage+"%":"方向を配分中");
  const world=Number(t.worldSeconds)||0;
  const known=Number(t.revealedDirections)>=6;
  update("[data-hex-world-status]",!known?"時間の先に、まだ知らない世界がある":
    (t.eventHappened?"《無の終焉》 · 宇宙への道が開いた":"世界時間 "+clamp(world,0,1).toFixed(6)+" / 1秒"));
}

const h=(value)=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
export function timeHexFlowPanel(t,concepts,principles,icon,{readOnly=false}={}){
  const selected=Array.isArray(t.selected)?t.selected:[0];
  const rows=principles.slice(0,t.revealedDirections).map((name,i)=>{
    const active=selected.includes(i);
    const blocked=readOnly||(active?selected.length<=1:selected.length>=3);
    const checkbox='<label><input type="checkbox" data-direction="'+i+'" '+(active?'checked ':'')+(blocked?'disabled ':'')+'>'+h(name)+'</label>';
    const weight=t.revealedDirections>1?'<div class="princ-weight"><input type="range" min="0" max="100" step="1" data-weight="'+i+'" value="'+Math.round(t.weights[i]||0)+'" '+(!active||readOnly?'disabled ':'')+'aria-label="'+h(name)+'の配分"><output>'+Math.round(t.weights[i]||0)+'%</output></div>':'<small>100%</small>';
    return '<div class="principle-row">'+checkbox+weight+'</div>';
  }).join("");
  const known=concepts.filter(c=>Boolean(t.growth?.totals?.[c.id]&&t.growth.totals[c.id]!=="0")||(t.residues[c.id]||0)>0);
  const residueItems=known.map(c=>{
    const total=t.growth?.totals?.[c.id]||String(t.residues[c.id]||0);
    const recognized=Boolean(t.growth?.recognized?.[c.id]||t.concepts[c.id]>0);
    const cap=growthCap(c),max=BigInt(total)>=cap;
    const detail=recognized?(max?"MAX ・ 熟練度へ成長":"累計 "+formatGrowthInt(total)+" 個"):(formatGrowthInt(total)+" / 10個");
    return '<div class="time-hex-residue-row">'+icon(c)+
      '<strong>'+h(recognized?c.name:"？？？の残滓")+'</strong><small>'+h(detail)+'</small></div>';
  }).join("");
  return '<p class="panel-intro">方向を選び、配分率を調整すると、発見する残滓の傾向が変わります。</p>'+
    '<h3 class="time-hex-section-title">方向の配分 · 最大3方向</h3>'+
    '<div class="kw-list">'+rows+'</div>'+
    (t.revealedDirections===1?'<p class="tiny">流動のみ：2種類の残滓が各25%・共通？？？50%（発生後の内訳）</p>':'')+
    '<h3 class="time-hex-section-title">発見した残滓 · '+known.length+'種類</h3>'+
    (known.length?'<div class="time-hex-residue-list">'+residueItems+'</div>':'<div class="empty-state"><p>残滓はまだ見つかっていません。</p></div>')+
    '<div class="kw-row"><span>共通の？？？ <strong>'+Number(t.common).toLocaleString('ja-JP')+' / 100</strong></span>'+
    '<small>100個で自動変換 · 全77種類</small></div>';
}
export function timeHexMiraclesPanel(t,principles){
  const known=Math.min(6,t.revealedDirections);
  const rows=principles.map((name,i)=>{
    const isKnown=i<known;
    return '<div class="time-hex-miracle-item'+(isKnown?'':' is-hidden')+'"><strong>'+(i+1)+'. '+(isKnown?h(name):'？')+'</strong><small>'+
      (isKnown?(i===0?'初めから認識':Array.isArray(t.miracles)&&t.miracles.includes(i+1)?'奇跡で認識':'認識済み'):'未認識')+'</small></div>';
  }).join('');
  const world=known===6?(t.eventHappened?
    '<p class="status-note">《無の終焉》を観測しました。《宇宙》へ進めます。</p>':
    '<p class="status-note">世界時間 '+Math.min(1,t.worldSeconds).toFixed(6)+' / 1秒</p>'):
    '<p class="status-note">まだ、世界の全ての方向を認識していません。</p>';
  return '<p class="panel-intro">奇跡は新しい方向を認識する特別な出来事です。</p>'+
    '<h3 class="time-hex-section-title">認識した方向 '+known+' / 6</h3>'+
    '<div class="time-hex-miracle-list">'+rows+'</div>'+world;
}
