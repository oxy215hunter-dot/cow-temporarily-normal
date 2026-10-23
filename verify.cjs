const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),assets={window:{}};
vm.runInNewContext(fs.readFileSync(__dirname+'/cow-data.js','utf8'),assets);vm.runInNewContext(fs.readFileSync(__dirname+'/gait-data.js','utf8'),assets);
const legs=assets.window.COW_ART_DATA.sprites,gait=assets.window.COW_GAIT_DATA;
assert.deepEqual(['hindNear','frontNear','hindFar','frontFar'].map(n=>legs[n].phase),[0,.75,.5,.25],'four staggered footfalls');
for(let f=0;f<48;f++){const lifted=Object.keys(gait.legs).filter(n=>gait.legs[n].poses[(f+legs[n].phase*48)%48].lift>.001);assert(lifted.length<=2,'at least two feet support the body');}
for(const [name,other]of [['frontNear','frontFar'],['frontFar','frontNear'],['hindNear','hindFar'],['hindFar','hindNear']]){
  const landingFrame=47,globalFrame=(landingFrame-legs[name].phase*48+48)%48,otherFrame=(globalFrame+legs[other].phase*48)%48;
  assert(gait.legs[name].poses[landingFrame].footX<gait.legs[other].poses[otherFrame].footX-60,name+' must pass the other foot before landing, rather than draw level');
}
const {createState,CHAPTERS,END,STRIDE,STAR_COUNT,update}=require('./journey.js');
for(const rig of Object.values(gait.legs))for(let f=0;f<Math.floor(gait.stance*48)-1;f++)assert(Math.abs((rig.poses[f+1].footX-rig.poses[f].footX)*.405-STRIDE/48)<.00001,'stance foot remains fixed relative to the moving ground');
const step=(s,seconds,moving=false)=>{for(let i=0;i<Math.ceil(seconds*60);i++)update(s,1/60,moving);return s;};
for(const c of CHAPTERS){
  const s=createState();s.distance=c.at;step(s,c.duration*.5);
  const material=c.id==='milk'?s.whiteFill:s.ink;
  assert(material<.55&&material>.4,c.id+': dwell changes the right material');
  assert.equal(c.id==='milk'?s.ink:s.whiteFill,1,c.id+': other material stays intact');assert.equal(s.distance,c.at);
  step(s,c.duration*.7+8);assert(s.distance>c.at+c.width/2,c.id+': escape');assert.equal(s.active,null);
  step(s,20);assert.equal(s.ink,1);assert.equal(s.whiteFill,1);
}
const fast=createState();fast.distance=650;step(fast,4,true);
const slow=createState();slow.distance=650;step(slow,4);assert(fast.ink>slow.ink);
const cloud=createState();cloud.distance=4650;step(cloud,1.5);assert.equal(cloud.clouds.length,1,'first cloud starts promptly');step(cloud,15.1);assert.equal(cloud.clouds.length,4);
const worlds=cloud.clouds.map(c=>c.world);step(cloud,8,true);assert.equal(cloud.clouds.length,4);assert.deepEqual(cloud.clouds.map(c=>c.world),worlds);
assert.equal(new Set(cloud.clouds.map(c=>c.index)).size,4,'clouds are not duplicated');
const milk=createState();milk.distance=8650;step(milk,28);assert.equal(milk.events.filter(e=>e.name==='kick').length,1);assert.equal(milk.ink,1);assert(milk.whiteFill<1);
const moon=createState();moon.distance=10650;step(moon,.5);assert(moon.events.some(e=>e.name==='star-pop'),'first star within half a second');step(moon,16.5);
for(const name of ['moon','shimmer'])assert.equal(moon.events.filter(e=>e.name===name).length,1,name+' plays once');
assert.equal(STAR_COUNT,28);assert.equal(moon.events.filter(e=>e.name==='star-pop').length,28);assert(!moon.events.some(e=>e.name==='sneeze'),'stars do not use a sneeze');
for(const c of CHAPTERS){const edge=createState();edge.distance=c.at-c.width/2+1;step(edge,.6);assert(edge.presence>.99,c.id+': edge entry reaches full contact');assert((c.id==='milk'?edge.whiteFill:edge.ink)<.99,c.id+': prompt first feedback while standing near the edge');}
const idle=createState();step(idle,12);assert.equal(idle.events.filter(e=>e.name==='moo').length,1);step(idle,10);assert.equal(idle.events.filter(e=>e.name==='moo').length,1);
const s=createState();s.auto=true;let before=0;
for(let i=0;i<60*180&&!s.ended;i++){update(s,1/60,false);assert(s.distance>=before);before=s.distance;}
assert.equal(s.distance,END);assert.equal(s.visited.length,7);assert(s.ended);assert.equal(s.auto,false);step(s,20);assert.equal(s.ink,1);assert.equal(s.whiteFill,1);
const recovery=createState();recovery.distance=650;step(recovery,7);recovery.distance=1100;const lost=recovery.ink;step(recovery,.35);assert.equal(recovery.ink,lost,'short pause before regrowth');step(recovery,1);assert(recovery.ink>lost+.06&&recovery.ink<lost+.068,'full regrowth takes fifteen seconds');assert.equal(recovery.inkEffect,'sun','the fade direction is preserved in the blank interval');
const bare=createState();bare.ink=0;bare.active='sun';bare.inkEffect='sun';bare.distance=1100;step(bare,7.9);assert(bare.ink>.49&&bare.ink<.51,'a fully bare cow recovers halfway in about 7.5 seconds');step(bare,7.6);assert.equal(bare.ink,1,'full regrowth completes within 15.5 seconds after leaving');
const fresh=createState();assert.equal(fresh.clouds.length,0);assert.equal(fresh.events.length,0);assert.equal(fresh.whiteFill,1);
console.log('Passed: four staggered footfalls; all four feet overtake their counterpart before landing; grounded feet match world motion; seven dwell/escape paths; persistent clouds; 28 pigment stars; complete journey and restart.');

