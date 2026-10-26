import {
    Checkbox, Circle, Colour, HexValueColorMapper, Label, LineSegment, LineSegmentsView, Range,
    RadialSymmetricBody, Segments, Simulation, Slider, ThreeJsScene, Vec2, Vec3
} from '../../../src/index.js';

const DATA_BASE_URL = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/';
const STAR_DATA_URL = DATA_BASE_URL + 'stars.6.json';
const CONSTELLATION_DATA_URL = DATA_BASE_URL + 'constellations.lines.json';
const STAR_MAGNITUDE_LIMIT = 5;
const INITIAL_SIDEREAL_TIME = 2;
const INVISIBLE_POSITION = new Vec3(100, 100, 0);

let latitudeDegrees = 52;
let bearingDegrees = 0;
let localSiderealTime = INITIAL_SIDEREAL_TIME;
let stars = [];
let constellationLines = [];
let constellationLabels = [];
let constellationsVisible = true;
let constellationLabelsVisible = true;

// Each pair is [right ascension in degrees, declination in degrees].
const constellations = {
    Orion: [
        [[88.7929, 7.4071], [81.2828, 6.3497]],  // Betelgeuse — Bellatrix
        [[81.2828, 6.3497], [83.0017, -0.2991]], // Bellatrix — Mintaka
        [[83.0017, -0.2991], [84.0534, -1.2019]],// Mintaka — Alnilam
        [[84.0534, -1.2019], [85.1897, -1.9426]],// Alnilam — Alnitak
        [[85.1897, -1.9426], [86.9391, -9.6696]],// Alnitak — Saiph
        [[86.9391, -9.6696], [78.6345, -8.2016]],// Saiph — Rigel
        [[78.6345, -8.2016], [83.0017, -0.2991]],// Rigel — Mintaka
        [[85.1897, -1.9426], [88.7929, 7.4071]]  // Alnitak — Betelgeuse
    ],
    UrsaMajor: [
        [[206.885, 49.313], [201.298, 54.925]], // Alkaid — Mizar
        [[201.298, 54.925], [193.507, 55.959]], // Mizar — Alioth
        [[193.507, 55.959], [183.875, 57.033]], // Alioth — Megrez
        [[183.875, 57.033], [178.458, 53.695]], // Megrez — Phecda
        [[178.458, 53.695], [165.932, 56.382]], // Phecda — Merak
        [[165.932, 56.382], [165.932, 61.751]], // Merak — Dubhe
        [[165.932, 61.751], [183.875, 57.033]]  // Dubhe — Megrez
    ],
    Cassiopeia: [
        [[2.293, 59.149], [10.126, 56.537]],     // Caph — Schedar
        [[10.126, 56.537], [14.1771, 60.7167]], // Schedar — Navi
        [[14.1771, 60.7167], [21.455, 60.235]], // Navi — Ruchbah
        [[21.455, 60.235], [28.5987, 63.6700]]  // Ruchbah — Segin
    ]
};

const constellationSegments = new Segments();
const constellationView = new LineSegmentsView({
    lineWidth: 1.5,
    visible: constellationsVisible,
    colorMapper: new HexValueColorMapper()
});

const simulation = Simulation
    .with({
        htmlDivId: 'nightSkyContainer',
        viewport: {aspectRatio: '2 / 1' },
        camera: {
            position: new Vec3(0, 0, 1),
            orthographic: true,
            controls: false
        },
        scene: {
            background: ThreeJsScene.Background.PLAIN,
            backgroundColor: Colour.Black
        },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: '<strong>🌃 Local night sky projection</strong><br/>' +
                '• Stars are loaded from the D3-Celestial star catalogue.'
        }
    })
    .bind(constellationSegments.alwaysWith(constellationView))
    .append(new Slider('Latitude')
        .withUnits('°')
        .withRange(new Range(-89, 89, 1))
        .withValue(latitudeDegrees)
        .onInput(value => {
            latitudeDegrees = value;
            updateSky();
        }))
    .append(new Slider('Bearing')
        .withUnits('°')
        .withRange(new Range(-180, 180, 1))
        .withValue(bearingDegrees)
        .onInput(value => {
            bearingDegrees = value;
            updateSky();
        }))
    .append(new Checkbox('Constellations')
        .checked(constellationsVisible)
        .onChange(checked => {
            constellationsVisible = checked;
            constellationView.visible = checked;
        }))
    .append(new Checkbox('Constellation labels')
        .checked(constellationLabelsVisible)
        .onChange(checked => {
            constellationLabelsVisible = checked;
            constellationLabels.forEach(label => label.view.visible = checked);
        }))
    .advancesBy(0.01)
    .runsEvery(0.035)
    .onStep((clock, dt) => {
        // Preserve the original demo's rate: one simulated sidereal minute per frame.
        localSiderealTime = clock.simulatedTime;
        updateSky();
    }).start();

/**
 * Project equatorial coordinates onto the visible local sky.
 * The result is normalized to a dome radius of one, with the horizon at y = -0.5.
 * @param {number} raDegrees right ascension in degrees
 * @param {number} decDegrees declination in degrees
 * @returns {Vec2 | null}
 */
function projectStar(raDegrees, decDegrees) {
    const latitude = latitudeDegrees * Math.PI / 180;
    const bearing = bearingDegrees * Math.PI / 180;
    const siderealAngle = localSiderealTime * 15 * Math.PI / 180;
    const ra = raDegrees * Math.PI / 180;
    const dec = decDegrees * Math.PI / 180;

    const sinLatitude = Math.sin(latitude);
    const cosLatitude = Math.cos(latitude);
    const sinDeclination = Math.sin(dec);
    const cosDeclination = Math.cos(dec);
    const hourAngle = siderealAngle - ra;

    const sinAltitude = sinDeclination * sinLatitude
        + cosDeclination * cosLatitude * Math.cos(hourAngle);

    if (sinAltitude <= 0)
        return null; // Below the horizon.

    const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude)));
    const cosAltitude = Math.cos(altitude);
    const sinAzimuth = -Math.sin(hourAngle) * cosDeclination / Math.max(cosAltitude, 1e-12);
    const cosAzimuth = (sinDeclination - sinLatitude * sinAltitude)
        / Math.max(cosLatitude * cosAltitude, 1e-12);
    const azimuth = Math.atan2(sinAzimuth, cosAzimuth);

    let relativeAzimuth = azimuth - bearing;
    if (relativeAzimuth < -Math.PI)
        relativeAzimuth += 2 * Math.PI;
    else if (relativeAzimuth > Math.PI)
        relativeAzimuth -= 2 * Math.PI;

    // Only the 180-degree field in front of the observer is visible.
    if (relativeAzimuth < -Math.PI / 2 || relativeAzimuth > Math.PI / 2)
        return null;

    // Azimuthal equidistant projection, normalized by the sky-dome radius.
    const alpha = Math.acos(Math.max(-1, Math.min(1, cosAltitude * Math.cos(relativeAzimuth))));
    const sinAlpha = Math.sin(alpha);
    if (Math.abs(sinAlpha) < 1e-12)
        return new Vec2(0, -0.5);

    const x = (2 / Math.PI) * alpha * cosAltitude * Math.sin(relativeAzimuth) / sinAlpha;
    const y = (2 / Math.PI) * alpha * sinAltitude / sinAlpha;

    // The viewport is 2:1: x spans [-1, 1], while y spans [0, 1].
    return new Vec2(x, y - 0.5);
}

/** Update all star positions and regenerate visible constellation segments. */
function updateSky() {
    for (const star of stars) {
        const projected = projectStar(star.ra, star.dec);
        star.body.position.copy(projected ?? INVISIBLE_POSITION);
    }

    for (const label of constellationLabels)
        label.body.position.copy(projectStar(label.ra, label.dec) ?? INVISIBLE_POSITION);

    constellationSegments.clear();
    for (const [from, to] of constellationLines) {
        // const projectedFrom = projectStar(from[0], from[1]);
        // const projectedTo = projectStar(to[0], to[1]);
        // if (!projectedFrom || !projectedTo)
        //     continue;
        //
        // constellationSegments.push(new LineSegment(projectedFrom, projectedTo, 0x003c66));
    }

    for (const connections of Object.values(constellations))
        for (const [from, to] of connections) {
            const projectedFrom = projectStar(from[0], from[1]);
            const projectedTo = projectStar(to[0], to[1]);
            if (!projectedFrom || !projectedTo)
                continue;

            constellationSegments.push(new LineSegment(projectedFrom, projectedTo, 0x003c66));
        }
}

/** Convert GeoJSON's signed right ascension longitude to 0..360 degrees. */
const longitudeToRightAscension = longitude => longitude < 0 ? longitude + 360 : longitude;

/** Load the star catalogue and constellation line data from D3-Celestial. */
async function loadData() {
    try {
        const [starsResponse, constellationsResponse] = await Promise.all([
            fetch(STAR_DATA_URL),
            fetch(CONSTELLATION_DATA_URL)
        ]);

        if (!starsResponse.ok)
            throw new Error(`Star catalogue request failed: ${starsResponse.status} ${starsResponse.statusText}`);
        if (!constellationsResponse.ok)
            throw new Error(`Constellation data request failed: ${constellationsResponse.status} ${constellationsResponse.statusText}`);

        const [starData, constellationData] = await Promise.all([
            starsResponse.json(),
            constellationsResponse.json()
        ]);

        constellationLines = constellationData.features.flatMap(feature =>
            feature.geometry.coordinates.flatMap(line =>
                line.slice(1).map((point, index) => [
                    [longitudeToRightAscension(line[index][0]), line[index][1]],
                    [longitudeToRightAscension(point[0]), point[1]]
                ])
            )
        );

        constellationLabels = constellationData.features.map(feature => {
            const coordinates = feature.geometry.coordinates.flatMap(line =>
                line.map(([longitude, declination]) => [
                    longitudeToRightAscension(longitude),
                    declination
                ])
            );
            const meanSinRa = coordinates.reduce((sum, point) =>
                sum + Math.sin(point[0] * Math.PI / 180), 0) / coordinates.length;
            const meanCosRa = coordinates.reduce((sum, point) =>
                sum + Math.cos(point[0] * Math.PI / 180), 0) / coordinates.length;
            const ra = (Math.atan2(meanSinRa, meanCosRa) * 180 / Math.PI + 360) % 360;
            const dec = coordinates.reduce((sum, point) => sum + point[1], 0) / coordinates.length;
            const name = feature.properties.name || feature.properties.desig || feature.id;
            const body = new RadialSymmetricBody({
                position: INVISIBLE_POSITION.clone()
            });
            const view = new Label({
                text: () => name,
                color: new Colour(0x8ab4d6),
                fontSize: '12px',
                visible: constellationLabelsVisible
            });

            simulation.bind(body.alwaysWith(view));
            return { ra, dec, body, view };
        });

        stars = starData.features
            .filter(feature => Number.isFinite(feature.properties.mag)
                && feature.properties.mag <= STAR_MAGNITUDE_LIMIT)
            .map(feature => {
                const magnitude = feature.properties.mag;
                const brightness = Math.max(0.12, Math.min(1, (5 - magnitude) / 6.5));
                const grey = Math.round(brightness * 255);
                const body = new RadialSymmetricBody({
                    position: INVISIBLE_POSITION.clone(),
                    radius: 0.0022 * ( 1 + brightness)
                });

                simulation.bind(body.alwaysWith(new Circle({
                    fillColor: new Colour((grey << 16) | (grey << 8) | grey),
                    borderColor: Colour.Black,
                    borderWidth: 0,
                    segments: 12
                })));

                return {
                    ra: longitudeToRightAscension(feature.geometry.coordinates[0]),
                    dec: feature.geometry.coordinates[1],
                    body
                };
            });

        updateSky();
    } catch (error) {
        console.error('Unable to load the night-sky data.', error);
        simulation.showHud('Could not load the star or constellation data. Check the network connection and try again.');
    }
}

await loadData();
updateSky();
