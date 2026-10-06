
/* UI + Cesium rendering. Movement rules live in flight-core.js. */
(() => {
    const $ = id => document.getElementById(id);

    // ------------------------------------------------------------
    // Check that Cesium loaded
    // ------------------------------------------------------------
    if (typeof Cesium === 'undefined') {
        const message = $('message');
        if (message) {
            message.textContent =
                'Cesium did not load. Check your internet connection or CDN access.';
        }
        return;
    }

    // ------------------------------------------------------------
    // Cesium Ion token
    // ------------------------------------------------------------
    Cesium.Ion.defaultAccessToken =
        "YOUR_NEW_CESIUM_TOKEN_HERE";

    // ------------------------------------------------------------
    // Check that Flight core loaded
    // ------------------------------------------------------------
    if (typeof Flight === 'undefined') {
        const message = $('message');
        if (message) {
            message.textContent =
                'Flight core did not load. Make sure flight-core.js is loaded before app.js.';
        }
        return;
    }

    let state = Flight.initial();

    try {

        // --------------------------------------------------------
        // Create Cesium viewer
        //
        // IMPORTANT:
        // Start with the basic ellipsoid + grid.
        // Once this works, World Terrain can be enabled separately.
        // --------------------------------------------------------
        const viewer = new Cesium.Viewer("globe", {

            // No remote imagery yet.
            // This lets us verify that Cesium itself is working.
            baseLayer: false,

            // Flat Earth terrain.
            terrainProvider:
                new Cesium.EllipsoidTerrainProvider(),

            baseLayerPicker: false,
            geocoder: false,
            animation: false,
            timeline: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            fullscreenButton: false,
            infoBox: false,
            selectionIndicator: false
        });

        // --------------------------------------------------------
        // Add Cesium grid
        // --------------------------------------------------------
        viewer.imageryLayers.addImageryProvider(
            new Cesium.GridImageryProvider()
        );

        // --------------------------------------------------------
        // Aircraft position
        // --------------------------------------------------------
        const position = () =>
            Cesium.Cartesian3.fromDegrees(
                state.lon,
                state.lat,
                state.height
            );

        // --------------------------------------------------------
        // Simulated aircraft
        // --------------------------------------------------------
        const plane = viewer.entities.add({
            position: new Cesium.CallbackProperty(
                position,
                false
            ),

            point: {
                pixelSize: 16,
                color: Cesium.Color.GOLD,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2
            },

            label: {
                text: 'SIMULATED FLIGHT',
                font: '14px sans-serif',
                pixelOffset:
                    new Cesium.Cartesian2(0, -28),
                showBackground: true
            }
        });

        // --------------------------------------------------------
        // Reading-area teaching origin
        // --------------------------------------------------------
        viewer.entities.add({
            position:
                Cesium.Cartesian3.fromDegrees(
                    -75.93,
                    40.33,
                    0
                ),

            point: {
                pixelSize: 10,
                color: Cesium.Color.WHITE
            },

            label: {
                text: 'Reading-area teaching origin',
                font: '14px sans-serif',
                pixelOffset:
                    new Cesium.Cartesian2(0, 22),
                showBackground: true
            }
        });

        // --------------------------------------------------------
        // Training grid
        // --------------------------------------------------------
        for (let i = -5; i <= 5; i++) {

            const d = i * 0.01;

            // Horizontal line
            viewer.entities.add({
                polyline: {
                    positions:
                        Cesium.Cartesian3.fromDegreesArray([
                            -76.00,
                            40.33 + d,

                            -75.86,
                            40.33 + d
                        ]),

                    width: 1,

                    material:
                        Cesium.Color.WHITE.withAlpha(0.35)
                }
            });

            // Vertical line
            viewer.entities.add({
                polyline: {
                    positions:
                        Cesium.Cartesian3.fromDegreesArray([
