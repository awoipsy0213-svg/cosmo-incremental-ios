import {createState,validateState,migrateLegacy} from "./game.mjs";
import {CONFIG} from "./balance-config.mjs";

export const KEYS={
  normal:"kotowari_v31_normal",
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
export function decode(text,mode=null){
  if(typeof text!=="string"||text.length>4*1024*1024)throw Error("セーブが大きすぎるか、形式が不正です");
  const box=JSON.parse(text);
  if(box.kind==="kotowari-save"||box.kind==="kotowari-backup-v31"){
    const body=JSON.stringify(box.data);
    if(checksum(body)!==box.checksum)throw Error("セーブの破損を検出しました");
    return validateState(box.data,mode);
  }
  if(box.schemaVersion===31)return validateState(box,mode);
  throw Error("Ver.3.1のセーブではありません");
}
export class SaveStore {
  constructor(storage,mode="normal",writer="tab-"+Math.random().toString(36).slice(2)){
    this.storage=storage;this.mode=mode;this.key=KEYS[mode];this.writer=writer;
    this.expectedRevision=0;this.lastSnapshot=0;this.lastError="";this.blocked=false;
    this.legacyArchive=null;
  }
  read(key){return this.storage.getItem(key);}
  load(now=Date.now()){
    let raw;
    try {raw=this.read(this.key);}
    catch(e){this.lastError=e.message;return {state:createState(now,this.mode),warning:"端末への保存を利用できません。バックアップを書き出してください。",storageUnavailable:true};}
    if(raw){
      try{
        const s=decode(raw,this.mode);this.expectedRevision=s.revision||0;
        // Preserve an untouched pre-v3.8 snapshot before first migration to 30 slots.
        // If backup cannot be verified, block writes rather than risking the sole save.
        const oldShape=JSON.parse(raw).data??JSON.parse(raw);
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
        return {state:s};
      }catch(error){
        // Quarantine original bytes and do not silently overwrite invalid data.
        try{this.storage.setItem(this.key+".corrupt",raw);}catch(e){}
        const backups=this.backups();
        for(const b of backups){
          try{const s=decode(b.raw,this.mode);this.expectedRevision=s.revision||0;
            // A restore is explicit in the returned message, original corrupt bytes preserved.
            this.storage.setItem(this.key,b.raw);
            return {state:s,warning:"主セーブの破損を検出し、保存履歴から復旧しました。破損前のデータも別に保管しています。"};
          }catch(e){}
        }
        this.blocked=true;
        return {state:createState(now,this.mode),warning:"セーブを読めません。元データは上書きせず保護中です。「保存」からバックアップを読み込んでください。",blocked:true};
      }
    }
    if(this.mode==="lab"){
      try{
        const normal=this.read(KEYS.normal);
        if(normal){
          const s=decode(normal,"normal");s.mode="lab";s.revision=0;s.lastWall=now;
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
    if(this.blocked)throw Error("破損した元セーブを保護中です");
    const current=this.read(this.key);
    if(current){
      const other=JSON.parse(current);
      const otherRev=other.data?.revision||0;
      if(other.writer!==this.writer&&otherRev>this.expectedRevision)throw Error("別タブの新しい保存を検出しました。この画面からは上書きしません。");
    }
    const previousRevision=state.revision||0;
    state.revision=Math.max(previousRevision,this.expectedRevision)+1;
    try{
      const text=encode(state,this.writer);
      this.storage.setItem(this.key,text);
      if(this.storage.getItem(this.key)!==text)throw Error("保存した内容を確認できません");
      this.expectedRevision=state.revision;this.lastError="";
      if(snapshot||Date.now()-this.lastSnapshot>600000){
        const list=this.backups();
        list.unshift({at:Date.now(),raw:text});
        this.storage.setItem(this.key+".backups",JSON.stringify(list.slice(0,3)));
        this.lastSnapshot=Date.now();
      }
      return true;
    }catch(e){state.revision=previousRevision;this.lastError=e.message;throw e;}
  }
  backups(){
    try{
      const x=JSON.parse(this.read(this.key+".backups")||"[]");
      return Array.isArray(x)?x.filter(y=>y&&typeof y.raw==="string"&&Number.isFinite(y.at)).slice(0,3):[];
    }catch(e){return [];}
  }
  export(state){
    const data=validateState(state,this.mode);
    let legacy=null;
    try{legacy=JSON.parse(this.read(KEYS.legacyArchive)||"null");}catch(e){}
    return JSON.stringify({kind:"kotowari-backup-v31",version:31,exportedAt:new Date().toISOString(),
      checksum:checksum(JSON.stringify(data)),data,legacyArchive:legacy},null,2);
  }
  import(text,now=Date.now()){
    let state,legacy=null;
    const parsed=JSON.parse(text);
    if(parsed.kind==="kotowari-save"||parsed.kind==="kotowari-backup-v31"||parsed.schemaVersion===31){
      state=decode(text,this.mode);legacy=parsed.legacyArchive||null;
    }else{
      if(this.mode!=="normal")throw Error("旧版の移行は通常データで行ってください");
      if(parsed.mode==="test")throw Error("旧版のテストデータを通常データへ読み込むことはできません");
      state=migrateLegacy(parsed,now);
      legacy={at:now,raw:JSON.stringify(parsed.game||parsed),boost:parsed.boost?JSON.stringify(parsed.boost):null};
    }
    // Never grant offline progress on import/repeated re-import.
    state.lastWall=now;state.boost.active=false;state.engraving.draft=null;
    const before=this.read(this.key);
    if(before)this.storage.setItem(this.key+".before-import",before);
    if(legacy)this.storage.setItem(KEYS.legacyArchive,JSON.stringify(legacy));
    let revision=0;
    try{revision=JSON.parse(before||"{}").data?.revision||0;}catch(e){}
    state.revision=Math.max(0,revision)+1;
    const encoded=encode(state,this.writer);
    this.storage.setItem(this.key,encoded);
    if(this.storage.getItem(this.key)!==encoded)throw Error("復元データの保存を確認できません");
    this.expectedRevision=state.revision;
    this.blocked=false;
    const list=this.backups();list.unshift({at:now,raw:encoded});
    this.storage.setItem(this.key+".backups",JSON.stringify(list.slice(0,3)));
    this.lastSnapshot=now;this.lastError="";
    return state;
  }
  restoreBackup(index,now=Date.now()){
    const b=this.backups()[index];if(!b)throw Error("履歴が見つかりません");
    return this.import(b.raw,now);
  }
}
