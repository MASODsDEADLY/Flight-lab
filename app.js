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
    $('message').textContent =
      'Cesium Ion token is missing. Check config.js.';
    return;
  }

  if (typeof Flight === 'undefined') {
    $('message').textContent =
      'Flight controls did not load. Check flight-core.js.';
    return;
  }

  Cesium.Ion.defaultAccessToken = token;

  let state = Flight.initial();

  async function start() {
    let viewer;

    try {
      $('message').textContent =
        'Loading Google Photorealistic 3D Tiles…';

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
        Cesium.Cartesian3.fromDegrees(
          state.lon,
          state.lat,
          state.height
        );

      // -------------------------------------------------------
      // CAMERA AND FLIGHT TRAIL
      // -------------------------------------------------------

      let followEnabled = true;
      let cameraRange = 2500;
      const cameraPitch = -30;

      const trailPositions = [position()];
      const maxTrailPoints = 360;
      const trailSampleInterval = 0.5;

      let trailElapsed = 0;
      let trailEnabled = true;

      const aircraft = viewer.entities.add({
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

      // -------------------------------------------------------
      // LANDMARK TOUR SETTINGS
      // -------------------------------------------------------

      const tourStops = [
        {
          name: 'Reading area, Pennsylvania',
          lon: -75.93,
          lat: 40.33,
          targetHeight: 180,
          range: 4200
        },
        {
          name: 'New York City — Statue of Liberty',
          lon: -74.0445,
          lat: 40.6892,
          targetHeight: 45,
          range: 1600
        },
        {
          name: 'New York City — Midtown Manhattan',
          lon: -73.9857,
          lat: 40.7484,
          targetHeight: 180,
          range: 2600
        },
        {
          name: 'Washington, D.C. — National Mall',
          lon: -77.0353,
          lat: 38.8895,
          targetHeight: 35,
          range: 2400
        },
        {
          name: 'San Francisco — Golden Gate Bridge',
          lon: -122.4783,
          lat: 37.8199,
          targetHeight: 80,
          range: 3200
        },
        {
          name: 'Paris — Eiffel Tower',
          lon: 2.2945,
          lat: 48.8584,
          targetHeight: 140,
          range: 1800
        },
        {
          name: 'Rome — Colosseum',
          lon: 12.4922,
          lat: 41.8902,
          targetHeight: 55,
          range: 1400
        }
      ];

      const TOUR_DWELL_SECONDS = 20;
      const TOUR_TRAVEL_SECONDS = 8;
      const TOUR_ORBIT_DEGREES_PER_SECOND = 3;

      let tourActive = false;
      let tourTraveling = false;
      let tourIndex = 0;
      let tourElapsed = 0;
      let tourHeading = 0;
      let tourGeneration = 0;

      // -------------------------------------------------------
      // FLOATING CONTROL PANEL
      // -------------------------------------------------------

      const panel = document.createElement('div');

      panel.style.cssText = `
        position: absolute;
        top: 16px;
        right: 16px;
        z-index: 10;
        width: 270px;
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
        ">FLIGHT & LANDMARK TOUR</div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" data-action="camera">
            Free camera
          </button>
          <button type="button" data-action="trail">
            Trail: ON
          </button>
        </div>

        <label style="display: block; margin-top: 12px;">
          Flight camera distance
          <span data-role="distance" style="float: right;">
            2500 m
          </span>

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

        <button
          type="button"
          data-action="tour"
          style="width: 100%; margin-top: 12px;"
        >
          Start landmark tour
        </button>

        <div
          data-role="tour-status"
          style="
            margin-top: 10px;
            padding: 10px;
            border-radius: 8px;
            background: rgba(101, 217, 255, 0.08);
            color: #b9eaff;
            line-height: 1.5;
          "
        ></div>

        <div style="
          margin-top: 10px;
          color: #a6b7cc;
          font-size: 11px;
          line-height: 1.6;
        ">
          Space: fly / pause · ← →: turn<br>
          C: camera mode · R: reset · T: tour
        </div>
      `;

      viewer.container.appendChild(panel);

      const cameraButton = panel.querySelector(
        '[data-action="camera"]'
      );

      const trailButton = panel.querySelector(
        '[data-action="trail"]'
      );

      const tourButton = panel.querySelector(
        '[data-action="tour"]'
      );

      const zoomInput = panel.querySelector(
        '[data-role="zoom"]'
      );

      const distanceLabel = panel.querySelector(
        '[data-role="distance"]'
      );

      const tourStatus = panel.querySelector(
        '[data-role="tour-status"]'
      );

      for (const button of panel.querySelectorAll('button')) {
        button.style.cssText += `
          padding: 8px 12px;
          border: 1px solid rgba(130, 190, 255, 0.3);
          border-radius: 8px;
          background: #172a40;
          color: #e9f2ff;
          font: inherit;
          cursor: pointer;
        `;
      }

      tourButton.style.background = '#123c51';
      tourButton.style.borderColor = 'rgba(101, 217, 255, 0.5)';

      // -------------------------------------------------------
      // UI UPDATES
      // -------------------------------------------------------

      function paint() {
        if (tourActive) {
          const stop = tourStops[tourIndex];

          const remaining = Math.max(
            0,
            Math.ceil(TOUR_DWELL_SECONDS - tourElapsed)
          );

          $('message').textContent = tourTraveling
            ? `Traveling to ${stop.name}…`
            : `Tour: ${stop.name} · Next stop in ${remaining}s`;

          $('readout').textContent =
            `Stop ${tourIndex + 1} of ${tourStops.length} · ` +
            `Longitude ${stop.lon.toFixed(5)} · ` +
            `Latitude ${stop.lat.toFixed(5)} · ` +
            (tourTraveling
              ? 'Camera traveling'
              : 'Sightseeing orbit');

          tourStatus.textContent = tourTraveling
            ? `Next destination: ${stop.name}`
            : `${stop.name} — departing in ${remaining}s`;
        } else {
          $('message').textContent = state.paused
            ? 'Paused — ready to inspect'
            : 'Flying — simulated movement';

          $('readout').textContent =
            `Heading ${state.heading.toFixed(0)}° · ` +
            `Longitude ${state.lon.toFixed(5)} · ` +
            `Latitude ${state.lat.toFixed(5)} · ` +
            `Height ${state.height.toFixed(0)} m · ` +
            `Speed ${state.speed.toFixed(0)} m/s`;

          tourStatus.textContent =
            'Tour stopped. Start it to visit the landmarks.';
        }

        cameraButton.textContent = followEnabled
          ? 'Free camera'
          : 'Follow flight';

        trailButton.textContent = trailEnabled
          ? 'Trail: ON'
          : 'Trail: OFF';

        tourButton.textContent = tourActive
          ? 'Stop landmark tour'
          : 'Start landmark tour';

        distanceLabel.textContent = `${cameraRange} m`;

        // This slider controls manual flight, not the tour orbit.
        zoomInput.disabled = tourActive;
        zoomInput.style.opacity = tourActive ? '0.45' : '1';
      }

      // -------------------------------------------------------
      // MANUAL FLIGHT CAMERA
      // -------------------------------------------------------

      function follow() {
        if (!followEnabled || tourActive) return;

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
        stopTour();

        followEnabled = !followEnabled;

        if (followEnabled) {
          follow();
        } else {
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        }

        paint();
      }

      function turn(amount) {
        stopTour();

        state.heading = Flight.wrap(state.heading + amount);

        paint();
        follow();
      }

      function resetFlight() {
        stopTour();

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

      // -------------------------------------------------------
      // TOUR CAMERA
      // -------------------------------------------------------

      function tourTarget(stop) {
        return Cesium.Cartesian3.fromDegrees(
          stop.lon,
          stop.lat,
          stop.targetHeight
        );
      }

      function showTourOrbit() {
        if (!tourActive) return;

        const stop = tourStops[tourIndex];

        viewer.camera.lookAt(
          tourTarget(stop),
          new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(tourHeading),
            Cesium.Math.toRadians(-30),
            stop.range
          )
        );
      }

      function visitTourStop(index, animate = true) {
        tourIndex = index;
        tourElapsed = 0;
        tourHeading = 0;
        tourTraveling = animate;

        const stop = tourStops[tourIndex];
        const generation = ++tourGeneration;

        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

        if (!animate) {
          showTourOrbit();
          paint();
          return;
        }

        viewer.camera.flyToBoundingSphere(
          new Cesium.BoundingSphere(tourTarget(stop), 100),
          {
            duration: TOUR_TRAVEL_SECONDS,
            offset: new Cesium.HeadingPitchRange(
              0,
              Cesium.Math.toRadians(-30),
              stop.range
            ),
            complete: () => {
              if (
                !tourActive ||
                generation !== tourGeneration
              ) {
                return;
              }

              tourTraveling = false;
              tourElapsed = 0;

              showTourOrbit();
              paint();
            },
            cancel: () => {
              if (
                !tourActive ||
                generation !== tourGeneration
              ) {
                return;
              }

              stopTour();
            }
          }
        );

        paint();
      }

      function startTour() {
        if (tourActive) return;

        state.paused = true;
        followEnabled = false;

        tourActive = true;

        // Hide the simulated aircraft and its trail while sightseeing.
        aircraft.show = false;
        trail.show = false;

        // Prevent mouse camera movements from interrupting the tour.
        viewer.scene.screenSpaceCameraController.enableInputs = false;

        // Start at Reading immediately.
        visitTourStop(0, false);
      }

      function stopTour() {
        if (!tourActive) return;

        tourActive = false;
        tourTraveling = false;

        // Invalidate callbacks before canceling the camera flight.
        tourGeneration++;

        viewer.camera.cancelFlight();
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

        viewer.scene.screenSpaceCameraController.enableInputs = true;

        // Keep the current sightseeing view until follow is selected.
        followEnabled = false;
        state.paused = true;

        aircraft.show = true;
        trail.show = trailEnabled;

        paint();
      }

      function updateTour(dt) {
        if (
          !tourActive ||
          tourTraveling ||
          document.hidden
        ) {
          return;
        }

        tourElapsed += dt;

        tourHeading =
          (
            tourHeading +
            TOUR_ORBIT_DEGREES_PER_SECOND * dt
          ) % 360;

        showTourOrbit();

        if (tourElapsed >= TOUR_DWELL_SECONDS) {
          const nextIndex =
            (tourIndex + 1) % tourStops.length;

          visitTourStop(nextIndex);
        }
      }

      // -------------------------------------------------------
      // BUTTONS AND INPUTS
      // -------------------------------------------------------

      $('fly').onclick = () => {
        stopTour();

        state.paused = false;
        followEnabled = true;

        paint();
        follow();
      };

      $('pause').onclick = () => {
        stopTour();

        state.paused = true;
        paint();
      };

      $('left').onclick = () => turn(-10);
      $('right').onclick = () => turn(10);
      $('reset').onclick = resetFlight;

      cameraButton.onclick = toggleCamera;

      trailButton.onclick = () => {
        trailEnabled = !trailEnabled;

        trail.show = trailEnabled && !tourActive;

        paint();
      };

      tourButton.onclick = () => {
        if (tourActive) {
          stopTour();
        } else {
          startTour();
        }
      };

      zoomInput.oninput = () => {
        if (tourActive) return;

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
          stopTour();

          const n = Number($(id).value);

          if (Number.isFinite(n)) {
            state[id] = Flight.clamp(n, min, max);
          }

          $(id).value = state[id];

          paint();
          follow();
        };
      }

      // -------------------------------------------------------
      // KEYBOARD CONTROLS
      // -------------------------------------------------------

      document.addEventListener('keydown', event => {
        const target = event.target;

        // Do not override typing or native form-control behavior.
        if (
          target instanceof Element &&
          target.closest(
            'input, textarea, select, button, ' +
            '[contenteditable]:not([contenteditable="false"])'
          )
        ) {
          return;
        }

        if (event.ctrlKey || event.metaKey || event.altKey) {
          return;
        }

        switch (event.code) {
          case 'Space':
            event.preventDefault();

            if (!event.repeat) {
              stopTour();

              state.paused = !state.paused;

              if (!state.paused) {
                followEnabled = true;
                follow();
              }

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
            if (!event.repeat) {
              toggleCamera();
            }
            break;

          case 'KeyR':
            if (!event.repeat) {
              resetFlight();
            }
            break;

          case 'KeyT':
            if (!event.repeat) {
              if (tourActive) {
                stopTour();
              } else {
                startTour();
              }
            }
            break;
        }
      });

      // -------------------------------------------------------
      // RENDER LOOP
      // -------------------------------------------------------

      let last = performance.now();
      let lastPaint = 0;

      document.addEventListener('visibilitychange', () => {
        // Avoid a large movement step when returning to this tab.
        last = performance.now();

        if (document.hidden) {
          state.paused = true;
        }

        paint();
      });

      viewer.scene.preRender.addEventListener(() => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.1);

        last = now;

        if (!document.hidden) {
          if (tourActive) {
            updateTour(dt);
          } else {
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
                  Cesium.Cartesian3.distance(
                    previousPosition,
                    nextPosition
                  ) > 1
                ) {
                  trailPositions.push(nextPosition);

                  if (trailPositions.length > maxTrailPoints) {
                    trailPositions.shift();
                  }
                }
              }

              follow();
            }
          }
        }

        if (now - lastPaint > 150) {
          paint();
          lastPaint = now;
        }
      });

      // Start the landmark tour automatically.
      startTour();

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
