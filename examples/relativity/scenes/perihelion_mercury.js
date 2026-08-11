import { MeshPhongMaterial, TextureLoader, Scene, PerspectiveCamera, WebGLRenderer, AmbientLight,
    PointLight, ACESFilmicToneMapping, SRGBColorSpace, MathUtils } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ThreeJsUtils, Sphere, TrailProperties } from '../js/three-js-extensions.js';
import { SkyDome, Sun, TEXTURES_PATH, PLANET_SCALE, SUN_SCALE } from '../js/astro-extensions.js';
import {Planets, Vec3} from "../../../src/index.js";

const planetsCanvas = document.getElementById('planetsCanvas');
planetsCanvas.focus();
console.clear();

let timeScale = 10;
const orbitRadius = 4.60;   // Initial radius of Mercury orbit, in units of R0
const orbitSpeed = 5.10e-1; // Initial orbital speed of Mercury, in units of R0/T0
const c_a = 9.90e-1;        // Base acceleration of Mercury, in units of R0**3/T0**2
const sunSchwarzschildRadius = 2.95e-7;  // Schwarzschild radius of Sun,in units of R0
const rL2 = 8.19e-7;        // Specific angular momentum, in units of R0**2

// Initialize distance and velocity vectors of Mercury (at perihelion)
const initial_position = new Vec3(orbitRadius, 0, 0);
const initial_velocity = new Vec3(0, 0, orbitSpeed);

const textureLoader = new TextureLoader();
textureLoader.setCrossOrigin("anonymous");

const planetaryScene = new Scene();
// --- CAMERA ---
const cameraStart = {
    position: new Vec3(-3 * orbitRadius, 1.25 * orbitRadius, 0).multiplyScalar(0.875),
    target: new Vec3(0, 0, 0)
};
const planetCamera = new PerspectiveCamera(40, 1, .05 * orbitRadius, 20 * orbitRadius);
planetCamera.position.copy(cameraStart.position);

const planetRenderer = new WebGLRenderer( {antialias: true, canvas: planetsCanvas, alpha: true} );
planetRenderer.shadowMap.enabled = false;
planetRenderer.setAnimationLoop( animate );
planetRenderer.toneMapping = ACESFilmicToneMapping;
planetRenderer.toneMappingExposure = 1.5;
planetRenderer.outputColorSpace = SRGBColorSpace;

// Resizing for mobile devices
ThreeJsUtils.resizeRendererToCanvas(planetRenderer, planetCamera);
window.addEventListener('resize', () => {
    ThreeJsUtils.resizeRendererToCanvas(planetRenderer, planetCamera);
});

const controls = new OrbitControls(planetCamera, planetsCanvas);
controls.target.copy(cameraStart.target);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

class RelativisticMercury extends Planets.mercury {
    constructor(planetData, scaleFactor, {bumpScale=0.005, identicalBumpMap=false} = {}) {
        super(planetData, scaleFactor, {
            bumpScale: bumpScale,
            identicalBumpMap: identicalBumpMap,
            trailProperties: new TrailProperties({
                makeTrail: true,
                maxPoints: 5000,
                color: 0xaaff00,
                trailStep: 1
            })
        });
        this._body.castShadow = true;
        this._body.receiveShadow = false;
        this._orbit = [];
        this._alpha = 1e6;
        this._beta = 1e5;
        this._velocity = initial_velocity;
    }

    _material(bumpScale, identicalBumpMap) {
        const bumpMap = TEXTURES_PATH + this._name + (identicalBumpMap ? "map.jpg" : "bump.jpg");
        return new MeshPhongMaterial({
            map: textureLoader.load(`${TEXTURES_PATH}` + this._name + "map.jpg"),
            bumpMap: textureLoader.load(bumpMap),
            bumpScale: 0.005,
            shininess: 0
        });
    }

    coordinatesAt(t) { return this._orbit.coordinatesAt(t); }

    updateBy(t, dt) {
        this.updateRotation(t);

        const current_pos = this.position.clone();
        const positionLength  = current_pos.length();
        this._orbit.push(current_pos);
        const old_position_vector_magnitude_squared = positionLength * positionLength;

        // Compute the factor coming from General Relativity
        const fact = 1 + this._alpha * sunSchwarzschildRadius / positionLength + this._beta * rL2 / old_position_vector_magnitude_squared;
        const acceleration_magnitude = c_a * fact / old_position_vector_magnitude_squared;
        const acceleration_vector = current_pos.multiplyScalar(-acceleration_magnitude / positionLength);

        this._velocity.addScaledVector(acceleration_vector, dt);
        this.position.addScaledVector(this._velocity, dt);
        this._trail?.update(this.position);
    }

    toggleAlpha() { this._alpha = this._alpha === 0 ? 1e6 : 0; } // Strength of 1/r**3 term
    toggleBeta()  { this._beta  = this._beta === 0  ? 1e5 : 0; } // Strength of 1/r**4 term
}

const skyDome = new SkyDome({starDensity: 1, skyRadius: 18 * orbitRadius, glowStarCount: 500});
planetaryScene.add(skyDome);

const sun = new Sun({
    "name": "sun",
    "radius": 696300000.0,
    "mass": 1.9885440000000002e+30,
    "spin": 3600 * 2.8653290845717256e-06,
    "tilt": 0.1265363707695889
}, SUN_SCALE * orbitRadius * .5);

sun.position.set(0, 0, 0);
planetaryScene.add(sun);
const sunLight = new PointLight(0xffffff, 2.0, 0, .1); // intense, no max distance
sunLight.position.set(0, 0, 0);
planetaryScene.add(sunLight);
planetaryScene.add(new AmbientLight(0xffffff, 0.2));

const mercury = new RelativisticMercury({
    "name": "mercury",
    'a': 57909050.,
    'e': 0.205630,
    'inclination': 7 * Math.PI / 180.,
    'right_ascension': 0.8436854966,
    'mean_anomaly': 3.0507657193,
    'radius': 2439.7 * 1e3,
    "mass": 3.302e+23,
    'tilt': 0.1 * Math.PI / 180.,
    "spin": 2 * Math.PI / 4222.6
}, PLANET_SCALE * orbitRadius * .4);
mercury.position.copy(initial_position);
planetaryScene.add(mercury);

document.getElementById("alphaTerm").onclick = () => mercury.toggleAlpha();
document.getElementById("betaTerm").onclick = () => mercury.toggleBeta();

const baseDt = 2. * orbitSpeed / c_a / 20;  // Time step
let turns = 0;
let vec_r_last = initial_position; // Previous position of Mercury
const perihelion_list = [];        // List of perihelion locations
let sum_angle  = 0.;               // Angle between first and last perihelion
let previousDr = 0;

function angleBetween(v1, v2) {
    const a = v1.clone().normalize();
    const b = v2.clone().normalize();
    const dot = MathUtils.clamp(a.dot(b), -1, 1);
    return Math.acos(dot); // in radialen
}

function markPerihelion() {
    planetaryScene.add(new Sphere({
        position: vec_r_last,
        color: 0x00ff00,
        radius: 0.2
    }));
    const prev = perihelion_list[perihelion_list.length - 2];
    const curr = perihelion_list[perihelion_list.length - 1];

    sum_angle += angleBetween(prev, curr) * 180 / Math.PI;
    plotData[0].push(turns);
    plotData[1].push(angleBetween(prev, curr) * 180 / Math.PI);
    plotData[2].push(sum_angle);

    plot.setData(plotData);
}

function checkPerihelion() {
    const radiusCurrent = vec_r_last.length();
    const radiusNext = mercury.position.length();
    const dr = radiusNext - radiusCurrent; // discrete derivative of radius
    if (previousDr !== null)
        if (previousDr < 0 && dr > 0) { // detect transition from ascending to descending
            turns++;
            perihelion_list.push(vec_r_last);
            if (turns > 1) markPerihelion();
        }
    previousDr = dr;
}

const plotData = [
    [0], // turns
    [0], // delta angle
    [0], // cumulative angle
];

const plot = new uPlot({
    width: planetsCanvas.clientWidth,
    height: planetsCanvas.clientHeight * .75,
    title: "Perihelion precession",
    scales: {
        x: { time: false },  // <--- no date interpretation
        y: { label: "Precession angle (deg)" }
    },
    series: [{}, // x-axis
        {
            label: "Δθ per orbit",
            stroke: "lime",
        },
        {
            label: "Cumulative θ",
            stroke: "orange",
        }
    ],
    axes: [
        {   // x-as
            stroke: "#ff0",
            font: "12px Arial",
            grid: {
                stroke: "rgba(255, 255, 255, 0.2)",
                width: 1
            }
        },
        {   // y-as
            stroke: "#ff0",
            font: "12px Arial",
            grid: {
                stroke: "rgba(255, 255, 255, 0.2)",
                width: 1
            }
        }
    ],
    bg: "transparent"
}, plotData, document.getElementById("plot"));


let tPhys = 0;
let lastTime = performance.now() * .001;
let accumulator = 0;
function animate(now) {

    const deltaSeconds = (now - lastTime) * .001;
    lastTime = now;

    accumulator += deltaSeconds * timeScale;

    while (accumulator > baseDt) {
        vec_r_last = mercury.position.clone();

        mercury.updateBy(tPhys, baseDt);
        checkPerihelion();

        tPhys += baseDt;
        accumulator -= baseDt;
    }

    sun.update(tPhys);
    skyDome.update(now * .001, planetCamera);
    planetRenderer.render(planetaryScene, planetCamera);
}
