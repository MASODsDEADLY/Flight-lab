/* UI + Cesium rendering. Movement rules live in flight-core.js. */
(() => {
 const $ = id => document.getElementById(id);
 if (typeof Cesium === 'undefined') { $('message').textContent='Cesium did not load. Check your internet connection or CDN access.'; return; }
 Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6InVGU3VGTnNncGN6YlhmUjAiLCJqdGkiOiJlMWMxMWE3My05NzZkLTQzNDItYTZhOC1lZjAwMDM3Y2FlYzIiLCJpZCI6NTA1NzM1LCJzdWIiOiJyMzRndXkxIiwiaXNzIjoiaHR0cHM6Ly9hcGkuY2VzaXVtLmNvbSIsImF1ZCI6IkFpcmNyYWZ0IHBhdGgiLCJpYXQiOjE3OTA2MDE4Nzd9.mZ1YRyGWG16xDV8SD8UgWvSBxToqLAh_9e1-4JsVQHI';
 let state = Flight.initial();
 try {
 const viewer = new Cesium.Viewer('globe', {
   baseLayer:false, baseLayerPicker:false, geocoder:false, animation:false,
   timeline:false, homeButton:false, sceneModePicker:false, navigationHelpButton:false,
   fullscreenButton:false, infoBox:false, selectionIndicator:false,
   terrainProvider:new Cesium.EllipsoidTerrainProvider()
 });
 viewer.imageryLayers.addImageryProvider(new Cesium.GridImageryProvider());
 const position = () => Cesium.Cartesian3.fromDegrees(state.lon, state.lat, state.height);
 const plane = viewer.entities.add({
   position: new Cesium.CallbackProperty(position, false),
   point:{pixelSize:16,color:Cesium.Color.GOLD,outlineColor:Cesium.Color.BLACK,outlineWidth:2},
   label:{text:'SIMULATED FLIGHT',font:'14px sans-serif',pixelOffset:new Cesium.Cartesian2(0,-28),showBackground:true}
 });
 viewer.entities.add({position:Cesium.Cartesian3.fromDegrees(-75.93,40.33,0),
   point:{pixelSize:10,color:Cesium.Color.WHITE},
   label:{text:'Reading-area teaching origin',font:'14px sans-serif',pixelOffset:new Cesium.Cartesian2(0,22),showBackground:true}});
 // Nearby training grid gives visible scale without remote imagery.
 for(let i=-5;i<=5;i++){
   const d=i*0.01;
   viewer.entities.add({polyline:{positions:Cesium.Cartesian3.fromDegreesArray([-76.00,40.33+d,-75.86,40.33+d]),width:1,material:Cesium.Color.WHITE.withAlpha(0.35)}});
   viewer.entities.add({polyline:{positions:Cesium.Cartesian3.fromDegreesArray([-75.93+d,40.27,-75.93+d,40.39]),width:1,material:Cesium.Color.WHITE.withAlpha(0.35)}});
 }
 function paint(){
   $('message').textContent=state.paused?'Paused — ready to inspect':'Flying — simulated movement';
   $('readout').textContent=`Heading ${state.heading.toFixed(0)}° · Longitude ${state.lon.toFixed(5)} · Latitude ${state.lat.toFixed(5)} · Height ${state.height.toFixed(0)} m · Speed ${state.speed.toFixed(0)} m/s`;
 }
 function follow(){viewer.camera.lookAt(position(),new Cesium.HeadingPitchRange(Cesium.Math.toRadians(state.heading),Cesium.Math.toRadians(-30),2500));}
 $('fly').onclick=()=>{state.paused=false;paint();};
 $('pause').onclick=()=>{state.paused=true;paint();};
 $('left').onclick=()=>{state.heading=Flight.wrap(state.heading-10);paint();follow();};
 $('right').onclick=()=>{state.heading=Flight.wrap(state.heading+10);paint();follow();};
 $('reset').onclick=()=>{state=Flight.initial();$('speed').value=state.speed;$('height').value=state.height;paint();follow();};
 for(const [id,min,max] of [['speed',0,250],['height',50,5000]]){
   $(id).onchange=()=>{const n=Number($(id).value);if(Number.isFinite(n))state[id]=Flight.clamp(n,min,max);$(id).value=state[id];paint();follow();};
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden){state.paused=true;paint();}});
 let last=performance.now(),lastPaint=0;
 viewer.scene.preRender.addEventListener(()=>{
   const now=performance.now(), dt=Math.min((now-last)/1000,0.1);last=now;
   state=Flight.step(state,dt);
   if(!state.paused)follow();
   if(now-lastPaint>150){paint();lastPaint=now;}
 });
 paint();follow();
 }catch(error){$('message').textContent='The globe could not start. Check WebGL support and the browser console.';console.error(error);}
})();
