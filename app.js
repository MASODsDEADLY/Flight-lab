/* UI + Cesium rendering. Movement rules live in flight-core.js. */
(() => {
  const $ = id => document.getElementById(id);

  if (typeof Cesium === 'undefined') {
    $('message').textContent =
      'Cesium did not load. Check your internet connection or CDN access.';
    return;
  }

  const token = window.APP_CONFIG && window.APP_CONFIG.CESIUM_ION_TOKEN;

  if (!token) {
    $('message').textContent = 'Cesium Ion token is missing. Check config.js.';
    return;
  }

  Cesium.Ion.defaultAccessToken = token;

  let state = Flight.initial();

  async function start() {
    let viewer;

    try {
      $('message').textContent = 'Loading Google Photorealistic 3D Tiles…';

      viewer = new Cesium.Viewer('globe', {
        globe: false,
        baseLayer: false,
        baseLayerPicker: false,
        geocoder: false,
        animation: false,
        timeline: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        shouldAnimate: false
      });

      const tileset = await Cesium.createGooglePhotorealistic3DTileset({
        onlyUsingWithGoogleGeocoder: false
      });

      viewer.scene.primitives.add(tileset);

      const position = () =>
        Cesium.Cartesian3.fromDegrees(state.lon, state.lat, state.height);

      // Camera settings.
      let followEnabled = true;
      let cameraRange = 2500;
      const cameraPitch = -30;

      // Retain a limited number of trail points.
      const trailPositions = [position()];
      const maxTrailPoints = 360;
      const trailSampleInterval = 0.5;
      let trailElapsed = 0;
      let trailEnabled = true;

      viewer.entities.add({
        position: new Cesium.CallbackProperty(position, false),
        point: {
          pixelSize: 16,
          color: Cesium.Color.GOLD,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.NONE
        },
        label: {
          text: 'SIMULATED FLIGHT',
          font: 'bold 14px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -30),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString(
            'rgba(12, 20, 32, 0.85)'
          ),
          backgroundPadding: new Cesium.Cartesian2(10, 6)
        }
      });

      const trail = viewer.entities.add({
        polyline: {
          positions: new Cesium.CallbackProperty(
            () => trailPositions,
            false
          ),
          width: 4,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.18,
            color: Cesium.Color.CYAN.withAlpha(0.85)
          }),
          clampToGround: false
        }
      });

      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(-75.93, 40.33, 0),
        point: {
          pixelSize: 10,
          color: Cesium.Color.WHITE
        },
        label: {
          text: 'Reading-area teaching origin',
          font: '14px sans-serif',
          pixelOffset: new Cesium.Cartesian2(0, 22),
          showBackground: true
        }
      });

      // Floating controls are created here, so no HTML edits are needed.
      const panel = document.createElement('div');

      panel.style.cssText = `
        position: absolute;
        top: 16px;
        right: 16px;
        z-index: 10;
        max-width: calc(100% - 32px);
        box-sizing: border-box;
        padding: 14px;
        color: #e9f2ff;
        background: rgba(10, 18, 30, 0.88);
        border: 1px solid rgba(130, 190, 255, 0.25);
        border-radius: 14px;
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        font: 13px system-ui, sans-serif;
      `;

      panel.innerHTML = `
        <div style="
          margin-bottom: 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          color: #8edfff;
        ">FLIGHT CAMERA</div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" data-action="camera">Free camera</button>
          <button type="button" data-action="trail">Trail: ON</button>
        </div>

        <label style="display: block; margin-top: 12px;">
          Camera distance
          <span data-role="distance" style="float: right;">2500 m</span>
          <input
            data-role="zoom"
            type="range"
            min="300"
            max="8000"
            step="100"
            value="2500"
            aria-label="Follow camera distance"
            style="
              display: block;
              width: 100%;
              margin: 8px 0 0;
              accent-color: #65d9ff;
            "
          >
        </label>

        <div style="
          margin-top: 10px;
          color: #a6b7cc;
          font-size: 11px;
          line-height: 1.6;
        ">
          Space: fly / pause · ← →: turn<br>
          C: camera mode · R: reset
        </div>
      `;

      viewer.container.appendChild(panel);

      const cameraButton = panel.querySelector('[data-action="camera"]');
      const trailButton = panel.querySelector('[data-action="trail"]');
      const zoomInput = panel.querySelector('[data-role="zoom"]');
      const distanceLabel = panel.querySelector('[data-role="distance"]');

      for (const button of panel.querySelectorAll('button')) {
        button.style.cssText = `
          padding: 8px 12px;
          border: 1px solid rgba(130, 190, 255, 0.3);
          border-radius: 8px;
          background: #172a40;
          color: #e9f2ff;
          font: inherit;
          cursor: pointer;
        `;
      }

      function paint() {
        $('message').textContent = state.paused
          ? 'Paused — ready to inspect'
          : 'Flying — simulated movement';

        $('readout').textContent =
          `Heading ${state.heading.toFixed(0)}° · ` +
          `Longitude ${state.lon.toFixed(5)} · ` +
          `Latitude ${state.lat.toFixed(5)} · ` +
          `Height ${state.height.toFixed(0)} m · ` +
          `Speed ${state.speed.toFixed(0)} m/s`;

        cameraButton.textContent = followEnabled
          ? 'Free camera'
          : 'Follow flight';

        trailButton.textContent = trailEnabled ? 'Trail: ON' : 'Trail: OFF';

        distanceLabel.textContent = `${cameraRange} m`;
      }

      function follow() {
        if (!followEnabled) return;

        viewer.camera.lookAt(
          position(),
          new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(state.heading),
            Cesium.Math.toRadians(cameraPitch),
            cameraRange
          )
        );
      }

      function toggleCamera() {
        followEnabled = !followEnabled;

        if (followEnabled) {
          follow();
        } else {
          // Release the flight-relative camera transform for exploration.
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        }

        paint();
      }

      function turn(amount) {
        state.heading = Flight.wrap(state.heading + amount);
        paint();
        follow();
      }

      function resetFlight() {
        state = Flight.initial();

        $('speed').value = state.speed;
        $('height').value = state.height;

        trailPositions.length = 0;
        trailPositions.push(position());
        trailElapsed = 0;

        followEnabled = true;
        cameraRange = 2500;
        zoomInput.value = cameraRange;

        paint();
        follow();
      }

      $('fly').onclick = () => {
        state.paused = false;
        paint();
      };

      $('pause').onclick = () => {
        state.paused = true;
        paint();
      };

      $('left').onclick = () => turn(-10);
      $('right').onclick = () => turn(10);
      $('reset').onclick = resetFlight;

      cameraButton.onclick = toggleCamera;

      trailButton.onclick = () => {
        trailEnabled = !trailEnabled;
        trail.show = trailEnabled;
        paint();
      };

      zoomInput.oninput = () => {
        cameraRange = Number(zoomInput.value);
        paint();
        follow();
      };

      for (const [id, min, max] of [
        ['speed', 0, 250],
        ['height', 50, 5000]
      ]) {
        $(id).value = state[id];

        $(id).onchange = () => {
          const n = Number($(id).value);

          if (Number.isFinite(n)) {
            state[id] = Flight.clamp(n, min, max);
          }

          $(id).value = state[id];

          paint();
          follow();
        };
      }

      document.addEventListener('keydown', event => {
        const target = event.target;

        // Leave typing and native control interactions alone.
        if (
          target instanceof Element &&
          target.closest(
            'input, textarea, select, button, [contenteditable]:not([contenteditable="false"])'
          )
        ) {
          return;
        }

        if (event.ctrlKey || event.metaKey || event.altKey) return;

        switch (event.code) {
          case 'Space':
            event.preventDefault();

            if (!event.repeat) {
              state.paused = !state.paused;
              paint();
            }
            break;

          case 'ArrowLeft':
            event.preventDefault();
            turn(-10);
            break;

          case 'ArrowRight':
            event.preventDefault();
            turn(10);
            break;

          case 'KeyC':
            if (!event.repeat) toggleCamera();
            break;

          case 'KeyR':
            if (!event.repeat) resetFlight();
            break;
        }
      });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          state.paused = true;
          paint();
        }
      });

      let last = performance.now();
      let lastPaint = 0;

      viewer.scene.preRender.addEventListener(() => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;

        state = Flight.step(state, dt);

        if (!state.paused) {
          trailElapsed += dt;

          if (trailElapsed >= trailSampleInterval) {
            trailElapsed %= trailSampleInterval;

            const nextPosition = position();
            const previousPosition =
              trailPositions[trailPositions.length - 1];

            if (
              !previousPosition ||
              Cesium.Cartesian3.distance(previousPosition, nextPosition) > 1
            ) {
              trailPositions.push(nextPosition);

              if (trailPositions.length > maxTrailPoints) {
                trailPositions.shift();
              }
            }
          }

          follow();
        }

        if (now - lastPaint > 150) {
          paint();
          lastPaint = now;
        }
      });

      paint();
      follow();

    } catch (error) {
      console.error('Flight simulator startup failed:', error);

      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }

      $('message').textContent =
        'The flight simulator could not start. ' +
        'Check that your Cesium Ion token has access to Google ' +
        'Photorealistic 3D Tiles, then open the browser console ' +
        'for the exact error.';
    }
  }

  start();
})();
