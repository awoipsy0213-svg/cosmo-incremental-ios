/*
 * v3.42 -- compact mobile controls for engrave automation and run plans.
 * Rendering only; all writes go through game.mjs validation.
 */
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pick=(value,current,label)=>'<option value="'+esc(value)+'"'+(String(value)===String(current)?' selected':'')+'>'+esc(label)+'</option>';
const options=(rows,current)=>rows.map(([value,label])=>pick(value,current,label)).join("");
export function engravingAutomationHTML(s,readOnly=false){
 const e=s.engraving,rate=Number(e.levels?.["ENG-17"])||0,unlocked=e.owned.includes("ENG-17")&&rate>0;
 const a=e.autoEngraving,off=readOnly||!unlocked;
 const minOptions=[...new Set(["0","0.001","0.005","0.025","0.125","0.5","1",a.minReserve])]
  .sort((a,b)=>Number(a)-Number(b)).map(value=>[value,value+" 存在"]);
 return '<section class="kw-card automation-row automation-engraving'+(unlocked?'':' is-locked')+'" aria-label="刻印の自動購入">'+
   '<div class="automation-line"><strong>刻印・自動購入</strong><small>'+
   (unlocked?'約'+(3/(1+0.12*(rate-1))).toFixed(2)+'ゲーム秒/回':'刻印「刻印自律」で解放')+'</small>'+
   '<label class="automation-toggle"><input type="checkbox" data-auto-engrave="enabled"'+
   (a.enabled?' checked':'')+(off?' disabled':'')+' aria-label="刻印の自動購入をON/OFF"></label></div>'+
   '<div class="automation-line automation-fields"><label>購入対象<select class="input-select" data-auto-engrave="mode"'+(off?' disabled':'')+'>'+
   options([["both","初回と強化"],["new","初回のみ"],["upgrade","追加強化のみ"]],a.mode)+'</select></label>'+
   '<label>購入優先<select class="input-select" data-auto-engrave="priority"'+(off?' disabled':'')+'>'+
   options([["unowned","未取得優先"],["cheap","価格の安い順"],["grade","高グレード順"]],a.priority)+'</select></label></div>'+
   '<div class="automation-line automation-fields"><label>残しておく存在<select class="input-select" data-auto-engrave="minReserve"'+(off?' disabled':'')+'>'+
   options(minOptions,a.minReserve)+'</select></label></div>'+
   '</section>';
}
export function engravingPresetHTML(s,content,readOnly=false){
 const e=s.engraving,has=e.owned.includes("ENG-30");
 const off=readOnly||!has,system=e.presetSystem,selected=system.activePreset;
 const slots=system.presets.map((preset,i)=>'<div class="engraving-preset-slot">'+
   '<strong>設定 '+(i+1)+(selected===i?' · 使用中':'')+'</strong>'+
   '<button type="button" data-preset-save="'+i+'"'+(off?' disabled':'')+' aria-label="現在の設定をプリセット'+(i+1)+'へ保存">保存</button>'+
   '<button type="button" data-preset-apply="'+i+'"'+(off||!preset?' disabled':'')+' aria-label="プリセット'+(i+1)+'を適用">適用</button></div>').join("");
 const fields=(kind,items)=>{
   const plan=system.plan[kind];
   return '<details data-preserve="engraving-plan-'+kind+'" class="engraving-plan-details">'+
   '<summary>'+ (kind==='moment'?'刹那':'源') +'の購入対象・目標Lv</summary>'+
   '<p class="tiny">目標Lv 0は無制限。対象外をONにすると自動購入しません。</p>'+
   '<div class="engraving-plan-list">'+items.map(item=>{
     const id=item.id,value=Number(plan.targets[id]||0),exclude=plan.excluded.includes(id);
     return '<div class="engraving-plan-row" data-engraving-plan="'+esc(id)+'">'+
       '<span title="'+esc(item.name)+'">'+esc(item.name)+'</span>'+
       '<label>目標<input type="number" inputmode="numeric" min="0" max="1000000" step="1" data-plan-kind="'+kind+'" data-plan-id="'+esc(id)+'" data-plan-field="targetLevel" value="'+value+'"'+(off?' disabled':'')+' aria-label="'+esc(item.name)+'の自動購入目標Lv"></label>'+
       '<label class="engraving-plan-exclude">対象外<input type="checkbox" data-plan-kind="'+kind+'" data-plan-id="'+esc(id)+'" data-plan-field="excluded"'+(exclude?' checked':'')+(off?' disabled':'')+' aria-label="'+esc(item.name)+'を自動購入対象から除外"></label></div>';
   }).join('')+'</div></details>';
 };
 return '<section class="kw-card automation-row automation-preset'+(has?'':' is-locked')+'" aria-label="購入プリセット">'+
  '<div class="automation-line"><strong>周回設計</strong><small>'+(has?'最大3つの自動購入設定を保存':'刻印「周回設計」で解放')+'</small></div>'+
  (has?'<p class="tiny">設定後に「保存」を押してから「適用」してください。自動購入のON/OFFは個別に保持します。</p>'+
  '<div class="engraving-preset-slots">'+slots+'</div>'+
  fields("moment",content.moment)+fields("source",content.sources):'')+
  '</section>';
}
