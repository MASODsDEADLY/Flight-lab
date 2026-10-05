(function(){
const results=[];
function test(name,fn){try{if(!fn())throw Error('Unexpected result');results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}}
const s={...Flight.initial(),paused:false};
test('Pause preserves position',()=>JSON.stringify(Flight.step({...s,paused:true},5))===JSON.stringify({...s,paused:true}));
test('North increases latitude',()=>Flight.step(s,1).lat>s.lat);
test('East increases longitude',()=>Flight.step({...s,heading:90},1).lon>s.lon);
test('Heading wraps in both directions',()=>Flight.wrap(-10)===350&&Flight.wrap(370)===10);
test('Height limits clamp',()=>Flight.clamp(-5,50,5000)===50&&Flight.clamp(8000,50,5000)===5000);
test('Zero speed keeps position',()=>Flight.step({...s,speed:0},1).lat===s.lat);
test('Duration consistency: one second equals ten 0.1-second steps',()=>{const once=Flight.step(s,1);let many=s;for(let i=0;i<10;i++)many=Flight.step(many,0.1);return Math.abs(once.lat-many.lat)<1e-8&&Math.abs(once.lon-many.lon)<1e-8;});
if(typeof document!=='undefined'){document.getElementById('results').textContent=results.map(r=>(r.pass?'PASS: ':'FAIL: ')+r.name).join('\n');}
else {console.log(results);if(results.some(r=>!r.pass))process.exitCode=1;}
})();