/* Quiet musical bed, authored foley, and event-synchronous playback. */
(() => {
  const button=document.querySelector('#sound'),cache={},playing=new Set(),history=[],decoded=new Set();
  let context,bus,unlocked=false,enabled=true,paused=false,hum=null,duckUntil=0,milkCount=0,serial=0;
  const data=window.COW_AUDIO_DATA||{},music=new Audio(data.music||'assets/audio/wandering.mp3');
  music.loop=true;music.preload='metadata';music.volume=0;
  const names=['moo','milk','bucket','drain','kick','recover','moon','ding','star-pop','shimmer','suction','depart','cloud'];
  function label(){button.textContent=enabled?'声音 · 开':'声音 · 关';button.setAttribute('aria-pressed',String(enabled));}
  async function activate(){
    if(!context){
      context=new (window.AudioContext||window.webkitAudioContext)();bus=context.createGain();bus.gain.value=.56;bus.connect(context.destination);
      for(const name of names)cache[name]=fetch(data[name]||'assets/audio/'+name+'.wav').then(r=>r.arrayBuffer()).then(b=>context.decodeAudioData(b)).then(buffer=>{decoded.add(name);return buffer;}).catch(()=>null);
    }
    unlocked=true;if(enabled&&!paused){await context.resume();music.play().catch(()=>{});}label();
  }
  async function play(name,volume=1,pitch=1){
    if(!enabled||!unlocked||paused)return;
    const generation=serial,buffer=await cache[name];if(!buffer||!enabled||paused||generation!==serial)return;
    if(playing.size>7)return;
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.playbackRate.value=pitch;gain.gain.value=volume;source.connect(gain);gain.connect(bus);playing.add(source);source.onended=()=>playing.delete(source);source.start();
  }
  function stopHum(){if(hum){hum.osc.forEach(o=>o.stop());hum=null;}}
  function ambient(s){
    if(!context||!enabled||paused)return;
    const active=s.active==='ufo'&&s.ufoLeaveAt<0;
    if(active&&!hum){
      const gain=context.createGain(),filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=520;filter.Q.value=1.5;gain.gain.value=0;filter.connect(gain);gain.connect(bus);
      const osc=[87,131].map(f=>{const o=context.createOscillator();o.type='triangle';o.frequency.value=f;o.connect(filter);o.start();return o;});hum={gain,osc};
    }
    if(hum){hum.gain.gain.setTargetAtTime(active?.035*s.presence*(.85+Math.sin(s.time*1.9)*.15):0,context.currentTime,.2);if(!active)stopHum();}
  }
  function events(list){
    for(const e of list){
      history.push(e.name);if(history.length>120)history.shift();
      if(e.name==='milk'){
        play('milk',.28);if(++milkCount%3===0)play('bucket',.08);if(milkCount%4===0)play('drain',.12);
      }else if(e.name==='moo'){
        duckUntil=performance.now()+2100;play(e.name,.44);
      }else if(e.name==='kick'){play('kick',.42);const generation=serial;setTimeout(()=>{if(generation===serial)play('bucket',.18);},120);}
      else if(e.name==='ending')duckUntil=performance.now()+7000;
      else if(e.name!=='ufo')play(e.name,{ding:.23,'star-pop':.24,shimmer:.16,recover:.18,moon:.19,suction:.23,depart:.25,cloud:.13}[e.name]||.2,e.name==='ding'?1+(history.filter(n=>n==='ding').length%3)*.125:1);
    }
  }
  function update(s,dt){
    const target=!enabled||paused?0:performance.now()<duckUntil?.075:s.ended?.10:.18;
    const seam=Number.isFinite(music.duration)?Math.max(0,Math.min(1,music.currentTime/1.5,(music.duration-music.currentTime)/2)):1;
    music.volume+=(target*seam-music.volume)*Math.min(1,dt*3);ambient(s);
  }
  function pause(){paused=true;serial++;music.pause();playing.forEach(s=>s.stop());playing.clear();stopHum();if(context)context.suspend();}
  function resume(){paused=false;if(unlocked&&enabled)activate().catch(()=>{});}
  function reset(rewind=true){serial++;playing.forEach(s=>s.stop());playing.clear();stopHum();milkCount=0;duckUntil=0;history.length=0;if(rewind){music.currentTime=0;music.volume=0;}}
  button.addEventListener('click',()=>{enabled=!enabled;label();if(!enabled){serial++;music.pause();playing.forEach(s=>s.stop());playing.clear();stopHum();}else activate().catch(()=>{});});
  addEventListener('pointerdown',()=>activate().catch(()=>{}),{capture:true,once:true});
  addEventListener('keydown',()=>activate().catch(()=>{}),{capture:true,once:true});label();
  window.CowAudio={activate,events,update,pause,resume,reset,get status(){return {enabled,unlocked,paused,playing:playing.size,decoded:decoded.size,musicPaused:music.paused,musicTime:music.currentTime,history:[...history]};}};
})();
