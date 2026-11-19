import {BATTLE_LIMIT_SECONDS,createBattleManaState,advanceBattleMana} from './battle-rules.mjs';
import {STARTER_HERO_ID,createHeroProgression,ensureHeroProgression,grantHeroActionExperience,markHeroSoulPending,collectAllHeroSouls,awardRerollPointsForCollectedXP,grantExplorationBasicAbilityExperience,createLifeMemory,ensureLifeMemory,recordLifeAttempt,recordWalkAttempt,recordHeroWalkProgress,fadeLifeDangerWarnings} from './hero-progression.mjs';
import {ensureHeroRoster, registeredHeroIds} from './hero-roster.mjs';
// Soul World browser prototype: deterministic gameplay state. No real purchases or network.
export const VERSION = '0.2.6';
export const SAVE_KEY = 'soul_world_browser_proto_v001';
export const N = 5;
export const LIFETIME = 300;
export const SPAWN_SECONDS = 5;
export const TEST_BUILDINGS = {
  storage: {label:'資材庫', costs:{wood:6}, info:'木材・石材の容量を各50にする', hp:35, work:18},
  foodstore: {label:'食料庫', costs:{wood:4}, info:'食料の容量を50にする', hp:30, work:14},
  subTown: {label:'サブタウン', costs:{wood:4,stone:8}, info:'サブ収容枠を5増やす（試験値）', hp:55, work:35},
  temple: {label:'神殿', costs:{wood:3,stone:5}, info:'魂の経験を受け取る', hp:40, work:24},
  training: {label:'訓練場', costs:{wood:6,stone:4}, info:'戦闘・守備訓練の場所', hp:30, work:28},
  bowgun: {label:'ボウガン', costs:{wood:7,stone:6}, info:'PvE初回クリア後に解放', hp:30, work:26}
};
export const ACTIONS = ['環境','戦闘','拠点','自由'];
export const SKILLS = {wood:'伐採',stone:'採掘',food:'農業',build:'建築',swim:'水泳',fight:'戦闘',pray:'祈り'};
export function tileAt(s, x,z){return s.tiles.find(t=>t.x===x&&t.z===z)}
export function rand(s){s.seed=(Math.imul(1664525,s.seed>>>0)+1013904223)>>>0;return s.seed/4294967296}
export function event(s,text){s.log.unshift({id:++s.eventSeq,t:Math.floor(s.time),text});s.log=s.log.slice(0,75)}
export function buildTiles(){const a=[];for(let z=0;z<5;z++)for(let x=0;x<5;x++)a.push({x,z,terrain:'grass',feature:null,quantity:0,regrow:0});for(const [x,z,feature,q] of [[0,0,'tree',8],[0,3,'tree',8],[4,0,'tree',8],[0,4,'tree',8],[4,4,'stone',8],[4,2,'stone',8],[1,4,'stone',8]]){const t=a.find(q=>q.x===x&&q.z===z);t.feature=feature;t.quantity=q}return a}
export function createInitialState(){const s={schema:1,saveFormatRevision:3,version:VERSION,seed:5291432,time:0,activity:0,stage:'base',stageSeconds:0,baseSeconds:0,raidNext:180,trashNext:900,raid:null,trash:null,battle:null,firstBattle:false,blueprints:{bowgun:false},eventSeq:0,actorSeq:0,buildSeq:4,heroProgression:createHeroProgression(),progressionEconomy:{rerollPoints:0,rerollXpCarry:0},offlineClaimAt:0,saveSeq:0,resources:{wood:0,stone:0,food:10,meat:0,hide:0,gem:0},cargo:{wood:0,stone:0,meat:0,hide:0},temple:{pending:{},totalCollected:0},worldXP:{},familiarity:{main:0,sub:0},command:{environment:2,combat:0,home:2,free:1},mainJob:'free',respawnMain:0,respawnSub:0,actors:[],effects:[],log:[],tiles:buildTiles(),exploreTiles:EXPLORATION_NODES.map(x=>({...x})),buildings:[{id:1,type:'mainTown',x:1,z:1,progress:1,hp:80},{id:2,type:'heroHouse',x:3,z:3,progress:1,hp:60},{id:3,type:'garden',x:3,z:1,progress:1,hp:40,harvest:12},{id:4,type:'temple',x:2,z:3,progress:1,hp:40}],settings:{speed:1,mute:false,quality:1},stats:{deaths:0,successes:0,raids:0,firstCross:false}};spawnOne(s,'main');ensureHeroRoster(s);s.respawnSub=5;event(s,'世界が生まれました。サブは5秒ごとに誕生します。');event(s,'木材を6個集めたら、資材庫を建てられます。');return s}
export function ensureStarterTempleInstalled(s){if(!s.buildings.some(b=>b.type==='temple')){const preferred=[[2,3],[2,1],[2,2],[1,2],[3,2]];const positions=[...preferred,...s.tiles.map(t=>[t.x,t.z])];const spot=positions.find(([x,z])=>!s.buildings.some(b=>b.x===x&&b.z===z)&&s.tiles.some(t=>t.x===x&&t.z===z&&t.terrain==='grass'&&(!t.feature||t.quantity<=0)));if(!spot){s.needsTemplePlacement=true;return false;}const id=Math.max(s.buildSeq||0,...s.buildings.map(b=>b.id||0))+1;s.buildSeq=id;s.buildings.push({id,type:'temple',x:spot[0],z:spot[1],progress:1,hp:40});}return true}
export function cap(s,k){if(k==='food')return s.buildings.some(b=>b.type==='foodstore'&&b.progress>=1)?50:10;if(k==='wood'||k==='stone')return s.buildings.some(b=>b.type==='storage'&&b.progress>=1)?50:10;return 999}
export function canPay(s,costs){return Object.entries(costs).every(([k,v])=>(s.resources[k]||0)>=v)}
export function spend(s,costs){if(!canPay(s,costs))return false;for(const [k,v] of Object.entries(costs))s.resources[k]-=v;return true}
export function subCap(s){return 5+s.buildings.filter(b=>b.type==='subTown'&&b.progress>=1).length*5}
export function activeSubs(s){return s.actors.filter(a=>a.kind==='sub').length}
export function spawnOne(s,kind,heroId=STARTER_HERO_ID){
 const id=++s.actorSeq;
 const houseId=s.heroRoster && Object.entries(s.heroRoster.assignments||{}).find(([,id])=>id===heroId)?.[0];
 const house=kind==='main'?s.buildings.find(b=>String(b.id)===houseId):null;
 const start=kind==='main'?{x:house?.x??3,z:house?.z??3}:{x:1,z:1};
 const hero=kind==='main'?s.heroProgression?.profiles?.[heroId]:null;
 if(kind==='main'&&!hero)throw new Error('英雄の識別情報がありません');
 const life=hero?.fieldLife;
 const a={id,kind,x:start.x+.1*(rand(s)-.5),z:start.z+.1*(rand(s)-.5),
   target:null,job:'idle',phase:'idle',timer:0,
   age:life?.age??0,remaining:life?.remaining??LIFETIME,
   lastSkill:null,soul:life?.soul?structuredClone(life.soul):{},
   emote:'wake',emoteTime:1.4,face:'neutral',walk:life?.walk??0,
   petCooldown:0,stuck:0,mode:'free',
   heroId:kind==='main'?heroId:null,
   lifeMemory:life?.lifeMemory?structuredClone(life.lifeMemory):createLifeMemory()};
 s.actors.push(a);
 if(hero){hero.status='alive';hero.fieldLife=null;}
 s.effects.push({id:++s.eventSeq,type:'spawn',x:a.x,z:a.z,y:1.1,ttl:1.5});
 return a
}
export function synchronizeHeroActors(s){
 if(s.stage==='battle')return 0;
 const roster=ensureHeroRoster(s);
 const profiles=s.heroProgression.profiles;
 const assigned=new Set(Object.values(roster.assignments).filter(id=>profiles[id]?.status!=='pending_soul'));
 const alive=new Set();
 for(const actor of [...s.actors]){
   if(actor.kind!=='main')continue;
   const hero=profiles[actor.heroId];
   const valid=hero && assigned.has(actor.heroId) && !alive.has(actor.heroId);
   if(valid){alive.add(actor.heroId);hero.status='alive';continue;}
   if(hero&&hero.status!=='pending_soul'){
     hero.fieldLife={age:actor.age,remaining:actor.remaining,walk:actor.walk,
       soul:structuredClone(actor.soul||{}),lifeMemory:structuredClone(ensureLifeMemory(actor))};
     hero.status='ready';
   }
   s.actors.splice(s.actors.indexOf(actor),1);
 }
 let spawned=0;
 for(const id of assigned){
   if(!alive.has(id)){spawnOne(s,'main',id);spawned++;}
 }
 return spawned;
}
export function xpForLevel(level){if(level<=0)return 0;if(level===1)return 10;return Math.round(10*level+3*level*(level-1))} // TEST curve. Not the 1yr/3yr balance.
export function levelFromXP(xp){let i=0;while(i<100&&xp>=xpForLevel(i+1))i++;return i}
export function addSoul(a,skill,amt=1){if(!skill||amt<=0)return;a.soul[skill]=(a.soul[skill]||0)+amt;a.lastSkill=skill}
export function die(s,a,reason){if(!s.actors.includes(a))return false;ensureHeroProgression(s);if(reason==='drown'||reason==='lava')addSoul(a,reason==='drown'?'swim':(a.lastSkill||'swim'),1);else if(reason==='raid')addSoul(a,'fight',1);else if(reason==='accident'&&a.lastSkill)addSoul(a,a.lastSkill,1);for(const [skill,n] of Object.entries(a.soul)){s.temple.pending[skill]=(s.temple.pending[skill]||0)+n}a.soul={};if(a.kind==='main'){const hero=s.heroProgression.profiles[a.heroId||STARTER_HERO_ID];if(hero&&s.stage==='base'&&['drown','lava','accident','raid'].includes(reason)&&a.lastSkill)grantHeroActionExperience(hero,a.lastSkill,10,{success:false});markHeroSoulPending(s,a.heroId||STARTER_HERO_ID);if(hero)hero.fieldLife=null;}s.stats.deaths++;s.effects.push({id:++s.eventSeq,type:'soul',x:a.x,z:a.z,y:1.2,ttl:2.1});s.actors.splice(s.actors.indexOf(a),1);const delay=s.stage==='explore'?10:SPAWN_SECONDS;if(a.kind==='main')s.respawnMain=delay;else s.respawnSub=Math.max(s.respawnSub,delay);if(s.stats.deaths<5||s.stats.deaths%10===0)event(s,`${a.kind==='main'?'メイン':'サブ'}の魂が神殿へ還りました（${reason}）`);return true}
export function collectTemple(s){ensureHeroProgression(s);const pts=Object.entries(s.temple.pending).reduce((v,[,n])=>v+n,0);if(pts===0&&s.heroProgression.pendingSouls.length===0)return 0;for(const [k,n] of Object.entries(s.temple.pending))s.worldXP[k]=(s.worldXP[k]||0)+n;s.temple.pending={};s.temple.totalCollected+=pts;awardRerollPointsForCollectedXP(s,pts);const released=collectAllHeroSouls(s);if(s.stage!=='battle')synchronizeHeroActors(s);event(s,`神殿から${pts}Ptを世界へ還元しました`);s.effects.push({id:++s.eventSeq,type:'collect',x:2,z:2,y:1.5,ttl:2});return pts}
export function reserveBuild(s,type,x,z){const cfg=TEST_BUILDINGS[type];if(!cfg)return {ok:false,reason:'未実装の施設です'};if(type==='temple'&&s.buildings.some(b=>b.type==='temple'))return {ok:false,reason:'神殿はすでに設置されています'};if(type==='bowgun'&&!s.blueprints.bowgun)return {ok:false,reason:'最初のPvEで設計図を獲得してください'};if(!Number.isInteger(x)||!Number.isInteger(z)||x<0||z<0||x>=5||z>=5)return {ok:false,reason:'5×5の範囲外です'};if(s.buildings.some(b=>b.x===x&&b.z===z))return {ok:false,reason:'建物が置かれています'};const t=tileAt(s,x,z);if(t.terrain!=='grass'||t.feature&&t.quantity>0)return {ok:false,reason:'木・岩・特殊地形を取り除いてください'};if(!canPay(s,cfg.costs))return {ok:false,reason:'資源が不足しています'};spend(s,cfg.costs);s.buildings.push({id:++s.buildSeq,type,x,z,progress:0,hp:cfg.hp,work:cfg.work});event(s,`${cfg.label}の建築を予約しました`);return {ok:true}}
export function editTerrain(s,x,z,kind){const t=tileAt(s,x,z);if(!t||s.buildings.some(b=>b.x===x&&b.z===z))return {ok:false,reason:'建物のあるマスは変更できません'};if(t.feature&&t.quantity>0)return {ok:false,reason:'資源を先に採集してください'};if(!['grass','river','cliff','lava','pond'].includes(kind))return {ok:false,reason:'未対応の地形です'};t.terrain=kind;event(s,`地形を「${({grass:'草原',river:'川',cliff:'崖',lava:'溶岩',pond:'溜池'})[kind]}」に変更しました`);return {ok:true}}
export function assign(s,kind,delta){const k=({environment:'environment',combat:'combat',home:'home',free:'free'})[kind];if(!k)return;const all=Object.keys(s.command);if(delta>0){const donor=[...all].filter(p=>p!==k).sort((a,b)=>s.command[b]-s.command[a])[0];if(s.command[donor]<=0)return;s.command[donor]--;s.command[k]++}else if(delta<0){if(s.command[k]<=0)return;s.command[k]--;s.command.free++}s.actors.forEach(a=>{if(a.kind==='sub')a.target=null});}
export function claimOffline(s,now,prior){const elapsed=Math.max(0,Math.min(10*3600000,now-(Number(prior)||now)));const n=Math.floor(elapsed/3600000);if(n>0){s.resources.gem+=n;event(s,`オフライン報酬（試験用）${n}ジェムを受け取りました`)}s.offlineClaimAt=now;return n}
export function gotoStage(s,stage){if(!['base','explore','battle'].includes(stage))return false;ensureHeroProgression(s);ensureHeroRoster(s);if(stage==='battle'){startBattle(s);return true}if(s.stage==='explore'&&stage==='base'){for(const k of Object.keys(s.cargo)){let v=Math.min(s.cargo[k],Math.max(0,cap(s,k)-(s.resources[k]||0)));s.resources[k]=(s.resources[k]||0)+v;s.cargo[k]-=v}event(s,'キャラバンが帰還しました。荷物を倉庫に収納しました。')}s.stage=stage;s.stageSeconds=0;for(const a of s.actors){a.target=null;a.phase='idle';a.x=stage==='base'?(a.kind==='main'?3.1:1.1):2.1;a.z=stage==='base'?(a.kind==='main'?3.2:1.2):3.5}event(s,stage==='explore'?'探索先へ到着しました':'拠点へ戻りました');return true}
export function startBattle(s){const plannedHeroIds=registeredHeroIds(s);s.stage='battle';s.stageSeconds=0;s.battle={plannedHeroIds,elapsed:0,enemyHp:100,allyHp:100,enemyUnits:8,alliedDamage:0,enemyDamage:0,won:null,tactic:'attack',...createBattleManaState()};s.actors.forEach(a=>{a.target=null;a.x=1+rand(s);a.z=3.7});event(s,'PvE模擬戦開始：戦闘中は経験値を獲得しません');return s.battle}
export function completeBattle(s,won){if(!s.battle||s.battle.won!==null)return;s.battle.won=won;if(won){s.resources.stone=Math.min(cap(s,'stone'),s.resources.stone+4);s.resources.wood=Math.min(cap(s,'wood'),s.resources.wood+4);if(!s.firstBattle){s.firstBattle=true;s.blueprints.bowgun=true;event(s,'PvE初回クリア！ボウガン設計図を獲得しました')}else event(s,'PvE勝利。試験用資源を獲得しました')}else event(s,'PvEは敗北。育成した世界の経験は失われません')}
function chooseTarget(s,a){const home=s.stage==='base';const role=a.kind==='main'?s.mainJob:a.mode;const unfinished=home?s.buildings.find(b=>b.progress<1):null;const canGather=k=>s.stage==='explore'?Object.values(s.cargo).reduce((a,b)=>a+b,0)<20:s.resources[k]<cap(s,k);const targets=(s.stage==='explore'?s.exploreTiles:s.tiles).filter(t=>t.feature&&(t.quantity>0)&&((t.feature==='tree'&&canGather('wood'))||(t.feature==='stone'&&canGather('stone'))));const cro=home?s.buildings.find(b=>b.type==='garden'&&b.harvest<=0):null;let target=null,skill=null,job=null;if(unfinished&&(role==='home'||role==='free')){target={x:unfinished.x,z:unfinished.z,id:unfinished.id};skill='build';job='building'}else if(cro&&(role==='home'||role==='free')){target={x:cro.x,z:cro.z,id:cro.id};skill='food';job='farm'}else if(role==='combat'){const training=home?s.buildings.find(b=>b.type==='training'&&b.progress>=1):null;if(training){target={x:training.x,z:training.z,id:training.id};skill='fight';job='training'}}if(!target&&targets.length){const priority=role==='home'?'tree':null;const cand=targets.filter(t=>!priority||t.feature===priority);const pool=cand.length?cand:targets;const t=pool[Math.floor(rand(s)*pool.length)];target={x:t.x,z:t.z};skill=t.feature==='tree'?'wood':'stone';job=t.feature==='tree'?'wood':'stone'}if(!target&&home&&cro){target={x:cro.x,z:cro.z};skill='food';job='farm'}if(!target&&s.stage==='explore'){target={x:3+rand(s)*4,z:2+rand(s)*4};skill='swim';job='survey'}if(!target){a.phase='idle';a.timer=2+rand(s)*3;a.job='idle';return}a.target=target;a.lastSkill=skill;a.job=job;a.phase='move';a.timer=0}
export const EXPLORATION_NODES=(()=>{const arr=[];for(let z=0;z<7;z++)for(let x=0;x<9;x++){let kind='grass',feature=null,quantity=0;if((x===4&&z>1)||(x===5&&z===3))kind='river';if((x+3*z)%10===0&&kind!=='river'){feature='stone';quantity=12}if((2*x+z)%7===0&&kind!=='river'){feature='tree';quantity=12}arr.push({x,z,terrain:kind,feature,quantity,regrow:0})}return arr})();
function finishJob(s,a){const job=a.job;let skill=a.lastSkill;const home=s.stage==='base';const successBefore=s.stats.successes;if(job==='building'){const b=s.buildings.find(b=>b.id===a.target?.id&&b.progress<1);if(b){const n=s.actors.filter(x=>x.job==='building'&&x.phase==='work'&&x.target?.id===b.id).length;const factor=1+.5*(Math.max(1,Math.min(5,n))-1);b.work=Math.max(0,b.work-(factor/Math.max(1,n))*2);b.progress=Math.max(0,Math.min(1,1-b.work/(TEST_BUILDINGS[b.type]?.work||1)));if(b.work<=0){b.progress=1;event(s,`${TEST_BUILDINGS[b.type].label}が完成しました！`);s.effects.push({id:++s.eventSeq,type:'collect',x:b.x,z:b.z,y:1.3,ttl:1.7})}addSoul(a,'build',1);s.stats.successes++}}
else if(job==='wood'||job==='stone'){const tiles=home?s.tiles:s.exploreTiles;const t=tiles.find(t=>t.x===a.target.x&&t.z===a.target.z);const k=job==='wood'?'wood':'stone';if(t&&t.quantity>0){const r=s.stage==='explore'?s.cargo:s.resources;const limit=s.stage==='explore'?Math.max(0,20-Object.values(s.cargo).reduce((a,b)=>a+b,0)+(s.cargo[k]||0)):cap(s,k);if((r[k]||0)<limit){const v=Math.min(2,limit-(r[k]||0));r[k]=(r[k]||0)+v;t.quantity--;t.regrow=t.quantity<=0?s.time+70:0;addSoul(a,k,1);s.stats.successes++;if(s.stats.successes%8===0)event(s,`${SKILLS[k]}に成功。魂に経験が蓄積しています`)}}}
else if(job==='farm'){const b=s.buildings.find(x=>x.type==='garden');if(b){s.resources.food=Math.min(cap(s,'food'),s.resources.food+2);b.harvest=18;addSoul(a,'food',1);s.stats.successes++}}
else if(job==='training'){addSoul(a,'fight',1);s.stats.successes++}
else if(job==='survey'){const tile=s.exploreTiles.find(t=>t.x===Math.round(a.x)&&t.z===Math.round(a.z));if(tile?.terrain==='river'){if(levelFromXP(s.worldXP.swim||0)<50){die(s,a,'drown');return}addSoul(a,'swim',1)}else addSoul(a,'stone',1);s.stats.successes++}
if(a.kind==='main'&&skill&&s.heroProgression?.profiles?.[a.heroId]){
 const succeeded=s.stats.successes>successBefore;
 recordLifeAttempt(a,skill,succeeded,s.time);
 if(s.stage==='base')grantHeroActionExperience(s.heroProgression.profiles[a.heroId],skill,10,{success:succeeded,difficulty:1});
 if(s.stage==='explore'&&job==='survey'){
   grantExplorationBasicAbilityExperience(s.heroProgression.profiles[a.heroId],skill==='swim'?'swim':'survey',10,{success:succeeded,difficulty:1});
 }
}a.emote='happy';a.emoteTime=.85;a.target=null;a.phase='idle';a.timer=.45}
export function updateGame(s,dt){if(dt<=0)return;dt=Math.min(dt,1);s.time+=dt;s.activity+=dt;s.stageSeconds+=dt;if(s.stage==='base')s.baseSeconds=(s.baseSeconds||0)+dt;for(const fx of s.effects)fx.ttl-=dt;s.effects=s.effects.filter(f=>f.ttl>0);if(s.stage==='battle'){const b=s.battle;if(b&&b.won===null){b.elapsed+=dt;advanceBattleMana(b,dt);const combat=s.actors.filter(a=>a.kind==='sub').length;const boost=({attack:1.20,occupy:.95,fortify:.76,guard:.88,free:1.0})[b.tactic]||1;const d=dt*(combat*.22+.85)*boost;b.enemyHp=Math.max(0,b.enemyHp-d);b.allyHp=Math.max(0,b.allyHp-dt*.32);if(b.enemyHp<=0||b.allyHp<=0||b.elapsed>=BATTLE_LIMIT_SECONDS)completeBattle(s,b.enemyHp<=0)}return}
if(s.stage==='base'&&s.baseSeconds>=s.raidNext){s.raidNext=s.baseSeconds+180;s.raid={x:4,z:4,hp:8+Math.ceil(s.time/900),elapsed:0};event(s,'動物の襲撃！戦闘担当や防衛設備が迎撃します')}
if(s.stage==='base'&&s.baseSeconds>=s.trashNext){s.trashNext=s.baseSeconds+900;if(!s.trash){s.trash={x:2,z:4,hits:0};event(s,'拠点にゴミが落ちています')}}
if(s.stage==='base'&&s.raid){s.raid.elapsed+=dt;const combatCount=s.actors.filter(a=>a.mode==='combat'&&a.kind==='sub').length+(s.buildings.some(b=>b.type==='bowgun'&&b.progress>=1)?2:0);s.raid.hp-=dt*.24*combatCount;if(s.raid.hp<=0){s.resources.meat+=2;s.resources.hide++;s.stats.raids++;event(s,'襲撃を撃退！肉と皮を獲得しました');for(const a of s.actors.filter(a=>a.mode==='combat'))addSoul(a,'fight',1);s.raid=null}else if(s.raid.elapsed>24){const victim=s.actors.find(a=>a.kind==='sub');if(victim)die(s,victim,'raid');event(s,'襲撃で被害が出ました。防衛訓練と施設が役立ちます');s.raid=null}}
if(s.stage==='base'){for(const t of s.tiles){if(t.regrow&&t.regrow<=s.time){t.quantity=6;t.regrow=0}}for(const b of s.buildings)if(b.type==='garden'&&b.harvest>0)b.harvest=Math.max(0,b.harvest-dt)}else{for(const t of s.exploreTiles){if(t.regrow&&t.regrow<=s.time){t.quantity=9;t.regrow=0}}}
const subs=s.actors.filter(a=>a.kind==='sub');let index=0;for(const [role,k] of [['environment','environment'],['combat','combat'],['home','home'],['free','free']])for(let c=0;c<s.command[k]&&index<subs.length;c++)subs[index++].mode=role;for(;index<subs.length;index++)subs[index].mode='free';
if(s.stage!=='battle')synchronizeHeroActors(s);if(activeSubs(s)<subCap(s)){s.respawnSub-=dt;if(s.respawnSub<=0){spawnOne(s,'sub');s.respawnSub=s.stage==='explore'?10:SPAWN_SECONDS}}else s.respawnSub=SPAWN_SECONDS;
for(const a of [...s.actors]){fadeLifeDangerWarnings(a,dt);a.age+=dt;a.remaining=Math.min(a.remaining-dt,LIFETIME-a.age);a.petCooldown=Math.max(0,(a.petCooldown||0)-dt);a.emoteTime=Math.max(0,(a.emoteTime||0)-dt);if(a.remaining<=0){die(s,a,'寿命');continue}a.walk+=dt;if(a.phase==='idle'){a.timer-=dt;if(a.timer<=0)chooseTarget(s,a);continue}if(a.phase==='move'&&a.target){const dx=a.target.x-a.x,dz=a.target.z-a.z,dist=Math.hypot(dx,dz);const speed=(a.kind==='main'?1.25:1.0)*(s.stage==='explore'?1.1:1);if(dist>.32){a.x+=dx/dist*Math.min(dist,speed*dt);a.z+=dz/dist*Math.min(dist,speed*dt);if(s.stage==='base'){const t=tileAt(s,Math.round(a.x),Math.round(a.z));if(t?.terrain==='lava'){die(s,a,'lava');continue}if(t?.terrain==='river'&&levelFromXP(s.worldXP.swim||0)<50){die(s,a,'drown');continue}}}else{if(a.kind==='main'){recordWalkAttempt(a,true,s.time);if(s.stage==='base'&&s.heroProgression?.profiles?.[a.heroId])recordHeroWalkProgress(s.heroProgression.profiles[a.heroId],true)}a.phase='work';a.timer=(a.job==='building'?3:a.job==='training'?5:3)+rand(s)*2}}else if(a.phase==='work'){a.timer-=dt;if(a.timer<=0)finishJob(s,a)} }
}
export function petActor(s,id){const a=s.actors.find(a=>a.id===id);if(!a)return false;a.emote='love';a.emoteTime=1.9;a.face='happy';const k=a.kind==='main'?'main':'sub';if(a.petCooldown<=0){s.familiarity[k]++;a.petCooldown=14;s.effects.push({id:++s.eventSeq,type:'heart',x:a.x,z:a.z,y:1.8,ttl:1.5});if(s.familiarity[k]===1)event(s,`${a.kind==='main'?'メイン':'サブ'}との交流が始まりました`)}return true}
export function removeTrash(s){if(!s.trash)return {ok:false};s.trash.hits++;if(s.trash.hits>=8){s.trash=null;s.resources.wood=Math.min(cap(s,'wood'),s.resources.wood+2);if(rand(s)<.07)s.resources.gem++;event(s,'ゴミを撤去。木材を獲得しました');return {ok:true,completed:true}}return {ok:true,completed:false}}
export function serialize(s){const clean=JSON.parse(JSON.stringify(s));clean.effects=[];return JSON.stringify({schema:1,saveTime:Date.now(),state:clean})}
// Reject malformed identity/growth data before migration so imports cannot silently
// erase corrupted heroes. Missing fields from older saves are migrated additively.
export function validateHeroSavePayload(s){
 const stored=s.heroProgression;
 if(stored===undefined || stored===null)return true;
 if(typeof stored!=='object'||Array.isArray(stored)||!stored.profiles||typeof stored.profiles!=='object'||Array.isArray(stored.profiles))throw Error('英雄の保存形式が不正');
 for(const [id,hero] of Object.entries(stored.profiles)){
  if(!hero||typeof hero!=='object'||Array.isArray(hero)||hero.id!==id || typeof hero.name!=='string'||!hero.name.trim())throw Error('英雄の識別情報が不正');
  if(!Number.isInteger(hero.level)||hero.level<1||hero.level>200)throw Error('英雄のレベルが不正');
  if(hero.attributes!==undefined){
    if(!hero.attributes||typeof hero.attributes!=='object'||Array.isArray(hero.attributes))throw Error('英雄能力値の形式が不正');
    for(const value of Object.values(hero.attributes))if(!Number.isInteger(value)||value<1||value>1000)throw Error('英雄能力値が不正');
  }
  if(hero.attributeXp!==undefined && (!hero.attributeXp||typeof hero.attributeXp!=='object'||Array.isArray(hero.attributeXp)||Object.values(hero.attributeXp).some(v=>!Number.isFinite(v)||v<0)))throw Error('英雄経験値の形式が不正');
 }
 if(stored.pendingSouls!==undefined&&(!Array.isArray(stored.pendingSouls)||stored.pendingSouls.some(id=>typeof id!=='string'||!stored.profiles[id])))throw Error('神殿の魂データが不正');
 const roster=s.heroRoster;
 if(roster!==undefined){
  if(!roster||typeof roster!=='object'||Array.isArray(roster)||!roster.assignments||
      typeof roster.assignments!=='object'||Array.isArray(roster.assignments)||!Array.isArray(roster.deployments))
    throw Error('英雄編成の保存形式が不正');
  const known=new Set(Object.keys(stored.profiles));
  const assignments=Object.values(roster.assignments);
  if(assignments.some(id=>typeof id!=='string'||!known.has(id))||assignments.length!==new Set(assignments).size ||
    roster.deployments.some(id=>typeof id!=='string'||!assignments.includes(id))||
    roster.deployments.length!==new Set(roster.deployments).size || roster.deployments.length>3)
    throw Error('英雄編成の識別情報が不正');
 }
 return true;
}
export function deserialize(text,now=Date.now()){const v=JSON.parse(text);if(v.schema!==1||!v.state||v.state.schema!==1)throw Error('未対応セーブ形式');const s=v.state;s.effects=[];if(!Array.isArray(s.exploreTiles))s.exploreTiles=EXPLORATION_NODES.map(x=>({...x}));if(!s.command||!s.temple||!s.buildings||!Array.isArray(s.actors)||!Array.isArray(s.tiles))throw Error('セーブデータの構造が不正');validateHeroSavePayload(s);ensureHeroProgression(s);ensureStarterTempleInstalled(s);ensureHeroRoster(s);synchronizeHeroActors(s);s.saveFormatRevision=3;claimOffline(s,now,v.saveTime||now);return s}