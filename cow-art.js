/* Registered paper layers: continuous gait, liquid white material, and original ink. */
(() => {
  const {clamp,smooth}=CowJourney,TAU=Math.PI*2,SCALE=.405;
  const gaitSprites={},sprites={},manifest=window.COW_ART_DATA,make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const materialNames=['body','head','tail',...manifest.legs];
  let ready=false,silhouetteData,constellationOutline;
  const loads=Object.entries(manifest.sprites).map(([name,d])=>new Promise(resolve=>{
    const image=new Image();image.onload=()=>{sprites[name]={...d,image};resolve();};image.src=d.data;
  }));
  const gaitLoads=Object.entries(window.COW_GAIT_DATA.legs).map(([name,d])=>new Promise(resolve=>{const image=new Image();image.onload=()=>{gaitSprites[name]={...d,image};resolve();};image.src=d.data;}));
  function prepare(p){
    const c=make(p.w,p.h),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(p.image,0,0);
    const data=g.getImageData(0,0,p.w,p.h),white=g.createImageData(p.w,p.h),solid=g.createImageData(p.w,p.h),outline=g.createImageData(p.w,p.h);
    for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++){
      const j=(y*p.w+x)*4,d=data.data;if(!d[j+3])continue;
      const faceDetail=p===sprites.head&&(p.y+y<245||(p.x+x-259)**2+(p.y+y-287)**2<30**2);
      const cream=!faceDetail&&d[j]>170&&d[j+1]>160&&d[j+2]>125&&d[j]-d[j+2]<96;
      (cream?white:solid).data.set(d.subarray(j,j+4),j);
      const absolute=((p.y+y)*1536+p.x+x)*4;
      if(d[j+3]>100&&(silhouetteData[absolute-8+3]<80||silhouetteData[absolute+8+3]<80||silhouetteData[absolute-1536*8+3]<80||silhouetteData[absolute+1536*8+3]<80)){
        outline.data[j]=48;outline.data[j+1]=73;outline.data[j+2]=47;outline.data[j+3]=210;
      }
    }
    for(const [name,data]of Object.entries({white,solid,outline})){p[name]=make(p.w,p.h);p[name].getContext('2d').putImageData(data,0,0);}
    p.glass=make(p.w,p.h);const glass=p.glass.getContext('2d');glass.drawImage(p.white,0,0);glass.globalCompositeOperation='source-in';
    const sheen=glass.createLinearGradient(-p.x,0,1536-p.x,0);for(const [at,a]of [[0,.04],[.28,.07],[.43,.23],[.48,.06],[.65,.04],[.74,.17],[.81,.05],[1,.07]])sheen.addColorStop(at,`rgba(255,249,227,${a})`);glass.fillStyle=sheen;glass.fillRect(0,0,p.w,p.h);
    p.cache=make(p.w,p.h);p.lift=0;
  }
  Promise.all([...loads,...gaitLoads]).then(()=>{
    const c=make(1536,1024),g=c.getContext('2d',{willReadFrequently:true});for(const n of materialNames){const p=sprites[n];g.drawImage(p.image,p.x,p.y);}silhouetteData=g.getImageData(0,0,1536,1024).data;
    constellationOutline=make(1536,1024);const og=constellationOutline.getContext('2d'),edge=og.createImageData(1536,1024);
    for(let y=4;y<1020;y++)for(let x=4;x<1532;x++){const j=(y*1536+x)*4;if(silhouetteData[j+3]>100&&(silhouetteData[j-16+3]<80||silhouetteData[j+16+3]<80||silhouetteData[j-1536*16+3]<80||silhouetteData[j+1536*16+3]<80)){edge.data[j]=255;edge.data[j+1]=241;edge.data[j+2]=207;edge.data[j+3]=190;}}og.putImageData(edge,0,0);
    materialNames.forEach(n=>prepare(sprites[n]));
    for(const n of manifest.patches){const p=sprites[n],c=make(p.w,p.h),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(p.image,0,0);const pixels=g.getImageData(0,0,p.w,p.h).data;p.sites=[];for(let y=4;y<p.h-4;y+=3)for(let x=4;x<p.w-4;x+=3)if([[0,0],[-3,0],[3,0],[0,-3],[0,3]].every(([dx,dy])=>pixels[((y+dy)*p.w+x+dx)*4+3]>230))p.sites.push({x:p.x+x,y:p.y+y});}
    ready=true;
  });
  function material(p,s){
    if(s.whiteFill>.999)return p.image;
    const g=p.cache.getContext('2d');g.clearRect(0,0,p.w,p.h);
    g.globalAlpha=(1-s.whiteFill)*.12;g.drawImage(p.white,0,0);g.globalAlpha=1-s.whiteFill;g.drawImage(p.glass,0,0);
    g.globalAlpha=(1-s.whiteFill)*.65;g.drawImage(p.outline,0,0);g.globalAlpha=1;g.drawImage(p.solid,0,0);
    if(s.whiteFill>.001){
      const edge=276+(1-s.whiteFill)*710;
      g.save();g.beginPath();g.moveTo(-1,p.h+1);g.lineTo(-1,edge-p.y);
      for(let x=0;x<=p.w+12;x+=12)g.lineTo(x,edge-p.y+Math.sin((x+p.x)*.024+s.time*1.7)*3);
      g.lineTo(p.w+1,p.h+1);g.closePath();g.clip();g.drawImage(p.white,0,0);g.restore();
    }return p.cache;
  }
  function cloud(c,x,y,r,color='#fff1cf'){
    c.beginPath();c.moveTo(x-r*.83,y+r*.3);c.bezierCurveTo(x-r*1.4,y+r*.23,x-r*1.36,y-r*.43,x-r*.76,y-r*.47);c.bezierCurveTo(x-r*.8,y-r*1.04,x-r*.12,y-r*1.1,x+r*.03,y-r*.76);c.bezierCurveTo(x+r*.5,y-r*1.19,x+r*.96,y-r*.6,x+r*.79,y-r*.3);c.bezierCurveTo(x+r*1.48,y-r*.19,x+r*1.24,y+r*.44,x+r*.6,y+r*.37);c.bezierCurveTo(x+r*.18,y+r*.71,x-r*.2,y+r*.54,x-r*.37,y+r*.34);c.closePath();c.fillStyle=color;c.fill();
  }
  function star(c,x,y,r,color='#fff1cf'){
    c.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,rr=k%2?r*.38:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fillStyle=color;c.fill();
  }
  function leg(c,p,s,bob){
    const rig=gaitSprites[p.name],res=window.COW_GAIT_DATA.resolution;
    const walking=smooth(clamp(s.velocity/80)),rest=window.COW_GAIT_DATA.stance/2,phase=rest+((s.gait+p.phase)%1-rest)*walking,index=Math.round(phase*48)%48,pose=rig.poses[index];
    const sx=(index%rig.cols)*rig.w,sy=Math.floor(index/rig.cols)*rig.h;
    const wantedLift=pose.lift*smooth(clamp(s.velocity/65)),scaleY=(963-wantedLift-bob/SCALE-p.hip[1])/(963-pose.lift-p.hip[1]);
    const age=s.time-s.kickAt,kick=p.name==='hindNear'&&age>0&&age<.72?Math.sin(Math.PI*age/.72):0;
    p.lift=wantedLift+kick*100;p.currentFootX=pose.footX;
    c.save();c.translate(...p.hip);c.rotate(-kick*.5);c.scale(1,scaleY);c.translate(-p.hip[0],-p.hip[1]);
    const draw=()=>c.drawImage(rig.image,sx,sy,rig.w,rig.h,rig.x,rig.y,rig.w/res,rig.h/res);
    if(s.whiteFill>.999)draw();
    else{
      if(!rig.glass)rig.glass=make(rig.w,rig.h);
      if(rig.glassIndex!==index){const g=rig.glass.getContext('2d'),body=sprites.body;g.globalCompositeOperation='source-over';g.clearRect(0,0,rig.w,rig.h);g.drawImage(rig.image,sx,sy,rig.w,rig.h,0,0,rig.w,rig.h);g.globalCompositeOperation='destination-out';g.drawImage(body.white,(body.x-rig.x)*res,(body.y-rig.y)*res,body.w*res,body.h*res);g.globalCompositeOperation='source-over';rig.glassIndex=index;}
      c.globalAlpha=(1-s.whiteFill)*.18;c.drawImage(rig.glass,rig.x,rig.y,rig.w/res,rig.h/res);c.globalAlpha=1;
      if(!rig.outline)rig.outline=make(rig.w,rig.h);
      if(rig.outlineIndex!==index){
        const g=rig.outline.getContext('2d');g.clearRect(0,0,rig.w,rig.h);g.globalCompositeOperation='source-over';
        for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]])g.drawImage(rig.image,sx,sy,rig.w,rig.h,dx,dy,rig.w,rig.h);
        g.globalCompositeOperation='source-in';g.fillStyle='#30492f';g.fillRect(0,0,rig.w,rig.h);g.globalCompositeOperation='destination-out';g.drawImage(rig.image,sx,sy,rig.w,rig.h,0,0,rig.w,rig.h);g.globalCompositeOperation='source-over';g.clearRect(0,0,rig.w,Math.max(0,(p.hip[1]+26-rig.y)*res));rig.outlineIndex=index;
      }
      c.globalAlpha=(1-s.whiteFill)*.7;c.drawImage(rig.outline,rig.x,rig.y,rig.w/res,rig.h/res);c.globalAlpha=1;
      const edge=276+(1-s.whiteFill)*710;
      c.save();c.beginPath();c.moveTo(rig.x-2,1100);c.lineTo(rig.x-2,edge);for(let x=rig.x;x<=rig.x+rig.w/res+8;x+=12)c.lineTo(x,edge+Math.sin(x*.024+s.time*1.7)*3);c.lineTo(rig.x+rig.w/res+8,1100);c.closePath();c.clip();draw();c.restore();
      c.drawImage(p.solid,p.x+pose.dx,p.y+pose.dy);
    }c.restore();
  }
  function pigment(c,p,index,s){
    const loss=1-s.ink,t=s.time,kind=s.active==='milk'||!s.active?s.inkEffect:s.active;
    if(kind==='cloud'){
      if(s.active==='cloud'&&s.cloudReleased[index])return;
      const regrown=smooth(clamp((s.ink-s.inkAtExit)/Math.max(.001,1-s.inkAtExit)));
      c.save();c.globalAlpha=s.cloudReleased[index]?regrown:1;c.drawImage(p.image,p.x,p.y);c.restore();return;
    }
    if(kind==='tailor'||kind==='ufo'){
      if(s.active!==kind){const lost=clamp(((1-s.inkAtExit)-index*.16)/.49),regrown=smooth(clamp((s.ink-s.inkAtExit)/Math.max(.001,1-s.inkAtExit)));c.save();c.globalAlpha=(1-lost)*(1-lost)+(1-(1-lost)*(1-lost))*regrown;c.drawImage(p.image,p.x,p.y);c.restore();return;}
      const progress=clamp((loss-index*.16)/.49),q=1-(1-progress)*(1-progress),target=800+(140+.72*(s.distance-CowJourney.CHAPTERS[6].at))/SCALE;
      c.save();c.translate(kind==='tailor'?q*600:q*(target-p.cx),-q*(kind==='tailor'?330:900));c.translate(p.cx,p.cy);
      c.rotate(kind==='tailor'?q*.7:Math.sin(t*1.7+index)*q*.05);c.scale(1-q*.24,1+q*(kind==='ufo'?1:.05));c.translate(-p.cx,-p.cy);
      c.globalAlpha=clamp((1-q)*6);c.drawImage(p.image,p.x,p.y);c.restore();return;
    }
    c.save();
    if(kind==='sun'||kind==='rain'||kind==='moon'){
      if(s.ink<.005){c.restore();return;}
      const edge=p.y+loss*(p.h+4),ripple=clamp(loss*18);
      c.beginPath();c.moveTo(p.x-4,1024);c.lineTo(p.x-4,edge);
      for(let x=p.x;x<p.x+p.w+10;x+=8)c.lineTo(x,edge+(Math.sin(x*.035+t*.6)*6+Math.sin(x*.012)*5)*ripple);
      c.lineTo(p.x+p.w+10,1024);c.closePath();c.clip();c.drawImage(p.image,p.x,p.y+(kind==='sun'?loss*14:0));
      if(kind==='sun'&&s.active==='sun'&&loss>.015){
        for(let k=0;k<2;k++){
          const x=p.cx+(k-.5)*p.w*.22,y=p.y+p.h-12+loss*18,len=loss*52*(.8+.2*Math.sin(t*1.4+k+index));
          if(y<edge+8)continue;
          c.beginPath();c.moveTo(x-6,y);c.bezierCurveTo(x-4,y+len*.35,x-6,y+len,x,y+len+7);c.bezierCurveTo(x+8,y+len,x+3,y+len*.35,x+6,y);c.fillStyle='#141811';c.fill();
        }
      }
    }else if(s.ink>.998){c.drawImage(p.image,p.x,p.y);}
    else{
      const r=p.r*Math.pow(s.ink,.72);c.beginPath();
      for(let i=0;i<=60;i++){const a=i/60*TAU,rr=r*(1+Math.sin(a*7)*.05);c.lineTo(p.cx+Math.cos(a)*rr,p.cy+Math.sin(a)*rr);}c.closePath();c.clip();c.drawImage(p.image,p.x,p.y);
    }c.restore();
  }
  function drawHead(c,s){
    const p=sprites.head,age=s.time-s.mooAt;
    const moo=age>0&&age<2.8?Math.sin(Math.PI*age/2.8):0;
    let angle=moo*.115+Math.sin(s.time*1.05)*.004;
    c.save();c.translate(...p.pivot);c.rotate(angle);c.translate(-p.pivot[0],-p.pivot[1]);c.drawImage(material(p,s),p.x,p.y);
    const phase=s.time%6.7,blink=phase>5.75&&phase<5.99?Math.sin((phase-5.75)/.24*Math.PI):0;
    if(blink>0){
      const x=259,y=287;c.fillStyle='#111610';c.beginPath();c.ellipse(x,y,30,30,0,0,TAU);c.fill();
      c.fillStyle='#fff1cf';c.beginPath();c.ellipse(x,y,23,Math.max(1,23*(1-blink)),0,0,TAU);c.fill();c.fillStyle='#111610';c.beginPath();c.ellipse(x,y,14,Math.max(.5,14*(1-blink)),0,0,TAU);c.fill();
    }
    c.restore();
  }
  window.CowPaperArt={
    get ready(){return ready;},
    background(c,w,h){if(ready){c.save();c.fillStyle=c.createPattern(sprites.background.image,'repeat');c.fillRect(0,0,w,h);c.restore();}},
    draw(c,s,anchor,ground){
      if(!ready)return;
      manifest.legs.forEach(n=>{sprites[n].name=n;});
      const moving=clamp(s.velocity/172),bob=Math.sin(s.gait*TAU*2)*.65*moving;
      c.save();c.translate(anchor,ground+bob);c.scale(SCALE,SCALE);c.translate(-800,-963);
      const tail=sprites.tail;c.save();c.translate(...tail.pivot);c.rotate(Math.sin(s.time*.85)*.025+Math.sin(s.time*2.7)*.012);c.translate(-tail.pivot[0],-tail.pivot[1]);c.drawImage(material(tail,s),tail.x,tail.y);c.restore();
      for(const n of ['frontFar','hindFar'])leg(c,sprites[n],s,bob);
      const body=sprites.body;c.save();c.translate(800,450);c.scale(1,1+Math.sin(s.time*1.22)*.0017);c.translate(-800,-450);c.drawImage(material(body,s),body.x,body.y);c.restore();
      manifest.patches.forEach((n,i)=>pigment(c,sprites[n],i,s));
      for(const n of ['frontNear','hindNear'])leg(c,sprites[n],s,bob);
      drawHead(c,s);c.restore();
      c.save();c.fillStyle='#16572d';
      for(const n of manifest.legs){const p=sprites[n];c.globalAlpha=.13*(1-clamp(p.lift/40));c.beginPath();c.ellipse(anchor+(p.currentFootX-800)*SCALE,ground+2,17,2.3,0,0,TAU);c.fill();}c.restore();
    },
    skyClouds(c,s,anchor,ground,H,W){
      if(!ready)return;
      for(const item of s.clouds){
        const p=sprites[manifest.patches[item.index]],age=s.time-item.born,flight=clamp(age/2.4),q=1-Math.pow(1-flight,3);
        const skyBase=H*(W/H<.9?.42:.23),cWorld=CowJourney.CHAPTERS[2].at;
        const targetX=anchor+s.distance-cWorld+[-280,-130,80,300][item.index];
        const startX=anchor+s.distance-item.world+(p.cx-800)*SCALE;
        const x=startX*(1-q)+targetX*q+Math.sin(age*.55+item.index)*3*q;
        const y=(ground+(p.cy-963)*SCALE)*(1-q)+(skyBase+[10,-50,-95,70][item.index])*q+Math.sin(age*.7+item.index)*3*q;
        if(x<-150||x>W+150)continue;
        c.save();cloud(c,x,y,p.r*.4*SCALE*(.88+.12*flight));if(flight<.6){c.strokeStyle=`rgba(25,69,43,${.35*(1-flight/.6)})`;c.lineWidth=.8;c.stroke();}c.restore();
      }
    },
    constellation(c,x,y,alpha){
      if(!ready)return;
      c.save();c.globalAlpha=alpha*.85;c.translate(x,y);c.scale(.19,.19);c.translate(-800,-500);c.drawImage(constellationOutline,0,0);
      c.strokeStyle='#fff1cf';c.lineWidth=2;c.setLineDash([5,12]);
      const points=[[145,340],[260,280],[420,370],[710,405],[1135,390],[1270,690],[1280,935],[1060,700],[960,935],[710,650],[470,675],[340,915],[620,935],[420,370]];
      c.beginPath();points.forEach(([xx,yy],i)=>i?c.lineTo(xx,yy):c.moveTo(xx,yy));c.stroke();c.setLineDash([]);
      for(const [xx,yy]of points)star(c,xx,yy,10);
      c.restore();
    },
    figure(c,chapter,s,anchor,ground){
      if(!ready)return;
      const delta=s.distance-chapter.at,working=s.active===chapter.id;
      if(chapter.id==='milk'){
        const p=sprites.farmer,blend=working?s.presence:0,x=anchor+80+delta*(1-blend),age=s.time-s.kickAt;
        const recoil=age>0&&age<1.4?Math.sin(Math.PI*clamp(age/1.4))*24:0;
        c.save();c.translate(x+85+recoil,ground);c.rotate(recoil*.002+(working?Math.sin(s.exposure*17*TAU/.95)*.007:0));c.drawImage(p.image,-85,-465*.38,360*.38,480*.38);
        if(working&&blend>.9){
          const g=c,fill=1-s.whiteFill,level=438-fill*115;
          g.save();g.translate(-85,-465*.38);g.scale(.38,.38);
          g.beginPath();g.moveTo(23,level);g.quadraticCurveTo(75,level-5,119,level);g.lineTo(110,436);g.quadraticCurveTo(73,446,31,435);g.closePath();g.fillStyle='#fff1cf';g.globalAlpha=.9;g.fill();g.restore();
        }c.restore();
        if(working&&blend>.9&&s.whiteFill>.015&&recoil<4){
          const beat=(s.exposure*17/.95)%1,pulse=Math.sin(beat*Math.PI);
          if(pulse>.15){c.save();c.strokeStyle='#fff4da';c.lineWidth=1.8+pulse;c.lineCap='round';c.beginPath();c.moveTo(anchor+100,ground-91);c.quadraticCurveTo(x+25,ground-83,x+27,ground-59);c.stroke();c.restore();}
        }
      }else if(chapter.id==='tailor'){
        const p=sprites.boy,chase=working?(1-s.ink)*120:0,x=anchor+delta-120+chase,phase=s.time*6.7;
        c.save();c.translate(x+60,ground-(working?Math.max(0,Math.sin(phase))*1.5:0));c.rotate(working?Math.sin(phase*.5)*.009:0);c.drawImage(p.image,-60,-645*.28,420*.28,660*.28);c.restore();
      }
    },
    starOrigin(s,index){
      let point;
      for(let i=0;i<4&&!point;i++){const p=sprites[manifest.patches[(index+i)%4]],edge=p.y+(1-s.ink)*(p.h+4),sites=p.sites.filter(q=>q.y>=edge+13);if(sites.length)point=sites[index*37%sites.length];}
      if(!point){const p=sprites[manifest.patches[index%4]];point=p.sites[p.sites.length-1];}
      return {x:(point.x-800)*SCALE,y:(point.y-963)*SCALE};
    },
    emission(s,seed){
      const index=Math.floor(seed)%manifest.patches.length,p=sprites[manifest.patches[index]];
      if(!p)return {x:0,y:-150};
      if(s.active==='sun')return {x:(p.cx-800)*SCALE,y:(Math.min(p.y+p.h+(1-s.ink)*40,880)-963)*SCALE};
      if(s.active==='rain')return {x:(p.cx-800)*SCALE,y:(p.y+(1-s.ink)*p.h-963)*SCALE};
      return {x:(p.cx-800)*SCALE,y:(p.cy-963)*SCALE};
    }
  };
})();

