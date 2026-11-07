import {
    Simulation, Vec3, CelestialBody, ThreeJsScene, Planet, Checkbox, PlanetMoonSystem, Trail, Range, SunView,
    Colour, Earth, Mercury, Venus, Luna, Mars, Sattelite, Jupiter, RingsPlanet, Saturn, Slider, Neptune, Uranus,
    Moon, Phobos, Deimos, Callisto, Europa, Ganymede, Io, ColorMappers, LineSegmentsView, LineSegment, Segments
} from '../../../src/index.js';
import {
    AmbientLight, MeshPhongMaterial, PointLight, Mesh, FrontSide
} from 'three';

import earthMap from '../textures/Solarsystemscope_texture_2k_earth_daymap.jpg';
import earthBumpMap from '../textures/earthbump1k.jpg';
import earthSpecMap from '../textures/earthspec1k.jpg';
import earthCloudsMap from '../textures/Earth-clouds.png';
import moonMap from '../textures/moonmap1k.jpg';
import moonBumpMap from '../textures/moonbump1k.jpg';
import mercuryMap from '../textures/mercurymap.jpg';
import mercuryBumpMap from '../textures/mercurybump.jpg';
import venusMap from '../textures/venusmap.jpg';
import venusBumpMap from '../textures/venusbump.jpg';
import marsMap from '../textures/marsmap.jpg';
import marsBumpMap from '../textures/marsbump.jpg';
import jupiterMap from '../textures/jupitermap.jpg';
import saturnMap from '../textures/saturnmap.jpg';
import neptuneMap from '../textures/neptunemap.jpg';
import saturnRingsColorUrl from '../textures/saturnringcolor.jpg';
import saturnRingsPatternUrl from '../textures/saturnringpattern.gif';
import uranusMap from "../textures/uranusmap.jpg";
import uranusRingsColorUrl from "../textures/uranusringcolour.jpg";
import uranusRingsPatternUrl from "../textures/uranusringtrans.gif";

export class EarthView extends Planet {
    constructor({
        material,
        translation = new Vec3(),
        radiusScaleFactor = 1
    }) {
        super({material, translation, radiusScaleFactor});
        const cloudsMaterial = new MeshPhongMaterial({
            map: Planet.loader.load(earthCloudsMap),
            transparent: true,
            opacity: 0.75,
            depthWrite: false,   // prevents harsh borders
            side: FrontSide,
            emissive: new Colour(0x222222).asThreeJsColor(),
            emissiveIntensity: 0.25,
            shininess: 5
        });
        this._clouds = new Mesh(this._mesh.geometry, cloudsMaterial);
        this._clouds.scale.setScalar(1.01); // Height of clouds
        this._clouds.material.depthWrite = false;
        this.add(this._clouds);
        this._mesh.castShadow = true;
    }

    set clouds(value) { this._clouds.visible = value; }

    synchronizeWith(body) {
        this._clouds.rotation.y = body.time * body.spin * .75;
        super.synchronizeWith(body);
    }
}

const planetView = (map, bumpMap, bumpScale, radiusScaleFactor=1) => new Planet({
    material: new MeshPhongMaterial({
        map: Planet.loader.load(map),
        bumpMap: Planet.loader.load(bumpMap),
        bumpScale,
        shininess: 0
    }),
    radiusScaleFactor
});

const moonView = (parent, color, radiusScaleFactor) => new Sattelite(parent, {
    material: new MeshPhongMaterial({
        color: color.asThreeJsColor(),
        shininess: 1,
        emissiveIntensity: 0.7,
    }),
    radiusScaleFactor
});

const mercuryView = planetView(mercuryMap, mercuryBumpMap, 1.5);
const venusView = planetView(venusMap, venusBumpMap, 1);
const earthView = new EarthView({
    material: new MeshPhongMaterial({
        map: Planet.loader.load(earthMap),
        bumpMap: Planet.loader.load(earthBumpMap),
        specularMap: Planet.loader.load(earthSpecMap),
        bumpScale: 8,
        shininess: 0
    })
});
const marsView = planetView(marsMap, marsBumpMap, 2.5);
const jupiterView = planetView(jupiterMap, jupiterMap, 1, 0.7);
const neptuneView = planetView(neptuneMap, neptuneMap, 5);

const lunarView = new Sattelite(earthView, {
    material: new MeshPhongMaterial({
        map: Planet.loader.load(moonMap),
        bumpMap: Planet.loader.load(moonBumpMap),
        bumpScale: 2,
        shininess: 0
    })
});

const saturnView = new RingsPlanet({
    material: new MeshPhongMaterial({
        map: Planet.loader.load(saturnMap),
        bumpMap: Planet.loader.load(saturnMap),
        bumpScale: 7.5,
        shininess: 0,
    }),
    innerRadius: 1.11,
    outerRadius: 2.1,
    divisor: 4,
    ringsColorUrl: saturnRingsColorUrl,
    ringsPatternUrl: saturnRingsPatternUrl
});

const uranusView =  new RingsPlanet({
    material: new MeshPhongMaterial({
        map: Planet.loader.load(uranusMap),
        bumpMap: Planet.loader.load(uranusMap),
        bumpScale: 5,
        shininess: 0
    }),
    innerRadius: 1.55,
    outerRadius: 2.05,
    divisor: 2,
    ringsColorUrl: uranusRingsColorUrl,
    ringsPatternUrl: uranusRingsPatternUrl
});

const planets = [Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune]
    .map(data => new CelestialBody(data))
const planetViews =
    [mercuryView, venusView, earthView, marsView, jupiterView, saturnView, uranusView, neptuneView];

const moons = [
    new Moon(planets[2], Luna),
    new Moon(planets[3], Phobos),
    new Moon(planets[3], Deimos),
    new Moon(planets[4], Callisto),
    new Moon(planets[4], Europa),
    new Moon(planets[4], Ganymede),
    new Moon(planets[4], Io)
];
const moonViews =
    [lunarView,
        moonView(planetViews[3], Colour.White, 5), // Deimos
        moonView(planetViews[3], Colour.White, 5), // Phobos
        moonView(planetViews[4], new Colour(0xcccccc), 1), // Callisto
        moonView(planetViews[4], new Colour(0xcccccc), 1), // Europa
        moonView(planetViews[4], new Colour(0xcccccc), 1), // Ganymede
        moonView(planetViews[4], new Colour(0xcccccc), 1)  // Io
];

const createOrbitView = (body, color, dashSize = 5e6, gapSize = 5e6) => {
    const points = body.orbitCoordinates;
    const segments = new Segments();

    for (let i = 0; i < points.length - 1; i++)
        segments.add(new LineSegment(points[i], points[i + 1]));

    const view = new LineSegmentsView({
        lineWidth: .5,
        dashSize,
        gapSize,
        dashed: true,
        colorMapper: ColorMappers.get(ColorMappers.Uniform, { color })
    });
    view.synchronizeWith(segments);
    view.visible = false;
    return view;
};

const orbitViews = [
    createOrbitView(planets[0], Colour.Yellow),
    createOrbitView(planets[1], Colour.Orange),
    createOrbitView(planets[2], Colour.LightBlue),
    createOrbitView(planets[3], Colour.Red),
    createOrbitView(planets[4], Colour.Cyan),
    createOrbitView(planets[5], new Colour(0x999999)),
    createOrbitView(planets[6], Colour.LightBlue),
    createOrbitView(planets[7], Colour.Blue)
];

const earthMoonSystem = new PlanetMoonSystem(planets[2], [moons[0]], 60);
const marsMoonSystem = new PlanetMoonSystem(planets[3], [moons[1], moons[2]], 750);
const jupiterMoonSystem = new PlanetMoonSystem(planets[4], [moons[3], moons[4], moons[5], moons[6]], 125);

const sun = new CelestialBody({ radius: 2e7 });
const sunLight = new PointLight(0xffffff, 2, 0, 0.1);
sunLight.castShadow = true;

const trail = (color, trailStep, maxPoints) => new Trail({maxPoints, trailStep, color});
const trails = [
    trail(Colour.Yellow, 10, 250),
    trail(Colour.Orange, 10, 600),
    trail(Colour.LightBlue, 10, 1000),
    trail(Colour.Red, 10, 1250),
    trail(Colour.Cyan, 100, 1000),
    trail(new Colour(0x999999), 100, 1000),
    trail(Colour.LightBlue, 100, 1000),
    trail(Colour.Blue, 100, 1000)
]

// Init planet positions
planets.forEach(planet => planet.position.copy(planet.coordinates));

let animationSpeed = 60;
let lastTime = performance.now() * 1e-3;
const closePerspective = new Vec3(-21.6, 9, 3.6);
const farPerspective  = new Vec3(100, 30, -180);
const simulation = Simulation
    .with({
        htmlDivId: 'solarSystemContainer',
        viewport: { aspectRatio: '19/12', parameterMenuCollapsed: false },
        camera: { fieldOfView: 50, position: closePerspective},
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-7 },
        lighting: { enabled: false, shadows: true },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: '<strong>🌗 Solar system</strong><br/>' +
                '• <a href=\"https://en.wikipedia.org/wiki/Newton%27s_method\">Newton-Raphson method</a> for realistic (elliptic) orbits<br/>' +
                '• Includes tilt, spin and tidal locking of applicable moons e.g. Earth’s moon<br/>' +
                '• Features advanced techniques for rendering earth clouds &amp; sun corona<br/>'
        }
    })
    .addObject3D(new AmbientLight(0x888888, 1e-1))
    .addObject3D(sunLight)
    .bind(sun.alwaysWith(new SunView()))
    .onFrame(timeStamp => {
        sun.time = timeStamp;

        const deltaSeconds = (timeStamp - lastTime) * .001;
        lastTime = timeStamp;

        const dtHours = animationSpeed * deltaSeconds * 24 / 60;
        planets.forEach(planet => planet.time += dtHours);
        moons.forEach(moon => moon.time += dtHours);
        earthMoonSystem.update();
        marsMoonSystem.update();
        jupiterMoonSystem.update();
    })
    .append(new Checkbox('Earth clouds')
        .checked(true)
        .onChange(checked => earthView.clouds = checked)
        .togetherWith(new Checkbox('Show orbits')
            .checked(false)
            .onChange(checked => orbitViews.forEach(view => view.visible = checked)))
    )
    .append(new Slider('Scale model')
        .withRange(new Range(1, 3, 0.01))
        .withValue(1)
        .onInput(scaleFactor => {
            planetViews.forEach(body => body.rescale = scaleFactor);
            moonViews.forEach(moon => moon.rescale = scaleFactor);
            trails.forEach(trail => trail.scale.setScalar(scaleFactor));
        }))
    .append(new Slider('Animation speed')
        .withRange(new Range(1, 240, 1))
        .withValue(animationSpeed)
        .onInput(value => animationSpeed = value))
    .start();

orbitViews.forEach(orbit => simulation.addObject3D(orbit));
planets.forEach((planet, index) => simulation.bind(planet.alwaysWith(planetViews[index])));
planets.forEach((planet, index) => simulation.bind(planet.alwaysWith(trails[index])));
moons.forEach((moon, index) => simulation.bind(moon.alwaysWith(moonViews[index])))
simulation.append(new Checkbox('Far view')
    .onChange(checked => simulation.cameraPosition = checked ? farPerspective : closePerspective));