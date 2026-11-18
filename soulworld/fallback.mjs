// Isometric Canvas2D compatibility view for browsers with WebGL disabled.
// The primary renderer is true 3D WebGL in scene.mjs.
export class SceneFallback {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');if(!this.ctx)throw Error('Canvas2D is unavailable');this.zoom=1;this.target=[0,0,0];this.selectedId=null;this.previewTile=null;this.clock=0;this.isFallback=true;this.vista=new Image();this.vista.src='./vista.svg';}
 setQuality(){}
 resetCamera(){this.target=[0,0,0];this.zoom=1}
 dimensions(stage){const w=this.canvas.clientWidth,h=this.canvas.clientHeight,n=stage==='base'?5:9,m=stage==='base'?5:7;const safeLeft=Math.min(192,w*.19),safeRight=Math.min(226,w*.26),safeTop=Math.min(76,h*.18),safeBottom=Math.min(76,h*.18);const availW=Math.max(160,w-safeLeft-safeRight),availH=Math.max(118,h-safeTop-safeBottom);const unit=Math.max(12,Math.min(availW/(n+m),availH/((n+m)*.57)))*this.zoom;return {w,h,n,m,ux:unit,uy:unit*.57,ox:(safeLeft+w-safeRight)*.5,oy:(safeTop+h-safeBottom)*.5}}
 mapPos(x,z,stage){const n=stage==='base'?5:9,m=stage==='base'?5:7;return [(x-(n-1)/2)*1.63,(z-(m-1)/2)*1.63]}
 iso(x,z,y=0,stage=this.stage){const {ux,uy,ox,oy,n,m}=this.dimensions(stage);return [ox+(x-z-this.target[0]/1.63+this.target[2]/1.63)*ux,oy+(x+z-(n+m-2)/2-this.target[0]/1.63-this.target[2]/1.63)*uy-y*ux*.8]}
 project(wx,y,wz){const {n,m}=this.dimensions(this.stage);const x=wx/1.63+(n-1)/2,z=wz/1.63+(m-1)/2;return this.iso(x,z,y,this.stage)}
 ground(x,y){const d=this.dimensions(this.stage);const a=(x-d.ox)/d.ux+(this.target[0]-this.target[2])/1.63,b=(y-d.oy)/d.uy+(d.n+d.m-2)/2+(this.target[0]+this.target[2])/1.63;return [(a+b)/2,(b-a)/2]}
 locateTile(x,y,stage){const hit=this.ground(x,y);const tx=Math.round(hit[0]),tz=Math.round(hit[1]),d=this.dimensions(stage);if(tx<0||tz<0||tx>=d.n||tz>=d.m)return null;return{x:tx,z:tz}}
 locateActor(s,x,y){let best=null,dist=50;for(const a of s.actors){const [px,py]=this.iso(a.x,a.z,1.2);const d=Math.hypot(px-x,py-y);if(d<dist){best=a;dist=d}}return best}
 moveCamera(dx,dy){const d=this.dimensions(this.stage);const tx=(-dx/d.ux-dy/d.uy)*.5*1.63,tz=(dx/d.ux-dy/d.uy)*.5*1.63;this.target[0]=Math.max(-4,Math.min(4,this.target[0]+tx));this.target[2]=Math.max(-4,Math.min(4,this.target[2]+tz))}
 diamond(x,z,color){const ctx=this.ctx,[px,py]=this.iso(x,z),{ux,uy}=this.dimensions(this.stage);ctx.beginPath();ctx.moveTo(px,py-uy);ctx.lineTo(px+ux,py);ctx.lineTo(px,py+uy);ctx.lineTo(px-ux,py);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=1;ctx.stroke();ctx.beginPath();ctx.moveTo(px-ux,py);ctx.lineTo(px,py+uy+8);ctx.lineTo(px+ux,py);ctx.lineTo(px+ux,py+8);ctx.lineTo(px,py+uy+15);ctx.lineTo(px-ux,py+8);ctx.closePath();ctx.fillStyle='#70665c';ctx.fill();}
 circle(x,y,r,color){const c=this.ctx;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill()}
 line(points,color,width=2){const c=this.ctx;c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.lineWidth=width;c.strokeStyle=color;c.lineJoin='round';c.stroke()}
 roof(x,y,r,color){const c=this.ctx;c.beginPath();c.moveTo(x,y-r*.7);c.lineTo(x+r,y);c.lineTo(x,y+r*.5);c.lineTo(x-r,y);c.closePath();c.fillStyle=color;c.fill();c.strokeStyle='#dbb989';c.lineWidth=1;c.stroke()}
 tree(x,z){const [px,py]=this.iso(x,z),{ux}=this.dimensions(this.stage),r=ux*.5,c=this.ctx;this.line([[px,py],[px,py-r*.85]],'#795743',r*.18);for(let i=0;i<3;i++){const yy=py-r*(1.15+i*.37),ww=r*(.75-i*.18);c.beginPath();c.moveTo(px,yy-r*.5);c.lineTo(px+ww,yy+r*.42);c.lineTo(px-ww,yy+r*.42);c.closePath();c.fillStyle=['#2d7659','#307a58','#418d61'][i];c.fill()}}
 rock(x,z){const [px,py]=this.iso(x,z),{ux}=this.dimensions(this.stage),r=ux*.37,c=this.ctx;c.beginPath();c.moveTo(px-r,py);c.lineTo(px-r*.8,py-r*.7);c.lineTo(px+r*.25,py-r);c.lineTo(px+r,py-r*.2);c.lineTo(px+r*.6,py+r*.5);c.lineTo(px-r*.6,py+r*.5);c.closePath();c.fillStyle='#96a1a0';c.fill();this.line([[px-r*.8,py-r*.7],[px+r*.2,py-r*.3],[px+r,py-r*.2]],'#b4c0bc',2)}
 building(b){const [px,py]=this.iso(b.x,b.z),{ux}=this.dimensions(this.stage),r=ux*.72,c=this.ctx;const base=b.type==='temple'?'#d3cfc3':b.type==='heroHouse'?'#e9d9b9':b.type==='mainTown'?'#e2d9b5':b.type==='garden'?'#805e40':'#c7b494';if(b.type==='garden'){for(let i=0;i<4;i++){this.line([[px-r*.7,py-r*.25+i*7],[px+r*.7,py-r*.25+i*7]],'#6c4e38',5);for(let j=0;j<3;j++)this.circle(px-r*.55+j*r*.55,py-r*.25+i*7,ux*.095,'#70ad5a')}return}c.fillStyle=base;c.fillRect(px-r*.55,py-r*.8,r*1.1,r*.85);this.roof(px,py-r*.8,r*.68,b.type==='heroHouse'?'#a56b5a':b.type==='mainTown'?'#4f7391':b.type==='temple'?'#99aeae':'#777f7f');c.fillStyle='#4f4036';c.fillRect(px-r*.11,py-r*.42,r*.23,r*.42);c.fillStyle='#fbe2a1';c.fillRect(px-r*.42,py-r*.58,r*.18,r*.19);c.fillRect(px+r*.19,py-r*.58,r*.18,r*.19);if(b.type==='temple'){this.circle(px,py-r*1.7,r*.18,'#b9f0f5');this.circle(px,py-r*1.9,r*.08,'#ffffff')}if(b.progress<1){c.strokeStyle='#f6d596';c.setLineDash([6,3]);c.lineWidth=2;c.strokeRect(px-r*.7,py-r*1.55,r*1.4,r*1.65);c.setLineDash([])}}
 actor(a){
  const c=this.ctx,[px,py]=this.iso(a.x,a.z),{ux}=this.dimensions(this.stage),r=ux*.29;
  const main=a.kind==='main',move=a.phase==='move',work=a.phase==='work';
  const s=Math.sin(this.clock*8+a.id),bounce=(move?Math.abs(s)*r*.09:Math.sin(this.clock*2+a.id)*r*.025);
  const happy=a.emoteTime>0&&['happy','love'].includes(a.emote);
  const cy=py-r*1.04-bounce;
  const ellipse=(x,y,rx,ry,fill,stroke=null,line=1)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.lineWidth=line;c.strokeStyle=stroke;c.stroke()}};
  const grad=(x,y,inner,outer,radius)=>{const g=c.createRadialGradient(x-radius*.3,y-radius*.4,radius*.06,x,y,radius);g.addColorStop(0,inner);g.addColorStop(1,outer);return g};
  // Grounding and independent gait
  ellipse(px,py+r*.15,r*.72,r*.24,'#1024364d');
  for(const side of [-1,1]){
   const sy=(move?side*s*r*.19:0);
   ellipse(px+side*r*.26,cy+r*.87+sy,r*.21,r*.33,main?'#3d375e':'#2b3347');
   ellipse(px+side*r*.27,cy+r*1.12+sy,r*.27,r*.14,'#222b43','#a58d6a',.7);
  }
  // Tunic, cloak and belt
  c.beginPath();c.moveTo(px-r*.42,cy+r*.2);c.quadraticCurveTo(px-r*.54,cy+r*.84,px-r*.64,cy+r*.93);c.quadraticCurveTo(px,cy+r*1.12,px+r*.61,cy+r*.9);c.lineTo(px+r*.38,cy+r*.13);c.closePath();c.fillStyle=main?'#6551a0':'#5d667f';c.fill();
  ellipse(px,cy+r*.36,r*.45,r*.48,main?grad(px,cy+r*.3,'#ab8ccc','#604a96',r*.6):grad(px,cy+r*.3,'#737e8e','#3f4a60',r*.6));
  c.fillStyle='#e3c389';c.fillRect(px-r*.38,cy+r*.61,r*.76,r*.09);
  // Arms, work gesture and tool
  for(const side of [-1,1]){
   const ex=px+side*r*.58,ey=cy+r*.30+(work?Math.sin(this.clock*9+a.id)*r*.17:happy?-r*.26:0);
   c.strokeStyle=main?'#836cb1':'#7c8595';c.lineWidth=r*.29;c.lineCap='round';c.beginPath();c.moveTo(px+side*r*.39,cy+r*.12);c.lineTo(ex,ey);c.stroke();
   ellipse(ex,ey,r*.15,r*.16,main?'#eed0ba':'#95a1a4');
   if(side===1 && work && ['wood','stone','building'].includes(a.job)){
    c.save();c.translate(ex,ey);c.rotate(Math.sin(this.clock*8+a.id)*.27);c.strokeStyle='#765037';c.lineWidth=r*.12;c.beginPath();c.moveTo(0,r*.08);c.lineTo(0,-r*.67);c.stroke();c.fillStyle='#c7d3db';c.fillRect(-r*.27,-r*.68,r*.52,r*.20);c.restore();
   }
   if(side===1 && main){c.strokeStyle='#9e78a9';c.lineWidth=r*.11;c.beginPath();c.moveTo(ex,ey);c.lineTo(ex+r*.06,ey-r*.69);c.stroke();ellipse(ex+r*.06,ey-r*.72,r*.16,r*.20,'#b087fb');}
  }
  // Large round head, exactly two-head style.
  const hy=cy-r*.78,hr=r*.77;
  if(main){
   ellipse(px,hy,hr,hr,grad(px,hy,'#ffe2ce','#edbba7',hr));
   ellipse(px,hy-r*.48,hr*.97,hr*.57,'#9583c4');
   for(let j=-3;j<=3;j++)ellipse(px+j*r*.19,hy-r*.50+Math.abs(j)*r*.075,r*.17,r*.32,j%2===0?'#bcabe5':'#9584cb');
   for(const side of [-1,1])ellipse(px+side*r*.73,hy+r*.23,r*.21,r*.53,'#aaa0dc');
   // Witch hat and a gold ribbon
   ellipse(px,hy-r*.76,r*.96,r*.17,'#6b5a9e','#d1aa65',r*.08);
   c.beginPath();c.moveTo(px-r*.51,hy-r*.78);c.lineTo(px-r*.12,hy-r*1.50);c.lineTo(px+r*.52,hy-r*.80);c.closePath();c.fillStyle='#7966ad';c.fill();
   c.strokeStyle='#e6bf72';c.lineWidth=r*.07;c.beginPath();c.moveTo(px-r*.5,hy-r*.82);c.lineTo(px+r*.48,hy-r*.82);c.stroke();
   for(const side of [-1,1]){
    ellipse(px+side*r*.29,hy+r*.11,r*.185,r*.25,'#6f55aa');
    ellipse(px+side*r*.28,hy+r*.10,r*.105,r*.17,'#b095e9');
    ellipse(px+side*r*.25,hy+r*.04,r*.055,r*.085,'white');
    ellipse(px+side*r*.52,hy+r*.42,r*.18,r*.085,'#eca6a3');
   }
   ellipse(px,hy+r*.47,r*.10,r*.047,happy?'#af5074':'#b87c8b');
  } else {
   const cloth=a.mode==='combat'?'#788ba1':a.mode==='environment'?'#8b9c7a':a.mode==='home'?'#bca180':'#9294a9';
   ellipse(px,hy-r*.03,hr*.98,hr*1.02,grad(px,hy,'#b8b7aa',cloth,hr));
   ellipse(px,hy+r*.10,hr*.77,hr*.81,'#121b2c','#c2b38e',r*.06);
   c.beginPath();c.moveTo(px-r*.55,hy-r*.32);c.quadraticCurveTo(px,hy-r*1.06,px+r*.55,hy-r*.32);c.strokeStyle='#ece1c3';c.lineWidth=r*.08;c.stroke();
   for(const side of [-1,1]){
    ellipse(px+side*r*.275,hy+r*.15,r*.145,happy?r*.075:r*.16,'#f3cf72');
    ellipse(px+side*r*.25,hy+r*.11,r*.045,r*.055,'#fff9cc');
   }
  }
  if(a.emoteTime>0&&a.emote==='love'){c.fillStyle='#ff9fc3';c.font=`bold ${r*.8}px sans-serif`;c.fillText('♥',px+r*.58,hy-r*.65)}
  if(this.selectedId===a.id){c.strokeStyle='#ffe7a0';c.lineWidth=2;c.beginPath();c.ellipse(px,py+r*.20,r*.94,r*.39,0,0,Math.PI*2);c.stroke()}
 }
 render(s,dt){this.stage=s.stage;this.clock+=Math.min(.1,dt||0);const c=this.canvas,ctx=this.ctx,w=c.clientWidth,h=c.clientHeight,dpr=Math.min(1.5,window.devicePixelRatio||1);if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#a7cbd0');sky.addColorStop(.5,'#c9d9c6');sky.addColorStop(1,'#5d8978');if(this.vista?.complete&&this.vista.naturalWidth>0){const im=this.vista,iw=im.naturalWidth,ih=im.naturalHeight,scale=Math.max(w/iw,h/ih),cropW=w/scale,cropH=h/scale;ctx.drawImage(im,(iw-cropW)/2,(ih-cropH)/2,cropW,cropH,0,0,w,h)}else{ctx.fillStyle=sky;ctx.fillRect(0,0,w,h)}ctx.fillStyle='#8cae9866';ctx.beginPath();ctx.moveTo(0,h*.47);for(let x=0;x<w+60;x+=50)ctx.lineTo(x,h*.44-Math.sin(x*.01)*35);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();const tiles=s.stage==='base'?s.tiles:s.stage==='explore'?s.exploreTiles:Array.from({length:63},(_,i)=>({x:i%9,z:Math.floor(i/9),terrain:(i%9===4&&Math.floor(i/9)>1&&Math.floor(i/9)<6)?'river':'grass',feature:null}));for(let sum=0;sum<30;sum++)for(const t of tiles.filter(t=>t.x+t.z===sum)){const colors=['#84b576','#7eac70','#7aa96f','#85b278'];this.diamond(t.x,t.z,({grass:colors[(t.x*3+t.z*7)%4],river:'#4c9bb3',pond:'#57a6bd',lava:'#d96742',cliff:'#939996'})[t.terrain]||colors[0]);if(t.feature==='tree'&&t.quantity>0)this.tree(t.x,t.z);if(t.feature==='stone'&&t.quantity>0)this.rock(t.x,t.z);const b=s.stage==='base'?s.buildings.find(b=>b.x===t.x&&b.z===t.z):null;if(b)this.building(b);for(const a of s.actors.filter(a=>Math.round(a.x)===t.x&&Math.round(a.z)===t.z))this.actor(a)}if(s.stage==='base'&&s.trash){const [x,y]=this.iso(s.trash.x,s.trash.z);this.circle(x,y-10,10,'#aa8975')}if(s.stage==='base'&&s.raid){const [x,y]=this.iso(s.raid.x,s.raid.z);this.circle(x,y-13,18,'#655253');this.circle(x-8,y-19,3,'#ef906e');this.circle(x+8,y-19,3,'#ef906e')}if(s.stage==='battle'){const [x,y]=this.iso(6,1);this.roof(x,y,36,'#ba6660')}for(const fx of s.effects){if(fx.type==='soul'){const [x,y]=this.iso(fx.x,fx.z,1.7+(2-fx.ttl)*.25);this.circle(x,y,7,`rgba(174,239,253,${Math.max(0,fx.ttl/2)})`)}}if(this.previewTile){const [x,y]=this.iso(this.previewTile.x,this.previewTile.z);this.circle(x,y,9,'rgba(255,221,110,.6)')}}
}