/*
 * Adapted from scripts/simulation.js in
 * https://github.com/krispy-kenay/particle-hydrodynamics
 * Original project copyright and licensing: GNU GPL v3.0 (see LICENSE-GPL-3.0.txt
 * in this directory). This file is a modified version; Helion rendering is new.
 */

import { Color, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial } from 'three';
import {
    Button, Checkbox, MathPhysicsModelBehavior, Range, Simulation, Slider, Vec3
} from '../../../src/index.js';
import { Renderable2D } from '../../../src/view/renderer.js';

const WIDTH = 14;
const HEIGHT = 8;
const PARTICLE_COUNT = 450;
const DT = 0.01;
const MAX_SPEED = 20;
const COLLISION_DAMPING = 0.5;

const INITIAL_SMOOTHING_RADIUS = 0.55;
const INITIAL_PARTICLE_RADIUS = 0.075;
const INITIAL_MASS = 0.02;

const velocityColor = [
    '#2736b9', '#0043c3', '#0056ae', '#0060a5', '#0067a3', '#006ea4',
    '#0075a6', '#007ba9', '#0082ac', '#0089af', '#0090b2', '#0097b4',
    '#009eb6', '#00a6b7', '#00aeb8', '#00b6b7', '#00beb5', '#00c7b2',
    '#00cead', '#1cd4a9', '#35da9f', '#4ddf93', '#64e486', '#7be878',
    '#92ec6a', '#abef5b', '#c4f14d', '#def140', '#f8f135', '#f8e92f',
    '#f8e129', '#f8d924', '#f7d11f', '#f6c91b', '#f5c117', '#f4b914',
    '#f2b212', '#f0aa11', '#eea211', '#ec9a12', '#ea9212', '#e78b13',
    '#e48315'
];

class Entry {
    constructor(index, cellKey) {
        this.index = index;
        this.cellKey = cellKey;
    }
}

/**
 * A first Helion port of the SPH kernel from
 * https://github.com/krispy-kenay/particle-hydrodynamics.
 *
 * The density, pressure, viscosity, neighbour-search and Verlet-style
 * integration equations intentionally stay close to the original script.
 * Canvas drawing and its global state have been replaced by ParticleCloudView.
 */
class SPHSimulation extends MathPhysicsModelBehavior {
    constructor() {
        super();
        this.gravity = 0.35;
        this.smoothingRadius = INITIAL_SMOOTHING_RADIUS;
        this.pressureMultiplier = 8;
        this.nearPressureMultiplier = 12;
        this.viscosityStrength = 0.08;
        this.targetDensity = 0.65;
        this.mass = INITIAL_MASS;
        this.particleRadius = INITIAL_PARTICLE_RADIUS;
        this.numPoints = PARTICLE_COUNT;

        this.positions = [];
        this.positionsPrev = [];
        this.acceleration = [];
        this.radiuses = [];
        this.densities = [];
        this.spatialLookup = [];
        this.startIndices = [];
        this.collisionSpatialLookup = [];
        this.collisionStartIndices = [];

        this.reset();
    }

    reset() {
        this.positions.length = 0;
        this.positionsPrev.length = 0;
        this.acceleration.length = 0;
        this.radiuses.length = 0;
        this.densities.length = 0;

        // Start as a compact block of fluid in the left-hand side of the tank.
        const columns = Math.ceil(Math.sqrt(this.numPoints * WIDTH / HEIGHT));
        const rows = Math.ceil(this.numPoints / columns);
        const spacing = Math.min(this.particleRadius * 2.1, 0.15);
        const blockWidth = Math.min(WIDTH * 0.48, columns * spacing);
        const blockHeight = Math.min(HEIGHT * 0.82, rows * spacing);
        for (let i = 0; i < this.numPoints; i++) {
            const column = i % columns;
            const row = Math.floor(i / columns);
            const x = 0.35 + column * (blockWidth / Math.max(1, columns - 1)) + (Math.random() - 0.5) * spacing * 0.15;
            const y = (HEIGHT - blockHeight) * 0.5 + row * (blockHeight / Math.max(1, rows - 1)) + (Math.random() - 0.5) * spacing * 0.15;
            this.positions.push([x, y]);
            this.positionsPrev.push([x + (Math.random() - 0.5) * 0.015, y + (Math.random() - 0.5) * 0.015]);
            this.acceleration.push([0, 0]);
            this.radiuses.push(this.particleRadius);
            this.densities.push([0, 0]);
        }

        this.spatialLookup = new Array(this.numPoints);
        this.startIndices = new Array(this.numPoints);
        this.collisionSpatialLookup = new Array(this.numPoints);
        this.collisionStartIndices = new Array(this.numPoints);
        this.updatePositions(DT);
        return this;
    }

    updatePositions(dt = DT) {
        const pos = this.positions;
        const ppos = this.positionsPrev;
        const acc = this.acceleration;
        const sradius = this.smoothingRadius;

        updateSpatialLookup(pos, this.collisionSpatialLookup, this.collisionStartIndices, this.particleRadius * 2);
        updateSpatialLookup(pos, this.spatialLookup, this.startIndices, sradius);

        if (this.targetDensity > 0)
            calculateDensity(pos, this.densities, this.spatialLookup, this.startIndices, sradius, this.mass);
        if (this.pressureMultiplier > 0)
            calculatePressureForce(pos, acc, this.densities, this.spatialLookup, this.startIndices, sradius,
                this.mass, this.targetDensity, this.pressureMultiplier, this.nearPressureMultiplier);
        if (this.viscosityStrength > 0)
            calculateViscosity(pos, ppos, acc, this.spatialLookup, this.startIndices, sradius, this.viscosityStrength, this.mass);
        if (this.gravity > 0)
            applyGravity(acc, this.gravity, this.mass);

        for (let i = 0; i < 3; i++)
            calculateCollision(pos, ppos, this.radiuses, this.collisionSpatialLookup, this.collisionStartIndices,
                this.particleRadius * 2, this.mass, COLLISION_DAMPING);

        boundBoxCheck(pos, ppos, WIDTH, HEIGHT, COLLISION_DAMPING);
        applyVelocity(pos, ppos, acc, dt);
    }

    step(dt) {
        // Keep the original fixed-step feel while avoiding a large step after a slow frame.
        this.updatePositions(Math.min(DT, Math.max(0, dt || DT)));
    }
}

function applyGravity(acc, gravity, mass) {
    for (const a of acc)
        a[1] += gravity * mass;
}

function applyVelocity(pos, ppos, acc, dt) {
    for (let i = 0; i < pos.length; i++) {
        for (let k = 0; k < 2; k++) {
            let displacement = pos[i][k] - ppos[i][k];
            displacement = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, displacement));
            ppos[i][k] = pos[i][k];
            pos[i][k] += displacement + acc[i][k] * dt * dt;
            acc[i][k] = 0;
        }
    }
}

function boundBoxCheck(pos, ppos, maxX, maxY, damping) {
    for (let i = 0; i < pos.length; i++) {
        if (pos[i][1] > maxY) {
            ppos[i][1] = maxY - (ppos[i][1] - maxY);
            pos[i][1] = maxY - (pos[i][1] - maxY) * damping;
            pos[i][0] = ppos[i][0] + (pos[i][0] - ppos[i][0]) * damping;
        }
        if (pos[i][1] < 0) {
            ppos[i][1] *= -1;
            pos[i][1] *= -damping;
            pos[i][0] = ppos[i][0] + (pos[i][0] - ppos[i][0]) * damping;
        }
        if (pos[i][0] > maxX) {
            ppos[i][0] = maxX - (ppos[i][0] - maxX);
            pos[i][0] = maxX - (pos[i][0] - maxX) * damping;
            pos[i][1] = ppos[i][1] + (pos[i][1] - ppos[i][1]) * damping;
        }
        if (pos[i][0] < 0) {
            ppos[i][0] *= -1;
            pos[i][0] *= -damping;
            pos[i][1] = ppos[i][1] + (pos[i][1] - ppos[i][1]) * damping;
        }
    }
}

function calculateCollision(pos, ppos, radii, lookup, starts, searchRadius, mass, damping) {
    for (let i = 0; i < pos.length; i++) {
        const [cellX, cellY] = positionToCellCoord(pos[i], searchRadius);
        for (let x = -1; x <= 1; x++)
            for (let y = -1; y <= 1; y++) {
                const key = getKeyFromHash(hashCell([cellX + x, cellY + y]), lookup.length);
                const start = starts[key];
                for (let k = start; k < lookup.length; k++) {
                    if (lookup[k].cellKey !== key) break;
                    const j = lookup[k].index;
                    if (i === j) continue;
                    const dx = pos[i][0] - pos[j][0];
                    const dy = pos[i][1] - pos[j][1];
                    const distance = Math.hypot(dx, dy);
                    const minDistance = radii[i] + radii[j];
                    if (distance >= minDistance || distance === 0) continue;

                    const nx = dx / distance;
                    const ny = dy / distance;
                    const separation = (minDistance - distance) * 0.5;
                    pos[i][0] += separation * nx;
                    pos[i][1] += separation * ny;
                    pos[j][0] -= separation * nx;
                    pos[j][1] -= separation * ny;

                    const rvx = (pos[i][0] - ppos[i][0]) - (pos[j][0] - ppos[j][0]);
                    const rvy = (pos[i][1] - ppos[i][1]) - (pos[j][1] - ppos[j][1]);
                    const velocity = rvx * nx + rvy * ny;
                    if (velocity > 0) continue;
                    let impulse = -(1 + damping) * velocity;
                    impulse /= (1 / mass) + (1 / mass);
                    ppos[i][0] -= impulse * nx / mass;
                    ppos[i][1] -= impulse * ny / mass;
                    ppos[j][0] += impulse * nx / mass;
                    ppos[j][1] += impulse * ny / mass;
                }
            }
    }
}

function calculateDensity(pos, densities, lookup, starts, radius, mass) {
    const radiusSquared = radius * radius;
    for (let i = 0; i < pos.length; i++) {
        const [cellX, cellY] = positionToCellCoord(pos[i], radius);
        let density = 0;
        let nearDensity = 0;
        for (let x = -1; x <= 1; x++)
            for (let y = -1; y <= 1; y++) {
                const key = getKeyFromHash(hashCell([cellX + x, cellY + y]), lookup.length);
                for (let k = starts[key]; k < lookup.length; k++) {
                    if (lookup[k].cellKey !== key) break;
                    const j = lookup[k].index;
                    const distanceSquared = (pos[j][0] - pos[i][0]) ** 2 + (pos[j][1] - pos[i][1]) ** 2;
                    if (distanceSquared >= radiusSquared) continue;
                    const distance = Math.sqrt(distanceSquared);
                    density += mass * spikyKernel(distance, radius);
                    nearDensity += mass * spikyKernel3(distance, radius);
                }
            }
        densities[i] = [density, nearDensity];
    }
}

function calculatePressureForce(pos, acc, densities, lookup, starts, radius, mass, targetDensity, pressureMultiplier, nearPressureMultiplier) {
    const radiusSquared = radius * radius;
    for (let i = 0; i < pos.length; i++) {
        const [cellX, cellY] = positionToCellCoord(pos[i], radius);
        const density = densities[i][0];
        const nearDensity = densities[i][1];
        const pressure = (density - targetDensity) * pressureMultiplier;
        const nearPressure = nearDensity * nearPressureMultiplier;
        const force = [0, 0];
        for (let x = -1; x <= 1; x++)
            for (let y = -1; y <= 1; y++) {
                const key = getKeyFromHash(hashCell([cellX + x, cellY + y]), lookup.length);
                for (let k = starts[key]; k < lookup.length; k++) {
                    if (lookup[k].cellKey !== key) break;
                    const j = lookup[k].index;
                    if (i === j) continue;
                    const dx = pos[j][0] - pos[i][0];
                    const dy = pos[j][1] - pos[i][1];
                    const distanceSquared = dx * dx + dy * dy;
                    if (distanceSquared >= radiusSquared) continue;
                    const distance = Math.sqrt(distanceSquared);
                    const nx = distance > 0 ? dx / distance : 0;
                    const ny = distance > 0 ? dy / distance : 0;
                    const neighbourDensity = densities[j][0];
                    const neighbourNearDensity = densities[j][1];
                    const neighbourPressure = (neighbourDensity - targetDensity) * pressureMultiplier;
                    const neighbourNearPressure = neighbourNearDensity * nearPressureMultiplier;
                    const sharedPressure = (pressure + neighbourPressure) * 0.5;
                    const sharedNearPressure = (nearPressure + neighbourNearPressure) * 0.5;
                    if (neighbourDensity !== 0 && neighbourNearDensity !== 0) {
                        force[0] += nx * densityKernelDerivative(distance, radius) * mass * sharedPressure / neighbourDensity;
                        force[1] += ny * densityKernelDerivative(distance, radius) * mass * sharedPressure / neighbourDensity;
                        force[0] += nx * spikyKernel3Derivative(distance, radius) * mass * sharedNearPressure / neighbourNearDensity;
                        force[1] += ny * spikyKernel3Derivative(distance, radius) * mass * sharedNearPressure / neighbourNearDensity;
                    }
                }
            }
        if (density !== 0) {
            acc[i][0] += force[0] / density;
            acc[i][1] += force[1] / density;
        }
    }
}

function calculateViscosity(pos, ppos, acc, lookup, starts, radius, strength, mass) {
    const radiusSquared = radius * radius;
    for (let i = 0; i < pos.length; i++) {
        const [cellX, cellY] = positionToCellCoord(pos[i], radius);
        let forceX = 0;
        let forceY = 0;
        for (let x = -1; x <= 1; x++)
            for (let y = -1; y <= 1; y++) {
                const key = getKeyFromHash(hashCell([cellX + x, cellY + y]), lookup.length);
                for (let k = starts[key]; k < lookup.length; k++) {
                    if (lookup[k].cellKey !== key) break;
                    const j = lookup[k].index;
                    if (i === j) continue;
                    const dx = pos[j][0] - pos[i][0];
                    const dy = pos[j][1] - pos[i][1];
                    const distanceSquared = dx * dx + dy * dy;
                    if (distanceSquared >= radiusSquared) continue;
                    const distance = Math.sqrt(distanceSquared);
                    if (distance === 0) continue;
                    forceX += ((pos[j][0] - ppos[j][0]) - (pos[i][0] - ppos[i][0])) * -smoothingKernelDerivative(distance, radius);
                    forceY += ((pos[j][1] - ppos[j][1]) - (pos[i][1] - ppos[i][1])) * -smoothingKernelDerivative(distance, radius);
                }
            }
        acc[i][0] += forceX * strength / mass;
        acc[i][1] += forceY * strength / mass;
    }
}

function updateSpatialLookup(pos, lookup, starts, radius) {
    for (let i = 0; i < pos.length; i++) {
        const cell = positionToCellCoord(pos[i], radius);
        lookup[i] = new Entry(i, getKeyFromHash(hashCell(cell), lookup.length));
        starts[i] = Number.MAX_SAFE_INTEGER;
    }
    lookup.sort((a, b) => a.cellKey - b.cellKey);
    for (let i = 0; i < lookup.length; i++) {
        const key = lookup[i].cellKey;
        const previousKey = i === 0 ? Number.MAX_SAFE_INTEGER : lookup[i - 1].cellKey;
        if (key !== previousKey) starts[key] = i;
    }
}

function smoothingKernelDerivative(distance, radius) {
    return distance < radius ? (distance - radius) * 12 / (Math.PI * radius ** 4) : 0;
}
function spikyKernel(distance, radius) {
    if (distance >= radius) return 0;
    const value = radius - distance;
    return value * value * 6 / (Math.PI * radius ** 4);
}
function spikyKernel3(distance, radius) {
    if (distance >= radius) return 0;
    const value = radius - distance;
    return value * value * value * 10 / (Math.PI * radius ** 5);
}
function spikyKernelDerivative(distance, radius) {
    if (distance >= radius) return 0;
    return -(radius - distance) * 12 / (Math.PI * radius ** 4);
}
function spikyKernel3Derivative(distance, radius) {
    if (distance >= radius) return 0;
    const value = radius - distance;
    return -value * value * 30 / (Math.PI * radius ** 5);
}
function densityKernelDerivative(distance, radius) {
    return spikyKernelDerivative(distance, radius);
}
function positionToCellCoord(position, radius) {
    return [Math.floor(position[0] / radius), Math.floor(position[1] / radius)];
}
function hashCell(cell) {
    return Math.trunc(cell[0] * 15823) + Math.trunc(cell[1] * 9737333);
}
function getKeyFromHash(hash, length) {
    return ((hash % length) + length) % length;
}

/** Renders the solver's particle positions with Helion's Three.js scene. */
class ParticleCloudView extends Renderable2D {
    constructor() {
        super();
        this._geometry = new BufferGeometry();
        this._positions = new Float32Array(PARTICLE_COUNT * 3);
        this._colors = new Float32Array(PARTICLE_COUNT * 3);
        this._geometry.setAttribute('position', new Float32BufferAttribute(this._positions, 3));
        this._geometry.setAttribute('color', new Float32BufferAttribute(this._colors, 3));
        this._material = new PointsMaterial({ size: 7, vertexColors: true, sizeAttenuation: false });
        this._points = new Points(this._geometry, this._material);
        this.add(this._points);
        this._color = new Color();
    }

    canBindTo(model) {
        if (!Array.isArray(model.positions))
            throw new Error('ParticleCloudView can only bind to an SPH particle model.');
        return true;
    }

    synchronizeWith(model) {
        for (let i = 0; i < model.positions.length; i++) {
            const [x, y] = model.positions[i];
            const offset = i * 3;
            this._positions[offset] = x - WIDTH * 0.5;
            this._positions[offset + 1] = HEIGHT * 0.5 - y;
            this._positions[offset + 2] = 0.01;
            const velocity = Math.hypot(x - model.positionsPrev[i][0], y - model.positionsPrev[i][1]);
            const colorIndex = Math.max(0, Math.min(velocityColor.length - 1,
                Math.floor(velocityColor.length * velocity / (MAX_SPEED * 2))));
            this._color.set(velocityColor[colorIndex]);
            this._colors[offset] = this._color.r;
            this._colors[offset + 1] = this._color.g;
            this._colors[offset + 2] = this._color.b;
        }
        this._geometry.setDrawRange(0, model.positions.length);
        this._geometry.attributes.position.needsUpdate = true;
        this._geometry.attributes.color.needsUpdate = true;
        this._geometry.computeBoundingSphere();
    }

    dispose() {
        this._geometry.dispose();
        this._material.dispose();
    }
}

const sph = new SPHSimulation();
const particleView = new ParticleCloudView();

const simulation = Simulation.with({
    htmlDivId: 'sphParticleHydrodynamicsContainer',
    viewport: { aspectRatio: '7/4', parameterMenuCollapsed: false },
    camera: { position: new Vec3(0, 0, 11), orthographic: true, controls: false },
    lighting: { enabled: false },
    infoPanel: {
        text: '<strong>💧 Smoothed Particle Hydrodynamics</strong><br/>' +
            'A particle-based fluid model using density, pressure, viscosity and a Verlet-style integrator.<br/>' +
            'Drag the sliders to explore how the parameters affect the fluid.'
    }
})
    .runsEvery(0.01)
    .onStep((_clock, dt) => sph.step(dt))
    .bind(sph.alwaysWith(particleView))
    .appendStartStopResetUI()
    .append(new Slider('Gravity')
        .withRange(new Range(0, 1.5, 0.01))
        .withValue(sph.gravity)
        .onInput(value => sph.gravity = value))
    .append(new Slider('Smoothing radius')
        .withRange(new Range(0.25, 0.9, 0.01))
        .withValue(sph.smoothingRadius)
        .onInput(value => sph.smoothingRadius = value))
    .append(new Slider('Pressure')
        .withRange(new Range(0, 20, 0.1))
        .withValue(sph.pressureMultiplier)
        .onInput(value => sph.pressureMultiplier = value))
    .append(new Slider('Viscosity')
        .withRange(new Range(0, 0.3, 0.005))
        .withValue(sph.viscosityStrength)
        .onInput(value => sph.viscosityStrength = value))
    .append(new Button()
        .withText('Reset fluid')
        .onClick(() => sph.reset()))
    .onReset(() => sph.reset())
    .start();
