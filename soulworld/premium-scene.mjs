/**
 * Soul World v0.2 - fully animated procedural 3D art pass.
 * Keeps simulation in core.mjs; all generated details are visual only.
 * No textures, external CDNs, third-party packages, or AI service calls.
 */
import {Scene3D} from './scene.mjs';
const ID=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
function pos(x,y,z){const o=ID();o[12]=x;o[13]=y;o[14]=z;return o}
function rotY(v){const o=ID();o[0]=Math.cos(v);o[8]=Math.sin(v);o[2]=-Math.sin(v);o[10]=Math.cos(v);return o}
function rotX(v){const o=ID();o[5]=Math.cos(v);o[9]=-Math.sin(v);o[6]=Math.sin(v);o[10]=Math.cos(v);return o}
function rotZ(v){const o=ID();o[0]=Math.cos(v);o[4]=-Math.sin(v);o[1]=Math.sin(v);o[5]=Math.cos(v);return o}
const mix=(a,b,t)=>a+(b-a)*t;
const noise=(x)=>{const n=Math.sin(x*127.1+78.233)*43758.5453123;return n-Math.floor(n)};
export class PremiumScene extends Scene3D{
 constructor(c){super(c);this.sparkleSeed=0;this.isPremium=true;}
 // Little decorative widgets can be composed from the shared lightweight meshes.
 sparkle(m,x,y,z,size=.06,color='#ffe9a4',t=0){const p=mul(m,rotZ(t));this.box(p,x,y,z,size*.22,size*1.6,size*.18,color);this.box(p,x,y,z,size*1.6,size*.22,size*.18,color)}
 beam(m,x,y,z,angle,length,color){const n=mul(m,rotZ(angle));this.box(n,x,y,z,.064,length,.063,color)}
 lantern(m,x,y,z,scale=1){this.box(m,x,y,z,.13*scale,.17*scale,.13*scale,'#6b4d32');this.sphere(m,x,y,z,.095*scale,.13*scale,.096*scale,'#ffca6d');this.box(m,x,y+.15*scale,z,.13*scale,.025*scale,.14*scale,'#e9cb8e');this.cone(m,x,y+.235*scale,z,.10*scale,.055*scale,.10*scale,'#49465a')}
 flag(m,x,y,z,color='#597ac4',height=.65){this.cyl(m,x,y,z,.025,height/2,.025,'#c4a475');this.box(m,x+.16,y+height*.33,z,.20,.13,.014,color);this.box(m,x+.15,y+height*.36,z+.018,.10,.038,.018,'#eed58b');this.sphere(m,x,y+height+.07,z,.055,.057,.055,'#f2d792')}
 grassDetail(m,n){const a=noise(n*1.31+7),b=noise(n*2.77);const x=(a-.5)*1.3,z=(b-.5)*1.3;const c=n%3===0?'#d7c875':n%3===1?'#4a8f46':'#9cc763';for(let j=0;j<2;j++){const p=mul(m,rotZ((j-.5)*.35));this.cone(p,x+(j-.5)*.09,.16,z,.034,.13,.030,c)}if(n%8===0){const petal=n%16===0?'#ffe5df':'#fff4b5';this.sphere(m,x,.245,z,.028,.032,.028,petal);this.sphere(m,x+.044,.234,z,.025,.026,.025,'#f5c4eb')}}
 groundTile(x,z,t,stage){super.groundTile(x,z,t,stage);const [wx,wz]=this.mapPos(x,z,stage),m=pos(wx,0,wz),kind=t.terrain,high=this.reduced?0:1;
  if(kind==='grass'&&high){this.grassDetail(m,x*59+z*71+7);this.grassDetail(m,x*11+z*47+8);if((x+z*7)%5===0){this.sphere(m,-.46,.115,.5,.11,.055,.14,'#9c9f83')}}
  if(kind==='river'||kind==='pond'){this.sphere(m,-.5,.062,.43,.12,.055,.13,'#aac4b4');this.sphere(m,.43,.09,-.36,.15,.07,.12,'#92a99c');if(high){const f=Math.sin(this.clock*.9+x*3+z)*.3;this.plane(m,f,.107,.25,.26,.013,[.82,.96,1,.32])}}
  if((x+z)%2===0&&high){this.box(m,0,-.36,.71,.76,.16,.07,'#84715b');this.box(m,-.71,-.35,0,.06,.14,.65,'#76634f')}
 }
 tree(x,z,stage,id=0){const [wx,wz]=this.mapPos(x,z,stage),m=pos(wx,0,wz),v=noise(x*7.1+z*17),h=1.15+v*.55;
  this.sphere(m,0,.08,0,.40,.08,.34,'#56774a');this.cyl(m,0,.38,0,.115,.38,.12,'#72503a');this.cyl(m,0,.52,0,.045,.28,.055,'#ae7950');
  for(let layer=0;layer<3;layer++){const w=.54-layer*.12;this.cone(m,0,.68+layer*.40,0,w,.39,w,(['#285d43','#347856','#408868'])[layer]);this.cone(m,.07,.71+layer*.4,-.01,w*.81,.27,w*.85,['#3b7956','#418c62','#60a273'][layer])}
  this.cone(m,0,h+.44,0,.22,.34,.22,'#4c9668');
  if(!this.reduced){this.sphere(m,-.27,.7,.14,.15,.09,.12,'#3a7759');this.sphere(m,.2,1.14,-.26,.18,.08,.12,'#4f9b6a')}
 }
 rock(x,z,stage){const [wx,wz]=this.mapPos(x,z,stage),m=pos(wx,0,wz),v=noise(x*11+z*9);this.sphere(m,0,.30,0,.5,.34,.43,'#a1adb1');this.sphere(m,-.35,.15,.24,.23,.18,.24,'#778b91');this.sphere(m,.23,.27,-.2,.24,.22,.19,'#c2c6bc');this.box(m,-.08,.59,-.13,.25,.018,.20,'#d0d0c8');if(!this.reduced&&v>.4)this.sphere(m,-.15,.68,.18,.12,.16,.12,'#6fc1d1')}
 flower(x,z,stage,seed){const [wx,wz]=this.mapPos(x,z,stage),m=pos(wx,0,wz);for(let i=0;i<5;i++){const dx=(noise(seed*3.7+i*7)-.5)*1.2,dz=(noise(seed*8.1+i*13)-.5)*1.2;this.cyl(m,dx,.11,dz,.013,.12,.013,'#4d9c64');const col=['#f1c6e4','#fff9cf','#cba7ee','#f8d779','#ffffff'][(i+seed)%5];this.sphere(m,dx,.23,dz,.049,.04,.05,col);this.sphere(m,dx+.026,.23,dz+.014,.023,.024,.021,'#ffe07e')}}
 house(m,wall,roof){
  // Stone footing and warm timber walls. Four roof wings actually slant upward.
  this.box(m,0,.16,0,.75,.15,.73,'#8d8990');this.box(m,0,.55,0,.65,.39,.62,wall);
  for(const x of [-.61,.61])for(const z of [-.52,.52])this.box(m,x,.60,z,.069,.47,.09,'#81573b');
  for(const y of [.31,.79]){this.box(m,0,y,.625,.68,.045,.05,'#98744b');this.box(m,0,y,-.625,.68,.045,.05,'#98744b')}
  // pitched, tiled roof; overhang below the gable
  this.box(m,-.34,1.08,0,.42,.085,.78,roof,.22);this.box(m,.34,1.08,0,.42,.085,.78,roof,-.22);
  for(let k=0;k<5;k++){const z=(k-2)*.31;this.box(m,-.36,1.11,z,.42,.018,.013,'#9b9ab3',.20);this.box(m,.36,1.11,z,.42,.018,.013,'#b3add1',-.20)}
  this.box(m,0,1.28,0,.052,.06,.86,'#d3a760');
  this.box(m,0,.43,.635,.19,.28,.028,'#514238');this.sphere(m,.10,.41,.683,.016,.019,.014,'#eacb84');
  for(const x of [-.37,.37]){this.box(m,x,.70,.64,.15,.17,.028,'#e7b869');this.box(m,x,.70,.68,.15,.018,.026,'#f7dda3');this.box(m,x,.70,.68,.014,.17,.025,'#8f6744')}
  this.lantern(m,-.56,.55,.67,.72);
 }
 building(b,stage){const [wx,wz]=this.mapPos(b.x,b.z,stage),m=pos(wx,0,wz),type=b.type,under=b.progress<1;
  if(type==='mainTown'){this.house(m,'#d6caa8','#3d628b');this.flag(m,.54,1.10,-.2,'#486eaa');this.cone(m,-.55,1.62,-.2,.23,.4,.23,'#557d9e');this.sphere(m,-.55,1.96,-.2,.06,.05,.05,'#f2de92')}
  else if(type==='heroHouse'){this.house(m,'#e6c9a4','#805c8c');this.flag(m,.54,1.10,-.2,'#6656b6');this.sphere(m,-.54,.35,.4,.24,.25,.25,'#8a6652');this.sphere(m,.56,.28,.35,.19,.16,.16,'#568d51')}
  else if(type==='garden'){this.box(m,0,.12,0,.68,.085,.68,'#88583c');for(let row=0;row<3;row++){this.box(m,(row-1)*.42,.22,0,.14,.06,.67,'#6b432e');for(let col=0;col<3;col++){const x=(row-1)*.41,z=(col-1)*.42;const bob=.019*Math.sin(this.clock*2+row+col);this.sphere(m,x,.29+bob,z,.12,.16,.10,'#6ca73b');this.cone(m,x,.44+bob,z,.09,.10,.09,'#9bc748')}}for(let q of [-1,1]){this.box(m,q*.70,.24,.70,.04,.25,.04,'#b98d5b')}}
  else if(type==='storage'||type==='foodstore'){this.house(m,'#ccaf89',type==='storage'?'#4b6e86':'#9a7444');for(let i=0;i<3;i++){this.box(m,-.59+i*.24,.25,.85,.15,.16,.12,'#a87d4a');this.box(m,-.59+i*.24,.40,.85,.15,.025,.12,'#e2ba75')}}
  else if(type==='subTown'){this.house(m,'#c6c6b0','#417a8a');this.flag(m,.58,1.14,-.15,'#4d94c0');this.lantern(m,.45,.30,.77,.65)}
  else if(type==='temple'){this.cyl(m,0,.14,0,.77,.12,.77,'#928b9c');for(let i=0;i<6;i++){const a=i*Math.PI/3;this.cyl(m,Math.cos(a)*.52,.66,Math.sin(a)*.52,.072,.44,.07,'#d0c4b1')}this.cone(m,0,1.18,0,.63,.22,.63,'#7b78a0');this.cone(m,0,1.6,0,.26,.37,.26,'#8abfe0');this.sphere(m,0,2.0+Math.sin(this.clock*2)*.05,0,.15,.18,.15,'#d9faff');this.sparkle(m,.4,1.92,.1,.1,'#b0deff',this.clock)}
  else if(type==='training'){this.box(m,0,.07,0,.73,.06,.7,'#c49c66');this.cyl(m,0,.53,0,.09,.45,.08,'#7f563b');this.sphere(m,0,1.03,0,.21,.21,.21,'#d8bb88');this.box(m,0,.69,.1,.26,.21,.13,'#a17656');for(const i of [-1,1])this.box(m,i*.55,.18,-.55,.04,.24,.04,'#9a764f')}
  else if(type==='bowgun'){this.cyl(m,0,.24,0,.38,.16,.38,'#9898a2');this.box(m,0,.58,0,.17,.12,.55,'#6c553e');for(const side of [-1,1])this.box(m,side*.24,.65,.11,.055,.07,.50,'#c5ae83');this.cyl(m,0,.69,.36,.09,.09,.11,'#695844');this.sphere(m,0,.68,.55,.07,.07,.07,'#c3d5df')}
  if(under){for(const x of [-.75,.75])for(const z of [-.71,.71])this.cyl(m,x,.50,z,.047,.48,.04,'#a37646');this.box(m,0,1.01,0,.79,.038,.75,'#a77d4f');for(let i=-1;i<=1;i++)this.box(m,0,.36+i*.31,.75,.79,.027,.032,'#a67c4e');this.sparkle(m,.46,1.14,.25,.11,'#fce0a6',this.clock*.6);}
 }
 actor(a,stage,selected=false){
  if(a.kind==='sub' && this.actorCount>32 && !selected && (a.id%2===0 || this.actorCount>65)){super.actor(a,stage,selected);return}
  const [wx,wz]=this.mapPos(a.x,a.z,stage),main=a.kind==='main',moving=a.phase==='move',working=a.phase==='work',happy=a.emoteTime>0&&['happy','love'].includes(a.emote),wake=a.emoteTime>0&&a.emote==='wake',i=a.id;
  const walk=moving?Math.sin(this.clock*(main?8.8:9.7)+i*1.63):0,activity=working?Math.sin(this.clock*10+i*1.4):0;
  const breathe=Math.sin(this.clock*2.5+i*1.9)*.018,hop=(moving?Math.abs(walk)*.10:happy?Math.abs(Math.sin(this.clock*8+i))*.07:0)+breathe;
  const tilt=happy?Math.sin(this.clock*8+i)*.13:working?activity*.045:Math.sin(this.clock*.8+i)*.065;
  const angle=a.target?Math.atan2(a.target.x-a.x,a.target.z-a.z):(stage==='battle'?Math.PI/4:Math.PI*.20);
  const m=mul(pos(wx,hop,wz),rotY(angle)),head=mul(mul(m,pos(0,1.48,0)),rotZ(tilt));
  this.sphere(m,0,.044,0,.36,.026,.24,[.03,.07,.07,.23]);
  // Boots and independent leg swing
  for(const side of [-1,1]){
   const leg=mul(mul(m,pos(side*.17,.45,.005)),rotX(side*walk*.52));
   this.sphere(leg,0,-.15,0,.13,.21,.15,main?'#55416f':'#25283a');
   this.sphere(leg,0,-.34,.11,.17,.075,.22,main?'#312e4c':'#384756');
   this.box(leg,0,-.32,.22,.14,.032,.034,main?'#cfa864':'#8f9ba2');
  }
  // Vest, torso and shoulder mantle
  this.sphere(m,0,.76,0,.31,.37,.27,main?'#61558d':'#343d50');
  this.cone(m,0,.64,-.015,.40,.28,.33,main?'#59477d':'#263245');
  this.box(m,0,.70,.27,.18,.23,.025,main?'#9d89bc':'#677382');
  this.box(m,0,.53,.28,.30,.035,.040,main?'#e2bf7c':'#c0a27a');
  if(main){
   this.sphere(m,0,.88,-.21,.40,.33,.13,'#735cbb');
   this.box(m,0,.79,-.37,.30,.35,.08,'#5e4aa5');
   this.box(m,-.2,.80,-.42,.055,.31,.025,'#e3c27e');
   this.box(m,.21,.80,-.42,.055,.31,.025,'#e3c27e');
  }else{
   const gear=a.mode==='combat'?'#5c6b84':a.mode==='home'?'#bf8c55':a.mode==='environment'?'#538069':'#62678a';
   this.sphere(m,0,.97,-.13,.32,.18,.29,gear);this.sphere(m,0,.76,-.25,.23,.21,.12,'#695b51');
   this.box(m,0,.68,-.36,.26,.25,.12,'#8e7452');this.box(m,0,.73,-.49,.20,.07,.025,'#d0aa74');
  }
  // Arms: work and interaction use overlapping action-specific poses without slowing simulation.
  for(const side of [-1,1]){
   const workSwing=working?(a.job==='building'||a.job==='wood'||a.job==='stone' ? activity*.85 : activity*.22):0;
   const gesture=happy?(side===1?-.95:-.55):wake?-.3:0;
   const arm=mul(mul(m,pos(side*.33,.91,.03)),rotX(side*walk*.48+workSwing+gesture));
   this.sphere(arm,side*.075,-.14,.01,.13,.25,.14,main?'#8264a4':'#4c5971');
   this.sphere(arm,side*.09,-.34,.04,.125,.11,.115,main?'#f2d4ca':'#7b8796');
   this.cyl(arm,side*.065,-.21,.06,.14,.05,.14,main?'#e3bd75':'#b59a75');
   if(side===1){
    if(working&&['wood','stone','building'].includes(a.job)){
     this.box(arm,side*.13,-.51,.07,.037,.24,.04,'#79543c');
     if(a.job==='wood')this.box(arm,side*.13,-.68,.07,.19,.095,.05,'#d0dde0');
     else if(a.job==='stone')this.box(arm,side*.13,-.69,.06,.22,.054,.06,'#c6ced4');
     else this.box(arm,side*.13,-.66,.06,.12,.11,.075,'#bdc5c9');
    }else if(main){
     this.cyl(arm,side*.15,-.65,.16,.035,.40,.035,'#87618e');
     this.sphere(arm,side*.15,-1.05,.16,.16,.19,.16,'#8c64ec');
     this.sphere(arm,side*.15,-1.06,.30,.055,.06,.055,'#d6cbff');
    }else if(a.mode==='combat'||stage==='battle'){
     this.box(arm,side*.08,-.55,.20,.034,.19,.04,'#845b3c');
     this.cone(arm,side*.08,-.87,.20,.10,.27,.10,'#c2d1dd');
    }
   } else if(!main&&(a.mode==='combat'||stage==='battle')){
    this.sphere(arm,side*.08,-.38,.22,.19,.24,.07,'#53749d');
    this.sphere(arm,side*.07,-.4,.295,.08,.10,.025,'#d4c8a7');
   }
  }
  // Head: approximately half the full height, shared two-head body proportion.
  if(main){
   this.sphere(head,0,0,0,.49,.47,.44,'#f2d7cc');
   // Lavender hair crown, locks and asymmetric swept fringe
   this.sphere(head,0,.27,-.095,.525,.29,.49,'#9583cf');
   for(let j=0;j<7;j++){
    const x=(j-3)*.135,depth=.18+.05*Math.sin(j*1.7);
    const p=mul(head,rotZ((j-3)*.10));this.sphere(p,x,.36-Math.abs(j-3)*.024,depth,.12,.26,.17,j%3===0?'#d7b9f4':'#a59bd8');
   }
   for(const side of [-1,1]){this.sphere(head,side*.42,-.12,-.05,.17,.37,.22,'#a99bd7');this.cone(head,side*.45,-.43,-.1,.13,.23,.16,'#9b85c8')}
   // Layered hat with golden trim and jewel
   this.sphere(head,0,.40,-.02,.54,.11,.52,'#6c568f');
   this.cone(head,0,.69,-.08,.36,.33,.36,'#68569d');this.cone(head,-.03,1.00,-.09,.18,.24,.17,'#8675b5');
   this.box(head,0,.45,.42,.25,.025,.035,'#f0d18c');this.sphere(head,.13,.52,.43,.08,.09,.037,'#e5b770');
   for(const side of [-1,1]){
    this.sphere(head,side*.205,-.04,.399,.15,.20,.048,'#6b57a6');
    this.sphere(head,side*.205,-.018,.447,.09,.13,.024,'#a992ea');
    this.sphere(head,side*.18,.05,.469,.045,.063,.018,'#ffffff');
    this.sphere(head,side*.24,-.10,.472,.02,.026,.014,'#ffffff');
    this.sphere(head,side*.32,-.24,.32,.12,.065,.03,'#efa6af');
   }
   this.sphere(head,0,-.275,.425,.065,.025,.016,happy?'#bd718b':'#b98293');
   if(happy)this.sphere(head,0,-.27,.442,.033,.018,.010,'#9b496a');
  } else {
   // True black doll under a colored hood; eyes read clearly even at small scale.
   const hood=a.mode==='combat'?'#61718d':a.mode==='environment'?'#718d64':a.mode==='home'?'#ac8b66':'#7b7596';
   this.sphere(head,0,.075,-.035,.54,.52,.50,hood);
   this.sphere(head,0,-.055,.155,.452,.39,.389,'#17202c');
   this.sphere(head,0,-.072,.30,.39,.30,.26,'#0f1723');
   // hood embroidery and face rim
   this.sphere(head,0,.31,-.17,.40,.18,.42,hood);
   this.cone(head,0,.51,-.12,.28,.24,.31,hood);
   this.box(head,0,.28,.405,.31,.026,.025,'#cab387');
   this.box(head,-.32,-.13,.388,.038,.19,.035,'#b6a275');
   this.box(head,.32,-.13,.388,.038,.19,.035,'#b6a275');
   const blink=Math.sin(this.clock*.53+i*2.1)>.991;
   const sy=blink?.012:happy?.055:.105;
   for(const side of [-1,1]){
    this.sphere(head,side*.17,-.02,.54,.091,sy,.034,'#ffdc78');
    this.sphere(head,side*.17,-.01,.565,.048,sy*.56,.013,'#fff3bc');
   }
   if(!this.reduced){this.sphere(head,0,.12,-.32,.26,.17,.21,hood);this.box(head,0,-.33,.42,.25,.038,.032,'#947d66')}
  }
  // Selection rings and particles use the existing FX list; no gameplay side effects.
  if(selected){this.cyl(m,0,.048,0,.58,.012,.57,[1,.80,.36,.68]);for(let q=0;q<3;q++){const t=this.clock*1.2+q*2.09;this.sparkle(m,Math.cos(t)*.48,.1,Math.sin(t)*.48,.075,'#ffe59a',t)}}
  if(happy&&a.emote==='love'){this.sphere(head,.22,.52,.28,.09,.11,.05,'#ff91b9');this.sphere(head,.31,.54,.29,.06,.08,.045,'#ffbed0')}
  if(working&&a.job==='building'&&!this.reduced){this.sparkle(m,.50,1.35,.35,.06,'#f7e2a0',this.clock*4)}
 }
 enemy(stage,s){if(stage==='battle'){
  // The actual battle outcome remains in core.mjs. Characters here are visualized, not simulated by physics.
  const m=pos(5.3,0,-2.3),hp=Math.max(0,s.battle?.enemyHp??100);
  this.box(m,0,.38,0,.72,.38,.76,'#8b594f');this.cone(m,0,.94,0,.76,.26,.79,'#574653');this.flag(m,.42,1.14,.12,'#c65361');
  for(let j=0;j<6;j++){
   const a=j*Math.PI*2/6,xx=3.2+Math.sin(a)*1.2,zz=-.1+Math.cos(a)*1.55,u=pos(xx,0,zz),walk=Math.sin(this.clock*7+j*2)*.10;
   this.sphere(u,0,.48+walk,0,.38,.29,.56,'#6b5152');this.sphere(u,0,.65+walk,.40,.30,.25,.29,'#796163');this.sphere(u,-.13,.73+walk,.62,.048,.04,.025,'#fb9b79');this.sphere(u,.13,.73+walk,.62,.048,.04,.025,'#fb9b79');
   for(const q of [-1,1]){this.cone(u,q*.27,.88+walk,.35,.13,.16,.12,'#473a3d');this.sphere(u,q*.24,.3,0,.13,.23,.15,'#514348')}
  }
  const bx=6.2+Math.sin(this.clock*.9)*.3,bz=-1.5,b=pos(bx,0,bz),bounce=Math.sin(this.clock*1.7)*.085;
  this.sphere(b,0,1.15+bounce,0,.84,.77,1.02,'#59454b');this.sphere(b,0,1.48+bounce,.69,.68,.56,.61,'#6c5050');
  this.sphere(b,0,1.18+bounce,1.05,.43,.29,.32,'#99716c');for(const q of [-1,1]){
   this.cone(b,q*.53,1.68+bounce,.66,.26,.40,.24,'#47373f');this.cone(b,q*.41,1.10+bounce,1.2,.13,.30,.17,'#e4d5b0');this.sphere(b,q*.27,1.61+bounce,1.13,.11,.10,.07,'#f2b87d');this.sphere(b,q*.28,1.61+bounce,1.19,.042,.045,.017,'#241a20');this.sphere(b,q*.51,.39,0,.24,.45,.24,'#493a44')}
  for(let t=0;t<6;t++)this.cone(b,Math.sin(t*1.8)*.45,1.82+bounce,Math.cos(t*1.4)*.44,.18,.30,.20,'#9b585a');
  if(!this.reduced&&hp>0&&Math.sin(this.clock*8)> .7)this.sparkle(b,-1.2,1.45,1.0,.19,'#fff1bd',this.clock);
  return;
 }if(stage==='base'&&s.raid){const [x,z]=this.mapPos(s.raid.x,s.raid.z,'base'),m=pos(x,0,z);this.sphere(m,0,.45,0,.43,.34,.51,'#6b4e56');this.sphere(m,0,.75,.29,.32,.28,.33,'#694b4d');this.sphere(m,-.14,.80,.54,.06,.05,.05,'#ff9d7c');this.sphere(m,.14,.80,.54,.06,.05,.05,'#ff9d7c')}}
 fillScene(s){this.actorCount=s.actors.length;super.fillScene(s);const stage=s.stage;
  // Stage-local ambience is decorative and never included in saved simulation state.
  if(this.reduced)return;
  if(stage==='base'){
   for(let i=0;i<5;i++){const x=-4.24+i*2.04,z=4.22,m=pos(x,0,z);this.cyl(m,0,.25,0,.04,.25,.04,'#bc9367');this.sphere(m,0,.50,0,.06,.06,.06,'#f4d588');if(i<4)this.box(m,1.02,.33,0,1,.035,.04,'#b88759')}
   // Decorative flowing air and a small lantern just outside the base playable tiles.
   for(let i=0;i<7;i++){const t=this.clock*.25+i*6.3;const m=pos(-5+Math.sin(t)*.6,.0,-3+Math.cos(t*.7));this.sphere(m,0,1.15+Math.sin(t)*.16,0,.04,.04,.04,[1,.94,.73,.43])}
  } else if(stage==='explore'){
   // The existing caravan is rendered by the base scene; add ropes and camp gear.
   const [x,z]=this.mapPos(1,3,stage),m=pos(x,0,z);
   for(const side of [-1,1]){this.sphere(m,side*.48,.18,-.55,.28,.28,.12,'#484b54');this.box(m,side*.50,.18,-.67,.055,.28,.045,'#c3a980')}
   this.flag(m,0,1.0,-.25,'#597f89');this.lantern(m,-.62,.55,.55,.75);
   for(let i=0;i<8;i++){const q=pos(-4.8+i*1.4,0,-5.6+Math.sin(i*2)*1.5);this.cone(q,0,1.0,0,.53,.79,.52,'#326d54');this.cone(q,0,1.55,0,.32,.6,.34,'#4d9370')}
  } else if(stage==='battle'){
   for(let i=0;i<9;i++){const q=pos(-5.4+i*1.15,0,4.8);this.box(q,0,.28,0,.17,.28,.17,'#9d805a');if(i<8)this.box(q,.58,.44,0,.60,.06,.06,'#bca479')}
  }
 }
}