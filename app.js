/* UI + Cesium rendering. Movement rules live in flight-core.js. */
(() => {
  const $ = id => document.getElementById(id);

  if (typeof Cesium === 'undefined') {
    $('message').textContent = 'Cesium did not load. Check your internet connection or CDN access.';
    return;
  }

  // Read the token from config.js. This keeps the token in one place.
  const token = window.APP_CONFIG && window.APP_CONFIG.CESIUM_ION_TOKEN;
  if (!token) {
    $('message').textContent = 'Cesium Ion token is missing. Check config.js.';
    return;
  }
  Cesium.Ion.defaultAccessToken = token;

  let state = Flight.initial();

  // The application now uses Google's Photorealistic 3D Tiles as the world.
  // Cesium ion brokers access to Google's dataset, so no separate Google API
  // key is required when the Ion account has the dataset enabled.
  async function start() {
    try {
      $('message').textContent = 'Loading Google Photorealistic 3D Tiles…';

      const viewer = new Cesium.Viewer('globe', {
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

      // Google Photorealistic 3D Tiles are loaded through Cesium ion.
      const tileset = await Cesium.createGooglePhotorealistic3DTileset({
        onlyUsingWithGoogleGeocoder: false
      });
      viewer.scene.primitives.add(tileset);

      const position = () =>
        Cesium.Cartesian3.fromDegrees(state.lon, state.lat, state.height);

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
          font: '14px sans-serif',
          pixelOffset: new Cesium.Cartesian2(0, -28),
          showBackground: true
        }
      });

      // Teaching/reference marker.
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(-75.93, 40.33, 0),
        point: { pixelSize: 10, color: Cesium.Color.WHITE },
        label: {
          text: 'Reading-area teaching origin',
          font: '14px sans-serif',
          pixelOffset: new Cesium.Cartesian2(0, 22),
          showBackground: true
        }
      });

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
      }

      function follow() {
        viewer.camera.lookAt(
          position(),
          new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(state.heading),
            Cesium.Math.toRadians(-30),
            2500
          )
        );
      }

      $('fly').onclick = () => {
        state.paused = false;
        paint();
      };

      $('pause').onclick = () => {
        state.paused = true;
        paint();
      };

      $('left').onclick = () => {
        state.heading = Flight.wrap(state.heading - 10);
        paint();
        follow();
      };

      $('right').onclick = () => {
        state.heading = Flight.wrap(state.heading + 10);
        paint();
        follow();
      };

      $('reset').onclick = () => {
        state = Flight.initial();
        $('speed').value = state.speed;
        $('height').value = state.height;
        paint();
        follow();
      };

      for (const [id, min, max] of [
        ['speed', 0, 250],
        ['height', 50, 5000]
      ]) {
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
          follow();
        }

        if (now - lastPaint > 150) {
          paint();
          lastPaint = now;
        }
      });

      // Start over the teaching location. 3D Tiles will stream in around it.
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          state.lon,
          state.lat,
          3000
        ),
        orientation: {
          heading: Cesium.Math.toRadians(state.heading),
          pitch: Cesium.Math.toRadians(-35),
          roll: 0
        }
      });

      paint();

    } catch (error) {
      console.error('Google Photorealistic 3D Tiles failed to load:', error);
      $('message').textContent =
        'Google Photorealistic 3D Tiles could not load. ' +
        'Make sure the Cesium Ion token has Google Photorealistic 3D Tiles enabled. ' +
        'Open the browser console for the exact error.';
    }
  }

  start();
})();
