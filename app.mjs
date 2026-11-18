import {CONFIG} from "./balance-config.mjs";
import {CONTENT} from "./content.mjs";
import {A,formatAmount} from "./numbers.mjs";
import * as G from "./game.mjs";
import {SaveStore,KEYS,decode,encode} from "./save.mjs";
import {purchaseInsight,shortDuration,formatTaps} from "./purchase-insights.mjs";

const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const params=new URLSearchParams(location.search);
const mode=params.get("lab")==="1"?"lab":"normal";
const dev=params.get("dev")==="1"||mode==="lab";
const childNames={moment:"刹那",sources:"源",engraving:"刻印",flow:"流れ",concepts:"概念",
  planets:"惑星",resources:"資源",observations:"観測",life:"生命",
  boost:"BOOST",achievements:"実績",chronicle:"記録",statistics:"統計",collection:"コレクション",
  guide:"遊び方",settings:"設定",backup:"保存",spec:"設計状況",lab:"開発テスト"};
const organizerItems=["boost","achievements","chronicle","statistics","collection","guide","settings","backup","spec",...(dev?["lab"]:[])];
let memory={};let storage;
try{storage=window.localStorage;}catch(e){storage={getItem:k=>memory[k]||null,setItem:(k,v)=>memory[k]=String(v),removeItem:k=>delete memory[k]};}
const store=new SaveStore(storage,mode,globalThis.crypto?.randomUUID?.()||"tab-"+Date.now());
let state,readOnly=false,storageUnavailable=false,lockRelease=null;
let currentStage="existence",currentSub="moment",sheetState="closed";
let lastFrame=Date.now(),hiddenAt=null,lastSavedAt=0,lastPanelRender=0,lastInteraction=0;
let toastTimer,importDraft="",offlineReport=null,updateWorker=null,confirmedAction=null;
let navDigest="",notice="",busyBirth=false;
const BOOST_QUICK_ICON=`<svg class="boost-quick-symbol" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13 2 5 13h6l-1 9 9-12h-6V2z" fill="currentColor"/></svg>`;
let holdPurchase=null,skipClickFor=null;
const f=(n,p=2)=>formatAmount(n,p,state?.settings.notation);
const duration=seconds=>{
  seconds=Math.max(0,Math.floor(seconds));
  const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;
  return h?`${h}時間${m}分`:m?`${m}分${s}秒`:`${s}秒`;
};
function toast(message){
  $("toast").textContent=message;$("toast").classList.add("show");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").classList.remove("show"),3500);
}
function showNotice(message){
  notice=message;$("noticeText").textContent=message;$("noticeBar").hidden=!message;
}
async function ask(title,text,yes="実行する"){
  if(confirmedAction)return false;
  $("confirmTitle").textContent=title;$("confirmText").textContent=text;$("confirmYes").textContent=yes;
  $("confirmDialog").showModal();
  return new Promise(resolve=>confirmedAction=resolve);
}
function finishConfirm(ok){
  const r=confirmedAction;confirmedAction=null;$("confirmDialog").close();r?.(ok);
}
$("confirmYes").onclick=()=>finishConfirm(true);
$("confirmNo").onclick=()=>finishConfirm(false);
$("confirmDialog").addEventListener("cancel",e=>{e.preventDefault();finishConfirm(false);});
async function acquireLock(){
  if(!navigator.locks){readOnly=false;return;}
  await new Promise(resolve=>{
    navigator.locks.request("kotowari-v31:"+mode,{ifAvailable:true},async lock=>{
      if(!lock){readOnly=true;resolve();return;}
      readOnly=false;resolve();
      await new Promise(r=>lockRelease=r);
    }).catch(e=>{readOnly=true;showNotice("保存用ロックを取得できません。別のゲーム画面を閉じてください。");resolve();});
  });
}
function checkpoint(){
  if(!state||readOnly||document.hidden)return;
  const now=Date.now(),gap=now-state.lastWall;
  const report=G.advance(state,now,{offline:gap>15000});
  if(gap>15000&&report.elapsed>0)reportOffline(report);
}
function save(forceSnapshot=false){
  if(!state||readOnly)return false;
  try{
    checkpoint();store.write(state,{snapshot:forceSnapshot});
    lastSavedAt=Date.now();$("saveIndicator").textContent=storageUnavailable?"一時保存":"保存済";
    $("saveIndicator").title=new Date(lastSavedAt).toLocaleTimeString("ja-JP");
    return true;
  }catch(e){
    $("saveIndicator").textContent="保存不可";
    showNotice(e.message+"。「保存」からデータを書き出してください。");
    if(e.message.includes("別タブ"))readOnly=true;
    return false;
  }
}
function reportOffline(report){
  if(report.elapsed<15)return;
  offlineReport=report;
  if(state.settings.showOffline)showNotice(`復帰：オーブ +${f(report.orbs)} / BOOST +${duration(Math.max(0,report.boost))}。本編は30分上限×30%、BOOST蓄積は別計算です。`);
}
function applySettings(){
  document.body.classList.toggle("lab-mode",mode==="lab");
  document.body.classList.toggle("not-compact",!state.settings.compact);
  document.body.classList.toggle("reduced-motion",state.settings.reducedMotion);
  document.body.classList.toggle("high-contrast",state.settings.highContrast);
  document.body.classList.toggle("low-power",state.settings.lowPower);
  document.body.classList.toggle("readonly-mode",readOnly);
  document.body.classList.toggle("filter-affordable",state.settings.affordableOnly);
}
function setSheet(which){
  sheetState=which;$("sheet").dataset.state=which;$("sheet").hidden=which==="closed";
  document.body.classList.toggle("sheet-open",which!=="closed");
  $("expandButton").textContent=which==="full"?"↙":"↗";
  $("expandButton").setAttribute("aria-label",which==="full"?"半分表示に戻す":"リストを全表示");
  if(which!=="closed")renderPanel(true);
}
function setStage(id){
  if(!availableStages().some(x=>x.id===id))return;
  if(currentStage===id&&sheetState!=="closed"){setSheet("closed");return;}
  currentStage=id;
  currentSub=CONTENT.stages.find(x=>x.id===id).children[0];
  setSheet("half");render(true);
}
function availableStages(){
  return CONTENT.stages.filter(x=>x.id==="existence"?state.intro.complete:x.id==="time"?state.time.unlocked:x.id==="universe"?state.universe.unlocked:state.life.unlocked);
}
function openOrganizer(){
  $("organizerLinks").innerHTML=organizerItems.map(id=>`<button data-organizer="${id}">${esc(childNames[id])}<span>›</span></button>`).join("");
  $("organizerDrawer").showModal();
}
function openOrganizerPage(id){
  $("organizerDrawer").close();
  currentStage="organizer";currentSub=id;setSheet("half");render(true);
}
function renderNav(){
  const a=availableStages();
  const digest=JSON.stringify([a.map(x=>x.id),currentStage,state.intro.complete]);
  if(navDigest===digest)return;navDigest=digest;
  $("stageNav").hidden=!state.intro.complete;
  // Keep BOOST in its own fixed-size slot at the left of the stage bar.
  // It is accessible even when the stage sheet is fully expanded.
  const shortcut=`<button id="boostQuick" type="button" class="boost-quick" data-action="toggle-boost" aria-pressed="false" aria-label="BOOSTを操作する" title="BOOST：タップで加速を切り替える">${BOOST_QUICK_ICON}<span id="boostQuickTime" class="boost-quick-time" aria-hidden="true">--</span><span id="boostQuickFill" class="boost-quick-fill" aria-hidden="true"></span></button>`;
  $("stageNav").innerHTML=shortcut+a.map(x=>`<button data-stage="${x.id}" class="${currentStage===x.id?"active":""}" aria-pressed="${currentStage===x.id}">${x.name}</button>`).join("")+`<button data-action="organizer" aria-label="共通管理メニュー">≡</button>`;
}
function renderWorld(){
  document.body.classList.toggle("is-intro",!state.intro.complete);
  document.body.style.setProperty("--intro-light",String(.2+.8*Math.min(1,state.intro.touches/CONFIG.provisional.introTouches)));
  const stage=CONTENT.stages.find(x=>x.id===currentStage)||CONTENT.stages[0];
  document.body.dataset.cosmoStage=String(stage.number);
  $("stageKicker").textContent=`STAGE 0${stage.number}`;
  $("stageTitle").textContent=stage.name;
  const rate=G.production(state),tap=G.tapPower(state);
  $("convergeMain").hidden=!state.intro.complete||!["existence","organizer"].includes(currentStage);
  if(["existence","organizer"].includes(currentStage)){
    $("primaryValue").textContent=f(G.existence(state),3);
    $("worldDetails").innerHTML=`<span class="wallet">オーブ <b>${f(state.orbs)}</b></span><span>干渉 +${f(tap)} / 自動 +${f(rate)} 毎秒</span>`;
    $("worldHint").textContent="光に触れて、生み出す。";
    const q=G.convergenceQuote(state);
    $("convergeMain").disabled=!q.steps||readOnly;
    $("convergeMain").innerHTML=`<strong>収束 <span>+${f(q.reward,3)}</span></strong><span><small>次の報酬まで</small>${f(q.nextRemaining)} オーブ</span>`;
  }else if(currentStage==="time"){
    $("primaryValue").textContent=Math.floor(state.time.elapsed).toLocaleString("ja-JP");
    $("worldDetails").innerHTML=`<span class="wallet">TIME · 経過の表示（仮換算）</span><span>自動生成 +${f(rate)} オーブ / 秒</span>`;
    $("worldHint").textContent=state.time.eventHappened?"《無の終焉》を観測した。":Object.keys(state.time.residues).length?"変化の中に、未知の残滓がある。":"世界は、触れなくても変わり始めた。";
    if(state.time.eventHappened)$("worldDetails").innerHTML+=`<span class="wallet">世界時間 1秒に到達</span>`;
  }else if(currentStage==="universe"){
    $("primaryValue").textContent=String(state.universe.planets.length);
    $("worldDetails").innerHTML=`<span class="wallet">観測している惑星</span><span>生成可能 ${state.universe.maxPlanets} / 発見資源 ${state.universe.discoveredResources.length}</span>`;
    $("worldHint").textContent="観測し、理解し、干渉する。";
  }else{
    $("primaryValue").textContent="";$("worldDetails").textContent="未知の変化が、自己を維持し始める。";
    $("worldHint").textContent="《生命》の詳細システムは設計中です。";
  }
}
function quoteText(q){
  if(q.count) return `+${q.count.toLocaleString("ja-JP")} · ${f(q.cost)}`;
  // MAX used to say only "資源不足", hiding the next actual price.
  if(q.reason==="資源不足"&&A(q.cost).cmp(0)>0) return `次の1Lv · ${f(q.cost)}`;
  return q.reason||"購入不可";
}
function cardQuote(kind,id){
  const q=G.purchaseQuote(state,kind,id),name=kind==="source"?CONTENT.sources.find(x=>x.id===id).name:CONTENT.moment.find(x=>x.id===id).name;
  return `<button class="buy-button" data-purchase="${kind}" data-id="${id}" ${!q.enabled||readOnly?"disabled":""} aria-label="${esc(name+"を購入")}"><span class="buy-amount" data-quote-label>${esc(quoteText(q))}</span><small>オーブ</small></button><div class="live-buy-hint" data-live-hint aria-live="off"></div><div class="buy-progress" aria-hidden="true"><i style="width:0%"></i></div>`;
}
function momentHTML(){
  const q=G.convergenceQuote(state);
  return `<p class="panel-intro">通常資源のオーブと、収束で得る《存在》は別です。強化の価格・効果量は調整用の仮値です。</p>
    <div class="row-grid">${CONTENT.moment.map(x=>`<article class="kw-card purchase-card" data-purchase-card><div class="card-top"><strong>${x.name}</strong><span class="badge">仮</span></div><small data-moment-level="${x.id}">Lv.${state.moment[x.id].toLocaleString("ja-JP")}</small><small>${x.id==="tap"?"タップ +1 / Lv.":"タップ倍率 ×1.5 / Lv."}</small>${cardQuote("moment",x.id)}</article>`).join("")}</div>
    <h3>収束</h3><div class="kw-card"><strong data-convergence-reward>獲得予定 +${f(q.reward,3)} 存在</strong><p>必要量を越えても、オーブは貯め続けられます。自動では収束しません。</p><button class="wide-button" data-action="converge" ${!q.steps||readOnly?"disabled":""}>収束する · 次まで ${f(q.nextRemaining)} オーブ</button><p class="tiny">報酬単位 +0.001 は基準案。必要量・全消費の規則は仮実装です。</p></div>`;
}
function sourcesHTML(){
  const ms=CONFIG.confirmed.sourceMilestones;
  return `<p class="panel-intro">30種 · 最大Lv.1,000,000 · 21節目。名前は仮名、7能力の配置・未決定効果は「？？？」です。</p>
  <div class="row-grid">${CONTENT.sources.map((x,i)=>{
    const v=state.sources[x.id],done=ms.filter(m=>m<=v.level).length,next=ms.find(m=>m>v.level),prev=[0,...ms].filter(m=>m<=v.level).at(-1),ratio=next?(v.level-prev)/(next-prev):1;
    return `<article class="kw-card source-card purchase-card" data-purchase-card><div class="card-top"><strong>${String(i+1).padStart(2,"0")} ${x.name}</strong></div>
    <small data-source-level="${x.id}">Lv.${v.level.toLocaleString("ja-JP")} / ＋${v.plus}</small><button class="more-button source-detail-button" data-source-detail="${x.id}" aria-label="${x.name}の詳細">⋯</button><div class="slim-progress"><i style="width:${Math.max(0,Math.min(100,ratio*100))}%"></i></div>
    <div class="source-meta"><span>節目 ${done}/21</span><span>次 ${next?next.toLocaleString("ja-JP"):"MAX"}</span></div>
    ${cardQuote("source",x.id)}
     ${v.level===1000000?`<button class="wide-button" data-breakthrough="${x.id}" ${mode!=="lab"?"disabled":""}>＋循環 ${mode==="lab"?"（仮の個別突破）":"要確認"}</button>`:""}</article>`;
  }).join("")}</div>`;
}
function engravingHTML(){
  const editing=state.engraving.draft!==null,q=G.engravingQuote(state);
  return `<p class="panel-intro">通常購入の倍率は使いません。仮振り → 確定で反映。未決定ノードは通常プレイに勝手な効果を付けません。</p>
    <div class="kw-card"><div class="card-top"><strong>余剰の存在 ${f(state.surplusExistence,3)}</strong><span class="badge confirmed">存在1は保護</span></div><p>毎日1回の無料再編・実績再編権・トークンの方針は保持。更新時刻・返却額・費用は要確認です。</p>
    ${!editing?'<button class="wide-button" data-action="edit-engraving">ビルドを編集する</button>':`<p class="tiny">編集中。確定まで現在のビルドは変わりません。</p>`}</div>
    <h3>刻印の枝</h3><div class="row-grid">${CONTENT.engravings.map(x=>`<div class="kw-card"><strong>${x.name}</strong><p class="tiny">${x.description}</p><small>${state.engraving.active.includes(x.id)?"適用中":"未取得"} / ${mode==="lab"?"検証費用 0.001":"費用 ？？？"}</small><button class="wide-button" data-draft="${x.id}" ${!editing||mode!=="lab"?"disabled":""}>${state.engraving.draft?.includes(x.id)?"仮選択を外す":"仮選択"}</button></div>`).join("")}</div>
    ${editing?`<div class="status-note">${state.engraving.observationUnlocked?`追加取得 ${q.added.length} / 消費予定 ${f(q.cost,3)} 存在（検証値）`:"詳細な合算・比較は《刻印の観測》で解放。達成条件は？？？"}</div><div class="sub-grid"><button class="wide-button" data-action="cancel-engraving">編集を取り消す</button><button class="wide-button" data-action="confirm-engraving">確定する</button></div>`:""}
    <p class="tiny muted">権能・断片・装備型奇跡は採用保留。ここでは追加していません。</p>`;
}
function flowHTML(){
  const t=state.time;
  return `<p class="panel-intro">存在を方向へ配分し、変化を見守ります。《時》に転生・リセットはありません。</p>
    <div class="kw-card"><strong>認識した方向 ${t.revealedDirections} / 6</strong><p>${t.revealedDirections===1?"まだ、流れだけがある。":"配分できるのは最大3方向。配分は本検証版では非消費の比率設定です（正式な消費・配置規則は要確認）。"}</p></div>
    <div class="kw-list">${CONTENT.principles.slice(0,t.revealedDirections).map((name,i)=>`<div class="principle-row"><label><input type="checkbox" data-direction="${i}" ${t.selected.includes(i)?"checked":""}>${name}</label>${t.revealedDirections>1?`<div class="princ-weight"><input type="range" min="0" max="100" step="1" data-weight="${i}" value="${Math.round(t.weights[i])}" ${!t.selected.includes(i)?"disabled":""} aria-label="${name}の配分"><output>${t.weights[i].toFixed(0)}%</output></div>`:"<small>100%</small>"}</div>`).join("")}</div>
    <div class="status-note">新方向の奇跡・残滓生成頻度・世界時間の換算は未決定。${mode==="lab"?"検証用の速度・確率で進行します。":"自動抽選・新方向解放を確定値として実行しません。"}</div>
    ${t.revealedDirections===1?'<p class="tiny">生成が起きた後の結果は、衝突25%・移動25%・共通？？？50%。生成そのものの発生率とは別です。</p>':""}`;
}
function icon(c){
  const n=c.iconIndex;
  const count=3+n%6,rot=Math.floor(n/6)*17;
  const points=Array.from({length:count},(_,i)=>{const a=(i/count*360+rot)*Math.PI/180;return `${16+10*Math.cos(a)},${16+10*Math.sin(a)}`;}).join(" ");
  return `<svg class="concept-icon" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="${4+Math.floor(n/8)%4}"/><polygon points="${points}"/><circle cx="${6+n%5*5}" cy="${6+Math.floor(n/5)%5*5}" r="1.4" fill="currentColor"/></svg>`;
}
function conceptHTML(){
  const t=state.time,visible=CONTENT.concepts.filter(c=>(t.residues[c.id]||0)>0||t.concepts[c.id]);
  return `<p class="panel-intro">同じ残滓10個で最初の概念を形成。未発見の名前・効果は先に表示しません。</p>
    <div class="kw-row"><span>形成済み ${Object.values(t.concepts).filter(x=>x>0).length} / 77<small>共通の？？？ ${t.common}</small></span><button data-action="convert-common" ${t.common<100?"disabled":""}>100個 → 抽選1個</button></div>
    <p class="tiny muted">全77種が抽選対象。交換先は選べません。手動操作・等確率は検証用の仮方式です。</p>
    ${visible.length?`<div class="row-grid">${visible.map(c=>{
      const formed=(t.concepts[c.id]||0)>0;
      return `<div class="kw-card concept-card"><div class="card-top">${icon(c)}<strong class="${formed?"":"unrecognized"}">${formed?c.name:"？？？の残滓"}</strong></div>
      <small>残滓 ${t.residues[c.id]||0} / 10${formed?` · Lv.${t.concepts[c.id]}`:""}</small><small>${formed?"効果：？？？":"まだ、形を持たない。"}</small>
      ${formed?'<small>Lv.2以降の条件：？？？</small>':`<button class="wide-button" data-form="${c.id}" ${(t.residues[c.id]||0)<10?"disabled":""}>概念として形成</button>`}</div>`;
    }).join("")}</div>`:'<div class="empty-state"><div class="glyph">·</div><p>まだ残滓は見つかっていません。<br>見つかったものだけが、ここに残ります。</p></div>'}`;
}
function planetHTML(){
  const u=state.universe,p=G.planet(state);
  return `<p class="panel-intro">惑星は自然成長と資源投入で変化します。初期状態・成長速度は仮値。星齢は残り寿命ではありません。</p>
    <div class="kw-row"><span>惑星 ${u.planets.length} / ${u.maxPlanets}<small>初回崩壊 → 《惑星の破滅》 → 2惑星</small></span><button data-action="create-planet" ${u.planets.length>=u.maxPlanets?"disabled":""}>生成する</button></div>
    ${u.planets.length?`<select class="input-select" id="planetSelect" aria-label="育成する惑星">${u.planets.map((p,i)=>`<option value="${p.id}" ${u.selectedPlanetId===p.id?"selected":""}>惑星 ${i+1} · ${p.id}</option>`).join("")}</select>`:""}
    ${p?`<div class="row-grid" style="margin-top:10px">${CONTENT.stats.map((x,i)=>{
      const known=p.observed.includes(x.id);
      const v=x.id==="age"?G.ageSeconds(p):p.stats[x.id];
      return `<div class="kw-card stat-card"><strong ${known?"":'class="unknown-label"'}>${known?x.name:""}</strong><div class="stat-number" aria-label="${known?x.name:"未知の数値"+(i+1)}">${f(v,x.id==="age"?0:3)}${known&&x.id==="age"?" 秒":""}${known&&x.id==="stability"?"%":""}</div>${known?`<small>${x.description}</small>`:""}</div>`;
    }).join("")}</div>`:'<div class="empty-state"><div class="glyph">◌</div><p>物質が、ひとつの惑星になる。</p><small>初回生成の費用は未決定。検証版では仮に0です。</small></div>'}
    <div class="status-note">観測による名称認識条件・破壊と崩壊・残留対象は要確認。通常版で強制崩壊や寿命カウントダウンは表示しません。</div>
    ${mode==="lab"?'<p class="tiny">検証では「開発テスト」から観測名の解放・崩壊イベントを試せます。星齢の仮表示は実時間基準です。</p>':""}`;
}
function resourcesHTML(){
  const u=state.universe,visible=CONTENT.resources.filter(r=>u.discoveredResources.includes(r.id)||A(u.resources[r.id]||0).cmp(0)>0);
  return `<p class="panel-intro">全資源が質量の成長に寄与します。個別効果は？？？。他の資源への合成・変換はありません。</p>
    <div class="status-note">受取方式：${mode==="lab"?(u.receiptMode?`${u.receiptMode}（検証設定）`:"未選択"):"要確認"}。A＝崩壊時受領、B＝時間受領＋崩壊報酬。通常版の自動受領は未適用です。</div>
    ${mode==="lab"?`<label class="kw-row">検証方式<select class="input-select" id="receiptSelect"><option value="" ${!u.receiptMode?"selected":""}>選択しない</option value="A" ${u.receiptMode==="A"?"selected":""}>A：崩壊で受領</option><option value="B" ${u.receiptMode==="B"?"selected":""}>B：時間＋崩壊</option></select></label>`:""}
    <p class="tiny muted">投入は1個あたり質量+1の仮値。全42種の名前は資料の暫定名です。未発見優遇はありません。</p>
    ${visible.length?`<div class="row-grid">${visible.map(r=>`<div class="kw-card"><div class="card-top"><strong>${r.name}</strong><span class="badge">R${r.rank} / 仮名</span></div><small>所持 ${f(u.resources[r.id]||0)}</small><small>質量+1（仮） / 個性 ？？？</small><button class="wide-button" data-invest="${r.id}" ${!G.planet(state)||A(u.resources[r.id]||0).cmp(1)<0?"disabled":""}>1個を投入</button></div>`).join("")}</div>`:'<div class="empty-state"><p>まだ資源を所持していません。</p></div>'}`;
}
function observationsHTML(){
  return `<p class="panel-intro">名前や意味は現象の観測後に判明します。具体的な認識条件はまだ未決定です。</p><div class="kw-list"><div class="kw-card"><strong>観測 → 理解 → 干渉</strong><p>惑星同士の衝突、成長方向への干渉、崩壊誘発、安定性への干渉は方向性として保管しています。</p><small>解放条件・費用・効果式：？？？</small></div><div class="kw-card"><strong>コア → 脈動 → 生命</strong><p>R6のアステリム（仮名）と惑星コアは別のものです。</p><small>コアの形態・形成条件・生命への移行条件：？？？</small></div></div>`;
}
function boostHTML(){
  const v=G.boostValues(state),s=state.boost;
  const labels=["オフライン報酬効率","オフライン進行の対象時間","BOOST基礎獲得量","オフラインBOOST獲得倍率","BOOST保有上限"];
  return `<div class="kw-card boost-status-card"><div class="card-top"><strong data-boost-remaining>${duration(s.seconds)} / ${duration(v.capacity)}</strong><span class="badge" data-boost-state>${s.active?"加速中":"蓄積中"}</span></div><div class="slim-progress"><i data-boost-progress style="width:${Math.min(100,100*s.seconds/v.capacity)}%"></i></div>
    <p>オンライン ${duration(v.onlineRate*3600)}/時 · オフライン ${duration(v.offlineRate*3600)}/時</p>
    <small data-boost-fill>オフラインで満タンまで ${duration((v.capacity-s.seconds)/v.offlineRate)}</small>
    <button class="wide-button" data-action="toggle-boost" ${s.seconds<1&&!s.active?"disabled":""}>${s.active?"加速を停止":"加速を開始 ×2（仮設定）"}</button>
    <p class="tiny">暫定式：m倍で実時間1秒につきBOOST(m−1)秒消費。タップ威力は直接増えません。アプリを閉じている間は消費しません。</p></div>
    <h3>BOOSTだけで育てる5系統</h3><p class="panel-intro">各ステージ・源・刻印からBOOSTを強化しません。価格と増加幅は未決定です。</p>
    <div class="kw-list">${labels.map((x,i)=>{
      const current=[`${Math.round(v.efficiency*100)}%`,duration(v.offlineCap),`${duration(v.onlineRate*3600)}/時`,`${(v.offlineRate/v.onlineRate).toFixed(2)}倍`,duration(v.capacity)][i];
      const trial=JSON.parse(JSON.stringify(state));trial.mode="lab";trial.boost.upgrades[i]++;
      const next=G.boostValues(trial),nexts=[`${Math.round(next.efficiency*100)}%`,duration(next.offlineCap),`${duration(next.onlineRate*3600)}/時`,`${(next.offlineRate/next.onlineRate).toFixed(2)}倍`,duration(next.capacity)];
      return `<div class="kw-card"><strong>${x}</strong><small>現在 ${current} → 強化後 ${mode==="lab"?nexts[i]:"？？？"}</small><button class="wide-button" data-boost-upgrade="${i}" ${mode!=="lab"?"disabled":""}>${mode==="lab"?duration(CONFIG.lab.boostUpgradeBaseCost*(s.upgrades[i]+1))+"で1段階（検証）":"費用 ？？？ / 未適用"}</button></div>`;
    }).join("")}</div><p class="status-note">本編のオフライン上限30分と、BOOST獲得時間は別。8時間離れても、BOOSTは容量60分まで貯まり、超過分だけ破棄されます。</p>`;
}
function achievementHTML(){
  return `<p class="panel-intro">達成条件が決まっているものを実装。条件未定の実績に仮の倍率報酬は付けません。</p><div class="kw-list">${CONTENT.achievements.map(x=>`<div class="kw-card"><div class="card-top"><strong>${state.achievements.includes(x.id)?"✦":"◇"} ${x.name}</strong><span class="badge">${x.status}</span></div><p>${x.description}</p><small>${state.achievements.includes(x.id)?"記録済み":x.id==="engravingObservation"?"達成条件 ？？？":"未達成"}</small></div>`).join("")}</div>`;
}
function statisticsHTML(){
  const values=[["タップ入力",state.counters.taps.toLocaleString("ja-JP")],["収束",state.convergenceCount.toLocaleString("ja-JP")+"回"],["累計オーブ",f(state.totalOrbs)],["余剰存在",f(state.surplusExistence,3)],["源総Lv.",Object.values(state.sources).reduce((v,x)=>v+x.level,0).toLocaleString("ja-JP")],["概念形成",Object.values(state.time.concepts).filter(x=>x>0).length+" / 77"],["オンライン",duration(state.counters.onlineSeconds)],["オフライン",duration(state.counters.offlineSeconds)]];
  return `<div class="sub-grid">${values.map(([k,v])=>`<div class="kw-card"><small>${k}</small><strong>${v}</strong></div>`).join("")}</div><p class="tiny">刻印の詳細合算と変更前後比較は、観測機能の解放前には表示しません。</p>`;
}
function guideHTML(){
  return `<div class="kw-list"><div class="kw-card"><strong>世界を生み、変化を観測する</strong><p>《無》は序章です。光に干渉すると最初の存在が成立します。存在1は失われません。</p></div>
  ${state.intro.complete?'<div class="kw-card"><strong>刹那・源・刻印</strong><p>タップと源は通常資源のオーブを生みます。任意のタイミングで収束して、余剰の存在を得ます。刻印は余剰分だけを使う設計です。</p></div>':""}
  ${state.time.unlocked?'<div class="kw-card"><strong>流れと概念</strong><p>時は自律成長を見守る場所です。同じ残滓10個で最初の概念を認識。未決定効果はまだ働きません。</p></div>':""}
  <div class="kw-card"><strong>この版の範囲</strong><p>設定データに「確定」「暫定」「要確認」「未決定」を保持しています。価格・速度など動作確認用の値と、正式仕様は別です。</p><button class="wide-button" data-organizer="spec">反映済みと未決定を確認</button></div></div>`;
}
function settingsHTML(){
  const labels=[["compact","コンパクト表示","2列で多くの項目を表示"],["showPurchaseHints","購入見込みを表示","足りない額・自動生成での目安・獲得量（仮）を表示"],["affordableOnly","購入可能なものだけ表示","一覧を絞り込むだけで自動購入はしません"],["holdToBuy","長押しで連続購入","押している間だけ通常購入を繰り返します"],["reducedMotion","動きを減らす","発光・波紋・開閉演出を抑える"],["highContrast","読みやすい境界線","文字と境界のコントラストを調整"],["lowPower","省電力","背景アニメーションを停止"],["confirmConvergence","収束前に確認","仮のリセット範囲を確認する"],["showOffline","復帰時に報告","オフラインの進行とBOOSTを表示"]];
  return `<p class="panel-intro">背景は既存のORGANIC FLOWを維持。安全な保存・表示設定は序章から利用できます。</p>
  ${labels.map(([id,name,desc])=>`<label class="kw-row"><span>${name}<small>${desc}</small></span><input type="checkbox" data-pref="${id}" ${state.settings[id]?"checked":""}></label>`).join("")}
  <label class="kw-row">数値表記<select class="input-select" data-pref="notation"><option value="auto" ${state.settings.notation==="auto"?"selected":""}>自動</option><option value="scientific" ${state.settings.notation==="scientific"?"selected":""}>指数</option></select></label>
  <div class="kw-row"><span>バージョン<small>Ver.3.1の確定仕様・暫定バランス調整 / 星雲ネオンUI</small></span><strong>3.4.0</strong></div>
  <div class="kw-row"><span>通信<small>クラウド・課金は未接続</small></span><strong>${navigator.onLine?"オンライン":"オフライン"}</strong></div>
  <button class="wide-button" data-organizer="backup">保存とバックアップ</button>
  <a class="link-button" href="./legacy/" data-legacy-link>保管した旧版Ver.3.0で続ける</a><br>
  <a class="link-button" href="./privacy.html">プライバシー・データ保存について</a>
  ${mode==="lab"?'<a class="link-button" href="./">通常プレイに戻る</a>':'<a class="link-button" href="./?lab=1">別セーブで設計検証モードを開く</a>'}
  <p class="tiny">BGM・SE・通知・クラウド同期・決済は、この版では実装していません。</p>`;
}
function backupHTML(){
  const bs=store.backups();
  return `<p class="panel-intro">この端末の自動保存＋3世代履歴。消去・故障に備え、JSONを外にも保存してください。クラウド同期ではありません。</p>
  ${state.migration?`<div class="status-note">旧版から移行済み。オーブ・源・概念等を引継ぎ。星屑・旧永久強化・惑星ランク等は推測変換せず、旧版のセーブに保管しています。</div>`:""}
  <div class="sub-grid"><button class="wide-button" data-action="export-save">JSONを書き出す</button><button class="wide-button" data-action="copy-save">文字列をコピー</button></div>
  <button class="wide-button" data-action="snapshot">いまの履歴を保存</button>
  <h3>データを読み込む</h3><input id="importFile" type="file" accept=".json,application/json,text/plain" aria-label="セーブJSONを選ぶ">
  <textarea id="importText" aria-label="バックアップ文字列" placeholder="バックアップJSONを貼り付け">${esc(importDraft)}</textarea>
  <button class="wide-button" data-action="import-save">内容を検証して読み込む</button>
  <h3>保存履歴</h3>${bs.length?bs.map((x,i)=>`<div class="kw-row"><span>${new Date(x.at).toLocaleString("ja-JP")}</span><button data-restore="${i}">復元</button></div>`).join(""):'<p>まだ履歴はありません。</p>'}
  <button class="wide-button" data-action="export-legacy">退避した旧データを書き出す</button>
  ${store.blocked?'<button class="wide-button" data-action="export-corrupt">読めなかった元データを救出</button>':""}
  <p class="tiny">旧セーブキーは削除しません。別URL・別ドメインへはJSONによる移行が必要です。</p>`;
}
function specHTML(){
  return `<p class="panel-intro">引き継ぎ資料を基準に反映。「設計で確定」と「この版で動く」は別です。</p>
  <div class="kw-card"><strong>今回、実装した核</strong><p>序章・最初の存在1 / オーブ分離 / 任意収束 / 親子タブ / 30源と21節目 / NEXTとMAX / 残滓の個別保管・10個形成 / 共通？？？の全77抽選 / BOOST独立蓄積 / 保存保護。</p></div>
  <h3>要確認・未適用</h3>${CONTENT.pending.map(x=>`<details data-preserve="${x.id}"><summary>${x.name} <span class="badge pending" style="margin-left:auto">要確認</span></summary><p>${x.description}</p></details>`).join("")}
  <h3>惑星15ステータス</h3>${CONTENT.stats.map(x=>`<div class="kw-row"><span>${x.name}<small>${x.description}<br>未定：${x.pending}</small></span><span class="badge ${x.status==="確定"?"confirmed":"pending"}">${x.status}</span></div>`).join("")}
  <a class="link-button" href="./docs/implementation.html">今回の反映・保留一覧</a>
  <h3>Ver.3.3での購入支援</h3><div class="kw-card"><strong>リアルタイム購入表示</strong><p>購入可能・不足額・所要時間を自動更新。購入可能のみ表示／長押し連続購入は操作補助であり、自動購入やマクロの解放ではありません。</p><small>源の仮の秒間生産係数を0.02から0.4へ調整。正式仕様ではありません。</small></div>
  <p class="tiny">源の名称・42資源名は暫定名を保持。概念の個別効果や未決定ステータスへ汎用倍率は付けていません。</p>`;
}
function labHTML(){
  if(mode!=="lab")return '<div class="status-note">通常のセーブを変更せず、検証用データで確認します。</div><a class="link-button" href="./?lab=1">設計検証モードへ</a>';
  const actions=[["orbs","オーブ +1兆"],["existence","余剰存在 +10"],["sourceMax","源01をLv.100万"],["directions","6方向を検証解放"],["concept","衝突の残滓 +10"],["common","共通？？？ +100"],["world","世界時間を1秒へ"],["observe","観測名・刻印比較を解放"],["resources","全42資源 +100"],["mass","選択惑星を質量100に"],["collapse","崩壊イベントを検証"],["life","生命タブを表示"],["boost","BOOSTを満タン"],["offline","8時間オフラインを検証"]];
  return `<div class="status-note">独立した検証セーブです。仮の確率・受取方式・コスト・解放を試せます。ここでの達成は通常セーブに反映しません。</div>
  <div class="row-grid">${actions.map(([id,t])=>`<button class="wide-button" data-lab="${id}">${t}</button>`).join("")}</div><p class="tiny">崩壊前に「宇宙 → 資源」でA/Bを選択。圧力10単位で×1.1は検証用の仮式。安定の残留対象は未決定なので、破壊処理には適用していません。</p>
  <a class="link-button" href="./">通常プレイに戻る</a>`;
}
function renderPanel(force=false){
  if(sheetState==="closed")return;
  const now=Date.now();
  // Currency/affordability is patched on the existing buttons every UI tick.
  // Do not rebuild the purchase cards while earning resources or holding a finger.
  if(!force&&(holdPurchase||currentStage==="existence"&&["moment","sources"].includes(currentSub)))return;
  if(!force&&(now-lastPanelRender<1700||now-lastInteraction<700||$("sheetBody").contains(document.activeElement)&&document.activeElement.matches("input,textarea,select")))return;
  lastPanelRender=now;
  const stage=CONTENT.stages.find(x=>x.id===currentStage);
  const children=currentStage==="organizer"?organizerItems:stage.children;
  $("childTabs").innerHTML=children.map(id=>`<button data-child="${id}" class="${currentSub===id?"active":""}" aria-pressed="${currentSub===id}">${childNames[id]}</button>`).join("");
  $("sheetHeading").textContent=(currentStage==="organizer"?"ORGANIZER":stage.name)+" / "+childNames[currentSub];
  $("purchaseToolbar").hidden=currentStage!=="existence"||!["moment","sources"].includes(currentSub);
  document.querySelectorAll("[data-buy-mode]").forEach(b=>b.classList.toggle("active",b.dataset.buyMode===state.purchaseMode));
  const body=$("sheetBody"),top=body.scrollTop,details=[...body.querySelectorAll("details[open][data-preserve]")].map(x=>x.dataset.preserve);
  const map={moment:momentHTML,sources:sourcesHTML,engraving:engravingHTML,flow:flowHTML,concepts:conceptHTML,
    planets:planetHTML,resources:resourcesHTML,observations:observationsHTML,
    life:()=>'<div class="empty-state"><div class="glyph">◌</div><p>未知の変化から、生命を認識する。</p><p>微生物・有機生物への接続は設計中です。生命を購入する操作は追加していません。</p></div>',
    boost:boostHTML,achievements:achievementHTML,statistics:statisticsHTML,settings:settingsHTML,backup:backupHTML,spec:specHTML,lab:labHTML,guide:guideHTML,
    chronicle:()=>state.events.length?'<div class="kw-list">'+[...state.events].reverse().map(e=>`<div class="kw-row"><span>${esc(e.text)}<small>${new Date(e.at).toLocaleString("ja-JP")}</small></span></div>`).join("")+'</div>':'<div class="empty-state"><p>まだ出来事は記録されていません。</p></div>',
    collection:()=>conceptHTML()};
  body.innerHTML=(map[currentSub]||guideHTML)();
  if(currentStage==="existence"&&["moment","sources"].includes(currentSub))body.insertAdjacentHTML("beforeend",'<p id="purchaseFilterEmpty" class="status-note" hidden>現在購入できる項目はありません。「購入可能のみ」を解除すると全項目を表示します。</p>');
  body.querySelectorAll("details[data-preserve]").forEach(x=>x.open=details.includes(x.dataset.preserve));
  body.scrollTop=force&&body.dataset.sub!==currentSub?0:top;body.dataset.sub=currentSub;
}
function refreshPurchaseButtons(){
  if(!state||sheetState==="closed"||currentStage!=="existence"||!["moment","sources"].includes(currentSub))return;
  const wallet=state.orbs,rate=G.production(state),tap=G.tapPower(state);
  const buttons=[...$("sheetBody").querySelectorAll("button[data-purchase]")];
  let ready=0,nearest=null;
  for(const b of buttons){
    const kind=b.dataset.purchase,id=b.dataset.id,q=G.purchaseQuote(state,kind,id);
    const info=purchaseInsight(q,wallet,rate,tap),card=b.closest("[data-purchase-card]");
    const enabled=q.enabled&&!readOnly&&!store.blocked;
    b.disabled=!enabled;
    b.classList.toggle("is-buyable",enabled);
    if(card)card.classList.toggle("is-buyable",enabled);
    const label=quoteText(q);
    // No wholesale DOM rebuild, even as the wallet grows or MAX quantity changes.
    const labelNode=b.querySelector("[data-quote-label]");
    // Update just the number, never recreate the button or its icon/label.
    if(labelNode&&labelNode.textContent!==label)labelNode.textContent=label;
    if(enabled)ready++;
    const hint=card?.querySelector("[data-live-hint]");
    if(hint){
      let value="";
      if(state.settings.showPurchaseHints&&info.hasTarget){
        if(enabled)value="購入可能 · タップして強化";
        else {
          value=`不足 ${f(info.missing)}`;
          if(info.seconds!==null&&Number.isFinite(info.seconds))value+=` · 自動で約${shortDuration(info.seconds)}`;
          else if(info.taps!==null)value+=` · あと約${formatTaps(info.taps)}タップ`;
        }
        if(kind==="source"&&q.count>0){
          const i=CONTENT.sources.findIndex(x=>x.id===id),plus=state.sources[id].plus;
          const trialMult=mode==="lab"?Math.pow(2,plus):1;
          const increment=q.count*CONFIG.provisional.source.productionPerLevel*(i+1)*trialMult;
          if(Number.isFinite(increment)&&increment>0)value+=` · 生成 +${f(increment)}/秒（仮）`;
        }
      }
      if(hint.textContent!==value)hint.textContent=value;
      hint.hidden=!state.settings.showPurchaseHints||!value;
      const bar=card.querySelector(".buy-progress>i");
      if(bar)bar.style.width=`${info.progress.toFixed(1)}%`;
    }
    if(!enabled&&info.hasTarget){
      // The shortest wait is a UI suggestion, not an automatic purchase queue.
      const score=A(info.missing).div(rate.cmp(0)>0?rate:tap).toNumber();
      if(Number.isFinite(score)&&(!nearest||score<nearest.score))nearest={id,kind,score,info};
    }
  }
  const summary=`購入可能 ${ready} / ${buttons.length} · 所持 ${f(wallet)} オーブ${nearest?` · 次は ${(nearest.kind==="source"?CONTENT.sources:CONTENT.moment).find(x=>x.id===nearest.id)?.name||""}（${nearest.info.seconds!==null?shortDuration(nearest.info.seconds):"タップで獲得"}）`:""}`;
  if($("purchaseLiveSummary").textContent!==summary){
    $("purchaseLiveSummary").textContent=summary;
    $("purchaseLiveSummary").title=summary;
  }
  if(currentSub==="moment"){
    const q=G.convergenceQuote(state),b=$("sheetBody").querySelector('button[data-action="converge"]');
    if(b){
      b.disabled=!q.steps||readOnly||store.blocked;
      const label=`収束する · 次まで ${f(q.nextRemaining)} オーブ`;
      if(b.textContent!==label)b.textContent=label;
    }
    const reward=$("sheetBody").querySelector('[data-convergence-reward]');
    if(reward){const label=`獲得予定 +${f(q.reward,3)} 存在`;if(reward.textContent!==label)reward.textContent=label;}
  }
  $("purchaseFilterToggle").textContent=state.settings.affordableOnly?"購入可能のみ ✓":"購入可能のみ";
  $("purchaseFilterToggle").setAttribute("aria-pressed",String(state.settings.affordableOnly));
  document.body.classList.toggle("filter-affordable",state.settings.affordableOnly);
  const empty=$("purchaseFilterEmpty");
  if(empty)empty.hidden=!state.settings.affordableOnly||ready>0;
}
function refreshBoostShortcut(){
  if(!state||!state.intro.complete)return;
  const seconds=Math.max(0,state.boost.seconds);
  const active=state.boost.active&&seconds>0;
  const capacity=G.boostValues(state).capacity;
  const shortcut=$("boostQuick");
  if(shortcut){
    shortcut.classList.toggle("is-boosting",active);
    shortcut.classList.toggle("is-empty",!active&&seconds<1);
    shortcut.disabled=readOnly||store.blocked;
    shortcut.setAttribute("aria-pressed",String(active));
    const label=`BOOST ${duration(seconds)}。${active?"加速中。タップで停止":"タップで加速を開始"}${seconds<1&&!active?"。残量がない場合はBOOST画面を開きます":""}`;
    if(shortcut.getAttribute("aria-label")!==label)shortcut.setAttribute("aria-label",label);
    shortcut.title=label;
    const time=$("boostQuickTime");
    if(time){
      // Two stable text glyphs, with a fixed box: no reflow as seconds change.
      const display=active?"×2":seconds>=3600?`${Math.floor(seconds/3600)}h`:seconds>=60?`${Math.floor(seconds/60)}m`:`${Math.floor(seconds)}s`;
      if(time.textContent!==display)time.textContent=display;
    }
    shortcut.style.setProperty("--boost-ratio",String(Math.max(0,Math.min(1,seconds/capacity))));
  }
  if(currentSub!=="boost"||sheetState==="closed")return;
  // The organizer's BOOST panel updates in place with the same geometry.
  const panel=$("sheetBody");
  const remaining=panel.querySelector("[data-boost-remaining]");
  if(remaining)remaining.textContent=`${duration(seconds)} / ${duration(capacity)}`;
  const badge=panel.querySelector("[data-boost-state]");
  if(badge)badge.textContent=active?"加速中":"蓄積中";
  const fill=panel.querySelector("[data-boost-progress]");
  if(fill)fill.style.width=`${(100*Math.min(1,seconds/capacity)).toFixed(2)}%`;
  const offline=panel.querySelector("[data-boost-fill]");
  if(offline)offline.textContent=`オフラインで満タンまで ${duration((capacity-seconds)/G.boostValues(state).offlineRate)}`;
  const button=panel.querySelector('button[data-action="toggle-boost"]');
  if(button){
    button.disabled=readOnly||store.blocked||(!active&&seconds<1);
    button.textContent=active?"加速を停止":"加速を開始 ×2（仮設定）";
  }
}
function render(force=false){
  if(!state)return;
  renderNav();renderWorld();renderPanel(force);refreshPurchaseButtons();refreshBoostShortcut();
}
function wave(x,y,gain){
  if(state.settings.reducedMotion||state.settings.lowPower)return;
  const rect=$("touchField").getBoundingClientRect();
  const span=document.createElement("span");span.className="wave";
  span.style.left=(x-rect.left)+"px";span.style.top=(y-rect.top)+"px";$("waves").appendChild(span);
  const text=document.createElement("span");text.className="wave-gain";text.style.left=span.style.left;text.style.top=span.style.top;
  if(gain&&A(gain).cmp(0)>0){text.textContent="+"+f(gain);$("waves").appendChild(text);}
  setTimeout(()=>{span.remove();text.remove();},850);
}
function birth(){
  busyBirth=true;$("birthOverlay").classList.add("visible");
  const t=state.settings.reducedMotion?150:CONFIG.provisional.introFadeMs;
  setTimeout(()=>{$("birthOverlay").classList.remove("visible");busyBirth=false;render(true);},t);
}
function handleTap(x,y){
  if(readOnly||store.blocked||busyBirth||!state)return;
  if(!["existence","organizer"].includes(currentStage)&&state.intro.complete)return;
  checkpoint();const result=G.tap(state);wave(x,y,result.gain);
  if(result.foundation){save(true);birth();}
  render(false);
}
const activePointers=new Set();
$("touchField").addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse"&&e.button!==0)return;
  if(activePointers.has(e.pointerId))return;
  activePointers.add(e.pointerId);e.preventDefault();
  handleTap(e.clientX,e.clientY);
});
for(const name of ["pointerup","pointercancel"])window.addEventListener(name,e=>activePointers.delete(e.pointerId));
$("touchField").addEventListener("keydown",e=>{
  if(e.key==="Enter"||e.key===" "){e.preventDefault();const r=$("touchField").getBoundingClientRect();handleTap(r.left+r.width/2,r.top+r.height/2);}
});
let drag=null;
$("sheetHandle").addEventListener("pointerdown",e=>{
  if(e.target.closest("button"))return;drag={id:e.pointerId,y:e.clientY};$("sheetHandle").setPointerCapture(e.pointerId);
});
$("sheetHandle").addEventListener("pointerup",e=>{
  if(!drag||drag.id!==e.pointerId)return;const d=e.clientY-drag.y;drag=null;
  if(d>45)setSheet(sheetState==="full"?"half":"closed");
  if(d< -45)setSheet("full");
});
$("sheetHandle").addEventListener("pointercancel",()=>drag=null);
document.addEventListener("pointerdown",()=>lastInteraction=Date.now(),{passive:true});
$("sheetBody").addEventListener("scroll",()=>lastInteraction=Date.now(),{passive:true});
// Manual press-and-hold: each purchase is individually quoted and deducted
// through the normal G.buy transaction. No unattended or background macro.
function stopHoldPurchase(evt=null){
  const h=holdPurchase;
  if(!h||evt&&evt.pointerId!==h.pointerId)return;
  clearTimeout(h.timer);clearInterval(h.repeat);
  h.button?.classList.remove("holding-purchase");
  if(h.started){
    skipClickFor={key:h.kind+":"+h.id,until:Date.now()+650};
    if(h.bought)save();
    render(true);
  }
  holdPurchase=null;
}
function buyWhileHeld(h){
  if(h!==holdPurchase||readOnly||store.blocked||document.hidden||!state?.settings.holdToBuy)return;
  checkpoint();
  const result=G.buy(state,h.kind,h.id);
  if(!result.ok)return;
  h.bought++;
  if(Date.now()-h.lastSave>950){save();h.lastSave=Date.now();}
  const node=$("sheetBody").querySelector(h.kind==="source"?`[data-source-level="${h.id}"]`:`[data-moment-level="${h.id}"]`);
  if(node){
    const level=h.kind==="source"?state.sources[h.id].level:state.moment[h.id];
    node.textContent=`Lv.${level.toLocaleString("ja-JP")}`+(h.kind==="source"?` / ＋${state.sources[h.id].plus}`:"");
  }
  renderNav();renderWorld();refreshPurchaseButtons();
}
document.addEventListener("pointerdown",e=>{
  const b=e.target.closest?.('button[data-purchase]');
  if(!b||b.disabled||!state?.settings.holdToBuy||readOnly||store.blocked||holdPurchase)return;
  if(e.pointerType==="mouse"&&e.button!==0)return;
  const h={button:b,kind:b.dataset.purchase,id:b.dataset.id,pointerId:e.pointerId,
    x:e.clientX,y:e.clientY,started:false,bought:0,timer:null,repeat:null,lastSave:Date.now()};
  holdPurchase=h;
  h.timer=setTimeout(()=>{
    if(holdPurchase!==h)return;
    h.started=true;b.classList.add("holding-purchase");
    buyWhileHeld(h);
    h.repeat=setInterval(()=>buyWhileHeld(h),CONFIG.provisional.ui.holdRepeatMs);
  },CONFIG.provisional.ui.holdStartMs);
},{passive:true});
window.addEventListener("pointermove",e=>{
  const h=holdPurchase;
  if(h&&h.pointerId===e.pointerId&&Math.hypot(e.clientX-h.x,e.clientY-h.y)>13)stopHoldPurchase(e);
},{passive:true});
for(const ev of ["pointerup","pointercancel"]){window.addEventListener(ev,e=>stopHoldPurchase(e));}
function resultDone(res,successText=null){
  if(!res?.ok){toast(res?.reason||"この操作は実行できません");return false;}
  save();render(true);if(successText)toast(successText);return true;
}
function download(text,name,type="application/json"){
  const blob=new Blob([text],{type});const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
}
async function dispatchAction(action){
  if(action==="organizer"){openOrganizer();return;}
  if(action==="filter-affordable"){
    state.settings.affordableOnly=!state.settings.affordableOnly;save();refreshPurchaseButtons();return;
  }
  if(action==="close-drawer"){$("organizerDrawer").close();return;}
  if(action==="expand"){setSheet(sheetState==="full"?"half":"full");return;}
  if(action==="collapse-sheet"){setSheet("closed");return;}
  if(action==="dismiss-notice"){showNotice("");return;}
  if(action==="export-save"){save();download(store.export(state),`kotowari-v31-${mode}-${new Date().toISOString().slice(0,10)}.json`);return;}
  if(action==="copy-save"){
    save();const text=store.export(state);
    try{await navigator.clipboard.writeText(text);toast("バックアップをコピーしました");}
    catch(e){importDraft=text;renderPanel(true);$("importText")?.focus();$("importText")?.select();toast("表示した文字列を選択してコピーしてください");}return;
  }
  if(action==="export-legacy"){
    const text=storage.getItem(KEYS.legacyArchive)||storage.getItem(KEYS.legacy);
    if(text)download(text,"kotowari-legacy-archive.json");else toast("退避した旧データはありません");return;
  }
  if(action==="export-corrupt"){
    const text=storage.getItem(store.key+".corrupt")||storage.getItem(store.key)||storage.getItem(KEYS.legacy);
    if(text)download(text,"kotowari-recovery-original.txt","text/plain");return;
  }
  if(readOnly){toast("別のタブが編集中です。ほかのゲーム画面を閉じてから再読み込みしてください。");return;}
  checkpoint();
  if(action==="converge"){
    const q=G.convergenceQuote(state);
    if(!q.steps){toast("必要なオーブを集めてください");return;}
    const text=`存在 +${f(q.reward,3)} を獲得します。\nオーブと刹那・源の周回内Lvをリセットします。\n最初の存在1・時・概念は残ります。\n報酬式と源＋の収束時保持は調整・確認中です。`;
    if(state.settings.confirmConvergence&&!await ask("収束する",text,"収束する"))return;
    if(resultDone(G.converge(state))){
      busyBirth=true;document.body.classList.add("is-converging");
      setTimeout(()=>{document.body.classList.remove("is-converging");busyBirth=false;},state.settings.reducedMotion?100:650);
    }return;
  }
  if(action==="edit-engraving")return resultDone(G.beginEngraving(state));
  if(action==="cancel-engraving")return resultDone(G.cancelEngraving(state),"変更を取り消しました");
  if(action==="confirm-engraving")return resultDone(G.confirmEngraving(state),"ビルドを確定しました");
  if(action==="convert-common")return resultDone(G.convertCommon(state),"ひとつの残滓を得ました");
  if(action==="create-planet")return resultDone(G.createPlanet(state));
  if(action==="toggle-boost"){
    if(!state.boost.active&&state.boost.seconds<1){
      openOrganizerPage("boost");toast("BOOST残量がありません。蓄積状況を表示しています");return;
    }
    state.boost.active=!state.boost.active;
    save();render(true);
    toast(state.boost.active?"BOOST加速を開始しました（×2・仮設定）":"BOOST加速を停止しました");
    return;
  }
  if(action==="snapshot"){if(save(true)){renderPanel(true);toast("履歴を保存しました");}return;}
  if(action==="import-save"){
    const text=$("importText")?.value||importDraft;
    if(!text.trim()){toast("バックアップを選択・貼り付けてください");return;}
    // Validate BEFORE asking to replace the active data.
    try{
      const p=JSON.parse(text);
      if(p.kind==="kotowari-backup-v31"||p.kind==="kotowari-save"||p.schemaVersion===31)decode(text,mode);
      else G.migrateLegacy(p);
      if(!await ask("バックアップを読み込む","現在のデータを退避して、指定した進行へ切り替えます。検証データを通常データへは読み込めません。","読み込む"))return;
      state=store.import(text);applySettings();importDraft="";offlineReport=null;
      render(true);showNotice("バックアップを読み込みました。読み込み時の経過時間の報酬は重複付与しません。");
    }catch(e){toast("読込中止："+e.message);}return;
  }
  if(action==="update"){
    if(!save(true)){toast("先に保存エラーを解決してください");return;}
    updateWorker?.postMessage({type:"SKIP_WAITING"});return;
  }
}
document.addEventListener("click",async e=>{
  const b=e.target.closest("button,a");if(!b)return;
  try{
    if(b.dataset.stage){setStage(b.dataset.stage);return;}
    if(b.dataset.child){currentSub=b.dataset.child;renderPanel(true);return;}
    if(b.dataset.organizer){openOrganizerPage(b.dataset.organizer);return;}
    if(b.dataset.action){await dispatchAction(b.dataset.action);return;}
    if(b.matches("[data-legacy-link]")){save(true);return;}
    if(b.dataset.sourceDetail){
      const x=CONTENT.sources.find(x=>x.id===b.dataset.sourceDetail);
      await ask(x.name+"（仮名）",`特性案：${x.role}\n最終効果：${x.finalDescription}\n\n通常6効果：？？？\n7効果の配置：？？？\n\n共通21節目：\n${CONFIG.confirmed.sourceMilestones.map(x=>x.toLocaleString("ja-JP")).join(" → ")}`,"閉じる");return;
    }
    if(readOnly){toast("別タブの書き込みを保護中です");return;}
    if(store.blocked && b.dataset.restore===undefined){toast("元セーブを保護中です。「保存」から復元してください。");return;}
    checkpoint();
    if(b.dataset.buyMode){G.setPurchaseMode(state,b.dataset.buyMode);save();renderPanel(true);return;}
    if(b.dataset.purchase){
      if(skipClickFor&&skipClickFor.key===b.dataset.purchase+":"+b.dataset.id&&Date.now()<skipClickFor.until){skipClickFor=null;return;}
      resultDone(G.buy(state,b.dataset.purchase,b.dataset.id));return;
    }
    if(b.dataset.breakthrough){resultDone(G.breakthrough(state,b.dataset.breakthrough));return;}
    if(b.dataset.draft){resultDone(G.toggleDraft(state,b.dataset.draft));return;}
    if(b.dataset.form){resultDone(G.formConcept(state,b.dataset.form),"概念を認識しました");return;}
    if(b.dataset.invest){resultDone(G.invest(state,b.dataset.invest),"資源を投入しました。固有効果は？？？のままです");return;}
    if(b.dataset.boostUpgrade!==undefined){resultDone(G.labBoostUpgrade(state,Number(b.dataset.boostUpgrade)));return;}
    if(b.dataset.restore!==undefined){
      if(!await ask("保存履歴から復元","現在のデータを退避して、この履歴へ戻します。","復元する"))return;
      state=store.restoreBackup(Number(b.dataset.restore));applySettings();render(true);toast("履歴から復元しました");return;
    }
    if(b.dataset.lab){
      const r=G.labAction(state,b.dataset.lab);
      if(resultDone(r)){if(r.report)reportOffline(r.report);else toast("検証用データに反映しました");}return;
    }
  }catch(error){toast("操作を中止しました："+error.message);console.error(error);}
});
document.addEventListener("change",async e=>{
  const t=e.target;if(!state)return;
  if(t.id==="importFile"){
    const file=t.files?.[0];if(!file)return;
    if(file.size>4*1024*1024){toast("4MBを超えるファイルは読み込めません");return;}
    importDraft=await file.text();const area=$("importText");if(area)area.value=importDraft;return;
  }
  if(readOnly){render(true);return;}
  checkpoint();
  if(t.dataset.pref){
    state.settings[t.dataset.pref]=t.type==="checkbox"?t.checked:t.value;applySettings();save();render(true);return;
  }
  if(t.dataset.direction!==undefined){const r=G.setDirection(state,Number(t.dataset.direction),t.checked);resultDone(r);return;}
  if(t.dataset.weight!==undefined){G.setWeight(state,Number(t.dataset.weight),Number(t.value));save();render(true);return;}
  if(t.id==="planetSelect"){state.universe.selectedPlanetId=t.value;save();render(true);return;}
  if(t.id==="receiptSelect"&&mode==="lab"){
    if(state.universe.planets.some(p=>Object.values(p.pendingResources).some(x=>A(x).cmp(0)>0))){
      toast("保留報酬があるため、先に現在方式で崩壊を確認してください。");renderPanel(true);return;
    }
    state.universe.receiptMode=t.value||null;save();render(true);return;
  }
});
document.addEventListener("input",e=>{lastInteraction=Date.now();if(e.target.id==="importText")importDraft=e.target.value;});
function hidePage(){
  stopHoldPurchase();
  if(!state||readOnly)return;
  const now=Date.now();G.advance(state,now,{offline:false});hiddenAt=now;state.boost.active=false;
  save();
}
document.addEventListener("visibilitychange",()=>{
  if(document.hidden)hidePage();
  else if(state&&!readOnly){
    const now=Date.now();const r=G.advance(state,now,{offline:true});hiddenAt=null;lastFrame=now;reportOffline(r);save();render(true);
  }
});
window.addEventListener("pagehide",()=>{hidePage();lockRelease?.();lockRelease=null;});
window.addEventListener("pageshow",async e=>{
  if(e.persisted){await acquireLock();if(!readOnly){const loaded=store.load();state=loaded.state;reportOffline(G.advance(state,Date.now(),{offline:true}));save();render(true);}}
});
window.addEventListener("online",()=>renderPanel(true));window.addEventListener("offline",()=>renderPanel(true));
window.addEventListener("storage",e=>{
  if(e.key===store.key&&e.newValue&&!readOnly){
    try{const d=JSON.parse(e.newValue);if(d.writer!==store.writer&&(d.data?.revision||0)>store.expectedRevision){readOnly=true;applySettings();showNotice("別画面の新しい保存を検出したため、この画面からの上書きを止めました。");}}catch(x){}
  }
});
async function setupPWA(){
  if(!("serviceWorker"in navigator)||!location.protocol.startsWith("http")||window.Capacitor)return;
  try{
    const registration=await navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"});
    const offer=worker=>{updateWorker=worker;$("updateBar").hidden=false;};
    if(registration.waiting)offer(registration.waiting);
    registration.addEventListener("updatefound",()=>{
      const w=registration.installing;
      w?.addEventListener("statechange",()=>{if(w.state==="installed"&&navigator.serviceWorker.controller)offer(w);});
    });
    let reloading=false;
    navigator.serviceWorker.addEventListener("controllerchange",()=>{
      if(updateWorker&&!reloading){reloading=true;location.reload();}
    });
  }catch(e){showNotice("オフライン用の準備が未完了です。オンラインでは遊べます。");console.warn(e);}
}
await acquireLock();
const loaded=store.load();
state=loaded.state;storageUnavailable=!!loaded.storageUnavailable;
if(loaded.warning)showNotice(loaded.warning);
if(readOnly)showNotice("ほかのタブがプレイ中のため閲覧専用です。そのタブを閉じてから再読み込みしてください。");
if(!readOnly&&!store.blocked){
  reportOffline(G.advance(state,Date.now(),{offline:true}));
  save(true);
}
applySettings();render(true);
setInterval(()=>{
  if(!state||document.hidden)return;
  if(!readOnly&&!store.blocked)checkpoint();
  render(false);
  if(Date.now()-lastSavedAt>CONFIG.provisional.saveIntervalMs&&!store.blocked)save();
},CONFIG.provisional.ui.refreshMs);
setupPWA();
if(dev){
  window.KOTOWARI_DEBUG={
    state:()=>JSON.parse(JSON.stringify(state)),save,
    setLabState:value=>{if(mode!=="lab")throw Error("検証モード専用");state=G.validateState(value,"lab");save();render(true);},
    lab:action=>{const r=G.labAction(state,action);save();render(true);return r;},
    open:(stage,sub)=>{currentStage=stage;currentSub=sub;setSheet("half");render(true);},
    storeKey:store.key
  };
}
