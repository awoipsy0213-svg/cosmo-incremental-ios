import {CONFIG} from "./balance-config.mjs";
import {UNIVERSE_RESOURCE_RULES,resourceEligible} from "./universe-confirmed-v4.mjs";
import {KNOWLEDGE_IDS,KNOWLEDGE_NAMES,knowledgeLevel,coreRequirements,autoPlanetAvailable} from "./universe-progression-v316.mjs";
import {engravingCatalogue,engravingSlots,engravingPurchaseQuote,ENGRAVING_AUTO_CONVERGE_ID} from "./engraving-rules-v317.mjs";
import {engravingConvergenceControl,engravingAutoMomentRate,engravingAutoSourceRate,engravingAutoEfficient} from "./engraving-effects-v333.mjs";
import {TELEMETRY_LIMITS,consecutiveOrbGains} from "./telemetry-v319.mjs";
import {compareMomentPrice,compareMomentPriceProfiles,exportPriceReport,PRICE_MODEL_VERSION} from "./price-lab.mjs";
import {MOMENT_GROUP_NAMES,cleanMomentPrefs,toggleMomentFavorite,moveMomentFavorite,momentVisible} from "./moment-filter.mjs";
import {CONTENT} from "./content.mjs";
import {PROPOSED,PLANET_EFFECT_PROPOSALS,resourcePrototype,trialPreview,boostTrialCost,proposedSourceSlots,FIRST_CONCEPT_PROPOSALS} from "./design-proposals.mjs";
import {A,formatAmount,formatExistenceDisplay,formatOrbAmount} from "./numbers.mjs";
import * as G from "./game.mjs";
import {timeHexMarkup,patchTimeHex,timeHexFlowPanel,timeHexMiraclesPanel} from "./time-hex-v341.mjs";
import {formatGrowthInt,growthCap} from "./time-growth-v350.mjs";
import {engravingAutomationHTML,engravingPresetHTML} from "./engraving-v342-ui.mjs";
import {SaveStore,KEYS,decode,encode} from "./save.mjs";
import {shortDuration} from "./purchase-insights.mjs";
import {purchasePreview} from "./purchase-preview-v338.mjs";
import {momentBrief,compactEffectValue} from "./purchase-clarity-v339.mjs";

const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const params=new URLSearchParams(location.search);
const mode=params.get("lab")==="1"?"lab":"normal";
const dev=params.get("dev")==="1"||mode==="lab";
const childNames={moment:"刹那",sources:"源",engraving:"刻印",flow:"残滓",concepts:"概念",miracles:"奇跡",
  planets:"惑星",resources:"資源",observations:"観測",life:"生命",
  boost:"BOOST",achievements:"実績",chronicle:"記録",statistics:"統計",collection:"コレクション",
  guide:"遊び方",settings:"設定",backup:"保存", "auto-existence":"存在","auto-time":"時","auto-universe":"宇宙","auto-life":"生命",spec:"設計状況",proposals:"研究・試案",lab:"テストモード",priceLab:"価格試算"};
const organizerItems=["boost","achievements","chronicle","statistics","collection","guide","settings","backup",...(mode==="lab"?["spec","proposals","priceLab","lab"]:["lab"])];
let memory={};let storage,storageFallback=false;
try{storage=window.localStorage;}catch(e){storageFallback=true;storage={getItem:k=>memory[k]||null,setItem:(k,v)=>memory[k]=String(v),removeItem:k=>delete memory[k]};}
const store=new SaveStore(storage,mode,globalThis.crypto?.randomUUID?.()||"tab-"+Date.now());
let state,readOnly=false,storageUnavailable=false,lockRelease=null;
let currentStage="existence",currentSub="moment",sheetState="closed",infoPanelOpen=false;
let lastFrame=Date.now(),hiddenAt=null,lastSavedAt=0,lastPanelRender=0,lastInteraction=0;
let toastTimer,noticeFadeTimer,noticeDismissTimer,importDraft="",offlineReport=null,updateWorker=null,confirmedAction=null;
let interferencePartnerId=null,bulkScope="all",bulkPurchasePending=false;
let navDigest="",notice="",busyBirth=false,automationDetailsOpen=false;
let testGrantDraft="1e12",resetPending=false;
const BOOST_QUICK_ICON=`<svg class="boost-quick-symbol" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13 2 5 13h6l-1 9 9-12h-6V2z" fill="currentColor"/></svg>`;
const HOLD_LEVEL_LIMIT=3000; // BOOST-Q673/674: one continuous long press, total acquired Lv
let holdPurchase=null,skipClickFor=null;
const f=(n,p=2)=>formatAmount(n,p,state?.settings.notation);
// Orb quantities have no decimal portion in the UI. Engine values remain untouched.
const o=(n,rounding="floor")=>formatOrbAmount(n,rounding,state?.settings.notation);
// Display-only orb integer formatting. Fractional balance and purchase prices never change.
// Specific UI rounding policy remains unresolved: truncation is provisional.
const orbDisplay=value=>o(value);
const duration=seconds=>{
  seconds=Math.max(0,Math.floor(seconds));
  const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;
  return h?`${h}時間${m}分`:m?`${m}分${s}秒`:`${s}秒`;
};
function toast(message){
  $("toast").textContent=message;$("toast").classList.add("show");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").classList.remove("show"),3500);
}
function showNotice(message,{autoDismiss=false}={}){
  clearTimeout(noticeFadeTimer);clearTimeout(noticeDismissTimer);
  const bar=$("noticeBar");bar.classList.remove("is-fading");
  notice=message;$("noticeText").textContent=message;bar.hidden=!message;
  // Informational login/offline reward finishes its visual fade at 3 seconds.
  // Storage, migration and read-only errors stay visible until manually closed.
  if(message&&autoDismiss){
    noticeFadeTimer=setTimeout(()=>bar.classList.add("is-fading"),2700);
    noticeDismissTimer=setTimeout(()=>{if(notice===message)showNotice("");},3000);
  }
}
async function ask(title,text,yes="実行する"){
  if(confirmedAction)return false;
  $("confirmTitle").textContent=title;$("confirmText").textContent=text;$("confirmYes").textContent=yes;
  // BOOST-Q408/412: important decision dialogs freeze stage time and BOOST
  // spending together, but do not mint offline BOOST while the app is active.
  checkpoint();
  $("confirmDialog").showModal();
  return new Promise(resolve=>confirmedAction=resolve);
}
function finishConfirm(ok){
  const r=confirmedAction;
  // Older details/test dialogs can open without a promise; allow them to close.
  if(!r){$("confirmDialog").close();return;}
  // Discard only the elapsed *dialog* interval, never elapsed time before it.
  if(state&&!document.hidden){const now=Date.now();state.lastWall=now;lastFrame=now;}
  confirmedAction=null;$("confirmDialog").close();r(ok);
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
  if(!state||readOnly||store.blocked||document.hidden)return;
  const now=Date.now(),gap=now-state.lastWall;
  // OS visibility is the offline boundary. A throttled visible frame
  // stays online and must not mint offline-only BOOST.
  if($("confirmDialog").open){
    state.lastWall=now; // decision-pause: no stage progress or BOOST spend
    return;
  }
  G.advance(state,now,{offline:false});
}
function save(forceSnapshot=false){
  if(!state||readOnly)return false;
  try{
    checkpoint();store.write(state,{snapshot:forceSnapshot});
    lastSavedAt=Date.now();$("saveIndicator").textContent=storageUnavailable?"一時保存":"保存済";
    $("saveIndicator").title=new Date(lastSavedAt).toLocaleTimeString("ja-JP");
    if(store.lastError)showNotice(store.lastError);
    return true;
  }catch(e){
    $("saveIndicator").textContent="保存不可";
    showNotice(e.message+"。「保存」からデータを書き出してください。");
    if(e.message.includes("別タブ"))readOnly=true;
    return false;
  }
}
function reportOffline(report){
  if(report.elapsed<10)return;
  offlineReport=report;
  if(state.settings.showOffline)showNotice(`復帰：ステージ進行・資源獲得なし / BOOST +${duration(Math.max(0,report.boost))}`+
    (report.boostDiscarded>0?` / 容量超過破棄 ${duration(report.boostDiscarded)}`:"")+"。オンライン中のBOOST新規獲得はありません。",{autoDismiss:true});
}
// BOOST-Q625: offline BOOST credit must be durably saved and read-back
// verified before success is visible. Failed primary saves never claim a grant.
function settleOfflineAndPersist(now,{snapshot=false}={}){
  const report=G.advance(state,now,{offline:true});
  const persisted=save(snapshot)&&!storageUnavailable;
  if(persisted)reportOffline(report);
  else if(report.elapsed>=10)
    showNotice("復帰BOOSTの保存を確認できません。獲得を確定表示せず、保存とバックアップを確認してください。");
  return {report,persisted};
}
function applySettings(){
  document.body.classList.toggle("lab-mode",mode==="lab");
  if(mode==="lab"){
    document.title="《理》 テストモード";
    const caption=document.querySelector(".brand-caption");
    if(caption?.firstChild?.nodeType===3)caption.firstChild.nodeValue="TEST MODE";
  }
  document.body.classList.toggle("not-compact",!state.settings.compact);
  document.body.classList.toggle("reduced-motion",state.settings.reducedMotion);
  document.body.classList.toggle("high-contrast",state.settings.highContrast);
  document.body.classList.toggle("low-power",state.settings.lowPower);
  document.body.classList.toggle("readonly-mode",readOnly);
  // Legacy affordableOnly setting is ignored; all upgrades remain visible.
}
function setSheet(which){
  stopHoldPurchase(null,true);
  if(which==="closed")infoPanelOpen=false;
  sheetState=which;$("sheet").dataset.state=which;$("sheet").hidden=which==="closed";
  document.body.classList.toggle("sheet-open",which!=="closed");
  $("expandButton").textContent=which==="full"?"↙":"↗";
  $("expandButton").setAttribute("aria-label",which==="full"?"半分表示に戻す":"リストを全表示");
  if(which!=="closed")renderPanel(true);
}
function setStage(id){
  if(!availableStages().some(x=>x.id===id))return;
  stopHoldPurchase(null,true);
  infoPanelOpen=false;
  if(currentStage===id&&sheetState!=="closed"){setSheet("closed");return;}
  currentStage=id;
  currentSub=id==="existence"?state.settings.existenceLastTab:CONTENT.stages.find(x=>x.id===id).children[0];
  setSheet("half");render(true);
}
function openAutomation(){
  if(!state.intro.complete)return;
  stopHoldPurchase(null,true);infoPanelOpen=false;
  if(currentStage==="automation"){
    setSheet(sheetState==="closed"?"half":"closed");return;
  }
  currentStage="automation";
  currentSub="auto-"+(state.settings.automationStage||"existence");
  setSheet("half");render(true);
}
function availableStages(){
  return CONTENT.stages.filter(x=>x.id==="existence"?state.intro.complete:x.id==="time"?state.time.unlocked:x.id==="universe"?state.universe.unlocked:state.life.unlocked);
}
function openOrganizer(){
  stopHoldPurchase(null,true);
  $("organizerLinks").innerHTML=organizerItems.map(id=>`<button data-organizer="${id}">${esc(childNames[id])}<span>›</span></button>`).join("");
  $("organizerDrawer").showModal();
}
function openOrganizerPage(id){
  stopHoldPurchase(null,true);
  $("organizerDrawer").close();
  infoPanelOpen=false;
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
  const automation='<button id="automationQuick" type="button" class="automation-quick'+(currentStage==="automation"?' active':'')+'" data-action="open-automation" aria-pressed="'+(currentStage==="automation")+'" aria-label="全ステージのオートメーションを開く" title="オートメーション">⟳</button>';
  $("stageNav").innerHTML=shortcut+a.map(x=>`<button data-stage="${x.id}" class="${currentStage===x.id?"active":""}" aria-pressed="${currentStage===x.id}">${x.name}</button>`).join("")+automation;
}
function renderWorld(){
  document.body.classList.toggle("is-intro",!state.intro.complete);
  document.body.style.setProperty("--intro-light",String(.2+.8*Math.min(1,state.intro.touches/CONFIG.provisional.introTouches)));
  const stage=CONTENT.stages.find(x=>x.id===currentStage)||CONTENT.stages[0];
  document.body.dataset.cosmoStage=String(stage.number);
  $("stageKicker").textContent=`STAGE 0${stage.number}`;
  const isTime=stage.id==="time";
  document.body.classList.toggle("time-hex-world",isTime);
  const stageScene=$("touchField");
  stageScene.setAttribute("role",isTime?"group":"button");
  stageScene.setAttribute("tabindex",isTime?"-1":"0");
  stageScene.setAttribute("aria-label",isTime?"時の方向をタップして選択":stage.id==="existence"?"光へ干渉してオーブを生む":"この世界へ干渉してオーブを生む");
  $("stageTitle").textContent=stage.name;
  $("activeStageTitle").textContent=`ステージ · ${stage.name}`;
  const rate=G.production(state),tap=G.tapPower(state);
  const showShared=state.intro.complete;
  $("commonInfoBar").hidden=!showShared;
  document.body.classList.toggle("has-common-info",showShared);
  if(showShared){
    const timeSpeed=state.boost.active&&state.boost.seconds>0?G.boostTimeMultiplier(state):1;
    const metrics=[
      ["existence",formatExistenceDisplay(G.existence(state)),"存在",""],
      ["timeSpeed","×"+timeSpeed,"時間の経過速度",""]
    ];
    for(const [id,formatted,label,unit] of metrics){
      const node=document.querySelector('[data-common-value="'+id+'"]');
      if(!node)continue;
      node.textContent=formatted;
      const button=node.closest("button");
      button.title=label+"："+formatted+unit;
      button.setAttribute("aria-label",label+" "+formatted+unit+"。詳細を開く");
    }
  }
  const combo=G.momentComboView(state);
  const run=$("hudRunCount");if(run)run.textContent=state.convergenceCount.toLocaleString("ja-JP");
  const ratio=combo.window>0?Math.round(Math.max(0,Math.min(100,100*combo.remaining/combo.window))):0;
  const milestone=combo.nextMark===null?" · 最終節目到達":` · 次${combo.nextMark}まで${combo.untilNext}回`;
  const comboHtml=combo.combo>0?`<span class="kw-combo">コンボ ${combo.combo.toLocaleString("ja-JP")} · ×${combo.multiplier.toFixed(2)}${milestone}<i class="kw-combo-track"><i style="width:${ratio}%"></i></i></span>`:"";
  const storedHtml=A(combo.stored).cmp(0)>0?`<span class="kw-stored">蓄積 ${o(combo.stored)}</span>`:"";
  $("convergeMain").hidden=!state.intro.complete||!["existence","organizer","automation"].includes(currentStage);
  if(["existence","organizer","automation"].includes(currentStage)){
    $("primaryValue").textContent=orbDisplay(state.orbs);
    $("worldDetails").innerHTML=`<span class="wallet">オーブ <b>${orbDisplay(state.orbs)}</b></span><span>${state.runOrbsEvidence==="verified"?"周回獲得 "+orbDisplay(state.runOrbsEarned)+" オーブ":"旧周回・確認済獲得 "+orbDisplay(state.runOrbsEarned)+" オーブ"}</span><span>干渉 +${o(tap)} / 源 +${o(rate)} 毎秒</span>${comboHtml}${storedHtml}`;
    $("worldHint").textContent="";
    const q=G.convergenceQuote(state);
    $("convergeMain").disabled=!q.steps||readOnly||store.blocked;
    const gauge=G.convergenceProgress(state);
    const mainConverge=$("convergeMain");
    if(!mainConverge.querySelector("[data-main-convergence-reward]")){
      mainConverge.innerHTML=`<span class="converge-main-reward"><strong>収束</strong><span data-main-convergence-reward>+0</span></span><span class="converge-main-next"><small>NEXT</small><span data-main-convergence-next>0 オーブ</span></span><span class="converge-gauge" aria-hidden="true"><i data-main-convergence-gauge style="width:0%"></i></span>`;
    }
    const nextOrbs=o(q.nextRemaining,"ceil"),rewardLabel="+"+f(q.reward,3);
    const mainReward=mainConverge.querySelector("[data-main-convergence-reward]");
    const mainNext=mainConverge.querySelector("[data-main-convergence-next]");
    if(mainReward.textContent!==rewardLabel)mainReward.textContent=rewardLabel;
    if(mainNext.textContent!==nextOrbs+" オーブ")mainNext.textContent=nextOrbs+" オーブ";
    mainConverge.querySelector("[data-main-convergence-gauge]").style.width=gauge.percent.toFixed(2)+"%";
    const convergeInfo=`収束で存在 ${rewardLabel}。次の報酬まで ${nextOrbs} オーブ。`+(q.historyVerified?"":"旧周回の獲得履歴は未確認です。現在の確認済み獲得分だけを数えています。");
    if(mainConverge.title!==convergeInfo)mainConverge.title=convergeInfo;
    if(mainConverge.getAttribute("aria-label")!==convergeInfo)mainConverge.setAttribute("aria-label",convergeInfo);
  }else if(currentStage==="time"){
    $("primaryValue").textContent=Math.floor(state.time.elapsed).toLocaleString("ja-JP");
    $("worldDetails").textContent=state.time.revealedDirections>=6?
      "世界時間 "+Math.min(1,state.time.worldSeconds).toFixed(6)+" / 1秒":
      "認識した方向 "+state.time.revealedDirections+" / 6";
    $("worldHint").textContent="方向を選び、残滓から概念を認識する。";
  }else if(currentStage==="universe"){
    $("primaryValue").textContent=String(state.universe.planets.length);
    $("worldDetails").innerHTML=`<span class="wallet">宇宙資源 · 時間で蓄積</span><span>惑星 ${state.universe.planets.length} / ${state.universe.maxPlanets} · 資源 ${state.universe.discoveredResources.length} / 42</span>`;
    $("worldHint").textContent="観測し、理解し、干渉する。";
  }else{
    $("primaryValue").textContent="—";$("worldDetails").textContent="未知の変化が、自己を維持し始める。";
    $("worldHint").textContent="未知の生命を観測する。";
  }
  const stageLabels={existence:"オーブ",time:"経過時間 · 秒",universe:"惑星数",life:"生命の兆し",organizer:"オーブ",automation:"オーブ"};
  $("stageResourceLabel").textContent=stageLabels[currentStage]||"進行";
  $("worldHint").hidden=["existence","organizer","automation"].includes(currentStage);
  const selected=state.universe.planets.find(p=>p.id===state.universe.selectedPlanetId);
  const stageRows=currentStage==="time"?[
    ["方向",state.time.revealedDirections+" / 6"],
    ["概念",Object.values(state.time.concepts).filter(x=>x>0).length+" / 77"],
    ["残滓",Object.values(state.time.residues).reduce((a,b)=>a+b,0).toLocaleString("ja-JP")]
  ]:currentStage==="universe"?[
    ["資源",state.universe.discoveredResources.length+" / 42"],
    ["上限",String(state.universe.maxPlanets)],
    ["崩壊",String(state.universe.collapseCount)],
    ["選択",selected?selected.id.replace("PLANET_","惑星 "):"未選択"]
  ]:currentStage==="life"?[
    ["段階","観測準備"],["状態","未知"]
  ]:[
    ["源の生成",o(rate)+" オーブ/秒"],
    ["干渉1タップ",o(tap)+" オーブ/タップ"],
    ["コンボ",combo.combo.toLocaleString("ja-JP")]
  ];
  $("stageResourceList").innerHTML=stageRows.map(([label,value])=>`<div class="stage-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("");
  // Scene metadata is derived from existing saved state only; no mission or currency is fabricated.
  const unlockedSourceCount=CONTENT.sources.filter(x=>state.sources[x.id]?.level>0).length;
  const unlockedMomentCount=CONTENT.moment.filter(x=>state.moment[x.id]>0).length;
  const conceptsCount=Object.keys(state.time.concepts).length;
  const progress=currentStage==="time"?{done:conceptsCount,total:77,title:"認識した概念"}:
    currentStage==="universe"?{done:state.universe.discoveredResources.length,total:42,title:"発見した資源"}:
    currentStage==="life"?{done:0,total:0,title:"未知"}:
    {done:unlockedSourceCount+unlockedMomentCount,total:60,title:"強化した種類"};
  $("matrixCaption").textContent=`${stage.name} のマトリクス`;
  $("matrixSummary").textContent=progress.total?`${progress.title} ${progress.done} / ${progress.total}`:"まだ観測できません";
  $("matrixFill").style.width=progress.total?`${Math.min(100,100*progress.done/progress.total).toFixed(1)}%`:"0%";
  const observeRows=currentStage==="existence"||currentStage==="organizer"?[
    ["源の生成/秒",o(rate),`源の生成 ${o(rate)} オーブ/秒`],
    ["干渉1タップ",o(tap),`干渉1タップ ${o(tap)} オーブ/タップ`]
  ]:stageRows.slice(0,3).map(([name,value])=>[name,value,`${name} ${value}`]);
  $("worldObserve").innerHTML=observeRows.map(([label,value,full])=>`<div class="scene-stat" title="${esc(full)}"><span>${esc(label)}</span><strong title="${esc(full)}">${esc(value)}</strong></div>`).join("");
  // DEC-20261122-005: the permanent “理の状態” sidebar is removed.
  // Game state and history remain intact; only redundant on-screen copy is hidden.
  $("heroSigil").textContent=currentStage==="time"?"時":currentStage==="universe"?"宇":currentStage==="life"?"生":"理";
  const timeRoot=$("timeHexRoot");
  if(timeRoot){
    if(currentStage==="time"){
      if(!timeRoot.firstElementChild)timeRoot.innerHTML=timeHexMarkup();
      timeRoot.hidden=false;
      patchTimeHex(timeRoot,state.time,{readOnly:readOnly||store.blocked});
    }else timeRoot.hidden=true;
  }
}
function quoteText(q){
  if(q.count) return `+${q.count.toLocaleString("ja-JP")} · ${o(q.cost,"ceil")}`;
  // MAX used to say only "資源不足", hiding the next actual price.
  if(q.reason==="資源不足"&&A(q.cost).cmp(0)>0) return `次の1Lv · ${o(q.cost,"ceil")}`;
  return q.reason||"購入不可";
}
function costLabel(q){
  // Keep price visible separately; never resize or rename the purchase button.
  return q.count===0&&q.reason==="上限到達"?"MAX":q.count===0&&q.cost==="0"?"—":q.cost!==undefined&&q.cost!==null?o(q.cost,"ceil"):"—";
}
function purchaseGainLabel(kind,id,preview){
  if(!preview.count)return "→ —";
  return kind==="source"?"+"+o(preview.sourceGain)+"/秒":"→ "+compactEffectValue(preview.afterEffect);
}
function purchaseCurrentLabel(kind,id){
  if(kind==="source")return "現 "+o(G.sourceProduction(state,id))+"/秒";
  const i=CONTENT.moment.findIndex(item=>item.id===id);
  return "現 "+compactEffectValue(G.momentEffects(state)[i]?.current);
}
function sourceMilestoneLabel(id){
  const level=state.sources[id].level;
  const next=CONFIG.confirmed.sourceMilestones.find(n=>n>level);
  return next?"次 Lv."+next.toLocaleString("ja-JP")+" · 生産×2":"全21節目達成";
}
function cardQuote(kind,id){
  const preview=purchasePreview(state,kind,id),q=preview.quote;
  const name=(kind==="source"?CONTENT.sources:CONTENT.moment).find(x=>x.id===id).name;
  const count=preview.count.toLocaleString("ja-JP"),gain=purchaseGainLabel(kind,id,preview),current=purchaseCurrentLabel(kind,id);
  const full=name+"：費用 "+costLabel(q)+" オーブ / 購入 ×"+count+" / "+current+" / "+gain;
  const aria=name+"、購入可能 "+count+" レベル。費用 "+costLabel(q)+" オーブ。"+current+"。"+gain+"。購入";
  return '<button type="button" class="buy-button dense-purchase-button" data-purchase="'+kind+'" data-id="'+esc(id)+'" '+
    (!q.enabled||readOnly||store.blocked?"disabled":"")+' aria-label="'+esc(aria)+'" title="'+esc(full)+'">'+
    '<span class="purchase-cost" title="'+esc(full)+'"><span class="purchase-symbol" aria-hidden="true">◉</span>'+
    '<strong class="purchase-cost-value" data-quote-label>'+esc(costLabel(q))+'</strong><small>オーブ</small></span>'+
    '<span class="purchase-action">購入 ×<strong data-quote-count>'+esc(count)+'</strong></span>'+
    '<span class="purchase-current" data-quote-current title="'+esc(current)+'">'+esc(current)+'</span>'+
    '<span class="purchase-delta" data-quote-gain title="'+esc(gain)+'">'+esc(gain)+'</span></button>';
}
const MOMENT_PREF_IDS=CONTENT.moment.map(x=>x.id);
let momentSearch="",lastMomentFilterRefresh=0;
function momentControls(){
 const prefs=cleanMomentPrefs(state.settings,MOMENT_PREF_IDS);
 const buttons=[["all","全系統"],...MOMENT_GROUP_NAMES.map((x,i)=>[String(i),x])];
 return `<section class="moment-tools" aria-label="刹那の表示切替">
   <div class="moment-groups">${buttons.map(([k,label])=>`<button type="button" data-moment-group-select="${k}" aria-pressed="${prefs.momentGroup===k}">${esc(label)}</button>`).join("")}</div>
   <div class="moment-filter-row">
     <label>名前・効果を検索 <input id="momentSearch" type="search" value="${esc(momentSearch)}" placeholder="強化名や効果を入力" maxlength="60"></label>
     <label>表示 <select data-moment-filter>
       <option value="all" ${prefs.momentFilter==="all"?"selected":""}>すべて</option>
       <option value="affordable" ${prefs.momentFilter==="affordable"?"selected":""}>購入可能</option>
       <option value="favorites" ${prefs.momentFilter==="favorites"?"selected":""}>お気に入り</option>
     </select></label>
   </div>
   <div class="moment-fav-pins" aria-label="お気に入りの順番">${prefs.momentFavorites.map((id,i)=>{const x=CONTENT.moment.find(x=>x.id===id);return x?`<div class="favorite-pin">
     <button type="button" data-moment-shortcut="${id}" title="${esc(x.name)}を表示">★ ${esc(x.name)}</button>
     <button type="button" data-moment-move="${id}" data-direction="-1" aria-label="${esc(x.name)}を前に移動" title="前へ" ${i===0?"disabled":""}>‹</button>
     <button type="button" data-moment-move="${id}" data-direction="1" aria-label="${esc(x.name)}を後ろに移動" title="後ろへ" ${i===prefs.momentFavorites.length-1?"disabled":""}>›</button>
     </div>`:"";}).join("")}</div>
   <small data-moment-filter-count aria-live="polite"></small>
 </section>`;
}
function refreshMomentVisibility(){
  // Later UI decision: all thirty upgrades remain visible without filters.
  if(state&&currentStage==="existence"&&currentSub==="moment"){
    for(const el of $("sheetBody").querySelectorAll("[data-moment-entry], [data-moment-heading]"))el.hidden=false;
    return;
  }

 if(!state||currentStage!=="existence"||currentSub!=="moment")return;
 const body=$("sheetBody"),prefs=cleanMomentPrefs(state.settings,MOMENT_PREF_IDS);
 const groups=new Set();let visible=0;
 for(const x of CONTENT.moment){
   const card=body.querySelector(`[data-moment-entry="${x.id}"]`);
   if(!card)continue;
   const affordable=prefs.momentFilter==="affordable"?G.purchaseQuote(state,"moment",x.id).enabled:false;
   const shown=momentVisible({...x,affordable},{group:prefs.momentGroup,filter:prefs.momentFilter,search:momentSearch,favorites:prefs.momentFavorites});
   card.hidden=!shown;if(shown){visible++;groups.add(String(x.group));}
 }
 for(const header of body.querySelectorAll("[data-moment-heading]"))
   header.hidden=!groups.has(header.dataset.momentHeading);
 const counter=body.querySelector("[data-moment-filter-count]");
 if(counter)counter.textContent=`表示 ${visible} / 30項目 ・ お気に入り ${prefs.momentFavorites.length} / 5`;
}

function momentHTML(){
  const q=G.convergenceQuote(state),effects=G.momentEffects(state);
  const gauge=G.convergenceProgress(state);
  return `<div class="row-grid compact-upgrades">${CONTENT.moment.map((x,i)=>{
    const heading=i%5===0?`<div class="moment-group-title" data-moment-heading="${Math.floor(i/5)}">${esc(["基礎干渉","連続干渉","確率干渉","自律干渉","源泉共鳴","超越干渉"][Math.floor(i/5)])}</div>`:"";
    const e=effects[i],brief=momentBrief(i);
    return `${heading}<article class="kw-card purchase-card moment-card" data-purchase-card data-moment-card="${x.id}" data-moment-entry="${x.id}">
      <div class="card-top"><strong title="${esc(x.name)}">${esc(x.name)}</strong><small data-moment-level="${x.id}">Lv.${state.moment[x.id].toLocaleString("ja-JP")}</small></div>
      <button type="button" class="moment-detail-button" data-moment-detail="${x.id}" aria-label="${esc(x.name)}の詳細" title="効果の詳細">⋯</button>
      <div class="compact-stat"><span>効果</span><strong class="moment-live-effect" title="${esc(x.description||brief.effect)}">${esc(brief.effect)}</strong></div>
      <div class="compact-stat"><span>内容</span><strong class="moment-next-effect" title="${esc(brief.mechanism)}">${esc(brief.mechanism)}</strong></div>
      ${cardQuote("moment",x.id)}
      </article>`;
  }).join("")}</div>
  <div class="kw-card converge-compact" title="${q.historyVerified?"":"旧周回の獲得履歴は未確認です。現在の確認済み獲得分から累計しています。"}">
    <div class="card-top"><strong>収束 · 永続補正</strong><small data-existence-rate>×${f(G.existenceMultiplier(state),3)}</small></div>
    <small data-convergence-reward>獲得予定 +${f(q.reward,3)} 存在</small>
    <button class="wide-button converge-with-gauge" data-action="converge" ${!q.steps||readOnly?"disabled":""}>
      <span data-converge-text>収束する · 次まで ${o(q.nextRemaining,"ceil")} オーブ</span>
      <span class="converge-gauge"><i data-converge-fill style="width:${gauge.percent.toFixed(2)}%"></i></span>
    </button>
  </div>`;
}
function sourcesHTML(){
  const cycle=G.sourceCycleStatus(state),resonance=G.sourceResonanceProgress(state);
  return `<button type="button" class="source-summary" data-source-summary aria-label="源の共振と一巡の詳細" title="源の共振と一巡の詳細">源の共振 ${resonance.completed}/${resonance.total} · 一巡 ${cycle.reached}/${cycle.total} · ⋯</button>
  <div class="row-grid compact-upgrades">${CONTENT.sources.map((x,i)=>{
    const v=state.sources[x.id];
    const cycleReady=v.level===1000000&&cycle.unlocked&&!readOnly&&!store.blocked;
    return `<article class="kw-card source-card purchase-card" data-source-entry="${x.id}" data-purchase-card>
      <div class="card-top"><strong title="${esc(x.name)}">${String(i+1).padStart(2,"0")} ${esc(x.name)} ＋${v.plus.toLocaleString("ja-JP")}</strong><small data-source-level="${x.id}">Lv.${v.level.toLocaleString("ja-JP")}</small></div>
      <button type="button" class="more-button source-detail-button" data-source-detail="${x.id}" aria-label="${esc(x.name)}の詳細" title="効果の詳細">⋯</button>
      <button type="button" class="source-cycle-button" data-breakthrough="${x.id}" ${!cycleReady?"disabled":""} aria-label="${esc(x.name)}の＋循環" title="${cycleReady?"＋循環を実行":v.level===1000000?"全30源一巡まで未解放":"Lv.1,000,000で＋循環が解放"}">↻</button>
      <div class="source-rates" title="この源の現在の毎秒オーブ生成量と、次の節目での生産2倍効果"><span data-source-next="${x.id}" title="毎秒 ${esc(o(G.sourceProduction(state,x.id)))} オーブ">毎秒 ${esc(o(G.sourceProduction(state,x.id)))} オーブ</span><span data-source-total="${x.id}">${esc(sourceMilestoneLabel(x.id))}</span></div>
      ${cardQuote("source",x.id)}
    </article>`;
  }).join("")}</div>`;
}
function automationHTML(){
  const tab=currentSub.slice(5),e=state.engraving,disabled=readOnly||store.blocked;
  const master=state.settings.automationEnabled!==false;
  const selected=(a,b)=>String(a)===String(b)?" selected":"";
  const option=(value,label,chosen,extra="")=>'<option value="'+esc(value)+'"'+selected(value,chosen)+extra+'>'+esc(label)+'</option>';
  const name=id=>engravingCatalogue().find(x=>x.id===id)?.name||"刻印";
  const momentRate=engravingAutoMomentRate(state),sourceRate=engravingAutoSourceRate(state);
  const convergeOwned=e.owned.includes(ENGRAVING_AUTO_CONVERGE_ID);
  const status=(title,unlocked,on)=>{
    const text=unlocked?(on?"ON":"OFF"):"未解放";
    return '<span class="automation-status '+(unlocked?(on?"is-on":"is-off"):"is-locked")+'" title="'+esc(title+"："+text)+'">'+esc(title)+' <b>'+esc(text)+'</b></span>';
  };
  const overview='<section class="kw-card automation-overview" aria-label="オートメーションの状態">'+
    '<div class="automation-master-line"><strong>全体自動化</strong><small data-auto-master-state>'+
    (master?"稼働中":"一時停止")+'</small>'+
    '<label class="automation-toggle automation-master-toggle"><input type="checkbox" data-auto-master'+
    (master?" checked":"")+(disabled?" disabled":"")+
    ' aria-label="全ステージの自動化をまとめてON/OFF"><span>ON</span></label></div>'+
    '<div class="automation-status-line" aria-label="存在の自動化状態">'+
    status("刹那",momentRate>0,e.autoBuy.moment.enabled)+
    status("源",sourceRate>0,e.autoBuy.source.enabled)+
    status("刻印",e.owned.includes("ENG-17")&&e.levels?.["ENG-17"]>0,e.autoEngraving.enabled)+
    status("収束",convergeOwned,e.autoConverge.enabled)+'</div>'+
    '<button type="button" class="automation-details-button" data-action="toggle-auto-details" aria-expanded="'+
    String(automationDetailsOpen)+'">'+(automationDetailsOpen?"設定を閉じる":"設定を開く")+'</button></section>';
  if(!automationDetailsOpen)return overview;
  if(tab==="existence"){
    const buy=(kind,label,rate,engravingId)=>{
      const cfg=e.autoBuy[kind],unlocked=rate>0,off=disabled||!unlocked;
      const requirement='刻印「'+name(engravingId)+'」で解放';
      const priorities=[["auto","自動選択"],["cheap","価格の安い順"],["grade","高グレード順"],
        ["efficient","費用対効果"]];
      const priorityOptions=priorities.map(([value,text])=>option(value,text,cfg.priority,
        value==="efficient"&&!engravingAutoEfficient(state)?" disabled":"")).join("");
      return '<section class="kw-card automation-row'+(unlocked?"":" is-locked")+'" data-automation-buy="'+kind+'">'+
        '<div class="automation-line"><strong>'+esc(label)+'</strong><small title="'+esc(requirement)+'">'+
        (unlocked?rate+'回/ゲーム秒':esc(requirement))+'</small>'+
        '<label class="automation-toggle"><input type="checkbox" data-auto-buy-kind="'+kind+
        '" data-auto-field="enabled"'+(cfg.enabled?' checked':'')+(off?' disabled':'')+
        ' aria-label="'+esc(label)+'の自動購入をON/OFF"><span>ON</span></label></div>'+
        '<div class="automation-line automation-fields"><label>購入優先<select class="input-select" data-auto-buy-kind="'+kind+
        '" data-auto-field="priority"'+(off?' disabled':'')+'>'+priorityOptions+'</select></label>'+
        '<label>購入間隔<select class="input-select" data-auto-buy-kind="'+kind+
        '" data-auto-field="intervalSeconds"'+(off?' disabled':'')+'>'+
        [1,2,5,10,30,60].map(v=>option(v,v+'ゲーム秒',cfg.intervalSeconds)).join("")+
        '</select></label></div></section>';
    };
    const a=e.autoConverge,on=convergeOwned,off=disabled||!on;
    const modes=[["ready","即時"],["seconds","秒ごと"],["minutes","分ごと"],["earned","累計値"]];
    const modeButtons=modes.map(([value,label])=>'<button type="button" data-auto-mode="'+value+
      '" aria-label="収束条件：'+esc(label)+'" aria-pressed="'+String(a.mode===value)+
      '" class="automation-mode-button'+(a.mode===value?" active":"")+'"'+(off?" disabled":"")+
      '>'+esc(label)+'</button>').join("");
    const preset=(values,chosen,unit)=>[...new Set([...values,chosen])].sort((a,b)=>a-b)
      .map(v=>option(v,v+unit,chosen)).join("");
    const condition=a.mode==="seconds"?
      '<select class="input-select" data-auto-converge="intervalSeconds"'+(off?' disabled':'')+
      ' aria-label="自動収束を判定する現実秒間隔">'+
      preset([60,120,180,300,600,900,1800,3600],a.intervalSeconds,"秒")+'</select>':
      a.mode==="minutes"?
      '<select class="input-select" data-auto-converge="intervalMinutes"'+(off?' disabled':'')+
      ' aria-label="自動収束を判定する現実分間隔">'+
      preset([1,2,3,5,10,15,30,60,120,240],a.intervalMinutes,"分")+'</select>':
      a.mode==="earned"?
      '<input class="input-select" type="text" inputmode="decimal" data-auto-converge="targetRunOrbs"'+
      ' value="'+esc(a.targetRunOrbs)+'" title="周回で実際に獲得したオーブの累計"'+
      (off?' disabled':'')+' aria-label="収束する周回累計獲得オーブ">':
      '<output class="automation-condition-placeholder">条件を満たしたら判定</output>';
    const rewardOptions=[...new Set(["0.025","0.05","0.1","0.5","1",a.minReward])]
      .map(v=>option(v,v+' 存在',a.minReward)).join("");
    const stepsOptions=[...new Set([1,2,3,5,10,20,50,100,a.minSteps])].sort((a,b)=>a-b)
      .map(v=>option(v,v+' 段階',a.minSteps)).join("");
    const thresholdInfo='刻印「'+name("ENG-24")+'」で解放';
    return overview+buy("moment","刹那・自動購入",momentRate,"ENG-23")+
      buy("source","源・自動購入",sourceRate,"ENG-26")+
      '<section class="kw-card automation-convergence'+(on?"":" is-locked")+'">'+
      '<div class="automation-line"><strong>自動収束</strong><small title="'+esc(thresholdInfo)+'">'+
      (on?'最短60秒の安全間隔':esc(thresholdInfo))+'</small>'+
      '<label class="automation-toggle"><input type="checkbox" data-auto-converge="enabled"'+
      (a.enabled?' checked':'')+(off?' disabled':'')+' aria-label="自動収束をON/OFF"><span>ON</span></label></div>'+
      '<div class="automation-modes" role="group" aria-label="収束条件の4方式">'+modeButtons+'</div>'+
      '<div class="automation-line automation-condition"><span>判定条件</span>'+condition+'</div>'+
      '<div class="automation-line automation-fields"><label>最低報酬<select class="input-select" data-auto-converge="minReward"'+
      (off?' disabled':'')+'>'+rewardOptions+'</select></label>'+
      '<label>最低段階<select class="input-select" data-auto-converge="minSteps"'+
      (off||!engravingConvergenceControl(state)?' disabled title="循環制御の刻印で解放"':'')+
      '>'+stepsOptions+'</select></label></div></section>'+
      engravingAutomationHTML(state,disabled)+engravingPresetHTML(state,CONTENT,disabled);
  }
  if(tab==="universe"){
    const u=state.universe,unlocked=u.unlocked&&autoPlanetAvailable(u),off=disabled||!unlocked;
    const requirement="累計崩壊20回・惑星5枠・崩壊現象の理解度100で解放";
    return overview+'<section class="kw-card automation-row'+(unlocked?"":" is-locked")+'">'+
      '<div class="automation-line"><strong>惑星の自動生成</strong><small title="'+esc(requirement)+'">'+
      (unlocked?'300ゲーム秒ごとに生成':requirement)+'</small>'+
      '<label class="automation-toggle"><input type="checkbox" data-auto-planet-enabled'+
      (u.autoGenerate?' checked':'')+(off?' disabled':'')+
      ' aria-label="惑星の自動生成をON/OFF"><span>ON</span></label></div>'+
      '<div class="automation-line automation-fields"><label>各R1の最低保有量<select class="input-select" data-auto-planet-reserve'+
      (off?' disabled':'')+'>'+
      [0,10,100,1000,u.autoReserve].filter((v,i,arr)=>arr.indexOf(v)===i).sort((a,b)=>a-b)
        .map(v=>option(v,v+' 個',u.autoReserve)).join('')+
      '</select></label></div></section>';
  }
  if(tab==="time"){
    return overview+'<section class="kw-card automation-row automation-info'+
      (state.time.unlocked?'':' is-locked')+'"><strong>時の流れ</strong><small>'+
      (state.time.unlocked?'ゲーム内時間に応じて進行します。':'時のステージを解放すると進行します。')+
      '</small><small>追加の自動化設定はまだありません。</small></section>';
  }
  return overview+'<section class="kw-card automation-row automation-info'+
    (state.life.unlocked?'':' is-locked')+'"><strong>生命</strong><small>'+
    (state.life.unlocked?'現在設定できる自動化はありません。':'生命のステージはまだ解放されていません。')+
    '</small></section>';
}
function engravingHTML(){
  const e=state.engraving,catalogue=engravingCatalogue();
  const count=tier=>catalogue.filter(x=>x.tier===tier&&e.owned.includes(x.id)).length;
  const options=["0.025","0.05","0.1","0.5","1"];
  const autoControls=e.owned.includes(ENGRAVING_AUTO_CONVERGE_ID)?`<div class="kw-card engraving-auto">
    <div class="card-top"><strong>自動収束</strong><span class="badge ${e.autoConverge.enabled?"confirmed":""}">${e.autoConverge.enabled?"ON":"OFF"}</span></div>
    <small>取得済みかつONのとき動作。最短60秒間隔・オフライン実行なし。</small>
    <label class="kw-row">最低獲得存在
      <select id="autoConvergeThreshold" class="input-select" aria-label="自動収束の最低報酬">
        ${[...new Set([...options,e.autoConverge.minReward])].map(v=>`<option value="${v}" ${A(v).cmp(e.autoConverge.minReward)===0?"selected":""}>${v}</option>`).join("")}
      </select>
    </label>
    ${engravingConvergenceControl(state)?`<label class="kw-row">必要収束段階
       <select id="autoConvergeMinSteps" class="input-select" aria-label="自動収束の最低段階">
       ${[...new Set([1,2,3,5,10,20,50,100,e.autoConverge.minSteps||1])].sort((a,b)=>a-b).map(n=>`<option value="${n}" ${(e.autoConverge.minSteps||1)===n?"selected":""}>${n}段階</option>`).join("")}
       </select></label>`:""}
    <button class="wide-button" data-action="toggle-auto-converge">${e.autoConverge.enabled?"自動収束を停止":"自動収束を開始"}</button>
  </div>`:"";
  return `<div class="kw-card engraving-overview">
    <div class="card-top"><strong>余剰存在 ${f(state.surplusExistence,3)}</strong><span class="badge confirmed">最初の存在1を保護</span></div>
    <small>取得済み ${e.owned.length} / 30 · 収束 ${state.convergenceCount} 回 · 取得済みの刻印は収束後も保持</small>
  </div>
  ${[1,2,3].map(tier=>`<h3 class="engraving-tier-title">刻印 ${["初級","中級","上級"][tier-1]} · 初回費用 ${["0.001","0.025","0.125"][tier-1]} 存在 / 取得 ${count(tier)}/10</h3>
    <div class="row-grid engraving-list">
    ${catalogue.filter(x=>x.tier===tier).map(item=>{
      const owned=e.owned.includes(item.id),level=e.levels?.[item.id],q=engravingPurchaseQuote(state,item.id),upgrade=G.engravingTrialUpgradeQuote(state,item.id);
      const levelText=!owned?"Lv.0":Number.isSafeInteger(level)?"Lv."+level.toLocaleString("ja-JP"):"Lv.―";
      const levelHint=!owned?"未取得":Number.isSafeInteger(level)?"現在のレベル："+level.toLocaleString("ja-JP"):"取得済み・レベルの記録なし";
      const price=owned?upgrade.price:q.price??item.cost;
      const shownPrice=price===undefined||price===null?"—":formatExistenceDisplay(price,{roundUp:true});
      const purchasable=owned?upgrade.ok:q.ok;
      const verb=owned?"強化":"取得",action=owned?"data-engraving-trial-upgrade":"data-engraving-buy";
      const gain=purchasable?"Lv. +1":owned&&upgrade.reason==="この刻印はLv1で完成しています"?"完成":"上昇 —",costInfo="費用 "+shownPrice+" 存在";
      const full=item.name+"："+costInfo+" / 購入 ×"+(purchasable?1:0)+" / "+gain;
      const button='<button type="button" class="wide-button engraving-purchase-button dense-purchase-button" '+
        action+'="'+esc(item.id)+'" '+(!purchasable||readOnly||store.blocked?"disabled":"")+
        ' aria-label="'+esc(item.name+"を"+verb+"。"+full)+'" title="'+esc(full)+'">'+
        '<span class="purchase-cost engraving-cost" title="'+esc(costInfo)+'"><span class="purchase-symbol" aria-hidden="true">✧</span>'+
        '<strong>'+esc(shownPrice)+'</strong><small>存在</small></span>'+
        '<span class="purchase-action">購入 ×<strong>'+(purchasable?"1":"0")+'</strong></span>'+
        '<span class="purchase-delta">'+esc(gain)+'</span></button>';
      return `<article class="kw-card engraving-card" data-engraving-entry="${item.id}">
        <div class="card-top"><strong title="${esc(item.name)}">${esc(item.name)}</strong><span class="badge engraving-level ${owned?"confirmed":""}" title="${esc(levelHint)}" aria-label="${esc(levelHint)}">${esc(levelText)}</span></div>
        <button type="button" class="engraving-detail-button" data-engraving-detail="${item.id}" aria-label="${esc(item.name)}の効果詳細" title="効果の詳細">⋯</button>
        <small class="engraving-effect" title="${esc(item.description)}">${esc(item.description)}</small>
        ${button}
      </article>`;
    }).join("")}</div>`).join("")}
  ${autoControls}
  ${e.owned.some(id=>e.levels?.[id]===undefined)?'<p class="tiny muted">一部の刻印は以前の記録からレベルを確認できません。取得済みの状態は保持されています。</p>':""}`;
}
function flowHTML(){
  return timeHexFlowPanel(state.time,CONTENT.concepts,CONTENT.principles,icon,{readOnly:readOnly||store.blocked});
}
function miraclesHTML(){
  return timeHexMiraclesPanel(state.time,CONTENT.principles);
}
function icon(c){
  const n=c.iconIndex;
  const count=3+n%6,rot=Math.floor(n/6)*17;
  const points=Array.from({length:count},(_,i)=>{const a=(i/count*360+rot)*Math.PI/180;return `${16+10*Math.cos(a)},${16+10*Math.sin(a)}`;}).join(" ");
  return `<svg class="concept-icon" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="${4+Math.floor(n/8)%4}"/><polygon points="${points}"/><circle cx="${6+n%5*5}" cy="${6+Math.floor(n/5)%5*5}" r="1.4" fill="currentColor"/></svg>`;
}
const CONCEPT_EFFECT_NAMES={event:"干渉発生",interval:"干渉周期",time:"時の進行",world:"世界時間",
  source:"オーブ生成",planetGrowth:"惑星の成長",observation:"観測・理解",resource:"宇宙資源",
  interference:"惑星間干渉",weight:"残滓抽選重み",auto:"自動化効率",pending:"条件整備待ち"};
function conceptHTML(){
  const t=state.time,known=CONTENT.concepts.filter(c=>
    (t.growth?.totals?.[c.id]&&t.growth.totals[c.id]!=="0")||(t.residues[c.id]||0)>0||t.concepts[c.id]>0);
  const count=CONTENT.concepts.filter(c=>t.growth?.recognized?.[c.id]||t.concepts[c.id]>0).length;
  return `<p class="panel-intro">残滓の獲得に応じて概念が成長します。10個で認識し、固有効果は自動で強化されます。</p>
    <div class="kw-row"><span>認識 ${count} / 77<small>共通の？？？ ${t.common} / 100</small></span><small>100個で自動抽選</small></div>
    ${known.length?`<div class="row-grid">${known.map(c=>{
      const total=t.growth?.totals?.[c.id]||String(t.residues[c.id]||0);
      const recognized=Boolean(t.growth?.recognized?.[c.id]||t.concepts[c.id]>0);
      const effect=G.conceptEffect(state,c.id),max=BigInt(total)>=growthCap(c);
      const progress=Math.min(100,Math.max(0,(effect?.progress||0)*100));
      const name=recognized?c.name:"？？？の残滓";
      const effectName=CONCEPT_EFFECT_NAMES[effect?.rule?.type]||"固有効果";
      const bonus=effect?.bonus?((effect.bonus)*100).toFixed(2)+"%":"0%";
      const status=effect?.active?"発動中":"待機中";
      const info=recognized?effectName+" +"+bonus+" · "+status:"認識すると効果が明らかになります";
      return `<article class="kw-card concept-card time-growth-card" data-concept-id="${esc(c.id)}">
        <div class="card-top">${icon(c)}<strong class="${recognized?"":"unrecognized"}" title="${esc(name)}">${esc(name)}</strong></div>
        <small>累計 ${esc(formatGrowthInt(total))} / ${esc(formatGrowthInt(growthCap(c)))}</small>
        <small title="${esc(info)}">${esc(info)}</small>
        <div class="slim-progress" aria-label="効果成長 ${progress.toFixed(1)}%"><i style="width:${progress.toFixed(2)}%"></i></div>
        <small>${max?"MAX · 超過分は永続熟練度へ":"累計に応じて自動成長"}</small>
      </article>`;
    }).join("")}</div>`:'<div class="empty-state"><p>まだ残滓は見つかっていません。</p></div>'}`;
}
function planetHTML(){
  const u=state.universe,p=G.planet(state);
  return `<p class="panel-intro">惑星は自然成長し、投入した資源の固有効果が積み上がります。星齢は経過時間であり、残り寿命ではありません。</p>
    <div class="kw-row"><span>惑星 ${u.planets.length} / ${u.maxPlanets}<small>初回崩壊 → 《惑星の破滅》 → 2惑星</small></span><button data-action="create-planet" ${u.planets.length>=u.maxPlanets?"disabled":""}>生成する</button></div>
    ${u.planets.length?`<select class="input-select" id="planetSelect" aria-label="育成する惑星">${u.planets.map((p,i)=>`<option value="${p.id}" ${u.selectedPlanetId===p.id?"selected":""}>惑星 ${i+1} · ${p.id}</option>`).join("")}</select>`:""}
    ${p?`<div class="row-grid" style="margin-top:10px">${CONTENT.stats.map((x,i)=>{
      const known=p.observed.includes(x.id);
      const v=x.id==="age"?G.ageSeconds(p):p.stats[x.id];
      return `<div class="kw-card stat-card"><strong ${known?"":'class="unknown-label"'}>${known?x.name:""}</strong><div class="stat-number" aria-label="${known?x.name:"未知の数値"+(i+1)}">${f(v,x.id==="age"?0:3)}${known&&x.id==="age"?" 秒":""}${known&&x.id==="stability"?"%":""}</div>${known?`<small>${x.description}</small>`:""}</div>`;
    }).join("")}</div>`:'<div class="empty-state"><div class="glyph">◌</div><p>物質が、ひとつの惑星になる。</p><small>初回は費用なしで生成できます。</small></div>'}
    ${p?.evidence?.investmentsByResource&&Object.keys(p.evidence.investmentsByResource).length?`<div class="kw-card investment-ledger">
      <strong>この惑星への資源投入履歴</strong>
      <small>投入した資源の種類と個数を惑星IDで保存します。残高や他の惑星の投入数と混同しません。</small>
      ${Object.entries(p.evidence.investmentsByResource).sort(([a],[b])=>a.localeCompare(b)).map(([id,quantity])=>{
        const name=CONTENT.resources.find(r=>r.id===id)?.name||id;
        return `<div class="kw-row"><span>${esc(name)} <small>${id}</small></span><strong>${f(quantity)}個</strong></div>`;
      }).join("")}
    </div>`:""}
    <div class="status-note">自然崩壊で質量と圧力に応じた資源を獲得します。惑星間の操作は「観測」から行えます。</div>
    ${p&&((p.core?.started||p.core?.formed)||Object.values(p.stats).some(v=>Number(v)>100))?`<div class="kw-card cosmic-core-card">
      <div class="card-top"><strong>惑星内部のコア</strong><span class="badge">${p.core?.formed?"形成済み":p.core?.started?"形成中":"未形成"}</span></div>
      <small>形成度 ${Math.floor(p.core?.progress||0)}% · 脈動 ${p.core?.pulses||0}回</small>
      <div class="slim-progress"><i style="width:${Math.min(100,p.core?.progress||0)}%"></i></div>
      <small>地表現象 ${p.core?.surfaceCount||0}回 · 未知の構造 ${p.core?.lifeStage||0}/3</small>
      ${!p.core?.started&&!p.core?.formed?`<button class="wide-button" data-action="start-core" ${!coreRequirements(p,u).ok||A(u.resources.UR6_01||0).cmp(1)<0?"disabled":""}>R6資源でコア形成開始</button>`:""}
    </div>`:""}
    ${autoPlanetAvailable(u)?`<div class="kw-card">
      <div class="card-top"><strong>惑星の自動生成</strong><span class="badge">${u.autoGenerate?"ON":"OFF"}</span></div>
      <small>5分ごとに空き枠を確認 · 生成費 R1資源100個</small>
      <label class="kw-row">各R1の最低保有量
        <select class="input-select" id="autoReserveSelect">
        ${[0,10,100,1000].map(v=>`<option value="${v}" ${u.autoReserve===v?"selected":""}>${v}個</option>`).join("")}
        </select>
      </label>
      <button class="wide-button" data-action="toggle-auto-planet">${u.autoGenerate?"自動生成を停止":"自動生成を開始"}</button>
    </div>`:""}
    `;
}
const statName=id=>CONTENT.stats.find(st=>st.id===id)?.name||id;
function resourcesHTML(){
  const u=state.universe,visible=CONTENT.resources.filter(r=>u.discoveredResources.includes(r.id)||A(u.resources[r.id]||0).cmp(0)>0);
  return `<p class="panel-intro">全42資源は質量と固有ステータスを育てます。時間ごとに獲得し、最終崩壊では追加報酬を受け取ります。</p>
    <div class="status-note">資源は時間の経過と惑星の崩壊で獲得できます。</div>
    ${mode==="lab"?`<label class="kw-row">従来の検証方式<select class="input-select" id="receiptSelect"><option value="" ${!u.receiptMode?"selected":""}>未選択</option><option value="A" ${u.receiptMode==="A"?"selected":""}>A：崩壊で受領</option><option value="B" ${u.receiptMode==="B"?"selected":""}>B：時間＋崩壊</option></select></label>`:""}

    ${visible.length?`<div class="row-grid">${visible.map(r=>{
      const rule=UNIVERSE_RESOURCE_RULES[r.id],effects=Object.entries(rule?.effects||{}).map(([id,n])=>statName(id)+" +"+n).join(" / ");
      return `<div class="kw-card"><div class="card-top"><strong>${esc(r.name)}</strong><span class="badge">R${r.rank}</span></div>
      <small>所持 ${f(u.resources[r.id]||0)}</small>
      <small>1個投入：質量 +${rule?.mass||0} / ${effects}</small>
      <div class="invest-choices">${[1,10,10000].map((n,k)=>{const max=A(u.resources[r.id]||0).cmp(10000)>=0?10000:Math.floor(A(u.resources[r.id]||0).toNumber());const amount=k===2?max:n;return `<button class="wide-button" data-invest="${r.id}" data-count="${amount}" ${!G.planet(state)||amount<1||A(u.resources[r.id]||0).cmp(amount)<0?"disabled":""}>${k===2?"MAX":"×"+n}</button>`;}).join("")}</div></div>`;
    }).join("")}</div>`:'<div class="empty-state"><p>まだ資源を所持していません。惑星の時間生産を観測してください。</p></div>'}`;
}
function observationsHTML(){
  const u=state.universe,p=G.planet(state);
  const partners=u.planets.filter(x=>x.id!==p?.id);
  const other=partners.find(x=>x.id===interferencePartnerId)||partners[0]||null;
  const actions=[
    {type:"collision",name:"惑星衝突",detail:"2惑星を消費して質量80%を持つ新惑星を生成。コア保有惑星は対象外。"},
    {type:"transfer",name:"成長移転",detail:"元の自然質量成長を10分停止し、通常成長の50%を別惑星に移転。"},
    {type:"induce",name:"崩壊誘発",detail:"指定惑星を即時に最終崩壊。自然崩壊と同額の報酬、10分間隔。"},
    {type:"stabilize",name:"惑星安定化",detail:"防護系R1を消費し安定度を1上昇（最大90）。同一惑星で有効時間5分間隔。"}
  ];
  return `<p class="panel-intro">現象の観測から名称を認識し、理解度100で干渉を解放。発見済みの知識は惑星が崩壊しても保持します。</p>
    <h3>観測した現象の理解度</h3>
    <div class="row-grid">${KNOWLEDGE_IDS.map(id=>{
      const value=knowledgeLevel(u,id);
      return `<div class="kw-card knowledge-card">
        <div class="card-top"><strong>${value>0?KNOWLEDGE_NAMES[id]:"未知の現象"}</strong><span class="badge">${Math.round(value)} / 100</span></div>
        <div class="slim-progress"><i style="width:${value}%"></i></div>
      </div>`;
    }).join("")}</div>
    ${p?`<div class="kw-card">
      <strong>観測対象：${esc(p.id)}</strong>
      <small>認識ステータス ${p.observed.length} / 15</small>
      <small>惑星内部 ${p.core?.formed?"脈動中":p.core?.started?"コア形成中":"未形成"} · 地表事象 ${p.core?.surfaceCount||0}回</small>
      <small>生命へ続く変化 ${p.core?.lifeStage||0}/3</small>
    </div>
    <h3>惑星への干渉</h3>
    ${partners.length?`<label class="kw-row interference-selector">相手の惑星
       <select id="interferencePartner" class="input-select" aria-label="干渉する相手惑星">
       ${partners.map(x=>`<option value="${esc(x.id)}" ${other?.id===x.id?"selected":""}>${esc(x.id)}</option>`).join("")}
       </select></label>`:""}
    <div class="row-grid interference-actions">${actions.map(action=>{
      const two=action.type==="collision"||action.type==="transfer";
      const quote=G.interferenceQuote(state,action.type,p.id,two?other?.id:null,Date.now());
      return `<div class="kw-card interference-action">
        <div class="card-top"><strong>${esc(action.name)}</strong>
        <span class="badge ${quote.ok?"confirmed":""}">${quote.ok?"解放済み":"条件未達"}</span></div>
        <small>${esc(action.detail)}</small>
        ${quote.ok?`<small>必要なR1資源：${f(quote.price)}</small>`:`<small>${esc(quote.reason)}</small>`}
        <button class="wide-button" data-interference="${action.type}"
          ${!quote.ok||readOnly||store.blocked?"disabled":""}>${quote.ok?"確認して実行":"実行不可"}</button>
      </div>`;
    }).join("")}</div>
    <p class="tiny muted">干渉を実行すると資源を消費します。</p>`:"<div class='status-note'>先に惑星を生成してください。</div>"}
    `;
}
function boostHTML(){
  const v=G.boostValues(state),s=state.boost;
  const ledger=s.accounting||G.freshBoostAccounting();
  const extraStored=Math.max(0,s.seconds-v.capacity);
  const overCap=extraStored>0?`<p class="status-note">旧BOOST残高を容量外で保護中：超過 ${duration(extraStored)}。この残高は使用できますが、容量を下回るまで新規蓄積はありません。</p>`:"";
  const legacyBit=s.timeOnlyMigration?.previousActive;
  const legacyLevels=s.timeOnlyMigration?.legacyUpgradeLevels;
  const migrationNote=s.timeOnlyMigration?.source!=="new"?
    `旧版の加速設定（${legacyBit===null?"状態不明":legacyBit?"ON":"OFF"}）は履歴として保持し、新時間加速はOFFから開始しました。${Array.isArray(legacyLevels)?" 旧強化Lv："+legacyLevels.join(" / ")+"（購入履歴保護・新5系統へ転用しない）":""}`:"";
  const auditNames={earned:"獲得",spent:"使用",upgrade:"強化購入",discarded:"容量超過",pending:"保留"};
  const items=ledger.entries.slice(-20).reverse().map(e=>`<li>${esc(new Date(e.at).toLocaleString("ja-JP"))} · ${auditNames[e.kind]||"保留"} ${e.seconds.toFixed(3)}秒${mode==="lab"&&e.note?" · "+esc(e.note):""}</li>`).join("");
  const auditHTML=`<details class="kw-card boost-audit"><summary>BOOST取引記録（直近20件を表示）</summary>
    <p>獲得 ${ledger.earned.toFixed(3)}秒／使用 ${ledger.spent.toFixed(3)}秒／強化 ${ledger.upgrade.toFixed(3)}秒／容量超過 ${ledger.discarded.toFixed(3)}秒</p>
    
    ${items?`<ol>${items}</ol>`:"<p>まだ記録がありません。</p>"}</details>`;

  if(mode!=="lab"){
    const labels=["BOOST基礎獲得速度","オフラインBOOST獲得倍率","BOOST容量","ゲーム内時間倍率","時間加速の消費効率"];
    const levels=s.trialLevels||[0,0,0,0,0],trialConfig=CONFIG.provisional.boostTrial;
    const view=(i,b,lv)=>[
      duration(CONFIG.confirmed.boostOfflineSecondsPerHour*(1+lv[0]*trialConfig.baseGainStep))+"/時",
      "×"+(1+lv[1]*trialConfig.offlineGainStep).toFixed(2),
      duration(b.capacity),
      "×"+b.timeMultiplier,
      "消費"+(b.consumptionFactor*100).toFixed(0)+"%"
    ][i];
    return `<div class="kw-card boost-status-card">
      <div class="card-top"><strong data-boost-remaining>${duration(s.seconds)} / ${duration(v.capacity)}</strong><span class="badge" data-boost-state>${s.active?"加速中":"待機中"}</span></div>
      <div class="slim-progress"><i data-boost-progress style="width:${Math.min(100,100*s.seconds/v.capacity)}%"></i></div>
      <small>オフライン +${duration(v.offlineRate*3600)}/時 · オンライン獲得なし · 時間×${v.timeMultiplier} · 消費係数 ${v.consumptionFactor.toFixed(2)}</small>
      <small data-boost-fill>${extraStored>0?"旧残高を容量外で保護中":`満タンまで ${duration(v.offlineRate>0?(v.capacity-s.seconds)/v.offlineRate:0)}（離席時間）`}</small>
      <button class="wide-button" data-action="toggle-boost" ${s.seconds<1&&!s.active?"disabled":""}>${s.active?"時間加速を停止":"時間×"+v.timeMultiplier+"を開始"}</button>
      ${overCap}
    </div>
    <h3>BOOST強化</h3>
    <div class="kw-list">${labels.map((label,i)=>{
      const q=G.boostTrialPurchaseQuote(state,i);
      const lv=[...levels];lv[i]=Math.min(trialConfig.limits[i],lv[i]+1);
      const nextState={...state,boost:{...state.boost,trialLevels:lv}};
      const after=G.boostValues(nextState);
      return `<div class="kw-card boost-trial-card">
        <div class="card-top"><strong>${esc(label)}</strong><span class="badge">Lv.${levels[i]} / ${trialConfig.limits[i]}</span></div>
        <small>${esc(view(i,v,levels))} ${q.current===trialConfig.limits[i]?"（上限）":"→ "+esc(view(i,after,lv))}</small>
        <button class="wide-button" data-boost-trial-buy="${i}" ${!q.ok||readOnly||store.blocked?"disabled":""}>${q.ok?"強化 · "+duration(q.cost)+" BOOST":esc(q.reason||"購入不可")}</button>
      </div>`;
    }).join("")}</div>
    ${migrationNote?`<details class="tiny muted"><summary>以前のBOOST情報</summary><p>${esc(migrationNote)}</p></details>`:""}${auditHTML}`;
  }
  const labels=["オフライン効率","進行対象時間","BOOST基礎獲得","オフライン獲得倍率","容量"];
  return `<div class="kw-card boost-status-card"><div class="card-top"><strong data-boost-remaining>${duration(s.seconds)} / ${duration(v.capacity)}</strong><span class="badge" data-boost-state>${s.active?"加速中":"蓄積中"}</span></div><div class="slim-progress"><i data-boost-progress style="width:${Math.min(100,100*s.seconds/v.capacity)}%"></i></div>
    <p>オンライン新規獲得なし · 現実オフライン ${duration(v.offlineRate*3600)}/時（旧試験強化の影響を含む）</p>
    <small data-boost-fill>オフラインで満タンまで ${duration((v.capacity-s.seconds)/v.offlineRate)}</small>
    <button class="wide-button" data-action="toggle-boost" ${s.seconds<1&&!s.active?"disabled":""}>${s.active?"加速を停止":"加速を開始 ×2（仮設定）"}</button>
    <p class="tiny">m倍速では実時間1秒につきBOOST(m−1)秒を消費します。タップ威力は直接増えません。アプリを閉じている間は消費しません。</p></div>
    <h3>追加のBOOST設定</h3><p class="panel-intro">旧来の試験効果・購入履歴をlabセーブに隔離しています。新しい正式5強化系統の価格・増加幅は未決定であり、ここでは研究以外に適用されません。</p>
    <div class="kw-list">${labels.map((x,i)=>{
      const current=[`${Math.round(v.efficiency*100)}%`,duration(v.offlineCap),`${duration(v.onlineRate*3600)}/時`,`${(v.offlineRate/(CONFIG.confirmed.boostOfflineSecondsPerHour/3600)).toFixed(2)}倍`,duration(v.capacity)][i];
      const trial=JSON.parse(JSON.stringify(state));trial.mode="lab";trial.boost.upgrades[i]++;
      const next=G.boostValues(trial),nexts=[`${Math.round(next.efficiency*100)}%`,duration(next.offlineCap),`${duration(next.onlineRate*3600)}/時`,`${(next.offlineRate/(CONFIG.confirmed.boostOfflineSecondsPerHour/3600)).toFixed(2)}倍`,duration(next.capacity)];
      return `<div class="kw-card"><strong>${x}</strong><small>現在 ${current} → 強化後 ${mode==="lab"?nexts[i]:"？？？"}</small><button class="wide-button" data-boost-upgrade="${i}" ${mode!=="lab"?"disabled":""}>${mode==="lab"?duration(boostTrialCost(s.upgrades[i]))+"で1段階（新しい暫定案）":"費用 ？？？ / 未適用"}</button></div>`;
    }).join("")}</div><p class="status-note">旧5系統のラボ用試案は通常プレイには適用されません。オフライン中はBOOSTのみ蓄積し、オーブ・時・惑星の進行は停止します。</p>${auditHTML}`;
}
function achievementHTML(){
  return `<p class="panel-intro">これまでの達成と発見を確認できます。</p><div class="kw-list">${CONTENT.achievements.map(x=>`<div class="kw-card"><div class="card-top"><strong>${state.achievements.includes(x.id)?"✦":"◇"} ${x.name}</strong><span class="badge">${state.achievements.includes(x.id)?"達成":"未達成"}</span></div><p>${x.description}</p><small>${state.achievements.includes(x.id)?"達成済み":x.id==="engravingObservation"?"条件：？？？":"未達成"}</small></div>`).join("")}</div>`;
}
function statisticsHTML(){
  const values=[["タップ入力",state.counters.taps.toLocaleString("ja-JP")],["収束",state.convergenceCount.toLocaleString("ja-JP")+"回"],["累計オーブ",orbDisplay(state.totalOrbs)],["累計獲得存在",formatExistenceDisplay(state.totalExistenceEarned)],["余剰存在",formatExistenceDisplay(state.surplusExistence)],["源総Lv.",Object.values(state.sources).reduce((v,x)=>v+x.level,0).toLocaleString("ja-JP")],["概念形成",Object.values(state.time.concepts).filter(x=>x>0).length+" / 77"],["オンライン",duration(state.counters.onlineSeconds)],["オフライン",duration(state.counters.offlineSeconds)]];
  const t=state.telemetry,rows=consecutiveOrbGains(t);
  const logarithmic=v=>{const a=A(v);return a.m>0?Math.max(0,a.e+Math.log10(a.m)+1):0;};
  const max=Math.max(1,...rows.filter(r=>r.gain!==null).map(r=>logarithmic(r.gain)));
  return `<p class="panel-intro">累計獲得存在は収束で獲得した存在の総量です（最初の存在1を除く）。刻印で消費しても減りません。${mode==="lab"?"テスト追加分も含みます。":""}オーブの測定できなかった区間は補間しません。</p>
    <div class="sub-grid">${values.map(([k,v])=>`<div class="kw-card"><small>${k}</small><strong>${v}</strong></div>`).join("")}</div>
    <h3>直近10分の獲得量 · 5秒ごと</h3>
    <div class="kw-card telemetry-card">
      ${rows.length?`<div class="telemetry-chart" role="img" aria-label="直近10分のオンラインオーブ獲得推移">
      ${rows.map((r,i)=>`<i class="telemetry-bar ${r.gain===null?"telemetry-gap":""}" style="height:${r.gain===null?2:Math.max(3,100*logarithmic(r.gain)/max).toFixed(2)}%" title="${r.gain===null?"測定間隔が空いています":"獲得 "+o(r.gain)+" オーブ"}"></i>`).join("")}
      </div>`:'<div class="empty-state"><p>5秒ごとの測定を開始しました。グラフは有効な2点から表示します。</p></div>'}
      <small>記録 ${t.onlineSamples.length}/${TELEMETRY_LIMITS.onlineSamples}点。縦軸は対数表現で、測定できなかった区間は低い空白として表示します。</small>
      ${rows.filter(r=>r.gain!==null).slice(-3).reverse().map(r=>`<small>${new Date(r.at).toLocaleTimeString("ja-JP")} · ${o(r.gain)} オーブ / 5秒</small>`).join("")}
    </div>
    <h3>オフライン精算履歴 · ${t.offlineReports.length}/10件</h3>
    ${t.offlineReports.length?`<div class="kw-list">${[...t.offlineReports].reverse().map(r=>`<div class="kw-card telemetry-row">
      <small>${new Date(r.at).toLocaleString("ja-JP")} · 離席 ${duration(r.seconds)}${r.effectiveSeconds>0?" · 旧版有効 "+duration(r.effectiveSeconds):" · ステージ停止"}</small>
      <strong>BOOST獲得 ${duration(r.boostEarned)}</strong><small>${r.effectiveSeconds>0||A(r.orbs).cmp(0)>0?"旧版オーブ +"+orbDisplay(r.orbs):"ステージ獲得 0"} · 超過破棄 ${duration(r.boostDiscarded||0)}</small></div>`).join("")}</div>`:"<p class='tiny muted'>まだ記録がありません。10秒未満の離席でもBOOST獲得を精算し、通知・履歴だけ省略します。</p>"}
    <h3>収束履歴 · ${t.convergences.length}/20件</h3>
    ${t.convergences.length?`<div class="kw-list">${[...t.convergences].reverse().map(r=>`<div class="kw-card telemetry-row">
      <small>${new Date(r.at).toLocaleString("ja-JP")} · 収束 ${r.steps.toLocaleString("ja-JP")}段階</small>
      <strong>+${f(r.reward,3)} 存在</strong></div>`).join("")}</div>`:"<p class='tiny muted'>まだ記録がありません。</p>"}
    <p class="tiny muted">過去版に計測データがない期間はゼロとは扱わず、記録なしとして表示します。以前のセーブ値から架空の履歴を作成しません。</p>`;
}
function guideHTML(){
  return `<div class="kw-list"><div class="kw-card"><strong>世界を生み、変化を観測する</strong><p>《無》は序章です。光に干渉すると最初の存在が成立します。存在1は失われません。</p></div>
  ${state.intro.complete?'<div class="kw-card"><strong>刹那・源・刻印</strong><p>タップと源は通常資源のオーブを生みます。任意のタイミングで収束して、余剰の存在を得ます。刻印は余剰分だけを使う設計です。</p></div>':""}
  ${state.time.unlocked?'<div class="kw-card"><strong>流れと概念</strong><p>時は自律成長を見守る場所です。同じ残滓10個で最初の概念を認識し、確定した概念効果が有効になります。</p></div>':""}
  </div>`;
}
function settingsHTML(){
  const labels=[["confirmEngravingPurchase","刻印の初回購入を確認","OFFならワンタップで取得"],["confirmEngravingUpgrade","刻印の追加強化を確認","OFFならワンタップで強化"],["confirmBoostUpgrade","BOOST強化を確認","OFFならワンタップで強化"],["confirmSourceBreakthrough","源の＋循環を確認","最大レベルから再開始する操作"],["confirmInterference","惑星への干渉を確認","衝突・移転・崩壊・安定化"],["confirmCoreFormation","コア形成を確認","資源消費を伴う操作"],["confirmSaveImport","セーブ読込前に確認","現在の進行を入れ替えるため初期ON推奨"],["confirmSaveRestore","履歴復元前に確認","過去の保存状態へ戻るため初期ON推奨"],["confirmBulkPurchase","一括購入前に確認","OFF：タップですぐ購入。ON：数量・費用を確認してから購入します"],["confirmMaxPurchase","MAX購入前に確認","ON：所持資源の90%以上を使うMAX購入を確認します"],["compact","コンパクト表示","ほかの一覧の密度を調整"],["holdToBuy","長押しで連続購入","押している間だけ通常購入を繰り返します"],["hapticTap","タップ時の振動","対応端末のみ。初期設定はOFFです"],["reducedMotion","動きを減らす","発光・波紋・開閉演出を抑える"],["highContrast","読みやすい境界線","文字と境界のコントラストを調整"],["lowPower","省電力","背景アニメーションを停止"],["confirmConvergence","収束前に確認","収束で失われる内容を確認する"],["showOffline","復帰時に報告","オフラインの進行とBOOSTを表示"]];
  return `<p class="panel-intro">表示や購入時の確認方法を変更できます。</p>
  ${labels.map(([id,name,desc])=>`<label class="kw-row"><span>${name}<small>${desc}</small></span><input type="checkbox" data-pref="${id}" ${state.settings[id]?"checked":""}></label>`).join("")}
  <label class="kw-row">数値表記<select class="input-select" data-pref="notation"><option value="auto" ${state.settings.notation==="auto"?"selected":""}>標準（100万以降e）</option><option value="scientific" ${state.settings.notation==="scientific"?"selected":""}>指数 e（1.23e12）</option><option value="exponent" ${state.settings.notation==="exponent"?"selected":""}>指数 E（1.23E+12）</option><option value="zeros" ${state.settings.notation==="zeros"?"selected":""}>0の個数（10^12）</option></select></label>
  <div class="kw-row"><span>通信<small>クラウド・課金は未接続</small></span><strong>${navigator.onLine?"オンライン":"オフライン"}</strong></div>
  <button class="wide-button" data-organizer="backup">保存・バックアップ・完全リセット</button>
  <button class="wide-button" data-organizer="lab">テストモード</button>
  <a class="link-button" href="./privacy.html">プライバシー・データ保存について</a>
  ${mode==="lab"?'<button class="wide-button" data-action="exit-test">通常プレイに戻る</button>':""}
  `;
}
function backupHTML(){
  const bs=store.backups();
  let protectedRows=[],archiveError="";
  try{protectedRows=store.protectedBackups();}catch(error){archiveError=error.message;}
  const backupDisabled=readOnly||storageUnavailable||store.blocked||!!archiveError;
  return `<p class="panel-intro">この端末の自動保存＋3世代履歴。消去・故障に備え、JSONを外にも保存してください。クラウド同期ではありません。</p>
  ${state.migration?`<div class="status-note">旧版から移行済み。オーブ・源・概念等を引継ぎ。星屑・旧永久強化・惑星ランク等は推測変換せず、旧版のセーブに保管しています。</div>`:""}
  <div class="sub-grid"><button class="wide-button" data-action="export-save">JSONを書き出す</button><button class="wide-button" data-action="copy-save">文字列をコピー</button></div>
  <button class="wide-button" data-action="snapshot">いまの履歴を保存</button>
  <button class="wide-button" data-action="protect-save" ${backupDisabled?"disabled":""}>保護バックアップを作成</button>
  <h3>保護バックアップ · 自動削除なし</h3>
  ${archiveError?`<p class="status-note">${esc(archiveError)}</p>`:protectedRows.length?[...protectedRows].map((row,i)=>({row,i})).reverse().map(({row,i})=>{
    let candidate;try{candidate=decode(row.raw,mode);}catch(error){}
    return `<div class="kw-card"><strong>${row.reason==="reset"?"リセット前":"手動"} · ${new Date(row.at).toLocaleString("ja-JP")}</strong>
    ${candidate?`<small>累計獲得存在 ${formatExistenceDisplay(candidate.totalExistenceEarned)} · オーブ ${orbDisplay(candidate.orbs)}</small>`:"<small>破損・原本保護中</small>"}
    <div class="sub-grid"><button class="wide-button" data-protected-export="${i}">JSON書出</button><button class="wide-button" data-protected-restore="${i}" ${!candidate||readOnly?"disabled":""}>復元する</button></div></div>`;
  }).join(""):"<p>まだ保護バックアップはありません。</p>"}
  <p class="tiny">自動保存履歴とは別管理です。端末の容量が不足した場合は操作を中止します。JSONを別の場所にも保管してください。</p>
  <h3>完全リセット</h3>
  <div class="kw-card"><strong>${mode==="lab"?"テストデータ":"通常データ"}を最初からやり直す</strong><small>全ステージ・強化・資産・統計・BOOST・設定が初期化されます。別モードとバックアップは保持します。</small>
  <button class="wide-button" data-action="reset-game" ${backupDisabled?"disabled":""}>完全リセット</button></div>
  <h3>データを読み込む</h3><input id="importFile" type="file" accept=".json,application/json,text/plain" aria-label="セーブJSONを選ぶ">
  <textarea id="importText" aria-label="バックアップ文字列" placeholder="バックアップJSONを貼り付け">${esc(importDraft)}</textarea>
  <button class="wide-button" data-action="import-save">内容を検証して読み込む</button>
  <h3>保存履歴 · 候補を比較して選択</h3>
  <div class="kw-card backup-comparison"><strong>現在の主セーブ</strong>
  ${store.blocked?"<small>読み込み不可・原本保護中。仮の初期状態を比較対象にしません。</small>":
    `<small>余剰存在 ${f(state.surplusExistence,3)} · オーブ ${orbDisplay(state.orbs)} · 収束 ${state.convergenceCount}回</small>
    <small>源Lv合計 ${Object.values(state.sources).reduce((n,v)=>n+v.level,0).toLocaleString("ja-JP")} · 概念 ${Object.values(state.time.concepts).filter(v=>v>0).length}/77 · 惑星 ${state.universe.planets.length}個</small>`}
  </div>
  ${bs.length?bs.map((x,i)=>{
    let candidate;
    try{candidate=decode(x.raw,mode);}catch(e){candidate=null;}
    return `<div class="kw-card backup-comparison">
      <div class="card-top"><strong>履歴 ${i+1} · ${new Date(x.at).toLocaleString("ja-JP")}</strong>
        <span class="badge ${candidate?"confirmed":"pending"}">${candidate?"検証済":"破損"}</span></div>
      ${candidate?`<small>余剰存在 ${f(candidate.surplusExistence,3)} · オーブ ${orbDisplay(candidate.orbs)} · 収束 ${candidate.convergenceCount}回</small>
      <small>源Lv合計 ${Object.values(candidate.sources).reduce((n,v)=>n+v.level,0).toLocaleString("ja-JP")} · 概念 ${Object.values(candidate.time.concepts).filter(v=>v>0).length}/77 · 惑星 ${candidate.universe.planets.length}個</small>
      <small>保存世代 ${candidate.revision} · データ形式 ${candidate.schemaVersion}</small>`:
      "<small>この履歴は検証に失敗しました。復元対象にはできません。元データは変更しません。</small>"}
      <button class="wide-button" data-restore="${i}" ${candidate?"":"disabled"}>この履歴を選択して復元</button>
    </div>`;
  }).join(""):"<p>まだ履歴はありません。</p>"}
  <button class="wide-button" data-action="export-legacy">退避した旧データを書き出す</button>
  ${store.blocked?'<div class="status-note">主セーブは保護中です。空の状態を通常のバックアップとして出力しません。復元を選択する前に、元データをファイルに保存してください。</div><button class="wide-button" data-action="export-corrupt">保護中の主セーブをそのまま救出（復旧用）</button>':""}
  <p class="tiny">旧セーブキーは削除しません。別URL・別ドメインへはJSONによる移行が必要です。</p>`;
}
function specHTML(){
  return `<p class="panel-intro">引き継ぎ資料を基準に反映。「設計で確定」と「この版で動く」は別です。</p>
  <div class="kw-card"><strong>今回、実装した核</strong><p>序章・最初の存在1 / オーブ分離 / 任意収束 / 親子タブ / 30源と21節目 / NEXTとMAX / 残滓の個別保管・10個形成 / 共通？？？の全77抽選 / BOOST独立蓄積 / 保存保護。</p></div>
  <h3>要確認・未適用</h3>${CONTENT.pending.map(x=>`<details data-preserve="${x.id}"><summary>${x.name} <span class="badge pending" style="margin-left:auto">要確認</span></summary><p>${x.description}</p></details>`).join("")}
  <h3>惑星15ステータス</h3>${CONTENT.stats.map(x=>`<div class="kw-row"><span>${x.name}<small>${x.description}<br>未定：${x.pending}</small></span><span class="badge ${x.status==="確定"?"confirmed":"pending"}">${x.status}</span></div>`).join("")}
  <a class="link-button" href="./docs/implementation.html">今回の反映・保留一覧</a><button class="wide-button" data-organizer="proposals">Ver.3.5の数値・効果試案を見る</button>
  <h3>Ver.3.3での購入支援</h3><div class="kw-card"><strong>リアルタイム購入表示</strong><p>購入可能・不足額・所要時間を自動更新。購入可能のみ表示／長押し連続購入は操作補助であり、自動購入やマクロの解放ではありません。</p><small>源の仮の秒間生産係数を0.02から0.4へ調整。正式仕様ではありません。</small></div>
  <p class="tiny">源・42資源の表示名は暫定。77概念と42資源の基本効果は確定ルールで計算し、未実装の現象や源特殊効果には仮倍率を付けていません。</p>`;
}
function proposalsHTML(){
  // Do not spoil undiscovered materials, principles, or stats in normal play.
  if(mode!=="lab")return `<p class="panel-intro">過去の研究候補を保存しています。現在は77概念と42資源の基本効果を通常プレイへ反映済みです。</p><div class="kw-card"><strong>研究した方向</strong><p>1. 価格と生産の回収時間を調整する。2. 資源は共通の成長と個性を両立させる。3. 自動化は《刻印》で段階的に解放する。</p><p class="tiny">未発見の名前・属性をここで公開しないため、具体的な候補表は検証モードにだけ表示します。</p><a class="link-button" href="./?lab=1">別セーブで研究候補を確認・試用する</a></div>`;
  const enabled=G.trialEnabled(state),p=G.planet(state);
  const exampleValue=id=>p?Math.min(10000,Number(p.stats[id]||0)):100;
  return `<p class="panel-intro">他ゲームの研究を基にした<strong>未採用の候補</strong>です。「設計確定」「現在の通常プレイへの適用」とは異なります。現在の未知効果は引き続き？？？です。</p>
  <div class="status-note">確定：質量は獲得個数、圧力は崩壊報酬、安定は残留率、星齢は経過時間。資源受取A/B・破壊/崩壊関係は要確認のままです。</div>
  <div class="kw-card"><strong>別セーブで効果を試す</strong><p class="tiny">42資源の「質量＋個性」投入、活動と重力の自然成長、解放済みR2・熱系資源の出現重みを実験できます。未実装イベントの候補は数値プレビューのみです。</p>
  ${mode==="lab"?`<button class="wide-button" data-action="toggle-trial">${enabled?"候補効果を停止":"候補効果を検証開始"}（通常セーブには影響なし）</button><small>現在：${enabled?"候補の追加効果を適用中":"候補の追加効果は停止中"}。停止後も、試験で投入した資源・成長したステータスは別セーブに残ります。</small>`:'<a class="link-button" href="./?lab=1">検証用の別セーブを開く</a>'}</div>
  <h3>惑星ステータス：7項目の効果候補</h3>
  ${PLANET_EFFECT_PROPOSALS.map(x=>`<details class="proposal-item" data-preserve="trial-${x.id}"><summary>${esc(x.name)} <span class="badge pending">${esc(x.status)}</span></summary><p>${esc(x.summary)}</p><strong>${esc(x.formula)}</strong><p class="tiny">${esc(x.risk)}</p>${mode==="lab"?`<small>現在値 ${f(p?.stats[x.id]||0)} → 候補係数 ${trialPreview(x.id,exampleValue(x.id)).toFixed(3)}×（比較値）</small>`:''}</details>`).join("")}
  <h3>資源42種類：質量と個性の検証候補</h3><p class="tiny">すべて質量+1（既存試験値）。各資源に個別特性を追加する候補で、名前は引き継ぎ資料の仮名です。</p>
  ${[1,2,3,4,5,6].map(rank=>{const arr=CONTENT.resources.filter(r=>r.rank===rank);return `<details class="proposal-item" data-preserve="rank-${rank}"><summary>Rank ${rank} · ${arr.length}種類 <span class="badge">暫定</span></summary>${arr.map(r=>{const sp=resourcePrototype(r);return `<div class="proposal-line"><strong>${esc(r.name)}</strong><small>${esc(sp?.description||"候補未作成")}</small></div>`;}).join("")}</details>`;}).join("")}
  <h3>《源》30種：21節目の中で7枠を配置する候補</h3><p class="tiny">共通節目21個は確定。下記の7枠配置・値は暫定で、本編へは未適用です。源の自動購入等は《刻印》の領分に残します。</p>
  <details class="proposal-item" data-preserve="sources-all"><summary>30種の候補配置を見る <span class="badge">21節目は維持</span></summary>${CONTENT.sources.map(x=>`<details class="proposal-item" data-preserve="src-${x.id}"><summary>${esc(x.name)} <small>仮名</small></summary><p class="tiny">${esc(x.role)}</p>${proposedSourceSlots(x).map(sl=>`<div class="proposal-line"><small>Lv.${sl.level.toLocaleString("ja-JP")} · ${esc(sl.kind)}</small><span>${esc(sl.description)}</span></div>`).join("")}</details>`).join("")}</details>
  <h3>《時》12概念の小規模な効果候補</h3><p class="tiny">この欄は旧研究案です。現行の77概念効果は別の確定ルール表を使用しており、旧案を二重適用しません。</p>
  <details class="proposal-item" data-preserve="concept-drafts"><summary>最初の12概念の候補一覧 <span class="badge">未採用</span></summary>${FIRST_CONCEPT_PROPOSALS.map(x=>`<div class="proposal-line"><strong>${esc(x.name)}</strong><span>${esc(x.idea)}<br><small>${esc(x.trial)}／注意：${esc(x.risk)}</small></span></div>`).join("")}</details>
  <h3>BOOST：5強化の暫定比較</h3><div class="kw-card"><p>初回コスト ${duration(PROPOSED.boost.initialCostSeconds)}、次回以降×${PROPOSED.boost.nextCostGrowth}。上限・増加量は全て試案で、通常プレイの既定値は変更しません。</p><small>報酬効率 +4ポイント/段階（最大86%）・対象時間 +10分/段階（最大6時間）・基本獲得 +12%/段階・オフライン獲得 +10%/段階・容量 +20分/段階（最大6時間）。</small></div>
  <h3>未決定・保留のまま残すもの</h3><div class="kw-card"><p>惑星の部分破壊・高度干渉、生命の詳細育成、源の通常特殊効果、刻印の購入・装備、BOOST強化の個別費用。既に採用した77概念・42資源・受取B方式は再び未決定扱いにしません。</p><small>これらは効果・倍率を一律で埋めず、試案があってもゲーム正式仕様にはしません。</small></div>
  <a class="link-button" href="./RESEARCH_V35.md">参照作品・検証根拠（Markdown原文）</a>`;
}
const priceLabParams={momentId:CONTENT.moment[0].id,profile:"current",durationSeconds:300,tapsPerSecond:5,levelOverride:null,factorOverride:null};
let priceLabReport=null,priceLabComparisons=null;
function priceLabHTML(){
 if(mode!=="lab")return '<p class="tiny">価格比較は通常セーブに影響しない検証モードでのみ利用できます。</p><a href="./?lab=1" class="link-button">検証モードで開く</a>';
 const p=priceLabParams;
 const levels=[["current","現在の検証セーブ"],["early","序盤の仮条件"],["middle","中盤の仮条件"],["late","後半の仮条件"]];
 const priceOptions=[["300","5分"],["1800","30分"],["7200","2時間"]];
 const rates=[2,5,10];
 const report=priceLabReport;
 return `<div class="price-lab">
  <p class="status-note">購入価格の試験値を比較します。計算は元セーブの複製だけに対して実行し、既存の価格や残高、セーブは変更しません。候補は正式採用ではありません。</p>
  <label>対象の刹那 <select data-price-lab="momentId">${CONTENT.moment.map(x=>`<option value="${x.id}" ${p.momentId===x.id?"selected":""}>${esc(x.name)}</option>`).join("")}</select></label>
  <div class="price-lab-fields">
  <label>育成条件 <select data-price-lab="profile">${levels.map(([v,label])=>`<option value="${v}" ${p.profile===v?"selected":""}>${label}</option>`).join("")}</select></label>
  <label>評価する時間 <select data-price-lab="durationSeconds">${priceOptions.map(([v,label])=>`<option value="${v}" ${p.durationSeconds===Number(v)?"selected":""}>${label}</option>`).join("")}</select></label>
  <label>想定手動タップ <select data-price-lab="tapsPerSecond">${rates.map(v=>`<option value="${v}" ${p.tapsPerSecond===v?"selected":""}>${v}回/秒</option>`).join("")}</select></label>
  <label>検証Lv（空欄=条件のLv） <input type="number" data-price-lab="levelOverride" min="0" max="1000000" step="1" value="${p.levelOverride??""}" placeholder="自動"></label>
  </div>
  <label>追加の価格倍率（0.01〜1000、任意） <input type="number" data-price-lab="factorOverride" min="0.01" max="1000" step="any" value="${p.factorOverride??""}" placeholder="例：1.25"></label>
  <button type="button" class="wide-button" data-action="run-price-lab">価格と回収時間を試算</button>
  <button type="button" class="wide-button" data-action="run-price-lab-compare">序盤・中盤・後半を比較</button>
  ${report||priceLabComparisons?'<button type="button" class="wide-button" data-action="export-price-lab">試算結果をJSONで書き出す</button>':""}
  ${priceLabComparisons? `<div class="price-lab-results"><p>3条件の参考比較（試験値）</p><table class="price-lab-table"><thead><tr><th>条件</th><th>増加量/秒</th><th>試験価格の回収時間</th></tr></thead><tbody>${priceLabComparisons.map(r=>`<tr><td>${esc(({early:"序盤",middle:"中盤",late:"後半"})[r.profile])}</td><td>${r.maxed?"Lv上限":o(r.deltaPerSecond)}</td><td>${r.priceCandidates?.find(c=>c.factor===1)?.recoverSeconds==null?"算出不可":shortDuration(r.priceCandidates.find(c=>c.factor===1).recoverSeconds)}</td></tr>`).join("")}</tbody></table><p class="tiny">各条件の強化Lvや源の状態は試験用の代表条件です。</p></div>`:""}
  ${report?`<div class="price-lab-results">
  <p><b>検証対象:</b> ${esc(CONTENT.moment.find(x=>x.id===report.momentId)?.name)} Lv.${report.level} → Lv.${report.level+1}</p>
  ${report.maxed?"<p>Lv上限に到達しているため比較できません。</p>":`<p>現行試験価格：${o(report.trialCost,"ceil")} オーブ</p>
  <p>評価期間内の想定獲得量：購入前 ${o(report.before)} → 購入後 ${o(report.after)}</p>
  <p>推定増加量：+${o(report.delta)} / ${duration(report.durationSeconds)}（約+${o(report.deltaPerSecond)}/秒）</p>
  <table class="price-lab-table"><thead><tr><th>倍率</th><th>購入費用</th><th>試験価格との差</th><th>回収時間</th></tr></thead>
  <tbody>${report.priceCandidates.map(c=>`<tr><td>×${c.factor}</td><td>${o(c.price,"ceil")}</td><td>${c.trialPriceDifferencePercent>0?"+":""}${c.trialPriceDifferencePercent.toFixed(1)}%</td><td>${c.recoverSeconds===null?"算出不可":shortDuration(c.recoverSeconds)}</td></tr>`).join("")}</tbody></table>`}
  <p class="tiny">計算対象：${report.includedEffects.map(esc).join("・")}</p><p class="tiny">未計算：${report.excludedEffects.map(esc).join("・")}</p><p class="tiny">試算モデル：${esc(report.modelVersion)}</p><p class="tiny">${esc(report.disclaimer)}</p>
  </div>`:"<p class='tiny'>条件を選び、試算を実行してください。</p>"}
  <p class="tiny">手動は「一定頻度×基本タップ量」の近似です。連続コンボ・確率抽選・奇跡などはこの試算では完全再現しません。試算不能な項目は「算出不可」と表示します。</p>
  </div>`;
}

function labHTML(){
  if(mode!=="lab")return '<div class="status-note">通常プレイとは別の保存データで試遊できます。初回は通常データのコピー（未保存なら新規）で開始します。テスト中の進行・追加資源は通常プレイに反映されません。</div><button class="wide-button" data-action="enter-test">テストモードを開始</button><small>テストを最初から行う場合は、テストモード内の完全リセットを利用してください。</small>';
  const actions=[["orbs","オーブ +1兆"],["existence","余剰存在 +10"],["sourceMax","源01をLv.100万"],["directions","6方向を検証解放"],["concept","衝突の残滓 +10"],["common","共通？？？ +100"],["world","世界時間を1秒へ"],["observe","観測名・刻印比較を解放"],["resources","全42資源 +100"],["mass","選択惑星を質量100に"],["collapse","崩壊イベントを検証"],["life","生命タブを表示"],["boost","BOOSTを満タン"],["offline","8時間オフラインを検証"]];
  return `<div class="status-note">独立した検証セーブです。仮の確率・受取方式・コスト・解放を試せます。ここでの達成は通常セーブに反映しません。</div><button class="wide-button" data-organizer="proposals">研究した候補効果の確認・有効化</button>
  <div class="kw-card"><strong>テストモード専用の資源追加</strong>
  <label class="kw-row"><span>追加する数量<small>例：1e1000000（オーブ）／10（存在）</small></span><input id="testGrantAmount" class="input-select" type="text" inputmode="text" autocomplete="off" maxlength="48" value="${esc(testGrantDraft)}" aria-label="テスト追加数量"></label>
  <div class="sub-grid"><button class="wide-button" data-action="test-grant-orbs">オーブ追加</button><button class="wide-button" data-action="test-grant-existence">存在追加</button></div>
  <small>オーブは1e2000000まで、存在は1e6までの正の値を1回に追加できます。存在は累計獲得にも反映します。</small></div>
  <button class="wide-button" data-organizer="backup">テストデータの保存・完全リセット</button>
  <button type="button" class="wide-button" data-organizer="priceLab">刹那の価格シミュレーター</button><div class="row-grid">${actions.map(([id,t])=>`<button class="wide-button" data-lab="${id}">${t}</button>`).join("")}</div><p class="tiny">崩壊前に「宇宙 → 資源」でA/Bを選択。圧力10単位で×1.1は検証用の仮式。安定の残留対象は未決定なので、破壊処理には適用していません。</p>
  <button class="wide-button" data-action="exit-test">通常プレイに戻る</button>`;
}

function commonInfoHTML(){
  const timeSpeed=state.boost.active&&state.boost.seconds>0?G.boostTimeMultiplier(state):1;
  return '<section class="common-info-detail" aria-label="全ステージ共通情報の詳細">' +
    '<p class="panel-intro">存在と時間の流れを確認できます。</p>' +
    '<div class="kw-card"><span>存在</span><strong>'+esc(formatExistenceDisplay(G.existence(state)))+'</strong></div>' +
    '<div class="kw-card"><span>時間の経過速度</span><strong>×'+esc(timeSpeed)+'</strong><small>BOOST使用中は時間が加速します。</small></div>' +
    '<button type="button" class="wide-button" data-action="return-stage-panel">ステージ操作に戻る</button></section>';
}
/** Presentation-only filtering; never edits or deletes historical saved events. */
function chronicleHTML(){
  const names=Object.fromEntries(engravingCatalogue().map(x=>[x.id,x.name]));
  const entries=[...state.events].reverse().map(e=>{
    const raw=String(e.text??"");
    if(mode!=="lab" && /【検証】|試験強化|暫定バランス|実装状態|未実装|原文照合|仕様が未決定/.test(raw))return null;
    const text=raw.startsWith("Ver.3.1へ安全に移行")?"以前の進行データを引き継ぎました。":raw.replace(/ENG-\d{2}/g,id=>names[id]||"刻印");
    return {...e,text};
  }).filter(Boolean);
  if(!entries.length)return '<div class="empty-state"><p>まだ出来事は記録されていません。</p></div>';
  return '<div class="kw-list">'+entries.map(e=>`<div class="kw-row"><span>${esc(e.text)}<small>${new Date(e.at).toLocaleString("ja-JP")}</small></span></div>`).join("")+"</div>";
}
function renderPanel(force=false){
  if(sheetState==="closed")return;
  const now=Date.now();
  if(infoPanelOpen){
    if(!force&&(now-lastPanelRender<1700||now-lastInteraction<700))return;
    lastPanelRender=now;
    $("childTabStrip").hidden=true;
    $("childTabs").hidden=true;
    $("sheetHeading").textContent="共通情報";
    $("purchaseToolbar").hidden=true;
    $("purchaseCycle").hidden=true;
    const body=$("sheetBody");
    body.innerHTML=commonInfoHTML();
    body.dataset.sub="commonInfo";
    return;
  }
  $("childTabStrip").hidden=false;
  $("childTabStrip").classList.toggle("is-existence",currentStage==="existence");
  $("childTabs").hidden=false;
  // Currency/affordability is patched on the existing buttons every UI tick.
  // Do not rebuild the purchase cards while earning resources or holding a finger.
  if(!force&&(holdPurchase||currentSub==="proposals"||currentStage==="existence"&&["moment","sources"].includes(currentSub)))return;
  if(!force&&(now-lastPanelRender<1700||now-lastInteraction<700||$("sheetBody").contains(document.activeElement)&&document.activeElement.matches("input,textarea,select")))return;
  lastPanelRender=now;
  const stage=CONTENT.stages.find(x=>x.id===currentStage);
  const children=currentStage==="organizer"?organizerItems:currentStage==="automation"?["auto-existence","auto-time","auto-universe","auto-life"]:currentStage==="time"?["flow","concepts","miracles"]:stage.children;
  $("childTabs").innerHTML=children.map(id=>`<button data-child="${id}" class="${currentSub===id?"active":""}" aria-pressed="${currentSub===id}">${childNames[id]}</button>`).join("");
  $("sheetHeading").textContent=(currentStage==="organizer"?"管理":currentStage==="automation"?"自動化":"強化")+" / "+childNames[currentSub];
  $("purchaseToolbar").hidden=currentStage!=="existence"||!["moment","sources"].includes(currentSub);
  const bulkAllowed=state.engraving.owned.includes("ENG-05");
  const bulkButton=$("bulkBuyButton");
  if(bulkButton){
    bulkButton.disabled=!bulkAllowed||readOnly||store.blocked;
    bulkButton.title=bulkAllowed?"現在のタブを一括購入":"刻印「一括解放」を取得すると利用できます";
    bulkButton.setAttribute("aria-label",bulkButton.title);
  }
  for(const id of ["bulkScopeButton","bulkOrderButton"]){
    const control=$(id);
    if(control)control.disabled=!bulkAllowed||readOnly||store.blocked;
  }
  const cycle=$("purchaseCycle");
  const buyTabs=currentStage==="existence"&&["moment","sources"].includes(currentSub);
  cycle.hidden=!buyTabs;
  cycle.textContent=({"1":"×1","10":"×10","NEXT":"NEXT","MAX":"MAX"})[state.purchaseMode];
  cycle.setAttribute("aria-label",`購入数 ${cycle.textContent}。タップで切替`);
  const order=$("bulkOrderButton");
  const orderLabels={
    cheap:["安い順","次の1Lvの価格が安い順で一括購入"],
    grade:["上位順","今買える最高グレード順で一括購入（価格順ではありません）"],
    efficient:["効率順","次の1Lvの効果増加量／価格で一括購入"],
    auto:["自動順","自律最適化の取得後は効率優先、それ以前は安い順で一括購入"]
  };
  const [shortOrder,fullOrder]=orderLabels[state.settings.bulkOrder]||orderLabels.cheap;
  order.textContent=shortOrder;order.title=fullOrder;order.setAttribute("aria-label",fullOrder);
  const scope=$("bulkScopeButton");if(scope){scope.textContent=bulkScope==="all"?"全件":"表示中";scope.title=bulkScope==="all"?"全件を対象に一括購入":"表示中を対象に一括購入";scope.setAttribute("aria-label",scope.title);}
  const body=$("sheetBody"),top=body.scrollTop,details=[...body.querySelectorAll("details[open][data-preserve]")].map(x=>x.dataset.preserve);
  const map={moment:momentHTML,sources:sourcesHTML,engraving:engravingHTML,flow:flowHTML,concepts:conceptHTML,miracles:miraclesHTML,
    planets:planetHTML,resources:resourcesHTML,observations:observationsHTML,
    life:()=>'<div class="empty-state"><div class="glyph">◌</div><p>未知の変化から、生命を認識する。</p><p>まだ生命を観測できません。</p></div>',
    boost:boostHTML,achievements:achievementHTML,statistics:statisticsHTML,settings:settingsHTML,backup:backupHTML,spec:specHTML,proposals:proposalsHTML,lab:labHTML,priceLab:priceLabHTML,guide:guideHTML,
    chronicle:chronicleHTML,
    "auto-existence":automationHTML,"auto-time":automationHTML,"auto-universe":automationHTML,"auto-life":automationHTML,
    collection:()=>conceptHTML()};
  body.innerHTML=(map[currentSub]||guideHTML)();

  body.querySelectorAll("details[data-preserve]").forEach(x=>x.open=details.includes(x.dataset.preserve));
  body.scrollTop=force&&body.dataset.sub!==currentSub?0:top;body.dataset.sub=currentSub;
  refreshMomentVisibility();
}
function refreshPurchaseButtons(){
  if(!state||sheetState==="closed"||currentStage!=="existence"||!["moment","sources"].includes(currentSub))return;
  const buttons=$("sheetBody").querySelectorAll("button[data-purchase]");
  let ready=0;
  for(const b of buttons){
    const kind=b.dataset.purchase,id=b.dataset.id,preview=purchasePreview(state,kind,id),q=preview.quote;
    const card=b.closest("[data-purchase-card]");
    const enabled=q.enabled&&!readOnly&&!store.blocked;
    b.disabled=!enabled;
    b.classList.toggle("is-buyable",enabled);
    if(card)card.classList.toggle("is-buyable",enabled);
    // The button always reads "購入"; price updates in its fixed-size cell.
    const price=costLabel(q),priceNode=card?.querySelector("[data-quote-label]");
    if(priceNode&&priceNode.textContent!==price)priceNode.textContent=price;
    const count=preview.count.toLocaleString("ja-JP"),countNode=card?.querySelector("[data-quote-count]");
    if(countNode&&countNode.textContent!==count)countNode.textContent=count;
    const gain=purchaseGainLabel(kind,id,preview),gainNode=card?.querySelector("[data-quote-gain]");
    if(gainNode&&gainNode.textContent!==gain){gainNode.textContent=gain;gainNode.title=gain;}
    const current=purchaseCurrentLabel(kind,id),currentNode=card?.querySelector("[data-quote-current]");
    if(currentNode&&currentNode.textContent!==current){currentNode.textContent=current;currentNode.title=current;}
    const levelNode=card?.querySelector(kind==="source"?"[data-source-level]":"[data-moment-level]");
    const level=kind==="source"?state.sources[id].level:state.moment[id];
    const levelText="Lv."+level.toLocaleString("ja-JP");
    if(levelNode&&levelNode.textContent!==levelText)levelNode.textContent=levelText;
    const name=(kind==="source"?CONTENT.sources:CONTENT.moment).find(x=>x.id===id)?.name||id;
    const full=name+"：費用 "+price+" オーブ / 購入 ×"+count+" / "+current+" / "+gain;
    if(b.title!==full)b.title=full;
    const aria=name+"、購入可能 "+count+" レベル。費用 "+price+" オーブ。"+current+"。"+gain+"。購入";
    if(b.getAttribute("aria-label")!==aria)b.setAttribute("aria-label",aria);
    const cost=card?.querySelector(".purchase-cost");
    if(cost&&cost.title!==full)cost.title=full;
    if(enabled)ready++;
    if(kind==="source"){
      const total=card?.querySelector(`[data-source-total="${id}"]`);
      const sum=sourceMilestoneLabel(id);
      if(total&&total.textContent!==sum)total.textContent=sum;
      const next=card?.querySelector(`[data-source-next="${id}"]`);
      const nextText=`毎秒 ${o(G.sourceProduction(state,id))} オーブ`;
      if(next&&next.textContent!==nextText){next.textContent=nextText;next.title=nextText;}
      const cycle=card?.querySelector("[data-breakthrough]");
      if(cycle)cycle.disabled=state.sources[id].level!==1000000||!G.sourceCycleStatus(state).unlocked||readOnly||store.blocked;
    }
  }
  const summary=`購入可能 ${ready} / ${buttons.length} · 所持 ${o(state.orbs)} オーブ`;
  if($("purchaseLiveSummary").textContent!==summary)$("purchaseLiveSummary").textContent=summary;
  if(currentSub==="moment"){
    const q=G.convergenceQuote(state),b=$("sheetBody").querySelector('button[data-action="converge"]');
    if(b){
      b.disabled=!q.steps||readOnly||store.blocked;
      const label=`収束する · 次まで ${o(q.nextRemaining,"ceil")} オーブ`;
      const t=b.querySelector("[data-converge-text]");if(t&&t.textContent!==label)t.textContent=label;
      const fill=b.querySelector("[data-converge-fill]");if(fill)fill.style.width=G.convergenceProgress(state).percent.toFixed(2)+"%";
    }
    const reward=$("sheetBody").querySelector('[data-convergence-reward]');
    if(reward){const label=`獲得予定 +${f(q.reward,3)} 存在`;if(reward.textContent!==label)reward.textContent=label;}
    const bonus=$("sheetBody").querySelector("[data-existence-rate]");
    if(bonus)bonus.textContent=`×${f(G.existenceMultiplier(state),3)}`;
  }
  if(currentSub==="moment"&&state.settings.momentFilter==="affordable"&&Date.now()-lastMomentFilterRefresh>900){
    lastMomentFilterRefresh=Date.now();refreshMomentVisibility();
  }
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
      const display=active?"×"+G.boostTimeMultiplier(state):seconds>=3600?`${Math.floor(seconds/3600)}h`:seconds>=60?`${Math.floor(seconds/60)}m`:`${Math.floor(seconds)}s`;
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
  if(offline)offline.textContent=seconds>capacity?"容量超過旧残高を保護中":`満タンまで ${duration(Math.max(0,(capacity-seconds)/G.boostValues(state).offlineRate))}（現実の離席時間）`;
  const button=panel.querySelector('button[data-action="toggle-boost"]');
  if(button){
    button.disabled=readOnly||store.blocked||(!active&&seconds<1);
    button.textContent=active?"時間加速を停止":"時間×"+G.boostTimeMultiplier(state)+"を開始";
  }
}
function render(force=false){
  if(!state)return;
  renderNav();renderWorld();renderPanel(force);refreshPurchaseButtons();refreshBoostShortcut();
}
function wave(x,y,gain,meta=null){
  if(state.settings.reducedMotion||state.settings.lowPower)return;
  const rect=$("touchField").getBoundingClientRect();
  const span=document.createElement("span");span.className="wave";
  span.style.left=(x-rect.left)+"px";span.style.top=(y-rect.top)+"px";$("waves").appendChild(span);
  const text=document.createElement("span");text.className="wave-gain";text.style.left=span.style.left;text.style.top=span.style.top;
  if(gain&&A(gain).cmp(0)>0){text.textContent="+"+o(gain);$("waves").appendChild(text);}
  const labels=[];
  for(const [id,name] of [["wave","余波"],["echo","反響"],["chain","連鎖"],["double","二重"],["released","蓄積放出"]]){
    if(meta?.components?.[id]&&A(meta.components[id]).cmp(0)>0)labels.push(name+" +"+o(meta.components[id]));
  }
  if(meta?.crit)labels.push("CRIT"+(meta.chain?" ×"+(meta.chain+1):""));
  if(meta?.miracle)labels.push("奇跡 ×200");
  const more=document.createElement("span");
  more.className="wave-special";more.style.left=span.style.left;more.style.top=span.style.top;
  if(labels.length){more.textContent=labels.slice(0,3).join(" · ");$("waves").appendChild(more);}
  setTimeout(()=>{span.remove();text.remove();more.remove();},850);
}
function birth(){
  busyBirth=true;$("birthOverlay").classList.add("visible");
  const t=state.settings.reducedMotion?150:CONFIG.provisional.introFadeMs;
  setTimeout(()=>{$("birthOverlay").classList.remove("visible");busyBirth=false;render(true);},t);
}
function handleTap(x,y){
  if(readOnly||store.blocked||busyBirth||!state)return;
  if(!["existence","organizer","automation"].includes(currentStage)&&state.intro.complete)return;
  checkpoint();const result=G.tap(state);wave(x,y,result.gain,result);
  if(state.settings.hapticTap && typeof navigator.vibrate==="function"){
    try{navigator.vibrate(8);}catch{/* 端末非対応時もゲーム処理を妨げない */}
  }
  if(result.foundation){save(true);birth();}
  render(false);
}
const activePointers=new Set();
$("touchField").addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse"&&e.button!==0)return;
  if(activePointers.has(e.pointerId))return;
  if(currentStage==="time"&&e.target.closest("#timeHexRoot"))return;
  activePointers.add(e.pointerId);e.preventDefault();
  handleTap(e.clientX,e.clientY);
});
for(const name of ["pointerup","pointercancel"])window.addEventListener(name,e=>activePointers.delete(e.pointerId));
$("touchField").addEventListener("keydown",e=>{
  if(e.target===$("touchField")&&(e.key==="Enter"||e.key===" ")){e.preventDefault();const r=$("touchField").getBoundingClientRect();handleTap(r.left+r.width/2,r.top+r.height/2);}
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
function stopHoldPurchase(evt=null,cancelClick=false){
  const h=holdPurchase;
  if(!h||evt&&evt.pointerId!==h.pointerId)return;
  // End the transaction before redrawing the panel or changing stage. A delayed
  // timer must never continue buying against a stale target after navigation.
  holdPurchase=null;
  clearTimeout(h.timer);clearInterval(h.repeat);
  h.button?.classList.remove("holding-purchase");
  if(h.started||cancelClick)
    skipClickFor={key:h.kind+":"+h.id,until:Date.now()+650};
  if(h.bought)save();
  // Navigation will render its destination once; don't redraw the old sheet.
  if(h.started&&!cancelClick)render(true);
}
function buyWhileHeld(h){
  if(h!==holdPurchase||readOnly||store.blocked||document.hidden||!state?.settings.holdToBuy)return;
  if(!["1","10"].includes(state.purchaseMode)){stopHoldPurchase();return;}
  checkpoint();
  // A single hold operation cannot exceed 3,000 purchased levels, including ×10.
  if(h.levelsPurchased>=HOLD_LEVEL_LIMIT){stopHoldPurchase();return;}
  const quote=G.purchaseQuote(state,h.kind,h.id);
  if(!quote.enabled)return;
  if(quote.count>HOLD_LEVEL_LIMIT-h.levelsPurchased){stopHoldPurchase();return;}
  const result=G.buy(state,h.kind,h.id);
  if(!result.ok)return;
  h.bought++;h.levelsPurchased+=result.count;
  if(h.levelsPurchased>=HOLD_LEVEL_LIMIT){stopHoldPurchase();toast("長押し1操作の上限（合計3,000Lv）に到達しました");return;}
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
  if(!b||b.disabled||!state?.settings.holdToBuy||readOnly||store.blocked||holdPurchase||!["1","10"].includes(state.purchaseMode))return;
  if(e.pointerType==="mouse"&&e.button!==0)return;
  const h={button:b,kind:b.dataset.purchase,id:b.dataset.id,pointerId:e.pointerId,
    x:e.clientX,y:e.clientY,started:false,bought:0,levelsPurchased:0,timer:null,repeat:null,lastSave:Date.now()};
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
window.addEventListener("pointerup",e=>stopHoldPurchase(e));
window.addEventListener("pointercancel",e=>stopHoldPurchase(e,true));
window.addEventListener("blur",()=>stopHoldPurchase(null,true));
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
  if(action==="open-automation"){openAutomation();return;}
  if(action==="toggle-auto-details"){automationDetailsOpen=!automationDetailsOpen;renderPanel(true);return;}
  if(action==="open-common-info"){
    stopHoldPurchase(null,true);
    infoPanelOpen=true;
    if(sheetState==="closed")setSheet("half");
    else renderPanel(true);
    return;
  }
  if(action==="return-stage-panel"){
    stopHoldPurchase(null,true);
    infoPanelOpen=false;
    renderPanel(true);
    return;
  }
  if(action==="run-price-lab"||action==="run-price-lab-compare"){
    if(mode!=="lab")return toast("検証モードでのみ使用できます");
    try{
      if(action==="run-price-lab"){priceLabReport=compareMomentPrice(state,{...priceLabParams,now:Date.now()});priceLabComparisons=null;}
      else {priceLabComparisons=compareMomentPriceProfiles(state,{...priceLabParams,profiles:["early","middle","late"],now:Date.now()});priceLabReport=null;}
      renderPanel(true);
    }catch(error){toast("価格試算を中止しました："+error.message);}
    return;
  }
  if(action==="export-price-lab"){
    if(mode!=="lab")return toast("検証モードでのみ使用できます");
    try{
      const result=priceLabComparisons||priceLabReport;
      if(!result)return toast("先に価格を試算してください");
      const data=exportPriceReport(result);
      download(data,`kotowari-price-trial-${new Date().toISOString().slice(0,10)}.json`);
    }catch(error){toast("書き出しできません："+error.message);}
    return;
  }
  if(action==="cycle-buy-mode"){
    if(readOnly)return toast("読み取り専用のため切り替えできません");
    stopHoldPurchase(null,true);
    const modes=["1","10","NEXT","MAX"];
    G.setPurchaseMode(state,modes[(modes.indexOf(state.purchaseMode)+1)%modes.length]);
    save();renderPanel(true);return;
  }
  if(action==="toggle-bulk-order"){
    if(readOnly)return toast("読み取り専用のため変更できません");
    const modes=["cheap","grade",...(engravingAutoEfficient(state)?["efficient"]:[]),"auto"];
    state.settings.bulkOrder=modes[(modes.indexOf(state.settings.bulkOrder)+1)%modes.length];
    save();renderPanel(true);return;
  }
  if(action==="toggle-bulk-scope"){
    bulkScope=bulkScope==="all"?"visible":"all";
    renderPanel(true);return;
  }
  if(action==="buy-all"){
    if(!state.engraving.owned.includes("ENG-05"))return toast("刻印「一括解放」で解放します");
    if(bulkPurchasePending)return;
    if(readOnly||store.blocked)return toast("この画面では購入できません");
    const kind=currentStage==="existence"?(currentSub==="moment"?"moment":currentSub==="sources"?"source":null):null;
    if(!kind)return toast("《刹那》か《源》の画面で操作してください");
    stopHoldPurchase(null,true);
    bulkPurchasePending=true;
    const bulkButton=$("bulkBuyButton");bulkButton.disabled=true;
    try{
      checkpoint();
      const stageBefore=currentStage,subBefore=currentSub,orderBefore=state.settings.bulkOrder;
      const scopeBefore=bulkScope;
      const targets=()=>{
        if(scopeBefore==="all")return null;
        const selector=kind==="moment"?"[data-moment-entry]:not([hidden])":"[data-source-entry]:not([hidden])";
        // CSS-based affordability filters also hide cards without setting [hidden].
        return [...$("sheetBody").querySelectorAll(selector)]
          .filter(el=>el.getClientRects().length>0)
          .map(el=>kind==="moment"?el.dataset.momentEntry:el.dataset.sourceEntry);
      };
      const ids=targets();
      if(scopeBefore==="visible"&&!ids.length)return toast("表示中の購入対象がありません");
      if(state.settings.confirmBulkPurchase){
        const quote=G.quoteBuyAll(state,kind,orderBefore,ids);
        if(!quote.ok)return toast(quote.reason||"購入できません");
        const label=kind==="moment"?"刹那":"源",description=scopeBefore==="all"?"全件":"表示中";
        const detail=label+"：対象 "+description+"（"+(ids?.length??30)+"項目）"+
          "\n購入 "+quote.count.toLocaleString("ja-JP")+"Lv / 消費 "+o(quote.spent,"ceil")+" オーブ"+
          "\n購入後残高 "+o(quote.remaining)+" オーブ"+
          (quote.limitReached?"\n1回の上限3,000Lvです。残りは再度手動で購入してください。":"")+
          "\n購入対象と消費金額を確認してください。";
        if(!await ask("一括購入の金額確認",detail,"この内容で購入"))return;
        checkpoint();
        if(currentStage!==stageBefore||currentSub!==subBefore||
           state.settings.bulkOrder!==orderBefore||bulkScope!==scopeBefore)
          return toast("購入条件が変わりました。再確認してください");
        const idsNow=targets();
        if(JSON.stringify(idsNow)!==JSON.stringify(ids))
          return toast("購入対象が変わりました。再確認してください");
        const updated=G.quoteBuyAll(state,kind,orderBefore,ids);
        // Passive earnings legitimately change remaining currency while the dialog is open.
        // Only the explicitly confirmed number of levels and spend must stay identical.
        if(!updated.ok||updated.count!==quote.count||A(updated.spent).cmp(quote.spent)!==0)
          return toast("購入数または価格が変わりました。もう一度一括購入を押してください");
      }
      // Default one-tap path: no await, no second time advance, no stale quote.
      // The engine checks affordability and the 3,000-level cap transactionally.
      const result=G.buyAll(state,kind,orderBefore,ids);
      if(!result.ok)return toast(result.reason||"購入できません");
      const persisted=save();
      render(true);
      if(!persisted)return toast("購入を実行しましたが保存できません。保存状況を確認してください");
      // Purchase feedback is shown by the new Lv and resources on the card.
    }finally{
      bulkPurchasePending=false;
      bulkButton.disabled=false;
    }
    return;
  }
  if(action==="close-drawer"){$("organizerDrawer").close();return;}
  if(action==="expand"){setSheet(sheetState==="full"?"half":"full");return;}
  if(action==="collapse-sheet"){setSheet("closed");return;}
  if(action==="dismiss-notice"){showNotice("");return;}
  if(action==="enter-test"){
    if(mode!=="normal")return;
    if(!save()||storageUnavailable)return toast("通常データを保存できません。先にバックアップしてください");
    location.assign("./?lab=1");return;
  }
  if(action==="exit-test"){
    if(mode!=="lab")return;
    if(!save()||storageUnavailable)return toast("テストデータの保存に失敗しました");
    location.assign("./");return;
  }
  if(action==="protect-save"){
    if(readOnly||store.blocked||storageUnavailable)return toast("端末の保存を利用できません");
    try{checkpoint();store.protect(state,"manual");renderPanel(true);toast("保護バックアップを保存・確認しました");}
    catch(error){toast("バックアップを中止しました："+error.message);}
    return;
  }
  if(action==="reset-game"){
    if(resetPending||confirmedAction)return;
    if(readOnly||store.blocked||storageUnavailable)return toast("端末の保存を利用できないためリセットできません");
    resetPending=true;stopHoldPurchase(null,true);
    try{
      const target=mode==="lab"?"テストデータ":"通常データ";
      if(!await ask("完全リセット",target+"の全進行・強化・統計・設定を初期化します。先に復元用バックアップを保存します。別モードと過去のバックアップは残ります。","次へ"))return;
      if(!await ask("最終確認",target+"を最初からやり直しますか？ バックアップが保存・検証できなければ何も初期化しません。","完全リセットする"))return;
      checkpoint();
      state=store.reset(state,Date.now());
      currentStage="existence";currentSub="moment";infoPanelOpen=false;navDigest="";
      offlineReport=null;importDraft="";testGrantDraft="1e12";momentSearch="";bulkScope="all";
      priceLabReport=null;priceLabComparisons=null;automationDetailsOpen=false;
      applySettings();setSheet("closed");lastSavedAt=Date.now();
      $("saveIndicator").textContent="保存済";render(true);
      showNotice("完全リセットしました。保存からリセット前のデータを復元できます。",{autoDismiss:true});
    }catch(error){toast("リセットを中止しました："+error.message);}
    finally{resetPending=false;}
    return;
  }
  if(action==="test-grant-orbs"||action==="test-grant-existence"){
    if(mode!=="lab"||readOnly||store.blocked)return toast("テストモード専用です");
    testGrantDraft=$("testGrantAmount")?.value??testGrantDraft;
    checkpoint();return resultDone(G.labGrant(state,action==="test-grant-orbs"?"orbs":"existence",testGrantDraft),"テスト資源を追加しました");
  }
  if(action==="export-save"){
    if(store.blocked)return toast("主セーブ保護中です。下の「保護中の主セーブを救出」を利用してください");
    if(!save())return toast("保存を確認できないためバックアップを中止しました");
    download(store.export(state),`kotowari-v31-${mode}-${new Date().toISOString().slice(0,10)}.json`);
    return;
  }
  if(action==="copy-save"){
    if(store.blocked)return toast("主セーブ保護中です。下の「保護中の主セーブを救出」を利用してください");
    if(!save())return toast("保存を確認できないためコピーを中止しました");
    const text=store.export(state);
    try{await navigator.clipboard.writeText(text);toast("バックアップをコピーしました");}
    catch(e){importDraft=text;renderPanel(true);$("importText")?.focus();$("importText")?.select();toast("表示した文字列を選択してコピーしてください");}return;
  }
  if(action==="export-legacy"){
    const text=storage.getItem(KEYS.legacyArchive)||storage.getItem(KEYS.legacy);
    if(text)download(text,"kotowari-legacy-archive.json");else toast("退避した旧データはありません");return;
  }
  if(action==="export-corrupt"){
    const text=storage.getItem(store.key)||storage.getItem(store.key+".corrupt")||storage.getItem(KEYS.legacy);
    if(text)download(text,"kotowari-recovery-original.txt","text/plain");return;
  }
  if(readOnly){toast("別のタブが編集中です。ほかのゲーム画面を閉じてから再読み込みしてください。");return;}
  checkpoint();
  if(action==="converge"){
    const q=G.convergenceQuote(state);
    if(!q.steps){toast("必要なオーブを集めてください");return;}
    const newRate=A(1).add(A(state.totalExistenceEarned||"0")).add(q.reward);
    const text=`存在 +${f(q.reward,3)} を獲得します。\n以後のタップ・源生産は ×${f(newRate,3)}になります。\nオーブと刹那・源の周回内Lvをリセットします。\n最初の存在1・時・概念は残ります。`;
    if(state.settings.confirmConvergence&&!await ask("収束する",text,"収束する"))return;
    if(resultDone(G.converge(state))){
      busyBirth=true;document.body.classList.add("is-converging");
      setTimeout(()=>{document.body.classList.remove("is-converging");busyBirth=false;},state.settings.reducedMotion?100:650);
    }return;
  }
  if(action==="edit-engraving")return resultDone(G.beginEngraving(state));
  if(action==="cancel-engraving")return resultDone(G.cancelEngraving(state),"変更を取り消しました");
  if(action==="confirm-engraving")return resultDone(G.confirmEngraving(state),"刻印装備を確定しました");
  if(action==="toggle-auto-converge"){
    const on=!state.engraving.autoConverge.enabled;
    return resultDone(G.configureAutoConvergence(state,{enabled:on},Date.now()),on?"自動収束をONにしました":"自動収束をOFFにしました");
  }
  if(action==="convert-common")return resultDone(G.convertCommon(state),"ひとつの残滓を得ました");
  if(action==="create-planet")return resultDone(G.createPlanet(state));
  if(action==="start-core"){
    const p=G.planet(state);
    if(!p)return toast("先に惑星を生成してください");
    if(state.settings.confirmCoreFormation&&!await ask("コア形成を開始",`${p.id}の内部にコアを形成します。R6資源を1個消費します。形成には必要な惑星状態と現象理解が必要です。`,"開始する"))return;
    return resultDone(G.startCore(state),"コア形成を開始しました");
  }
  if(action==="toggle-auto-planet"){
    const r=G.toggleAutoPlanet(state);
    return resultDone(r,r.enabled?"惑星の自動生成を有効にしました":"惑星の自動生成を停止しました");
  }
  if(action==="toggle-boost"){
    if(!state.boost.active&&state.boost.seconds<1){
      openOrganizerPage("boost");toast("BOOST残量がありません。蓄積状況を表示しています");return;
    }
    state.boost.active=!state.boost.active;
    save();render(true);
    toast(state.boost.active?"時間加速×"+G.boostTimeMultiplier(state)+"を開始しました":"時間加速を停止しました");
    return;
  }
  if(action==="toggle-trial"){
    if(mode!=="lab")return toast("独立した検証セーブだけで試せます");
    const result=G.setTrialEnabled(state,!G.trialEnabled(state));
    return resultDone(result,result.enabled?"候補効果の検証を開始しました":"候補効果の検証を停止しました");
  }
  if(action==="snapshot"){if(save(true)){renderPanel(true);toast(store.lastError?"進捗は保存しましたが履歴更新は失敗しました":"履歴を保存しました");}return;}
  if(action==="import-save"){
    const text=$("importText")?.value||importDraft;
    if(!text.trim()){toast("バックアップを選択・貼り付けてください");return;}
    // Validate BEFORE asking to replace the active data.
    try{
      const p=JSON.parse(text);
      if(p.kind==="kotowari-backup-v31"||p.kind==="kotowari-save"||p.schemaVersion===31)decode(text,mode);
      else G.migrateLegacy(p);
      if(state.settings.confirmSaveImport&&!await ask("バックアップを読み込む","現在のデータを退避して、指定した進行へ切り替えます。検証データを通常データへは読み込めません。","読み込む"))return;
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
    if(b.dataset.timeDirection!==undefined){
      if(currentStage!=="time"||readOnly||store.blocked)return;
      const index=Number(b.dataset.timeDirection),active=state.time.selected.includes(index);
      checkpoint();
      resultDone(G.setDirection(state,index,!active));return;
    }
    if(b.dataset.timeOpen!==undefined){
      if(currentStage!=="time"||!["flow","concepts","miracles"].includes(b.dataset.timeOpen))return;
      stopHoldPurchase(null,true);
      currentSub=b.dataset.timeOpen;infoPanelOpen=false;
      setSheet("half");render(true);return;
    }
    if(b.dataset.child){
      stopHoldPurchase(null,true);currentSub=b.dataset.child;
      if(currentStage==="automation"&&currentSub.startsWith("auto-")&&!readOnly&&!store.blocked){state.settings.automationStage=currentSub.slice(5);save();}
      if(currentStage==="existence"&&["moment","sources","engraving"].includes(currentSub)&&!readOnly&&!store.blocked){
        state.settings.existenceLastTab=currentSub;save();
      }
      renderPanel(true);return;
    }
    if(b.dataset.organizer){openOrganizerPage(b.dataset.organizer);return;}
    if(b.dataset.autoMode!==undefined){
      if(readOnly||store.blocked)return toast("読み取り専用です");
      if(!state.engraving.owned.includes(ENGRAVING_AUTO_CONVERGE_ID))return;
      checkpoint();
      resultDone(G.configureAutoConvergence(state,{mode:b.dataset.autoMode},Date.now()));
      return;
    }
    if(b.dataset.momentGroupSelect!==undefined){
      if(readOnly||store.blocked)return toast("読み取り専用です");
      state.settings.momentGroup=b.dataset.momentGroupSelect;
      save();renderPanel(true);return;
    }
    if(b.dataset.momentFavorite){
      if(readOnly||store.blocked)return toast("読み取り専用です");
      const next=toggleMomentFavorite(state.settings.momentFavorites,b.dataset.momentFavorite,MOMENT_PREF_IDS);
      if(!next.changed)return toast(next.error==="limit"?"お気に入りは5項目までです":"対象が見つかりません");
      state.settings.momentFavorites=next.favorites;save();renderPanel(true);return;
    }
    if(b.dataset.momentMove){
      if(readOnly||store.blocked)return toast("読み取り専用です");
      const result=moveMomentFavorite(state.settings.momentFavorites,b.dataset.momentMove,Number(b.dataset.direction),MOMENT_PREF_IDS);
      if(!result.changed)return toast("これ以上順番を移動できません");
      state.settings.momentFavorites=result.favorites;
      save();renderPanel(true);
      $("sheetBody").querySelector(`[data-moment-move="${b.dataset.momentMove}"][data-direction="${b.dataset.direction}"]`)?.focus({preventScroll:true});
      return;
    }
    if(b.dataset.momentShortcut){
      if(readOnly||store.blocked)return toast("読み取り専用です");
      const entry=CONTENT.moment.find(x=>x.id===b.dataset.momentShortcut);
      if(entry){state.settings.momentGroup=String(entry.group);state.settings.momentFilter="all";momentSearch="";
        save();renderPanel(true);$("sheetBody").querySelector(`[data-moment-entry="${entry.id}"]`)?.scrollIntoView({block:"center"});}
      return;
    }
    if(b.dataset.presetSave!==undefined){
      if(readOnly||store.blocked)return toast("保存できません");
      checkpoint();resultDone(G.savePurchasePreset(state,Number(b.dataset.presetSave)));return;
    }
    if(b.dataset.presetApply!==undefined){
      if(readOnly||store.blocked)return toast("保存できません");
      checkpoint();resultDone(G.applyPurchasePreset(state,Number(b.dataset.presetApply)));return;
    }
    if(b.dataset.protectedExport!==undefined){
      const row=store.protectedBackups()[Number(b.dataset.protectedExport)];
      if(!row)return toast("保護バックアップが見つかりません");
      download(row.raw,`kotowari-${mode}-${row.reason}-${row.at}.json`);return;
    }
    if(b.dataset.protectedRestore!==undefined){
      if(readOnly||storageUnavailable)return toast("端末の保存を利用できません");
      const index=Number(b.dataset.protectedRestore),row=store.protectedBackups()[index];
      if(!row)return toast("保護バックアップが見つかりません");
      decode(row.raw,mode);
      if(!await ask("保護バックアップから復元","現在のデータを退避してから、選んだ進行へ戻します。保護バックアップ自体は保持します。","復元する"))return;
      if(!store.blocked&&!save())return toast("現在の進行を保護できないため復元を中止しました");
      state=store.restoreProtectedBackup(index);offlineReport=null;importDraft="";
      applySettings();render(true);showNotice(store.lastError||"保護バックアップから復元しました。");return;
    }
    if(b.dataset.action){await dispatchAction(b.dataset.action);return;}
    if(b.matches("[data-legacy-link]")){save(true);return;}
    if(b.dataset.momentDetail){
      const id=b.dataset.momentDetail,i=CONTENT.moment.findIndex(x=>x.id===id);
      if(i<0)return;
      const x=CONTENT.moment[i],e=G.momentEffects(state)[i],q=G.purchaseQuote(state,"moment",id);
      const level=state.moment[id];
      await ask(x.name+" · Lv."+level.toLocaleString("ja-JP"),
        x.description+"\n\n現在："+e.current+"\n次Lv："+e.next+
        "\n購入費用："+costLabel(q)+" オーブ"+
        (q.enabled&&q.count>0?"\n購入後："+G.momentAfterQuote(state,i,q.count):"")+
        "","閉じる");
      return;
    }
    if(b.dataset.engravingDetail){
      const id=b.dataset.engravingDetail,item=engravingCatalogue().find(x=>x.id===id);
      if(!item)return;
      const owned=state.engraving.owned.includes(id),q=owned?G.engravingTrialUpgradeQuote(state,id):engravingPurchaseQuote(state,id);
      const price=q.price??item.cost;
      const level=state.engraving.levels?.[id];
      const status=!owned?"Lv.0（未取得）":Number.isSafeInteger(level)?"Lv."+level.toLocaleString("ja-JP"):"Lv.―（以前のレベル情報がありません）";
      await ask(item.name,"現在 "+status+"\n"+item.description+
        "\n必要存在："+(price===null||price===undefined?"—":formatExistenceDisplay(price,{roundUp:true})),"閉じる");
      return;
    }
    if(b.dataset.sourceSummary!==undefined){
      const cycle=G.sourceCycleStatus(state),resonance=G.sourceResonanceProgress(state);
      const next=resonance.next?resonance.next.id+" Lv."+resonance.next.level+"（残り"+resonance.next.remaining+"Lv）":"全節目到達";
      await ask("源の共振・一巡","共振 "+resonance.completed+"/"+resonance.total+
        "\n次の節目："+next+"\n一巡 "+cycle.reached+"/"+cycle.total+
        "\n＋循環："+(cycle.unlocked?"解放":"未解放"),"閉じる");
      return;
    }
    if(b.dataset.sourceDetail){
      const x=CONTENT.sources.find(x=>x.id===b.dataset.sourceDetail);
      const status=G.sourceFinalEffectStatus(state,x.id);
      const v=state.sources[x.id],ms=CONFIG.confirmed.sourceMilestones,done=ms.filter(k=>k<=v.level).length,next=ms.find(k=>k>v.level);
      const special=status?.unlocked&&status?.implemented?"\n＋循環の固有効果："+status.label:"";
      await ask(x.name,`現在 Lv.${v.level.toLocaleString("ja-JP")} / ＋${v.plus}\n節目 ${done}/${ms.length} / 次 ${next||"MAX"}\n節目達成ごとに生産×2（累積 ×${o(G.sourceMilestoneMultiplier(v.level))}）\n＋倍率 ×${f(G.sourcePlusGain(v.plus))}\n現在 ${o(G.sourceProduction(state,x.id))} オーブ/秒\n次Lv増加 ${o(G.sourceNextGain(state,x.id))} オーブ/秒\n※節目で購入価格は変化しません。${special}`,"閉じる");return;
    }
    if(readOnly){toast("別タブの書き込みを保護中です");return;}
    if(store.blocked && b.dataset.restore===undefined){toast("元セーブを保護中です。「保存」から復元してください。");return;}
    checkpoint();
    if(b.dataset.buyMode){stopHoldPurchase(null,true);G.setPurchaseMode(state,b.dataset.buyMode);save();renderPanel(true);return;}
    if(b.dataset.purchase){
      if(skipClickFor&&skipClickFor.key===b.dataset.purchase+":"+b.dataset.id&&Date.now()<skipClickFor.until){skipClickFor=null;return;}
      if(readOnly||store.blocked)return toast("読み取り専用のため購入できません");
      checkpoint();
      const kind=b.dataset.purchase,id=b.dataset.id,modeBefore=state.purchaseMode;
      const quote=G.purchaseQuote(state,kind,id);
      if(!quote.enabled)return toast(quote.reason||"購入できません");
      if(state.settings.confirmMaxPurchase&&G.maxPurchaseRequiresConfirmation(state.orbs,quote,modeBefore)){
        const label=(kind==="source"?CONTENT.sources:CONTENT.moment).find(x=>x.id===id)?.name||id;
        const cost=o(quote.cost,"ceil"),remaining=o(A(state.orbs).sub(quote.cost));
        if(!await ask("MAX購入の確認",label+"："+quote.count.toLocaleString("ja-JP")+"Lv購入 / 消費 "+cost+" オーブ / 購入後 "+remaining+" オーブ","購入する"))return;
        checkpoint();
        const updated=G.purchaseQuote(state,kind,id);
        if(state.purchaseMode!==modeBefore||updated.count!==quote.count||updated.cost!==quote.cost)
          return toast("購入価格または購入可能Lvが変化したため、再度お試しください");
      }
      const result=G.buy(state,kind,id);
      if(!resultDone(result))return;
      // A MAX purchase does not open a success popup.
      return;
    }
    if(b.dataset.breakthrough){
      const id=b.dataset.breakthrough,x=CONTENT.sources.find(item=>item.id===id);
      if(!x)return toast("源を確認できません");
      const source=state.sources[id];
      if(state.settings.confirmSourceBreakthrough&&!await ask("＋循環の確認",x.name+"：Lv."+source.level.toLocaleString("ja-JP")+" / ＋"+source.plus+" → ＋"+(source.plus+1)+"・Lv1から再開始します。","＋循環する"))return;
      resultDone(G.breakthrough(state,id));return;
    }
    if(b.dataset.interference){
      const type=b.dataset.interference;
      const p=G.planet(state),list=state.universe.planets.filter(x=>x.id!==p?.id);
      const partner=list.find(x=>x.id===interferencePartnerId)||list[0];
      const other=type==="collision"||type==="transfer"?partner?.id:null;
      if(!p)return toast("先に惑星を選択してください");
      const quote=G.interferenceQuote(state,type,p.id,other,Date.now());
      if(!quote.ok)return toast(quote.reason||"操作できません");
      const names={collision:"衝突",transfer:"成長移転",induce:"崩壊誘発",stabilize:"安定化"};
      const details=type==="collision"||type==="transfer"?" / 相手："+other:"";
      if(state.settings.confirmInterference&&!await ask(names[type]+"の確認",
        "対象："+p.id+details+"\n必要資源：R1合計 "+f(quote.price)+
        "\n実行後の消費は取り消せません。","実行する"))return;
      checkpoint();
      const current=G.interferenceQuote(state,type,p.id,other,Date.now());
      if(!current.ok||A(current.price).cmp(quote.price)!==0)return toast("状態・費用が変化したため再確認してください");
      const out=type==="collision"?G.collidePlanets(state,p.id,other):
        type==="transfer"?G.transferPlanetGrowth(state,p.id,other):
        type==="induce"?G.inducePlanetCollapse(state,p.id):
        G.stabilizePlanet(state,p.id);
      return resultDone(out,names[type]+"を実行しました");
    }
    if(b.dataset.engravingBuy){
      const id=b.dataset.engravingBuy,quote=engravingPurchaseQuote(state,id);
      if(!quote.ok)return toast(quote.reason||"購入できません");
      if(state.settings.confirmEngravingPurchase&&!await ask("刻印の初回購入",`${engravingCatalogue().find(x=>x.id===id)?.name||"刻印"} を余剰存在 ${formatExistenceDisplay(quote.price,{roundUp:true})} で初回購入します。残り存在：${formatExistenceDisplay(A(state.surplusExistence).sub(quote.price))}。有効な固有効果は購入後から常時適用します。`,"購入する"))return;
      checkpoint();
      return resultDone(G.buyEngraving(state,id));
    }
    if(b.dataset.engravingTrialUpgrade){
      const id=b.dataset.engravingTrialUpgrade,q=G.engravingTrialUpgradeQuote(state,id);
      if(!q.ok)return toast(q.reason);
      if(state.settings.confirmEngravingUpgrade&&!await ask("刻印の強化",`${engravingCatalogue().find(x=>x.id===id)?.name||"刻印"} のLvを上げます。費用 ${formatExistenceDisplay(q.price,{roundUp:true})} 余剰存在。`,"購入する"))return;
      checkpoint();return resultDone(G.buyEngravingTrialUpgrade(state,id));
    }
    if(b.dataset.draft){resultDone(G.toggleDraft(state,b.dataset.draft));return;}
    if(b.dataset.form){resultDone(G.formConcept(state,b.dataset.form));return;}
    if(b.dataset.formMax){resultDone(G.formConceptMax(state,b.dataset.formMax));return;}
    if(b.dataset.invest){const r=G.invest(state,b.dataset.invest,Number(b.dataset.count||1));resultDone(r);return;}
    if(b.dataset.boostTrialBuy!==undefined){
      const id=Number(b.dataset.boostTrialBuy),q=G.boostTrialPurchaseQuote(state,id);
      if(!q.ok)return toast(q.reason);
      if(state.settings.confirmBoostUpgrade&&!await ask("BOOST強化",`${["基礎獲得","オフライン獲得","容量","時間倍率","消費効率"][id]}をLv.${q.next}へ。費用：${duration(q.cost)} BOOST。`,"BOOSTで購入"))return;
      checkpoint();return resultDone(G.buyBoostTrialUpgrade(state,id));
    }
    if(b.dataset.boostUpgrade!==undefined){resultDone(G.labBoostUpgrade(state,Number(b.dataset.boostUpgrade)));return;}
    if(b.dataset.restore!==undefined){
      if(state.settings.confirmSaveRestore&&!await ask("保存履歴から復元","現在のデータを退避して、この履歴へ戻します。","復元する"))return;
      state=store.restoreBackup(Number(b.dataset.restore));applySettings();render(true);toast("履歴から復元しました");return;
    }
    if(b.dataset.lab){
      const r=G.labAction(state,b.dataset.lab);
      if(resultDone(r)){if(r.report)reportOffline(r.report);else toast("変更しました");}return;
    }
  }catch(error){toast("操作を中止しました："+error.message);console.error(error);}
});
document.addEventListener("change",async e=>{
  const t=e.target;if(!state)return;
  if(t.id==="testGrantAmount"){testGrantDraft=t.value;return;}
  if(t.id==="importFile"){
    const file=t.files?.[0];if(!file)return;
    if(file.size>4*1024*1024){toast("4MBを超えるファイルは読み込めません");return;}
    importDraft=await file.text();const area=$("importText");if(area)area.value=importDraft;return;
  }
  if(t.dataset.priceLab){
    if(mode!=="lab")return;
    const key=t.dataset.priceLab;
    if(!Object.prototype.hasOwnProperty.call(priceLabParams,key))return;
    priceLabParams[key]=["durationSeconds","tapsPerSecond","levelOverride","factorOverride"].includes(key)?(t.value===""?null:Number(t.value)):t.value;
    priceLabReport=null;priceLabComparisons=null;renderPanel(true);return;
  }
  if(readOnly||store.blocked){render(true);return;}
  checkpoint();
  if(t.hasAttribute("data-auto-master")){
    resultDone(G.configureAutomationMaster(state,t.checked));return;
  }
  if(t.dataset.autoBuyKind!==undefined){
    const kind=t.dataset.autoBuyKind,field=t.dataset.autoField;
    if(!["enabled","priority","intervalSeconds"].includes(field))return;
    const value=field==="enabled"?t.checked:field==="intervalSeconds"?Number(t.value):t.value;
    resultDone(G.configureAutoPurchase(state,kind,{[field]:value}));return;
  }
  if(t.dataset.autoEngrave!==undefined){
    const field=t.dataset.autoEngrave;
    if(!["enabled","priority","mode","minReserve"].includes(field))return;
    const value=field==="enabled"?t.checked:t.value;
    resultDone(G.configureEngravingAutoBuy(state,{[field]:value}));return;
  }
  if(t.dataset.planField!==undefined){
    const field=t.dataset.planField;
    if(!["targetLevel","excluded"].includes(field))return;
    const value=field==="excluded"?t.checked:Number(t.value);
    resultDone(G.editPurchasePlan(state,t.dataset.planKind,t.dataset.planId,{[field]:value}));return;
  }
  if(t.dataset.autoConverge!==undefined){
    const field=t.dataset.autoConverge;
    if(!["enabled","mode","intervalSeconds","intervalMinutes","targetRunOrbs","minReward","minSteps"].includes(field))return;
    const value=field==="enabled"?t.checked:
      ["intervalSeconds","intervalMinutes","minSteps"].includes(field)?Number(t.value):t.value;
    const result=G.configureAutoConvergence(state,{[field]:value},Date.now());
    resultDone(result);return;
  }
  if(t.hasAttribute("data-auto-planet-enabled")){
    if(t.checked===state.universe.autoGenerate)return;
    resultDone(G.toggleAutoPlanet(state));return;
  }
  if(t.hasAttribute("data-auto-planet-reserve")){
    resultDone(G.setAutoPlanetReserve(state,Number(t.value)));return;
  }
  if(t.dataset.momentFilter!==undefined){
    state.settings.momentFilter=t.value;save();renderPanel(true);return;
  }
  if(t.dataset.pref){
    state.settings[t.dataset.pref]=t.type==="checkbox"?t.checked:t.value;applySettings();save();render(true);return;
  }
  if(t.dataset.direction!==undefined){
    if(readOnly||store.blocked){toast("読み取り専用です");renderPanel(true);return;}
    checkpoint();resultDone(G.setDirection(state,Number(t.dataset.direction),t.checked));return;
  }
  if(t.dataset.weight!==undefined){
    if(readOnly||store.blocked){toast("読み取り専用です");renderPanel(true);return;}
    checkpoint();
    if(!G.setWeight(state,Number(t.dataset.weight),Number(t.value))){toast("選択中の方向のみ配分できます");renderPanel(true);return;}
    save();render(true);return;
  }
  if(t.id==="planetSelect"){state.universe.selectedPlanetId=t.value;save();render(true);return;}
  if(t.id==="autoReserveSelect"){resultDone(G.setAutoPlanetReserve(state,Number(t.value)),"最低保有量を変更しました");return;}
  if(t.id==="interferencePartner"){interferencePartnerId=t.value;renderPanel(true);return;}
  if(t.id==="autoConvergeThreshold"){resultDone(G.configureAutoConvergence(state,{minReward:t.value}),"自動収束の最低報酬を変更しました");return;}
  if(t.id==="autoConvergeMinSteps"){resultDone(G.configureAutoConvergence(state,{minSteps:Number(t.value)}),"自動収束の最低段階を変更しました");return;}
  if(t.id==="receiptSelect"&&mode==="lab"){
    if(state.universe.planets.some(p=>Object.values(p.pendingResources).some(x=>A(x).cmp(0)>0))){
      toast("保留報酬があるため、先に現在方式で崩壊を確認してください。");renderPanel(true);return;
    }
    state.universe.receiptMode=t.value||null;save();render(true);return;
  }
});
document.addEventListener("input",e=>{lastInteraction=Date.now();if(e.target.id==="importText")importDraft=e.target.value;
  if(e.target.id==="momentSearch"){momentSearch=e.target.value.slice(0,60);refreshMomentVisibility();}
});
function hidePage(){
  stopHoldPurchase(null,true);
  if(!state||readOnly||store.blocked)return;
  const now=Date.now();
  if($("confirmDialog").open)state.lastWall=now;else G.advance(state,now,{offline:false});
  hiddenAt=now;state.boost.active=false;
  save();
}
document.addEventListener("visibilitychange",()=>{
  if(document.hidden)hidePage();
  else if(state&&!readOnly&&!store.blocked){
    const now=Date.now();hiddenAt=null;lastFrame=now;
    settleOfflineAndPersist(now);
    render(true);
  }
});
window.addEventListener("pagehide",()=>{hidePage();lockRelease?.();lockRelease=null;});
window.addEventListener("pageshow",async e=>{
  if(e.persisted){await acquireLock();if(!readOnly){const loaded=store.load();state=loaded.state;if(!store.blocked)settleOfflineAndPersist(Date.now());render(true);}}
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
state=loaded.state;storageUnavailable=storageFallback||!!loaded.storageUnavailable;
currentSub=state.settings.existenceLastTab||"moment";
if(loaded.warning)showNotice(loaded.warning,{autoDismiss:!loaded.blocked&&!loaded.storageUnavailable});
if(readOnly)showNotice("ほかのタブがプレイ中のため閲覧専用です。そのタブを閉じてから再読み込みしてください。");
if(!readOnly&&!store.blocked){
  settleOfflineAndPersist(Date.now(),{snapshot:true});
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
