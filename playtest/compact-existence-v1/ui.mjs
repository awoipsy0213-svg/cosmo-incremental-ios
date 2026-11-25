import {G} from "./engine.mjs";
(function ui(){
 const $=id=>document.getElementById(id),KEY="kotowari_compact_existence_trial_v1";
 let s=G.fresh(),tab="moment",mode="MAX",signature="",persist=true,last=performance.now(),gainUntil=0,saveAt=0,renderAt=0,paused=false;
 const warning=msg=>{$("warning").hidden=!msg;$("warning").textContent=msg||"";};
 try{const raw=localStorage.getItem(KEY);if(raw)s=G.decode(raw);}
 catch(e){persist=false;warning("試験データを読み込めません。原本は上書きしません。試験リセットで開始できます。");}
 function save(){if(!persist)return;try{const raw=G.encode(s);localStorage.setItem(KEY,raw);if(localStorage.getItem(KEY)!==raw)throw Error("readback");}catch(e){persist=false;warning("試験データを保存できません。通常版には影響しません。");}}
 const num=n=>n.toLocaleString("ja-JP");
 const money=(c,n,up=false)=>G.fmt(n,c.kind==="engraving",up);
 const name=c=>c.kind==="source"?"源"+String(c.i+1).padStart(2,"0")+(c.rank>=30?" ＋"+num(Math.floor(c.rank/30)):""):(c.kind==="moment"?G.M:G.E)[c.i][0];
 const desc=c=>c.kind==="source"?"実質グレード "+num(c.rank+1):(c.kind==="moment"?G.M:G.E)[c.i][1];
 const revealed=c=>!c.fresh||c.ready&&G.quote(s,c,"1").count>0;
 const list=kind=>G.cards(s,kind).sort((a,b)=>(b.fresh?1:0)-(a.fresh?1:0)||b.rank-a.rank);
 const create=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
 function makeCard(c){
  const row=create("article","card"),info=create("div","info"),head=create("div","heading");
  head.append(create("strong","name"),create("span","level"));info.append(head,create("div","effect"),create("div","meta"));
  const buy=create("button","buy");buy.dataset.buy=G.key(c);buy.append(create("strong","cost"),create("span","count"));
  row.dataset.card=G.key(c);row.append(info,buy);return row;
 }
 function updateCard(row,c){
  const vis=revealed(c),q=G.quote(s,c,c.breakthrough&&c.fresh?"1":mode),done=c.level===c.max;
  row.classList.toggle("new",!!c.fresh);row.classList.toggle("locked",!vis);
  row.querySelector(".name").textContent=vis?name(c):"？？？";
  row.querySelector(".level").textContent=vis?(c.kind==="engraving"&&G.E[c.i][3]==="feature"?(done?"解放済":"未取得"):"Lv."+num(c.level)+(c.kind==="source"?"/10,000":"")):"？？？";
  row.querySelector(".effect").textContent=vis?(c.fresh?desc(c):G.effect(s,c)):"？？？";
  row.querySelector(".meta").textContent=vis?(c.kind==="source"?(c.fresh&&c.breakthrough?"限界突破 · Lv1":done?"次の循環へ":("次の節目 "+num(G.marks.find(v=>v>c.level)||10000))):desc(c)):"次の解放";
  const b=row.querySelector(".buy");b.disabled=!vis||!q.count;
  row.querySelector(".cost").textContent=!vis?"？？？":done?"—":money(c,q.count?q.cost:G.cost(s,c,1),true);
  row.querySelector(".count").textContent=!vis?"？？？":done?(c.kind==="source"?"完成":"解放済"):c.fresh&&c.breakthrough?"限界突破":q.count?"購入 ×"+num(q.count):"購入 ×0";
  b.setAttribute("aria-label",!vis?"未解放":name(c)+(c.fresh&&c.breakthrough?"の限界突破":"を購入 "+num(q.count)+"Lv"));
 }
 function autoHTML(){
  const root=$("panel");
  const row=(label,feature,kind)=>{
    const open=G.own(s,feature),r=create("div","auto-row"+(open?"":" locked"));
    r.append(create("strong","",open?label:"？？？"));
    const select=create("select");select.dataset.order=kind;select.disabled=!open;select.setAttribute("aria-label",label+"購入順");
    for(const [v,t] of [["cheap","安い順"],["grade","高グレード順"]]){const o=create("option","",t);o.value=v;select.append(o);}
    select.value=s.settings.priority[kind];
    const cb=create("input");cb.type="checkbox";cb.dataset.toggle=kind;cb.checked=s.settings[kind];cb.disabled=!open;cb.setAttribute("aria-label",label+"自動購入");
    r.append(select,cb);root.append(r);
  };
  const master=create("div","auto-row master"),m=create("input");m.type="checkbox";m.dataset.toggle="master";m.checked=s.settings.master;m.setAttribute("aria-label","全体自動化");
  master.append(create("strong","","全体自動化"),m);root.append(master);
  row("刹那","momentAuto","moment");row("源","sourceAuto","source");row("刻印","engravingAuto","engraving");
  const open=G.own(s,"convergeAuto"),r=create("div","auto-row master"+(open?"":" locked")),cb=create("input");cb.type="checkbox";cb.dataset.toggle="converge";cb.checked=s.settings.converge;cb.disabled=!open;cb.setAttribute("aria-label","自動収束");
  r.append(create("strong","",open?"自動収束":"？？？"),cb);root.append(r);
  if(open){
   const c=create("div","auto-row condition"),select=create("select");select.dataset.condition="1";select.setAttribute("aria-label","収束条件");
   for(const [v,t] of [["time","時間（秒）"],["earned","累計獲得数"]]){const o=create("option","",t);o.value=v;select.append(o);}
   select.value=s.settings.condition;
   const input=create("input");input.dataset.threshold="1";input.type="text";input.inputMode="decimal";input.setAttribute("aria-label",s.settings.condition==="time"?"秒数":"累計獲得数");
   input.value=s.settings.condition==="time"?String(s.settings.seconds):s.settings.target===G.Z?"0":"1e"+Math.floor(s.settings.target);
   if(s.settings.condition==="earned"&&Number.isFinite(s.settings.target)){const e=Math.floor(s.settings.target);input.value=String(Number((10**(s.settings.target-e)).toPrecision(12)))+"e"+e;}
   c.append(select,input);root.append(c);
  }
 }
 function render(force=false){
  $("orbs").textContent=G.fmt(s.orbs);$("existence").textContent=G.fmt(G.add(0,s.existence),true);$("production").textContent=G.fmt(G.production(s));
  $("tapRate").textContent="タップ目安 "+G.fmt(G.expectedTap(s));$("combo").textContent="連撃 "+num(s.combo)+" · 自動 "+G.autoRate(s).toFixed(2)+"/秒";
  $("unlockLabel").textContent=s.sourceUnlocked?"源 解放済み":"？？？解放まで "+G.fmt(G.sub(6,s.runEarned),false,true);
  $("unlockProgress").value=s.sourceUnlocked?100:100*(s.runEarned===G.Z?0:10**(s.runEarned-6));
  const q=G.convergenceQuote(s);$("converge").disabled=!q.steps;$("convergenceLabel").textContent=q.steps?"収束 +"+G.fmt(q.reward,true)+" 存在":"？？？";
  $("convergenceProgress").textContent=q.steps?"当周回獲得 "+G.fmt(s.runEarned)+" · "+num(q.steps)+"段階":"初回100万オーブで収束可能";
  for(const b of $("tabs").querySelectorAll("button")){
   const k=b.dataset.tab;b.textContent=k==="source"?(s.sourceUnlocked?"源":"？？？"):k==="engraving"?(s.engravingUnlocked?"刻印":"？？？"):k==="moment"?"刹那":"自動化";
   b.setAttribute("aria-pressed",String(tab===k));b.disabled=k==="source"&&!s.sourceUnlocked||k==="engraving"&&!s.engravingUnlocked;
  }
  if(tab==="source"&&!s.sourceUnlocked||tab==="engraving"&&!s.engravingUnlocked)tab="moment";
  $("toolbar").hidden=tab==="auto";$("mode").textContent=mode;$("priority").textContent=s.settings.priority[tab]==="cheap"?"安い順":"高グレード順";
  $("bulk").disabled=!G.own(s,"bulk");
  if(tab==="auto"){
   const sig="auto:"+["momentAuto","sourceAuto","engravingAuto","convergeAuto"].map(k=>G.own(s,k)).join(":")+":"+s.settings.condition;
   if(force||signature!==sig){$("panel").replaceChildren();autoHTML();signature=sig;}return;
  }
  const rows=list(tab),sig=tab+":"+rows.map(c=>G.key(c)).join(",");
  if(force||signature!==sig){
   const root=$("panel"),priorTop=signature.startsWith(tab+":")?root.scrollTop:0;
   root.replaceChildren();
   if(tab==="engraving"){
    const next=rows.find(c=>c.fresh);if(next){root.append(create("div","section-label","次の解放"),makeCard(next));}
    for(const [type,label] of [["growth","数値強化"],["feature","機能解放"]]){
      const items=rows.filter(c=>!c.fresh&&G.E[c.i][3]===type);if(items.length){root.append(create("div","section-label",label));items.forEach(c=>root.append(makeCard(c)));}
    }
   }else rows.forEach(c=>root.append(makeCard(c)));
   root.scrollTop=priorTop;signature=sig;
  }
  const nodes=new Map([...$("panel").querySelectorAll("[data-card]")].map(n=>[n.dataset.card,n]));
  for(const c of rows)updateCard(nodes.get(G.key(c)),c);
 }
 function act(fn,force=false){
  try{fn();save();render(force);}
  catch(e){warning(String(e.message||e));}
 }
 $("orb").addEventListener("click",()=>act(()=>{const r=G.tap(s);$("gain").textContent=(r.critical?"会心 ":"")+(r.reflected?"反響 ":"")+"+"+G.fmt(r.gain);$("gain").classList.toggle("critical",r.critical);gainUntil=performance.now()+900;}));
 $("tabs").addEventListener("click",e=>{const b=e.target.closest("[data-tab]");if(b&&!b.disabled){tab=b.dataset.tab;signature="";render(true);}});
 $("mode").addEventListener("click",()=>{const modes=["1","10","NEXT","MAX"];mode=modes[(modes.indexOf(mode)+1)%modes.length];render();});
 $("priority").addEventListener("click",()=>act(()=>{s.settings.priority[tab]=s.settings.priority[tab]==="cheap"?"grade":"cheap";}));
 $("bulk").addEventListener("click",()=>act(()=>{if(G.own(s,"bulk")&&tab!=="auto")G.buyAll(s,tab,s.settings.priority[tab]);}));
 $("panel").addEventListener("click",e=>{const b=e.target.closest("[data-buy]");if(!b||b.disabled)return;act(()=>{const c=G.cards(s,tab).find(c=>G.key(c)===b.dataset.buy);if(c){G.buy(s,b.dataset.buy,c.fresh&&c.breakthrough?"1":mode);}});});
 $("panel").addEventListener("change",e=>{const n=e.target;if(n.dataset.toggle){act(()=>{s.settings[n.dataset.toggle]=n.checked;if(n.dataset.toggle==="converge")s.autoAge=0;});}
 else if(n.dataset.order){act(()=>{s.settings.priority[n.dataset.order]=n.value;});}
 else if(n.dataset.condition){act(()=>{s.settings.condition=n.value;s.autoAge=0;},true);}
 else if(n.dataset.threshold){act(()=>{if(s.settings.condition==="time"){const value=Number(n.value);if(!Number.isFinite(value)||value<.1)throw Error("0.1秒以上を入力してください");s.settings.seconds=value;}else{const value=G.parse(n.value);if(value===G.Z)throw Error("正の獲得数を入力してください");s.settings.target=value;}s.autoAge=0;},true);}});
 $("converge").addEventListener("click",()=>act(()=>G.converge(s)));
 $("grantButton").addEventListener("click",()=>act(()=>G.grant(s,$("grantKind").value,$("grantValue").value)));
 $("reset").addEventListener("click",()=>{if(confirm("独立試験版だけを初期化します。通常版は変更しません。")){s=G.fresh();persist=true;paused=false;signature="";tab="moment";warning("");save();render(true);}});
 document.addEventListener("visibilitychange",()=>{last=performance.now();if(document.hidden)save();});
 window.addEventListener("pagehide",save);
 setInterval(()=>{
   const now=performance.now(),dt=Math.min(.25,Math.max(0,(now-last)/1000));last=now;if(document.hidden||paused)return;
   try{G.tick(s,dt);if(gainUntil&&now>gainUntil){$("gain").textContent="";gainUntil=0;}
    if(now-renderAt>=200){render();renderAt=now;}if(now-saveAt>=2000){save();saveAt=now;}
   }catch(e){paused=true;warning("試験処理を停止しました："+String(e.message||e));save();}
 },100);
 render(true);
})();
