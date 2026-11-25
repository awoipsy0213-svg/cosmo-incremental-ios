import {createState,validateState,migrateLegacy,isCompact} from "./game.mjs";
import {CONFIG} from "./balance-config.mjs";

export const KEYS={
  normal:"kotowari_v31_normal",
  compact:"kotowari_v31_compact_v1",
  lab:"kotowari_v31_lab",
  legacy:"cosmo_incremental_v01",
  legacyTest:"cosmo_incremental_test_v12",
  legacyArchive:"kotowari_v31_legacy_archive"
};
export function checksum(text){
  // Accidental corruption detection, NOT tamper resistance / authentication.
  let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16).padStart(8,"0");
}
export function encode(state,writer=""){
  const data=validateState(state,state.mode),body=JSON.stringify(data);
  return JSON.stringify({kind:"kotowari-save",version:31,checksum:checksum(body),writer,data});
}
export function decode(text,mode=null,compact=null){
  const checked=input=>{const state=validateState(input,mode);if(compact!==null&&isCompact(state)!==compact)throw Error("新経済版と旧版のセーブは混ぜられません");return state;};
  if(typeof text!=="string"||text.length>4*1024*1024)throw Error("セーブが大きすぎるか、形式が不正です");
  const box=JSON.parse(text);
  if(box.kind==="kotowari-save"||box.kind==="kotowari-backup-v31"){
    const body=JSON.stringify(box.data);
    if(checksum(body)!==box.checksum)throw Error("セーブの破損を検出しました");
    return checked(box.data);
  }
  if(box.schemaVersion===31)return checked(box);
  throw Error("Ver.3.1のセーブではありません");
}
export class SaveStore {
  constructor(storage,mode="normal",writer="tab-"+Math.random().toString(36).slice(2),{compact=false}={}){
    if(compact&&mode!=="normal")throw Error("モード不正");
    this.storage=storage;this.mode=mode;this.compact=compact;this.key=KEYS[compact?"compact":mode];this.writer=writer;
    this.expectedRevision=0;this.lastSnapshot=0;this.lastError="";this.blocked=false;
    this.legacyArchive=null;
  }
  read(key){return this.storage.getItem(key);}
  assertEconomy(state){if(isCompact(state)!==this.compact||state.mode!==this.mode)throw Error("異なるゲーム版のデータです");}
  load(now=Date.now()){
    let raw;
    try {raw=this.read(this.key);}
    catch(e){this.lastError=e.message;return {state:createState(now,this.mode,this.compact),warning:"端末への保存を利用できません。バックアップを書き出してください。",storageUnavailable:true};}
    if(raw){
      try{
        const s=decode(raw,this.mode,this.compact);this.expectedRevision=s.revision||0;
        // Preserve an untouched pre-v3.8 snapshot before first migration to 30 slots.
        // If backup cannot be verified, block writes rather than risking the sole save.
        const oldShape=JSON.parse(raw).data??JSON.parse(raw);
        // v3.50: archive the exact prior save before introducing cumulative
        // high-precision residues and legacy purchase-level compatibility data.
        if(oldShape.time && oldShape.time.growth===undefined){
          const key=this.key+".before-v350-time-growth";
          try{
            if(!this.read(key))this.storage.setItem(key,raw);
            if(this.read(key)!==raw)throw Error("time-growth backup verification mismatch");
          }catch(error){
            this.blocked=true;
            return {state:s,blocked:true,
              warning:"累計残滓導入前のセーブ原本を退避できません。上書きを停止しました。"};
          }
        }
        if(oldShape.boost?.trialLevels===undefined||oldShape.engraving?.trialLevels===undefined){
          const key=this.key+".before-v330-playtest";
          try{
            if(!this.read(key))this.storage.setItem(key,raw);
            if(this.read(key)!==raw)throw Error("v330 copy mismatch");
          }catch(e){
            this.blocked=true;
            return {state:s,blocked:true,warning:"試験強化導入前のセーブ原本を退避できません。上書きを停止しました。"};
          }
        }
        // DEC-20261122-002/003: preserve the exact source before recording
        // verified run earnings or new permanent engraving levels.
        if(oldShape.runOrbsEvidence===undefined||oldShape.engraving?.levels===undefined){
          const key=this.key+".before-v329-earned-engraving";
          try{
            if(!this.read(key))this.storage.setItem(key,raw);
            if(this.read(key)!==raw)throw Error("original backup mismatch");
          }catch(error){
            this.blocked=true;
            return {state:s,blocked:true,warning:"周回獲得履歴・刻印移行前の原本退避に失敗しました。旧セーブを保護し上書きを停止しています。"};
          }
        }
        // Engraving A-D v333: before adding persistent automation credit/threshold
        // and effect-bearing levels, retain the exact prior bytes. If storage is
        // unavailable, block writes rather than silently rewriting the only save.
        if(oldShape.engraving &&
           (oldShape.engraving.runtime===undefined ||
            oldShape.engraving.autoConverge?.minSteps===undefined)){
          const key=this.key+".before-v333-engraving-effects";
          try{
            if(!this.read(key))this.storage.setItem(key,raw);
            if(this.read(key)!==raw)throw Error("v333 archive verification mismatch");
          }catch(error){
            this.blocked=true;
            return {state:s,blocked:true,
              warning:"刻印25効果導入前のセーブ原本を退避できません。既存データの上書きを停止しています。"};
          }
        }
        // v3.42: exact backup before persisting new automation and
        // current-run purchased-level evidence. Legacy saved levels are
        // never back-filled from visible moment/source totals.
        if(oldShape.engraving&&(
          oldShape.engraving.runPurchases===undefined||
          oldShape.engraving.autoEngraving===undefined||
          oldShape.engraving.presetSystem===undefined)){
          const key=this.key+".before-v342-engraving-automation";
          try{
            if(!this.read(key))this.storage.setItem(key,raw);
            if(this.read(key)!==raw)throw Error("v342 original backup mismatch");
          }catch(error){
            this.blocked=true;
            return {state:s,blocked:true,
              warning:"刻印の自動化・継承機能の導入前に原本を退避できません。旧セーブを保護し書き込みを停止しています。"};
          }
        }
        // BOOST-CORE-004/Q469/499/501: save a byte-for-byte backup BEFORE
        // normalizing old active flags and preserving balances above capacity.
        // A failed backup blocks all writes to the only original save.
        if(oldShape.boost&&oldShape.boost.timeOnlyMigration===undefined){
          const key=this.key+".before-v327-time-only";
          try{
            if(!this.read(key))this.storage.setItem(key,raw);
            if(!this.read(key))throw Error("original v327 backup not persisted");
            // Never overwrite a previous archived source with a newer version.
          }catch(e){
            this.blocked=true;
            return {state:s,blocked:true,warning:"BOOST時間倍率への移行前バックアップに失敗しました。旧残高・旧設定を上書きせず保護しています。"};
          }
        }
        if(this.mode==="normal" && !oldShape.momentRuntime){
          const key=this.key+".before-setsuna38";
          try {
            if(!this.read(key))this.storage.setItem(key,raw);
            if(!this.read(key))throw Error("backup not persisted");
          }catch(e){
            this.blocked=true;
            return {state:s,blocked:true,warning:"Ver.3.8への移行前バックアップを保存できません。元のデータを保護し、書き込みを停止しています。"};
          }
        }
        // v3.9 snapshots protect v3.8 saves even when momentRuntime exists.
        // Keep the original byte sequence, checksum, and writer for manual recovery.
        if(this.mode==="normal" && !Object.prototype.hasOwnProperty.call(oldShape.momentRuntime||{},"cycleTaps")){
          const key=this.key+".before-setsuna39";
          try{
            if(!this.read(key))this.storage.setItem(key,raw);
            if(this.read(key)!==raw)throw Error("backup write was not verified");
          }catch(e){
            this.blocked=true;
            return {state:s,blocked:true,warning:"Ver.3.9への移行前バックアップを検証できません。元のセーブを保護し、書き込みを停止しています。"};
          }
        }
        // v3.16 adds observation/core/auto-generation state without changing
        // the v31 save schema or key. Keep the untouched original bytes before
        // the first write; never silently migrate the only recoverable copy.
        if(this.mode==="normal"&&(
          oldShape.time?.miracles===undefined||
          oldShape.universe?.knowledge===undefined||
          oldShape.universe?.autoGenerate===undefined||
          (oldShape.universe?.planets||[]).some(p=>p.core===undefined)
        )){
          const key=this.key+".before-v316";
          try{
            if(!this.read(key))this.storage.setItem(key,raw);
            if(this.read(key)!==raw)throw Error("backup write was not verified");
          }catch(e){
            this.blocked=true;
            return {state:s,blocked:true,warning:"Ver.3.16への移行前バックアップを検証できません。元セーブを保護し、書き込みを停止しました。"};
          }
        }
        // A v3.16 save gains permanent ENG-01..ENG-30 ownership and equipment.
        // Never rewrite the sole existing save until a byte-perfect copy exists.
        if(this.mode==="normal"&&(
          oldShape.engraving?.owned===undefined||
          oldShape.engraving?.equipped===undefined||
          oldShape.engraving?.autoConverge===undefined
        )){
          const key=this.key+".before-v317";
          try{
            if(!this.read(key))this.storage.setItem(key,raw);
            if(this.read(key)!==raw)throw Error("backup not verified");
          }catch(error){
            this.blocked=true;
            return {state:s,blocked:true,warning:"Ver.3.17への移行前バックアップを検証できません。元セーブを保護し、書き込みを停止しました。"};
          }
        }
        // v3.18 stores interference timers and selected transfers separately.
        // Keep old progress byte-for-byte before adding a new state field.
        if(this.mode==="normal"&&oldShape.universe?.interference===undefined){
          const key=this.key+".before-v318";
          try{
            if(!this.read(key))this.storage.setItem(key,raw);
            if(this.read(key)!==raw)throw Error("backup verification failed");
          }catch(e){
            this.blocked=true;
            return {state:s,blocked:true,warning:"Ver.3.18移行前の元データ退避に失敗しました。既存セーブは上書きせず保護しています。"};
          }
        }
        // v3.19 adds bounded online samples, offline/convergence history and
        // per-planet resource investment counts. Never rewrite a sole v3.18 save.
        if(this.mode==="normal"&&(
          oldShape.telemetry===undefined||
          (oldShape.universe?.planets||[]).some(p=>p.evidence?.investmentsByResource===undefined)
        )){
          const key=this.key+".before-v319";
          try{
            if(!this.read(key))this.storage.setItem(key,raw);
            if(this.read(key)!==raw)throw Error("backup verification failed");
          }catch(e){
            this.blocked=true;
            return {state:s,blocked:true,warning:"Ver.3.19の統計移行前に元のセーブを退避できませんでした。既存データを守るため書き込みを停止しています。"};
          }
        }
        // v3.37 adds a global automation pause without changing individual
        // switches, purchase credits or the schema. Preserve exact old bytes.
        if(this.mode==="normal"&&oldShape.settings?.automationEnabled===undefined){
          const key=this.key+".before-v337-automation-master";
          try{
            if(!this.read(key))this.storage.setItem(key,raw);
            if(this.read(key)!==raw)throw Error("global automation backup mismatch");
          }catch(error){
            this.blocked=true;
            return {state:s,blocked:true,
              warning:"自動化の共通設定追加前のセーブ原本を退避できません。上書きを停止しています。"};
          }
        }
        return {state:s};
      }catch(error){
        // I-31/I-34: broken or incompatible current saves must remain untouched.
        // Never silently replace the user's latest progress with an older snapshot.
        this.blocked=true;
        this.lastError=String(error?.message||error);
        let quarantined=false;
        try{
          const key=this.key+".corrupt";
          if(!this.read(key))this.storage.setItem(key,raw);
          quarantined=this.read(key)===raw;
        }catch(e){/* Original bytes are still intact under this.key. */}
        const candidates=this.backups().filter(b=>{
          try{decode(b.raw,this.mode,this.compact);return true;}catch(e){return false;}
        }).length;
        const details=candidates?
          "検証可能な保存履歴が"+candidates+"件あります。復元内容を選んで明示的に復元してください。":
          "読み込み可能な保存履歴がありません。元データを外部へ書き出してください。";
        return {state:createState(now,this.mode,this.compact),blocked:true,recoverableBackups:candidates,
          warning:"主セーブを読み込めません。元データは上書きせず保護しています。"+
            (quarantined?"元データの別コピーも保存しました。":"")+
            details};
      }
    }
    if(this.compact)return {state:createState(now,"normal",true)};
    if(this.mode==="lab"){
      try{
        const normal=this.read(KEYS.normal);
        if(normal){
          const s=decode(normal,"normal",false);s.mode="lab";s.revision=0;s.lastWall=now;
          s.boost.active=false;s.engraving.draft=null;
          return {state:s,warning:"通常データのコピーから検証用セーブを開始しました。通常データには反映されません。"};
        }
      }catch(e){}
      return {state:createState(now,"lab")};
    }
    try{
      const old=this.read(KEYS.legacy);
      if(old){
        const data=JSON.parse(old),boost=JSON.parse(this.read("kotowari_boost_v1")||"null");
        const state=migrateLegacy(data,now,boost);
        // Snapshot before migration; source keys remain untouched.
        const archive={at:now,raw:old,boost:this.read("kotowari_boost_v1")};
        if(!this.read(KEYS.legacyArchive))this.storage.setItem(KEYS.legacyArchive,JSON.stringify(archive));
        this.legacyArchive=archive;
        return {state,migrated:true,warning:"旧セーブから移行しました。星屑など対応未決定の値は旧版に保管し、旧キーを変更していません。"};
      }
    }catch(error){
      this.blocked=true;
      return {state:createState(now,"normal"),blocked:true,warning:"旧セーブの読取・退避ができません。安全のため、新規セーブによる上書きを止めています。"};
    }
    return {state:createState(now,"normal")};
  }
  write(state,{snapshot=false}={}){
    this.assertEconomy(state);
    if(this.blocked)throw Error("破損した元セーブを保護中です");
    const current=this.read(this.key);
    if(current){
      const other=JSON.parse(current);
      const otherRev=other.data?.revision||0;
      if(other.writer!==this.writer&&otherRev>this.expectedRevision)throw Error("別タブの新しい保存を検出しました。この画面からは上書きしません。");
    }
    const previousRevision=state.revision||0;
    state.revision=Math.max(previousRevision,this.expectedRevision)+1;
    let text;
    // U-32: atomic primary save must not be treated as failed merely because
    // an optional snapshot could not fit into localStorage.
    try{
      text=encode(state,this.writer);
      this.storage.setItem(this.key,text);
      if(this.storage.getItem(this.key)!==text)throw Error("保存した内容を確認できません");
    }catch(e){
      state.revision=previousRevision;this.lastError=e.message;throw e;
    }
    this.expectedRevision=state.revision;this.lastError="";
    const now=Date.now();
    if(snapshot||(now-this.lastSnapshot>600000&&now-(this.lastBackupAttempt||0)>60000)){
      this.lastBackupAttempt=now;
      try{
        const list=this.backups();
        list.unshift({at:now,raw:text});
        const history=JSON.stringify(list.slice(0,3));
        this.storage.setItem(this.key+".backups",history);
        if(this.storage.getItem(this.key+".backups")!==history)
          throw Error("保存履歴を検証できません");
        this.lastSnapshot=now;
      }catch(e){
        this.lastError="保存履歴の更新に失敗しましたが、進捗本体は保存済みです："+e.message;
      }
    }
    return true;
  }
  backups(){
    try{
      const x=JSON.parse(this.read(this.key+".backups")||"[]");
      return Array.isArray(x)?x.filter(y=>y&&typeof y.raw==="string"&&Number.isFinite(y.at)).slice(0,3):[];
    }catch(e){return [];}
  }
  // Explicit backups and pre-reset snapshots never rotate out with the
  // ordinary three-generation history. Quota/corruption must stop replacement.
  protectedBackups(){
    const raw=this.read(this.key+".protected-backups");
    if(raw===null)return [];
    const rows=JSON.parse(raw);
    if(!Array.isArray(rows)||rows.some(x=>!x||typeof x.raw!=="string"||
      !Number.isFinite(x.at)||!["manual","reset"].includes(x.reason)))
      throw Error("保護バックアップ一覧が不正です。上書きしません。");
    return rows;
  }
  assertCurrentWriter(raw){
    if(raw===null)return;
    const other=JSON.parse(raw);
    const revision=(other.data??other).revision||0;
    if(other.writer!==this.writer&&revision>this.expectedRevision)
      throw Error("別タブの新しい保存を検出しました。この画面からは上書きしません。");
  }
  protect(state,reason="manual",now=Date.now()){
    this.assertEconomy(state);
    if(this.blocked)throw Error("元セーブを保護中です");
    if(!["manual","reset"].includes(reason)||!Number.isFinite(now)||now<0)
      throw Error("バックアップの指定が不正です");
    validateState(state,this.mode);
    const before=this.read(this.key);
    this.assertCurrentWriter(before);
    // Retain both the live state and original stored bytes if they differ.
    const raw=encode(state,this.writer);
    decode(raw,this.mode,this.compact);
    const entry={at:now,reason,raw};
    if(before!==null&&before!==raw)entry.originalRaw=before;
    const rows=this.protectedBackups();
    rows.push(entry);
    const history=JSON.stringify(rows),key=this.key+".protected-backups";
    this.storage.setItem(key,history);
    if(this.read(key)!==history)throw Error("保護バックアップを読み戻せません。元データを変更しません。");
    decode(this.protectedBackups().at(-1).raw,this.mode,this.compact);
    return {index:rows.length-1,entry,before};
  }
  reset(state,now=Date.now()){
    // Archive first; no deletion of primary keys, legacy or the other mode.
    const saved=this.protect(state,"reset",now);
    if(this.read(this.key)!==saved.before)throw Error("別タブで保存が変化しました。リセットを中止します。");
    const next=createState(now,this.mode,this.compact);
    const oldRev=saved.before===null?0:(JSON.parse(saved.before).data??JSON.parse(saved.before)).revision||0;
    next.revision=Math.max(state.revision||0,this.expectedRevision,oldRev)+1;
    const encoded=encode(next,this.writer);
    let primaryWritten=false;
    try{
      this.storage.setItem(this.key,encoded);
      primaryWritten=true;
      if(this.read(this.key)!==encoded)throw Error("初期セーブの読み戻しに失敗しました");
      decode(encoded,this.mode,this.compact);
    }catch(error){
      // localStorage setItem is atomic on failure. A failed post-write
      // read-back must block autosave, and the verified archive remains.
      if(primaryWritten){
        try{
          if(this.read(this.key)===encoded){
            if(saved.before!==null)this.storage.setItem(this.key,saved.before);
            else this.storage.removeItem(this.key);
          }
          if(this.read(this.key)!==saved.before)throw Error("元の保存を確認できません");
        }catch(recoveryError){this.blocked=true;}
      }
      throw error;
    }
    this.expectedRevision=next.revision;this.lastSnapshot=now;this.lastError="";
    return next;
  }
  restoreProtectedBackup(index,now=Date.now()){
    const row=this.protectedBackups()[index];
    if(!row)throw Error("保護バックアップが見つかりません");
    return this.import(row.raw,now);
  }
  export(state){
    this.assertEconomy(state);
    if(this.blocked)throw Error("元セーブ保護中です。未保存の仮データを通常バックアップとして出力できません");
    const data=validateState(state,this.mode);
    let legacy=null;
    try{if(this.mode==="normal"&&!this.compact)legacy=JSON.parse(this.read(KEYS.legacyArchive)||"null");}catch(e){}
    return JSON.stringify({kind:"kotowari-backup-v31",version:31,exportedAt:new Date().toISOString(),
      checksum:checksum(JSON.stringify(data)),data,legacyArchive:legacy},null,2);
  }
  import(text,now=Date.now()){
    let state,legacy=null;
    const parsed=JSON.parse(text);
    if(parsed.kind==="kotowari-save"||parsed.kind==="kotowari-backup-v31"||parsed.schemaVersion===31){
      state=decode(text,this.mode,this.compact);legacy=parsed.legacyArchive||null;
    }else{
      if(this.mode!=="normal"||this.compact)throw Error("旧版の移行は旧通常データで行ってください");
      if(parsed.mode==="test")throw Error("旧版のテストデータを通常データへ読み込むことはできません");
      state=migrateLegacy(parsed,now);
      legacy={at:now,raw:JSON.stringify(parsed.game||parsed),boost:parsed.boost?JSON.stringify(parsed.boost):null};
    }
    // Never grant offline progress on import/repeated re-import.
    state.lastWall=now;state.boost.active=false;state.engraving.draft=null;
    const before=this.read(this.key);
    if(!this.blocked)this.assertCurrentWriter(before);
    if(before){
      // Never overwrite the only pre-import copy. A second import keeps the
      // first snapshot and creates an additional timestamped recovery point.
      let key=this.key+".before-import";
      const prior=this.read(key);
      if(prior&&prior!==before)key=this.key+".before-import-"+now;
      const existing=this.read(key);
      if(existing&&existing!==before)throw Error("復元前バックアップの保存先が既に使用されています");
      if(existing!==before)this.storage.setItem(key,before);
      if(this.read(key)!==before)throw Error("復元前の元データを検証できません。復元を中止しました");
    }
    if(legacy&&this.mode==="normal"&&!this.compact)this.storage.setItem(KEYS.legacyArchive,JSON.stringify(legacy));
    let revision=0;
    try{revision=JSON.parse(before||"{}").data?.revision||0;}catch(e){}
    state.revision=Math.max(0,revision)+1;
    const encoded=encode(state,this.writer);
    this.storage.setItem(this.key,encoded);
    if(this.storage.getItem(this.key)!==encoded)throw Error("復元データの保存を確認できません");
    this.expectedRevision=state.revision;
    this.blocked=false;
    this.lastError="";
    try{
      const list=this.backups();list.unshift({at:now,raw:encoded});
      const history=JSON.stringify(list.slice(0,3));
      this.storage.setItem(this.key+".backups",history);
      if(this.read(this.key+".backups")!==history)throw Error("保存履歴の読み戻しに失敗しました");
      this.lastSnapshot=now;
    }catch(error){this.lastError="復元は保存済みですが履歴の更新に失敗しました："+error.message;}
    return state;
  }
  restoreBackup(index,now=Date.now()){
    const b=this.backups()[index];if(!b)throw Error("履歴が見つかりません");
    return this.import(b.raw,now);
  }
}
