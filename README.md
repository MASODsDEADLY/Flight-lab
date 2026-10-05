# AI 101 — CesiumJS Flight Lab

This is an original teaching starter: a steerable moving point, not a realistic aircraft simulator.

## Run
Upload all files in this folder to the root of a public GitHub repository. In Settings → Pages choose Deploy from a branch, main, /(root). Open the site URL after deployment. Alternatively serve this folder with your editor's local web server. If Python is already installed: `python -m http.server 8000`, then open http://localhost:8000.

Internet and WebGL are required. CesiumJS 1.145 and its matching CSS load from Cesium's CDN. No build step, Node installation, ion token, imagery service, or paid data is needed. Keep Cesium's on-screen credits visible.

## Controls
Fly starts motion; Pause stops it. Left/Right change heading by 10 degrees. Speed is 0–250 meters/second; height is 50–5000 meters above the model ellipsoid. Height changes instantly: this starter does not simulate climbing. Reset restores the paused initial state. Switching to another browser tab pauses the app. On returning, press Fly again. The camera follows while flying.

## Test
Open tests.html on the same site. Also perform the six manual checks on Canvas page 05. Optional developer command: `node -e "require('./flight-core.js');require('./tests.js')"`.

## Model and geography
Uses spherical destination-point math with Earth radius 6,371,000 m, displayed on Cesium's ellipsoid globe. This approximation is for learning. Heading remains constant between clicks. Frame dt is capped at 0.1 s to prevent large jumps after stalls, so low frame rates can slow simulated time. There is no lift, drag, bank, pitch, collision, real terrain, flight data, or navigation accuracy. The marker is a point, not an aircraft model. Grid lines provide visual reference, not roads.
The approximate origin (-75.93, 40.33) is a Reading-area classroom reference, not a verified Alvernia campus location. Validate real location claims separately.

## Student additions — complete before submission
Audience and purpose:
Feature changed:
AI assistance accepted/rejected:
Tests and evidence:
Partner reproduction feedback:
Geographic/API sources:
Known limitations:

## References
https://cesium.com/learn/cesiumjs-learn/
https://cesium.com/learn/cesiumjs/ref-doc/Viewer.html
https://cesium.com/learn/cesiumjs/ref-doc/Cartesian3.html
https://cesium.com/learn/cesiumjs/ref-doc/GridImageryProvider.html

CesiumJS is an external dependency with its own license and notices. It is not bundled in this resource ZIP.
