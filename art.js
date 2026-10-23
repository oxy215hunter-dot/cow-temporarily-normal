/* A quiet one-way paper world. Artwork and foley are local assets. */
(() => {
  'use strict';
  const {CHAPTERS,END,createState,update,clamp}=CowJourney;
  const canvas=document.querySelector('#world'),ctx=canvas.getContext('2d');
  let state=createState(), W=1440,H=900,zoom=1,dpr=1,ground=690,anchor=940,homeAnchor=940,focused=true;
  let held=false,dragging=false,dragX=0,dragBudget=0,lastTime=0,gait=0,emitClock=0,lastCaption='',captionTimer;
  const keys=new Set(),particles=[],puddles=[];
  const C={green:'#2dab61',cream:'#fff2ce',white:'#fff4d6',black:'#141914',peach:'#f4b483',horn:'#ebcf91',grass:'#17633a',shadow:'#227d47',gray:'#8a8a71'};
  const rand=(n)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
  const lerp=(a,b,t)=>a+(b-a)*t;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const paper=document.createElement('canvas');paper.width=paper.height=512;
  const pc=paper.getContext('2d'),noise=pc.createImageData(512,512);
  for(let i=0;i<noise.data.length;i+=4){const n=rand(i)*255;noise.data[i]=n;noise.data[i+1]=n;noise.data[i+2]=n;noise.data[i+3]=45;}
  pc.putImageData(noise,0,0);const grain=ctx.createPattern(paper,'repeat');
  const moonDisk=document.createElement('canvas');moonDisk.width=moonDisk.height=180;
  const moonContext=moonDisk.getContext('2d');moonContext.fillStyle=C.cream;moonContext.beginPath();moonContext.arc(90,90,65,0,Math.PI*2);moonContext.fill();moonContext.globalCompositeOperation='destination-out';moonContext.beginPath();moonContext.arc(117,72,63,0,Math.PI*2);moonContext.fill();
  function path(d,fill=C.black,stroke=null,line=2){const p=new Path2D(d);if(fill){ctx.fillStyle=fill;ctx.fill(p);}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke(p);}return p;}
  function ellipse(x,y,rx,ry,fill=C.black,rot=0){ctx.beginPath();ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),rot,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
  function line(points,color=C.cream,width=3){ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
  function blob(x,y,r,seed=1,color=C.black,sy=1){
    const p=[];for(let i=0;i<9;i++){const a=i/9*Math.PI*2,rr=r*(.72+rand(seed+i)*.33);p.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr*sy]);}
    ctx.beginPath();ctx.moveTo((p[8][0]+p[0][0])/2,(p[8][1]+p[0][1])/2);
    for(let i=0;i<9;i++){const n=p[(i+1)%9];ctx.quadraticCurveTo(p[i][0],p[i][1],(p[i][0]+n[0])/2,(p[i][1]+n[1])/2);}
    ctx.closePath();ctx.fillStyle=color;ctx.fill();
  }
  function cloud(x,y,r,color=C.cream){
    ctx.beginPath();ctx.moveTo(x-r*.8,y+r*.28);ctx.bezierCurveTo(x-r*1.5,y+r*.25,x-r*1.5,y-r*.45,x-r*.78,y-r*.48);ctx.bezierCurveTo(x-r*.84,y-r*1.1,x-r*.13,y-r*1.16,x+r*.03,y-r*.8);ctx.bezierCurveTo(x+r*.5,y-r*1.25,x+r*.94,y-r*.63,x+r*.78,y-r*.34);ctx.bezierCurveTo(x+r*1.55,y-r*.24,x+r*1.28,y+r*.45,x+r*.63,y+r*.36);ctx.bezierCurveTo(x+r*.2,y+r*.8,x-r*.23,y+r*.58,x-r*.38,y+r*.35);ctx.closePath();ctx.fillStyle=color;ctx.fill();
  }
  function star(x,y,r,color=C.cream,rotation=0){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2?r*.43:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();}
  function sparkle(x,y,r,color=C.cream){line([[x-r,y],[x+r,y]],color,2);line([[x,y-r],[x,y+r]],color,2);}
  function resize(){
    const w=innerWidth,h=innerHeight;zoom=Math.min(w/1000,h/850);W=w/zoom;H=h/zoom;dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ground=H*(w/h<.85?.70:.77);homeAnchor=W*(w/h<.85?.53:.66);anchor=homeAnchor;
  }
  addEventListener('resize',resize);resize();
  function sky(c){
    if(Math.abs(state.distance-c.at)>1200)return;
    const t=state.time*(reduced?.2:1);
    let x=anchor+(state.distance-c.at)*.72+140+Math.sin(t*.43+c.at)*3,y=H*(W/H<.9?.42:.23)+Math.sin(t*.69+c.at)*4;
    if(c.id==='cloud')x=anchor+state.distance-c.at+140+Math.sin(t*.43+c.at)*3;
    if(c.id==='ufo'&&state.ufoLeaveAt>0){const q=clamp((state.time-state.ufoLeaveAt)/1.25);x+=q*q*450;y-=q*q*650;if(q>=1)return;}
    if(x<-550||x>W+550)return;
    ctx.save();
    if(c.id==='sun'){
      const r=61;ellipse(x,y,r,r,C.cream);
      for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.sin(t*.2)*.025;line([[x+Math.cos(a)*83,y+Math.sin(a)*83],[x+Math.cos(a)*110,y+Math.sin(a)*110]],C.cream,7);}
      if(state.active==='sun')for(let i=0;i<3;i++){ctx.globalAlpha=(1-state.ink)*.34;const hx=anchor-80+i*95,hy=ground-280;ctx.beginPath();ctx.moveTo(hx,hy);ctx.bezierCurveTo(hx-13,hy-20,hx+16,hy-40,hx,hy-65);ctx.strokeStyle=C.cream;ctx.lineWidth=3;ctx.stroke();}
    }else if(c.id==='rain'){
      cloud(x-55,y+8,90,C.black);cloud(x+68,y-2,65,C.black);
      const left=x-175,right=x+175,top=y+30,bottom=ground-145;
      ctx.globalAlpha=.7;
      for(let i=0;i<52;i++){const xx=left+rand(i+701)*(right-left),len=16+rand(i+9)*12,yy=top+((rand(i+500)*700+t*260)%(Math.max(20,bottom-top)));line([[xx,yy],[xx-9,yy+len]],C.cream,2.8);}
    }else if(c.id==='cloud'){
      cloud(x-130,y+35+Math.sin(t*.4)*5,42);cloud(x+70,y-15+Math.sin(t*.3+1)*5,70);cloud(x+270,y-75,95);
    }else if(c.id==='tailor'){
      for(let i=0;i<4;i++){const xx=x-240+i*110+((t*30)%110),yy=y+50+i*22;ctx.globalAlpha=.36;ctx.beginPath();ctx.moveTo(xx,yy);ctx.bezierCurveTo(xx+55,yy+15,xx+95,yy-30,xx+140,yy-20);ctx.strokeStyle=C.cream;ctx.lineWidth=2;ctx.stroke();}
      blob(x+80+Math.sin(t*.8)*8,y+80,21,5,C.black);blob(x+230,y+10,30,9,C.black);
    }else if(c.id==='moon'){
      ctx.drawImage(moonDisk,x-90,y-90);
      for(let i=0;i<17;i++){const xx=x-370+rand(i+115)*700,yy=y-100+rand(i+45)*260;ctx.globalAlpha=.35+Math.sin(t+i)*.18;sparkle(xx,yy,2+rand(i)*3);}
      const a=state.starAt>0?CowJourney.smooth((1-state.ink-.24)/.48):0;
      if(state.active==='moon'&&a>0)CowPaperArt.constellation(ctx,anchor-20,y+80,a);
    }else if(c.id==='ufo'){
      const uy=y+Math.sin(t*1.4)*9;
      if(state.ufoLeaveAt<0&&Math.abs(state.distance-c.at)<c.width/2+250){ctx.save();ctx.globalAlpha=.12+Math.sin(t*2)*.025;path(`M${x-56} ${uy+36} L${x-220} ${ground-10} Q${x} ${ground+28} ${x+220} ${ground-10} L${x+56} ${uy+36} Z`,C.cream);ctx.restore();}
      ellipse(x,uy+26,113,19,C.black);ellipse(x,uy+14,104,15,C.cream);ellipse(x,uy+9,97,16,C.black);ctx.beginPath();ctx.arc(x,uy-7,41,Math.PI,0);ctx.fillStyle=C.black;ctx.fill();
      ellipse(x,uy-12,17,24,C.cream);ellipse(x,uy-13,9,11,C.black);ellipse(x-4,uy-16,3,4,C.cream,-.4);ellipse(x+4,uy-16,3,4,C.cream,.4);line([[x,uy-48],[x,uy-73]],C.black,3);ellipse(x,uy-76,4,4);
    }
    ctx.restore();
  }
  function grass(){
    const from=Math.floor((state.distance-W)/190),to=Math.ceil((state.distance+W)/190);
    for(let i=from;i<to;i++){
      const x=anchor+state.distance-i*190,yy=ground+rand(i+23)*85-12;
      if(x<-50||x>W+50)continue;const s=.55+rand(i+51)*.6;
      ctx.save();ctx.translate(x,yy);ctx.scale(s,s);ctx.rotate(Math.sin(state.time*.9+i)*.035*(reduced?.2:1));ctx.globalAlpha=.48;
      path('M-2 0 Q-16 -26 -11 -29 Q-6 -29 2 -1 Q2 -43 8 -37 Q13 -33 7 0 Q22 -26 25 -21 Q27 -16 11 3 Z',C.grass);
      ellipse(-25,2,3,4,C.grass,-.4);ellipse(25,6,3,2,C.grass);ctx.restore();
    }
  }
  function emit(dt){
    emitClock+=dt;
    if(!state.active||state.ink<=0||emitClock<.14)return;
    emitClock=0;const loss=1-state.ink;if(loss<.015)return;
    const id=state.active;if(id==='milk'||id==='moon')return;
    if(id==='cloud'||id==='tailor'||id==='ufo')return;
    const n=particles.length+state.time*13,origin=CowPaperArt.emission(state,n);
    const p={kind:id,world:state.distance,x:origin.x,y:ground+origin.y,age:0,life:7,seed:n,spin:rand(n+2)*3,r:6+rand(n+3)*9};
    if(id==='sun'||id==='rain'){p.vx=rand(n+1)*14-7;p.vy=25+rand(n+2)*35;p.r=3+rand(n+3)*5;p.life=3;}
    if(id==='cloud'){p.r=15+rand(n+2)*20;p.vx=15+rand(n+1)*25;p.vy=-38-rand(n+2)*25;p.life=10;}
    if(id==='tailor'){p.r=17+rand(n+2)*13;p.vx=80+rand(n+1)*45;p.vy=-22-rand(n+2)*45;p.life=7;}
    if(id==='moon'){p.r=5+rand(n+2)*6;p.vx=rand(n+1)*50-25;p.vy=-55-rand(n+2)*25;p.life=7;}
    if(id==='ufo'){p.r=14+rand(n+2)*12;p.vx=8;p.vy=-100;p.life=5;}
    particles.push(p);
    if(particles.length>200)particles.shift();
  }
  function drawParticles(dt){
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];p.age=p.born===undefined?p.age+dt:state.time-p.born;
      if(p.kind==='sun'&&state.active!=='sun'){particles.splice(i,1);continue;}
      if(p.age>p.life){particles.splice(i,1);continue;}
      let x=anchor+state.distance-p.world+p.x+p.vx*p.age,y=p.y+p.vy*p.age;
      if(p.kind==='sun'||p.kind==='rain'){
        y+=p.age*p.age*130;
        if(y>=ground){if(p.kind!=='sun')puddles.push({world:p.world-p.x-p.vx*p.age,age:0,r:10+p.r*2});particles.splice(i,1);continue;}
      }
      ctx.save();ctx.globalAlpha=clamp((p.life-p.age)/1.5);
      if(p.kind==='cloud'){
        const f=clamp((p.age-2)/3),color=`rgb(${lerp(20,255,f)},${lerp(25,242,f)},${lerp(20,206,f)})`;
        cloud(x+Math.sin(p.age*2+p.seed)*7,y,p.r*(1+p.age*.04),color);
        if(p.age<1.2){ctx.globalAlpha*=.6;line([[x-15,y+25],[x-20,y+40]],C.cream,2);}
      }else if(p.kind==='tailor'){
        ctx.translate(x,y);ctx.rotate(p.spin+p.age*.6);blob(0,0,p.r,p.seed);ctx.globalAlpha*=.7;line([[-p.r*.8,-5],[-p.r*1.5,-12]],C.cream,2);
      }else if(p.kind==='moon'){
        const flight=Math.max(0,p.age-.35);x=anchor+state.distance-p.world+p.x+p.vx*flight;y=p.y+p.vy*flight;
        star(x,y,p.r,C.cream,p.age*.3);sparkle(x+12,y+5,2,C.cream);
      }else if(p.kind==='ufo'){
        const c=CHAPTERS[6],ux=anchor+(state.distance-c.at)*.72+140,uy=H*(W/H<.9?.36:.23);
        const a=clamp(p.age/3);x=lerp(x,ux,a*a);y=lerp(y,uy,a);ctx.translate(x,y);ctx.scale(1-a*.75,1+a*.7);blob(0,0,p.r,p.seed);
      }else{
        ctx.translate(x,y);path(`M0 ${-p.r*1.7} C${-p.r*.1} ${-p.r*.7} ${-p.r} 0 ${-p.r*.7} ${p.r*.6} Q0 ${p.r*1.5} ${p.r*.7} ${p.r*.6} C${p.r} 0 ${p.r*.1} ${-p.r*.7} 0 ${-p.r*1.7} Z`,p.kind==='rain'&&rand(p.seed)>.45?C.gray:C.black);
      }
      ctx.restore();
    }
    if(puddles.length>150)puddles.splice(0,puddles.length-150);
  }
  function drawPuddles(dt){
    for(let i=puddles.length-1;i>=0;i--){const p=puddles[i];p.age+=dt;if(p.age>25){puddles.splice(i,1);continue;}const x=anchor+state.distance-p.world;ctx.save();ctx.globalAlpha=clamp((25-p.age)/6)*.9;blob(x,ground+7,p.r,Math.floor(p.world),C.black,.18);ctx.restore();}
  }
  const route=document.querySelector('#route');
  CHAPTERS.forEach((c,i)=>{const dot=document.createElement('button');dot.type='button';dot.className='route-dot';dot.style.right=`${c.at/END*100}%`;dot.title=`${i+1} · ${c.name}`;dot.setAttribute('aria-label',`跳到第${i+1}关：${c.name}`);dot.addEventListener('click',e=>{e.stopPropagation();jump(i);});route.append(dot);});
  const routeCow=document.createElement('span');routeCow.className='route-cow';route.append(routeCow);
  route.title='点击进度条，跳到对应关卡';
  route.addEventListener('click',e=>{const rect=route.getBoundingClientRect(),distance=clamp((rect.right-e.clientX)/rect.width)*END;let nearest=0;CHAPTERS.forEach((c,i)=>{if(Math.abs(c.at-distance)<Math.abs(CHAPTERS[nearest].at-distance))nearest=i;});jump(nearest);});
  function caption(){
    let key,eyebrow,title,copy;
    if(state.active){const c=CHAPTERS[state.chapter];key=c.id;eyebrow=`0${state.chapter+1} — ${c.name}`;title=c.title;copy=c.copy;}
    else if(state.distance<CHAPTERS[0].at){key='intro';eyebrow='一头牛 / 黑白暂时齐全';title='奶牛<br>暂时正常。';copy='它打算出去走走。<br>黑白各有各的打算。';}
    else{const next=CHAPTERS.find(c=>c.at>state.distance);key=`rest-${next?.id||'end'}`;eyebrow=next?`留白 — 下一站 · ${next.name}`:'卷尾 — 暂时正常';title='花纹慢慢回来。<br>像什么也没发生。';copy='这段路没有别的事。<br>正好，等身上的黑白归位。';}
    if(key!==lastCaption){
      lastCaption=key;clearTimeout(captionTimer);const el=document.querySelector('#chapter');el.classList.add('changing');
      captionTimer=setTimeout(()=>{document.querySelector('#chapter-kicker').textContent=eyebrow;document.querySelector('#chapter-title').innerHTML=title;document.querySelector('#chapter-copy').innerHTML=copy;el.classList.remove('changing');},260);
    }
    const swatch=document.querySelector('#ink-swatch');swatch.style.transform=`rotate(-14deg) scale(${.12+(state.active==='milk'?state.whiteFill:state.ink)*.88})`;swatch.style.background=state.active==='milk'?'#fff1cf':'#14261c';
    document.querySelector('#ink-label').textContent=state.escaping?'它决定先跑了':state.active==='milk'?(state.whiteFill>.2?'白色慢慢进桶':'白色暂时不在'):!state.active&&state.whiteFill<.99?'白色正在回来':state.active?(state.ink>.7?'黑色开始出走':state.ink>.2?'黑色慢慢离开':'黑色暂时不在'):(state.ink<.99?'花纹陆续回来':'黑色暂时齐全');
    document.querySelectorAll('.route-dot').forEach((dot,i)=>{dot.classList.toggle('passed',state.distance>CHAPTERS[i].at+CHAPTERS[i].width/2);dot.classList.toggle('current',state.chapter===i);if(state.chapter===i)dot.setAttribute('aria-current','step');else dot.removeAttribute('aria-current');});
    routeCow.style.right=`${state.distance/END*100}%`;
    document.querySelector('#walk').classList.toggle('active',held||keys.size>0||dragging||state.escaping);
    document.querySelector('#walk-label').textContent=state.escaping?'先走一步':'按住，往前走';
    document.querySelector('#auto').setAttribute('aria-pressed',String(state.auto));
    document.querySelector('#auto').innerHTML=state.auto?'停下来看看 <span>Ⅱ</span>':'自己走走 <span>↤</span>';
    document.body.classList.toggle('ended',state.ended);document.querySelector('#ending').hidden=!(state.ended&&state.time-state.endedAt>.8);
  }
  function frame(ms){
    const dt=Math.min((ms-(lastTime||ms))/1000,1);lastTime=ms;
    if(!CowPaperArt.ready){requestAnimationFrame(frame);return;}
    if(!document.hidden){
      const dragMove=dragBudget>0,previousDistance=state.distance;
      for(let remaining=dt;remaining>0;remaining-=.05)update(state,Math.min(remaining,.05),held||keys.size>0||dragMove);
      if(dragMove)dragBudget=Math.max(0,dragBudget-(state.distance-previousDistance));
      gait=state.gait*Math.PI*2;
      anchor=homeAnchor-(homeAnchor-Math.max(320,W*.24))*CowJourney.smooth((state.distance-13500)/500);
      const events=state.events.splice(0);CowAudio.events(events);CowAudio.update(state,dt);
      for(const e of events)if(e.name==='star-pop'){const n=e.index,origin=CowPaperArt.starOrigin(state,n);particles.push({kind:'moon',world:state.distance,x:origin.x,y:ground+origin.y,age:0,born:e.time,life:4.2,seed:n,spin:0,r:4+rand(n)*4,vx:(-20-origin.x)/4+rand(n+1)*8-4,vy:-60-rand(n+2)*30});}
      ctx.setTransform(dpr*zoom,0,0,dpr*zoom,0,0);ctx.globalAlpha=1;ctx.fillStyle=C.green;ctx.fillRect(0,0,W,H);
      CowPaperArt.background(ctx,W,H);CHAPTERS.forEach(sky);grass();drawPuddles(dt);CowPaperArt.draw(ctx,state,anchor,ground,gait,reduced);CowPaperArt.skyClouds(ctx,state,anchor,ground,H,W);
      for(const c of CHAPTERS)if(c.id==='tailor'||c.id==='milk')CowPaperArt.figure(ctx,c,state,anchor,ground);
      emit(dt);drawParticles(dt);
      ctx.save();ctx.globalAlpha=.065;ctx.globalCompositeOperation='soft-light';ctx.fillStyle=grain;ctx.fillRect(0,0,W,H);ctx.restore();
      // A very subtle second grain layer keeps the cream and ink on the same paper.
      ctx.save();ctx.globalAlpha=.009;ctx.fillStyle=grain;ctx.fillRect(0,0,W,H);ctx.restore();
      caption();
    }
    requestAnimationFrame(frame);
  }
  const walk=document.querySelector('#walk');
  walk.addEventListener('pointerdown',e=>{if(state.ended)return;state.auto=false;CowAudio.activate().catch(()=>{});held=true;walk.setPointerCapture(e.pointerId);e.preventDefault();});
  const release=()=>{held=false;dragging=false;};
  addEventListener('pointerup',release);addEventListener('pointercancel',release);
  addEventListener('keydown',e=>{if(['ArrowLeft','a','A',' '].includes(e.key)&&!e.repeat){if(e.target.tagName==='BUTTON'&&e.key===' ')return;state.auto=false;CowAudio.activate().catch(()=>{});keys.add(e.key);e.preventDefault();}});
  addEventListener('keyup',e=>keys.delete(e.key));
  addEventListener('blur',()=>{focused=false;keys.clear();release();dragBudget=0;CowAudio.pause();});
  addEventListener('focus',()=>{focused=true;lastTime=0;CowAudio.resume();});
  document.addEventListener('visibilitychange',()=>{lastTime=0;if(document.hidden){keys.clear();release();dragBudget=0;CowAudio.pause();}else if(focused)CowAudio.resume();});
  canvas.addEventListener('pointerdown',e=>{state.auto=false;dragging=true;dragX=e.clientX;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-dragX;dragX=e.clientX;if(dx>0)dragBudget=Math.min(dragBudget+dx/zoom*1.3,900);});
  canvas.addEventListener('wheel',e=>{e.preventDefault();state.auto=false;CowAudio.activate().catch(()=>{});const n=e.deltaX||e.deltaY;if(n>0)dragBudget=Math.min(dragBudget+n/zoom,900);},{passive:false});
  document.querySelector('#auto').addEventListener('click',()=>{if(!state.ended){state.auto=!state.auto;dragBudget=0;}});
  function restart(){CowAudio.reset();state=createState();particles.length=0;puddles.length=0;keys.clear();release();dragBudget=0;gait=0;lastCaption='';caption();}
  function jump(index){CowAudio.reset(false);state=createState();state.distance=CHAPTERS[index].at;particles.length=0;puddles.length=0;keys.clear();release();dragBudget=0;gait=0;lastCaption='';update(state,1/60,false);caption();}
  document.querySelector('#restart').addEventListener('click',restart);document.querySelector('#again-end').addEventListener('click',restart);
  document.querySelector('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{document.querySelector('#hint').textContent='当前窗口不支持全屏，可以在浏览器中放大观看。';}});
  if(reduced)document.querySelector('#hint').textContent='按住 ← / A 向前走 · 点击进度条跳关 · 已减缓装饰动作';
  window.CowExperience={get state(){return state;},restart};
  caption();requestAnimationFrame(frame);
})();
