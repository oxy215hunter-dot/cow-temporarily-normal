/* One-way travel, independent materials, and one-shot story events. */
(function(root){
  const CHAPTERS=[
    {id:'sun',name:'日光',at:650,width:720,duration:15,title:'太阳一晒，<br>黑色先下班了。',copy:'先从上面开始。<br>底下的还不知道这件事。'},
    {id:'rain',name:'阵雨',at:2650,width:740,duration:16,title:'雨在下。<br>黑色也是。',copy:'淋湿的部分，暂时归雨。<br>牛没带伞。'},
    {id:'cloud',name:'云经过',at:4650,width:760,duration:17,title:'原来花纹，<br>也想当天气。',copy:'搬上去以后，<br>看起来就像一直住在那里。'},
    {id:'tailor',name:'追花纹的男孩',at:6650,width:740,duration:20,title:'风在跑，<br>他在追。',copy:'花纹没有报名。<br>不过已经在路上了。'},
    {id:'milk',name:'一桶白色',at:8650,width:740,duration:17,title:'这一桶，<br>都是白色。',copy:'黑色还在身上。<br>暂时轮不到它。'},
    {id:'moon',name:'借给夜晚',at:10650,width:780,duration:18,title:'黑色里面，<br>有几颗不太黑。',copy:'星星一颗颗出来。<br>出来以后，就不算牛的了。'},
    {id:'ufo',name:'不明来客',at:12650,width:780,duration:17,title:'黑色被带走了。<br>没有留下收据。',copy:'飞碟停得很轻。<br>像是借过很多次了。'}
  ];
  const END=14000,SPEED=172,RUN=330,RECOVER=.10,STRIDE=152;
  const STAR_COUNT=28,STAR_STEP=.034;
  const CLOUD_STEPS=[.018,.25,.50,.75];
  const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
  const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
  function createState(){return {distance:0,ink:1,whiteFill:1,time:0,exposure:0,presence:0,enteredAt:0,chapter:-1,active:null,inkEffect:null,inkAtExit:1,recoverAt:0,escaping:false,escapeUntil:0,velocity:0,ended:false,endedAt:0,auto:false,visited:[],lossRate:0,whiteLossRate:0,idleTime:0,mooAt:-100,nextMoo:10,kickAt:-100,starAt:-100,ufoLeaveAt:-100,gait:0,clouds:[],cloudReleased:[false,false,false,false],events:[],fired:{},milkBeat:-1,recoverBeat:0};}
  function emit(s,name,detail={}){s.events.push({name,time:s.time,...detail});}
  function once(s,key,name=key){if(s.fired[key])return;s.fired[key]=true;emit(s,name);}
  function releaseCloud(s,index){if(s.cloudReleased[index])return;s.cloudReleased[index]=true;s.clouds.push({index,world:s.distance,born:s.time});emit(s,'cloud',{index});}
  function zoneAt(distance){return CHAPTERS.findIndex(c=>Math.abs(distance-c.at)<c.width/2);}
  function update(s,dt,moving){
    dt=clamp(dt,0,.05);s.time+=dt;
    const old=s.active,z=s.ended?-1:zoneAt(s.distance),c=CHAPTERS[z];
    s.active=c?.id||null;s.chapter=z;s.lossRate=0;s.whiteLossRate=0;s.presence=0;
    if(old!==s.active){
      s.enteredAt=s.time;
      if(old){s.recoverAt=s.time+.4;if(old!=='milk')s.inkAtExit=s.ink;}
      if(old==='ufo'&&s.ufoLeaveAt<0){s.ufoLeaveAt=s.time;once(s,'ufo-leave','depart');}
      if(s.active==='moon')once(s,'moon-enter','moon');
      if(s.active==='ufo')once(s,'ufo-enter','ufo');
    }
    if(c){
      if(c.id!=='milk')s.inkEffect=c.id;
      if(!s.visited.includes(z))s.visited.push(z);
      s.presence=Math.max(smooth((c.width/2-Math.abs(s.distance-c.at))/95),smooth((s.time-s.enteredAt)/.35));
      const loss=dt*s.presence/c.duration;
      if(c.id==='milk'){
        s.whiteFill=Math.max(0,s.whiteFill-loss);s.whiteLossRate=loss/dt;
        const beat=Math.floor(s.exposure*17/.95);
        if(s.presence>.85&&beat!==s.milkBeat&&s.whiteFill>.015){s.milkBeat=beat;emit(s,'milk');}
      }else{s.ink=Math.max(0,s.ink-loss);s.lossRate=loss/dt;}
      s.exposure+=loss;
      const lossInk=1-s.ink;
      if(c.id==='cloud')for(let i=0;i<4;i++)if(lossInk>CLOUD_STEPS[i])releaseCloud(s,i);
      if(c.id==='moon'){
        for(let i=0;i<STAR_COUNT;i++)if(lossInk>.018+i*STAR_STEP&&!s.fired['pop-'+i]){
          s.fired['pop-'+i]=true;if(s.starAt<0)s.starAt=s.time;emit(s,'star-pop',{index:i});
          if(i<3)emit(s,'ding');
        }
        if(lossInk>.38)once(s,'constellation','shimmer');
      }
      if(c.id==='ufo'){
        for(let i=0;i<4;i++)if(lossInk>.14+i*.2)once(s,'suction-'+i,'suction');
        if(s.ink<.025&&s.ufoLeaveAt<0){s.ufoLeaveAt=s.time;once(s,'ufo-leave','depart');}
      }
      if((c.id==='milk'?s.whiteFill:s.ink)<=.018&&!s.escaping){
        if(c.id==='milk'&&s.kickAt<0){s.kickAt=s.time;once(s,'kick');}
        if(c.id!=='milk'||s.time-s.kickAt>.85){s.escaping=true;s.escapeUntil=c.at+c.width/2+170;}
      }
    }else{
      const was=Math.min(s.ink,s.whiteFill),rate=s.time<s.recoverAt?0:RECOVER;
      s.ink=Math.min(1,s.ink+rate*dt);s.whiteFill=Math.min(1,s.whiteFill+rate*dt);s.exposure=0;
      const now=Math.min(s.ink,s.whiteFill),bucket=Math.floor(now*4);
      if(now>was&&bucket>s.recoverBeat&&bucket<4)emit(s,'recover');s.recoverBeat=bucket;
    }
    if(c)s.recoverBeat=Math.floor(Math.min(s.ink,s.whiteFill)*4);
    if(s.escaping&&s.distance>=s.escapeUntil)s.escaping=false;
    const kicking=s.active==='milk'&&s.time-s.kickAt<.85;
    const target=s.ended||kicking?0:s.escaping?RUN:moving||s.auto?SPEED:0;
    s.velocity+=(target-s.velocity)*Math.min(1,dt*9);
    if(s.velocity<.06&&target===0)s.velocity=0;
    const travel=s.velocity*dt;s.gait+=travel/STRIDE;
    s.distance=Math.min(END,s.distance+travel);
    if(s.velocity<2&&!kicking){s.idleTime+=dt;}else{s.idleTime=0;s.nextMoo=10;}
    if(s.idleTime>s.nextMoo&&s.time-s.starAt>4){s.mooAt=s.time;s.nextMoo=s.idleTime+29;emit(s,'moo');}
    if(s.distance>=END&&!s.ended){s.ended=true;s.endedAt=s.time;s.velocity=0;s.auto=false;emit(s,'ending');}
    return s;
  }
  const api={CHAPTERS,END,SPEED,RUN,RECOVER,STRIDE,STAR_COUNT,STAR_STEP,CLOUD_STEPS,createState,zoneAt,update,clamp,smooth};root.CowJourney=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

