import {
    Checkbox, Circle, Colour, HexValueColorMapper, Label, LineSegment, LineSegmentsView, Range,
    RadialSymmetricBody, Segments, Simulation, Slider, ThreeJsScene, Vec2, Vec3
} from '../../../src/index.js';

const DATA_BASE_URL = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/';
const STAR_DATA_URL = DATA_BASE_URL + 'stars.6.json';
const CONSTELLATION_DATA_URL = DATA_BASE_URL + 'constellations.lines.json';
const STAR_MAGNITUDE_LIMIT = 5;
const INVISIBLE_POSITION = new Vec2(100, 100);

class Star extends RadialSymmetricBody {
    static labelFromD3CelestialData = feature => {
        const coordinates = feature.geometry.coordinates.flatMap(line =>
            line.map(([longitude, declination]) => [longitudeToRightAscension(longitude), declination]));

        const meanSinRa = coordinates.reduce((sum, point) =>
            sum + Math.sin(point[0] * Math.PI / 180), 0) / coordinates.length;

        const meanCosRa = coordinates.reduce((sum, point) =>
            sum + Math.cos(point[0] * Math.PI / 180), 0) / coordinates.length;

        const ra = (Math.atan2(meanSinRa, meanCosRa) * 180 / Math.PI + 360) % 360;
        const dec = coordinates.reduce((sum, point) => sum + point[1], 0) / coordinates.length;
        const name = feature.properties.name || feature.properties.desig || feature.id;
        return new Star(0, ra, dec, name);
    };
    
    static fromD3CelestialData = feature => {
        const magnitude = feature.properties.mag;
        const brightness = Math.max(0.12, Math.min(1, (5 - magnitude) / 6.5));
        const rightAscension = longitudeToRightAscension(feature.geometry.coordinates[0]);
        const declination = feature.geometry.coordinates[1];
        return new Star(brightness, rightAscension, declination);
    };

    /**
     * @param {number} brightness
     * @param {number} rightAscension right ascension in degrees
     * @param {number} declination declination in degrees
     * @param {string} name may contain a label
     */
    constructor(brightness, rightAscension, declination, name = "") {
        super({ position: INVISIBLE_POSITION.clone(), radius: 4.5e-3 * (1 + brightness) });
        this.rightAscension = rightAscension;
        this.declination = declination;
        this.brightness = brightness;
        this.name = name;
    }
}

let latitudeDegrees = 52;
let bearingDegrees = 0;
/** @type {Star[]} */
const stars = [];
/** @type {[Star, Star][]} [fromStar, toStar] */
const constellationLines = [];
/** @type {Star[]} */
const constellationLabelAnchors = [];
/** @type {Label[]} */
const constellationLabelViews = [];
/** @type {Segments<LineSegment>} */
const constellationSegments = new Segments();
const constellationView = new LineSegmentsView({
    lineWidth: 1.5,
    colorMapper: new HexValueColorMapper()
});

const simulation = Simulation
    .with({
        htmlDivId: 'nightSkyContainer',
        viewport: { aspectRatio: '2 / 1', parameterMenuCollapsed: false },
        camera: {
            position: new Vec3(0, 0, 1),
            orthographic: true,
            controls: false
        },
        scene: { background: ThreeJsScene.Background.PLAIN, backgroundColor: Colour.Black },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: '<strong>🌃 Local night sky projection</strong><br/>' +
                '• Stars are loaded from the D3-Celestial star catalogue.'
        }
    })
    .append(new Slider('Latitude')
        .withUnits('°')
        .withRange(new Range(-89, 89, 1))
        .withValue(latitudeDegrees)
        .onInput(value => latitudeDegrees = value))
    .append(new Slider('Bearing')
        .withUnits('°')
        .withRange(new Range(-180, 180, 1))
        .withValue(bearingDegrees)
        .onInput(value => bearingDegrees = value))
    .append(new Checkbox('Constellations')
        .checked(true)
        .onChange(checked => constellationView.visible = checked))
    .append(new Checkbox('Constellation labels')
        .checked(true)
        .onChange(checked => constellationLabelViews.forEach(label => label.visible = checked)))
    .advancesBy(0.01)
    .runsEvery(0.05)
    .onStep((clock, dt) => updateSky(clock.simulatedTime));

/**
 * Project equatorial coordinates onto the visible local sky.
 * The result is normalized to a dome radius of one, with the horizon at y = -0.5.
 * @param {Star} star
 * @param {number} localSiderealTime
 * @returns {Vec2 | null}
 */
function projectStar(star, localSiderealTime) {
    const latitude = latitudeDegrees * Math.PI / 180;
    const bearing = bearingDegrees * Math.PI / 180;
    const siderealAngle = localSiderealTime * 15 * Math.PI / 180;
    const ra = star.rightAscension * Math.PI / 180;
    const dec = star.declination * Math.PI / 180;

    const sinLatitude = Math.sin(latitude);
    const cosLatitude = Math.cos(latitude);
    const sinDeclination = Math.sin(dec);
    const cosDeclination = Math.cos(dec);
    const hourAngle = siderealAngle - ra;

    const sinAltitude = sinDeclination * sinLatitude + cosDeclination * cosLatitude * Math.cos(hourAngle);
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

    // The viewport is 2:1: x spans [-1, 1], while y spans [0, 1].
    return new Vec2(
        (2 / Math.PI) * alpha * cosAltitude * Math.sin(relativeAzimuth) / sinAlpha,
        (2 / Math.PI) * alpha * sinAltitude / sinAlpha - 0.5);
}

/** @param {number} localSiderealTime Update all star positions and regenerate visible constellation segments. */
function updateSky(localSiderealTime = 2) {
    stars.forEach(star => star.position.copy(projectStar(star, localSiderealTime) ?? INVISIBLE_POSITION));
    constellationLabelAnchors.forEach(star => star.position.copy(projectStar(star, localSiderealTime) ?? INVISIBLE_POSITION));
    constellationSegments.clear();
    for (const [fromStar, toStar] of constellationLines) {
        const projectedFrom = projectStar(fromStar, localSiderealTime);
        const projectedTo = projectStar(toStar, localSiderealTime);
        if (projectedFrom && projectedTo)
            constellationSegments.add(new LineSegment(projectedFrom, projectedTo, 0x003c66));
    }
}

/** @param {number} longitude Convert GeoJSON's signed right ascension longitude to 0..360 degrees. */
const longitudeToRightAscension = longitude => longitude < 0 ? longitude + 360 : longitude;

/** Load the star catalogue and constellation line data from D3-Celestial. */
async function loadData() {
    const [starsResponse, constellationsResponse] = await Promise.all(
        [ fetch(STAR_DATA_URL), fetch(CONSTELLATION_DATA_URL) ]);

    if (!starsResponse.ok)
        throw new Error(`Star catalogue request failed: ${starsResponse.status} ${starsResponse.statusText}`);
    if (!constellationsResponse.ok)
        throw new Error(`Constellation data request failed: ${constellationsResponse.status} ${constellationsResponse.statusText}`);

    const [starData, constellationData] = await Promise.all([starsResponse.json(), constellationsResponse.json()]);

    constellationData.features.forEach(feature => {
        feature.geometry.coordinates.forEach(line => {
            line.slice(1).forEach((point, index) => {
                constellationLines.push([
                    new Star(0, longitudeToRightAscension(line[index][0]), line[index][1]),
                    new Star(0, longitudeToRightAscension(point[0]), point[1])
                ]);
            });
        });
    });

    constellationData.features.forEach(feature => constellationLabelAnchors.push(Star.labelFromD3CelestialData(feature)));
    starData.features
        .filter(feature => Number.isFinite(feature.properties.mag) && feature.properties.mag <= STAR_MAGNITUDE_LIMIT)
        .forEach(feature => stars.push(Star.fromD3CelestialData(feature)));
}

try {
    await loadData();
    simulation.bind(constellationSegments.alwaysWith(constellationView))
    stars.forEach(star => {
        const grey = Math.round(star.brightness * 255);
        simulation.bind(star.alwaysWith(new Circle({
            fillColor: new Colour((grey << 16) | (grey << 8) | grey),
            borderWidth: 0,
            segments: 12
        })));
    });
    constellationLabelAnchors.forEach(dummyStar => {
        const view = new Label({
            text: () => dummyStar.name,
            color: new Colour(0x8ab4d6),
            fontSize: `${simulation.width / 60}px`
        });
        constellationLabelViews.push(view);
        simulation.bind(dummyStar.alwaysWith(view));
    });
    simulation.start();

} catch (error) {
    console.error('Unable to load the night-sky data.', error);
    simulation.showHud('Could not load the star or constellation data. Check the network connection and try again.');
}
