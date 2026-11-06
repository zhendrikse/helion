import {
    Simulation, Vec3, CelestialBody, ThreeJsScene, Planet, Checkbox, PlanetMoonSystem, Trail, Range, SunView,
    Colour, Earth, Mercury, Venus, Luna, Mars, Sattelite, Jupiter, RingsPlanet, Saturn, Slider, Neptune, Uranus
} from '../../../src/index.js';
import {
    AmbientLight, MeshPhongMaterial, PointLight, Mesh, FrontSide, SphereGeometry
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

const earthMoonSystem = new PlanetMoonSystem(Earth, [Luna]);

export class EarthView extends Planet {
    constructor({
                    material,
                    translation = new Vec3()
                }) {
        super({material, translation});
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

const planetView = (map, bumpMap, bumpScale) =>
    new Planet({
        material: new MeshPhongMaterial({
            map: Planet.loader.load(map),
            bumpMap: Planet.loader.load(bumpMap),
            bumpScale,
            shininess: 0
        })
    });

const earthView = new EarthView({
    material: new MeshPhongMaterial({
        map: Planet.loader.load(earthMap),
        bumpMap: Planet.loader.load(earthBumpMap),
        specularMap: Planet.loader.load(earthSpecMap),
        bumpScale: 8,
        shininess: 0
    })
});

const lunarView = new Sattelite(earthView, {
    material: new MeshPhongMaterial({
        map: Planet.loader.load(moonMap),
        bumpMap: Planet.loader.load(moonBumpMap),
        bumpScale: 2,
        shininess: 0
    })
});

const mercuryView = planetView(mercuryMap, mercuryBumpMap, 1.5);
const marsView = planetView(marsMap, marsBumpMap, 2.5);
const venusView = planetView(venusMap, venusBumpMap, 1);
const jupiterView = planetView(jupiterMap, jupiterMap, 1);
const neptuneView = planetView(neptuneMap, neptuneMap, 5);

const saturnView = new RingsPlanet({
    material: new MeshPhongMaterial({
        map: Planet.loader.load(saturnMap),
        bumpMap: Planet.loader.load(saturnMap),
        bumpScale: 7.5,
        shininess: 0
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

const planets = [Mercury, Venus, Mars, Earth, Jupiter, Saturn, Uranus, Neptune];
const celestialBodies =
    [lunarView, earthView, mercuryView, marsView, venusView, jupiterView, saturnView, uranusView, neptuneView];

const sun = new CelestialBody({
    radius: 3e7
});
const sunLight = new PointLight(0xffffff, 2, 1e7, 0);
sunLight.castShadow = true;

let lastTime = performance.now() * 1e-3;

const moons = [Luna];
planets.forEach(planet => planet.position.copy(planet.coordinates));

const scaleCelestialBodies = scaleFactor => celestialBodies.forEach(body => body.radiusScaleFactor = scaleFactor);

scaleCelestialBodies(1.25);
let animationSpeed = 60;
const closePerspective = new Vec3(-400, 150, 75);
const farPerspective  = new Vec3(1000, 300, -1800);
const simulation = Simulation
    .with({
        htmlDivId: 'solarSystemContainer',
        viewport: { aspectRatio: '19/12', parameterMenuCollapsed: false },
        camera: { fieldOfView: 50, position: closePerspective},
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-6 },
        lighting: { enabled: false, shadows: true },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>🌎 Solar system</strong><br/>` +
                `• Features tidal locking of moons<br/>`
        }
    })
    .addObject3D(new AmbientLight(0x888888, 1e-1))
    .addObject3D(sunLight)
    .bind(sun.alwaysWith(new SunView()))
    .bind(Mercury.alwaysWith(mercuryView))
    .bind(Mercury.alwaysWith(new Trail({
        maxPoints: 250,
        trailStep: 10,
        color: Colour.Yellow
    })))
    .bind(Venus.alwaysWith(venusView))
    .bind(Venus.alwaysWith(new Trail({
        maxPoints: 600,
        trailStep: 10,
        color: Colour.Orange
    })))
    .bind(Earth.alwaysWith(earthView))
    .bind(Earth.alwaysWith(new Trail({
        maxPoints: 1000,
        trailStep: 10,
        color: Colour.LightBlue
    })))
    .bind(Luna.alwaysWith(lunarView))
    .bind(Mars.alwaysWith(marsView))
    .bind(Mars.alwaysWith(new Trail({
        maxPoints: 300,
        trailStep: 10,
        color: Colour.Red
    })))
    .bind(Jupiter.alwaysWith(jupiterView))
    .bind(Jupiter.alwaysWith(new Trail({
        maxPoints: 1000,
        trailStep: 100,
        color: Colour.Cyan
    })))
    .bind(Saturn.alwaysWith(saturnView))
    .bind(Saturn.alwaysWith(new Trail({
        maxPoints: 1000,
        trailStep: 100,
        color: new Colour(0x999999)
    })))
    .bind(Uranus.alwaysWith(uranusView))
    .bind(Uranus.alwaysWith(new Trail({
        maxPoints: 1000,
        trailStep: 100,
        color: Colour.LightBlue
    })))
    .bind(Neptune.alwaysWith(neptuneView))
    .bind(Neptune.alwaysWith(new Trail({
        maxPoints: 1000,
        trailStep: 100,
        color: Colour.Blue
    })))
    .onFrame(timeStamp => {
        sun.time = timeStamp;

        const deltaSeconds = (timeStamp - lastTime) * .001;
        lastTime = timeStamp;

        const dtHours = animationSpeed * deltaSeconds * 24 / 60;
        planets.forEach(planet => planet.time += dtHours);
        moons.forEach(moon => moon.time += dtHours);
        earthMoonSystem.update();
    })
    .append(new Checkbox('Earth clouds')
        .checked(true)
        .onChange(checked => earthView.clouds = checked)
    )
    .append(new Slider('Scale planets')
        .withRange(new Range(1, 3, 0.01))
        .withValue(1.25)
        .onInput(value => scaleCelestialBodies(value)))
    .append(new Slider('Animation speed')
        .withRange(new Range(1, 240, 1))
        .withValue(animationSpeed)
        .onInput(value => animationSpeed = value))
    .start();

simulation.append(new Checkbox('Far view')
    .onChange(checked => simulation.cameraPosition = checked ? farPerspective : closePerspective));