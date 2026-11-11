import { MeshPhongMaterial, AmbientLight, PointLight, MathUtils } from 'three';
import {
    CelestialBody, Checkbox, Colour, Mercury, Planet, RadialSymmetricBody, Simulation, Sphere, SunView,
    ThreeJsScene, Trail, Vec3
} from '../../../src/index.js';
import mercuryMap from '../../astrophysics/textures/mercurymap.jpg';
import mercuryBumpMap from '../../astrophysics/textures/mercurybump.jpg';

let timeScale = 10;
const orbitRadius = 4.60;   // Initial radius of Mercury orbit, in units of R0
const orbitSpeed = 5.10e-1; // Initial orbital speed of Mercury, in units of R0/T0
const c_a = 9.90e-1;        // Base acceleration of Mercury, in units of R0**3/T0**2
const sunSchwarzschildRadius = 2.95e-7;  // Schwarzschild radius of Sun,in units of R0
const rL2 = 8.19e-7;        // Specific angular momentum, in units of R0**2

// Initialize distance and velocity vectors of Mercury (at perihelion)
const initial_position = new Vec3(orbitRadius, 0, 0);
const initial_velocity = new Vec3(0, 0, orbitSpeed);

class RelativisticMercury extends CelestialBody {
    constructor(planetData) {
        super(planetData);
        this._orbit = [];
        this._alpha = 1e6;
        this._beta = 1e5;
        this.velocity.copy(initial_velocity);
    }

    get coordinates() { return this.position; }

    updateBy(t, dt) {
        const current_pos = this.position.clone();
        const positionLength  = current_pos.length();
        this._orbit.push(current_pos);
        const minRadius = 1e-10;
        const safePositionLength = Math.max(positionLength, minRadius);
        const old_position_vector_magnitude_squared = safePositionLength * safePositionLength;

        // Compute the factor coming from General Relativity
        const fact = 1 + this._alpha * sunSchwarzschildRadius / safePositionLength + this._beta * rL2 / old_position_vector_magnitude_squared;
        const acceleration_magnitude = c_a * fact / old_position_vector_magnitude_squared;
        const acceleration_vector = current_pos.multiplyScalar(-acceleration_magnitude / safePositionLength);

        this.velocity.addScaledVector(acceleration_vector, dt);
        this.position.addScaledVector(this.velocity, dt);
    }

    toggleAlpha() { this._alpha = this._alpha === 0 ? 1e6 : 0; } // Strength of 1/r**3 term
    toggleBeta()  { this._beta  = this._beta === 0  ? 1e5 : 0; } // Strength of 1/r**4 term
}

const baseDt = 2. * orbitSpeed / c_a / 20;  // Time step
let turns = 0;
let vec_r_last = initial_position; // Previous position of Mercury
const perihelion_list = [];        // List of perihelion locations
let sum_angle  = 0.;               // Angle between first and last perihelion
let previousDr = 0;
let simulation;

function angleBetween(v1, v2) {
    const a = v1.clone().normalize();
    const b = v2.clone().normalize();
    const dot = MathUtils.clamp(a.dot(b), -1, 1);
    return Math.acos(dot); // in radialen
}

function markPerihelion() {
    simulation.bind(new RadialSymmetricBody({
        position: vec_r_last,
        radius: 0.2
    }).onceWith(new Sphere({ color: Colour.Green })));
    const prev = perihelion_list[perihelion_list.length - 2];
    const curr = perihelion_list[perihelion_list.length - 1];

    sum_angle += angleBetween(prev, curr) * 180 / Math.PI;
    // plotData[0].push(turns);
    // plotData[1].push(angleBetween(prev, curr) * 180 / Math.PI);
    // plotData[2].push(sum_angle);
    //
    // plot.setData(plotData);
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

// const plotData = [
//     [0], // turns
//     [0], // delta angle
//     [0], // cumulative angle
// ];
//
// const plot = new uPlot({
//     width: planetsCanvas.clientWidth,
//     height: planetsCanvas.clientHeight * .75,
//     title: 'Perihelion precession',
//     scales: {
//         x: { time: false },  // <--- no date interpretation
//         y: { label: 'Precession angle (deg)' }
//     },
//     series: [{}, // x-axis
//         {
//             label: 'Δθ per orbit',
//             stroke: 'lime',
//         },
//         {
//             label: 'Cumulative θ',
//             stroke: 'orange',
//         }
//     ],
//     axes: [
//         {   // x-as
//             stroke: '#ff0',
//             font: '12px Arial',
//             grid: {
//                 stroke: 'rgba(255, 255, 255, 0.2)',
//                 width: 1
//             }
//         },
//         {   // y-as
//             stroke: '#ff0',
//             font: '12px Arial',
//             grid: {
//                 stroke: 'rgba(255, 255, 255, 0.2)',
//                 width: 1
//             }
//         }
//     ],
//     bg: 'transparent'
// }, plotData, document.getElementById('plot'));

const sun = new CelestialBody({
    'name': 'sun',
    'radius': 696300000.0 * .25e-2,
    'mass': 1.9885440000000002e+30,
    'spin': 3600 * 2.8653290845717256e-06,
    'tilt': 0.1265363707695889
});

sun.position.set(0, 0, 0);

const sunLight = new PointLight(0xffffff, 2.0, 0, .1); // intense, no max distance
sunLight.position.set(0, 0, 0);

const mercury = new RelativisticMercury(Mercury);

let tPhys = 0;
let lastTime = performance.now() * .001;
let accumulator = 0;
simulation = Simulation
    .with({
        htmlDivId: 'perihelionMercuryContainer',
        camera: {
            position: new Vec3(-3 * orbitRadius, 1.25 * orbitRadius, 0).multiplyScalar(3),
        },
        headUpDisplay: { enabled: false },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-6 },
        lighting: { enabled: false }
    })
    .bind(mercury.alwaysWith(new Planet({
        material: new MeshPhongMaterial({
            map: Planet.loader.load(mercuryMap),
            bumpMap: Planet.loader.load(mercuryBumpMap),
            bumpScale: 1.5,
            shininess: 0
        })
    })))
    .bind(mercury.alwaysWith(new Trail()))
    .bind(sun.alwaysWith(new SunView()))
    .onFrame(timeStamp => {
        const deltaSeconds = (timeStamp - lastTime) * .001;
        lastTime = timeStamp;
        //const dtHours = deltaSeconds * 24 / 60; // 24 hours equal to one minute simulation view

        accumulator += deltaSeconds * timeScale;
        while (accumulator > baseDt) {
            vec_r_last = mercury.position.clone();

            mercury.updateBy(tPhys, baseDt);
            checkPerihelion();

            mercury.time += baseDt;
            accumulator -= baseDt;
        }
    })
    .addObject3D(sunLight)
    .addObject3D(new AmbientLight(0xffffff, 0.2))
    .append(new Checkbox('Alpha term').onChange(() => mercury.toggleAlpha()))
    .append(new Checkbox('Beta term').onChange(() => mercury.toggleBeta()));
