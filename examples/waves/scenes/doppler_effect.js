import {
    Simulation, Vec3, Slider, Range, UPlotGraph, Colour
} from '../../../src/index.js';
import {
    DoubleSide, Group, Mesh, MeshBasicMaterial, SphereGeometry, CylinderGeometry, RingGeometry,
    Vector3
} from 'three';

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 6;
const SOURCE_INITIAL_X = 1;
const SOURCE_Y = 2;
const MAX_WAVEFRONTS = 100;

let sourceFrequency = 1.0;
let sourceVelocity = 0.5;
let waveSpeed = 1.0;
let simulationTime = 0;
let sourceX = SOURCE_INITIAL_X;
let nextEmissionTime = 0;
let nextWavefrontIndex = 0;
let lastArrivalTime = null;
let isDraggingObserver = false;

const waveGeometry = new RingGeometry(0.985, 1, 64);
const waveMaterial = new MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.8,
    side: DoubleSide,
    depthWrite: false
});

/**
 * A simple stick figure whose head position follows the observer position.
 */
class Person extends Group {
    constructor(positionX) {
        super();

        this.positionX = positionX;
        this._head = new Mesh(
            new SphereGeometry(0.28, 20, 16),
            new MeshBasicMaterial({ color: 0xffff00 })
        );
        this.add(this._head);

        const bodyMaterial = new MeshBasicMaterial({ color: 0x00cc44 });
        this._body = this._limb(0.12, bodyMaterial);
        this._armA = this._limb(0.08, bodyMaterial);
        this._armB = this._limb(0.08, bodyMaterial);
        this._legA = this._limb(0.08, bodyMaterial);
        this._legB = this._limb(0.08, bodyMaterial);
        this.add(this._body, this._armA, this._armB, this._legA, this._legB);
        this.update(positionX);
    }

    _limb(radius, material) {
        return new Mesh(new CylinderGeometry(radius, radius, 1, 10), material);
    }

    _setLimb(mesh, from, to) {
        const direction = new Vector3().subVectors(to, from);
        mesh.position.copy(from).add(to).multiplyScalar(0.5);
        mesh.scale.y = direction.length();
        mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
    }

    update(positionX) {
        this.positionX = positionX;
        const head = new Vector3(positionX + 0.4, 0, 0.04);
        const shoulders = new Vector3(head.x, head.y - 0.1, 0.04);
        const waist = new Vector3(head.x, head.y - 1.2, 0.04);

        this._head.position.copy(head);
        this._setLimb(this._body, head, waist);
        this._setLimb(this._armA, shoulders, new Vector3(head.x - 0.6, -0.65, 0.04));
        this._setLimb(this._armB, shoulders, new Vector3(head.x + 0.6, -0.65, 0.04));
        this._setLimb(this._legA, waist, new Vector3(head.x - 0.4, -1.85, 0.04));
        this._setLimb(this._legB, waist, new Vector3(head.x + 0.4, -1.85, 0.04));
    }

    get headPosition() {
        return this._head.position;
    }
}

const observer = new Person(-2.5);
const source = new Mesh(
    new SphereGeometry(0.12, 16, 12),
    new MeshBasicMaterial({ color: 0xffaa00 })
);
source.position.set(SOURCE_INITIAL_X, SOURCE_Y, 0.04);

const wavefronts = Array.from({ length: MAX_WAVEFRONTS }, () => {
    const mesh = new Mesh(waveGeometry, waveMaterial);
    mesh.visible = false;
    return {
        mesh,
        emissionTime: Infinity,
        sourceX: SOURCE_INITIAL_X,
        emittedFrequency: sourceFrequency,
        emittedVelocity: sourceVelocity,
        previousGap: -Infinity,
        crossed: false
    };
});

const wavefrontGroup = new Group();
wavefronts.forEach(wavefront => wavefrontGroup.add(wavefront.mesh));

const graph = new UPlotGraph({
    dataDefinition: [
        { label: 'Time' },
        { label: 'Observed frequency', color: new Colour(0xffff00) },
        { label: 'Predicted frequency', color: new Colour(0x00ffff) }
    ],
    title: 'Observed vs. predicted frequency',
    xLabel: 'Time (s)',
    yLabel: 'Frequency (Hz)',
    height: 190,
    maxPoints: 600
});

let simulation;

function observerHeadX() {
    return observer.headPosition.x;
}

function updateObserver(worldX) {
    // The pointer controls the observer's horizontal position only.
    observer.update(worldX - 0.4);

    // Moving the observer must not itself count as a wavefront arrival.
    for (const wavefront of wavefronts) {
        if (!Number.isFinite(wavefront.emissionTime))
            continue;

        const radius = waveSpeed * (simulationTime - wavefront.emissionTime);
        const distance = Math.hypot(observerHeadX() - wavefront.sourceX, SOURCE_Y);
        wavefront.previousGap = radius - distance;
    }
}

function recordArrival(wavefront, time) {
    if (lastArrivalTime !== null) {
        const interval = time - lastArrivalTime;
        if (interval > 0) {
            const measuredFrequency = 1 / interval;
            const distanceX = observerHeadX() - wavefront.sourceX;
            const distance = Math.hypot(distanceX, SOURCE_Y);
            const radialDirectionX = distanceX / distance;
            const radialSourceVelocity = wavefront.emittedVelocity * radialDirectionX;
            const denominator = waveSpeed - radialSourceVelocity;
            const predictedFrequency = denominator > 0
                ? wavefront.emittedFrequency * waveSpeed / denominator
                : 0;

            graph.push([time, measuredFrequency, predictedFrequency]);
            simulation.setBottomText(
                `Observed frequency: ${measuredFrequency.toFixed(2)} Hz  |  Predicted: ${predictedFrequency.toFixed(2)} Hz`
            );
        }
    }

    lastArrivalTime = time;
}

function emitWavefronts() {
    while (nextEmissionTime <= simulationTime) {
        const wavefront = wavefronts[nextWavefrontIndex % MAX_WAVEFRONTS];
        wavefront.emissionTime = nextEmissionTime;
        wavefront.sourceX = sourceX - sourceVelocity * (simulationTime - nextEmissionTime);
        wavefront.emittedFrequency = sourceFrequency;
        wavefront.emittedVelocity = sourceVelocity;
        wavefront.previousGap = -Infinity;
        wavefront.crossed = false;
        wavefront.mesh.visible = true;

        nextWavefrontIndex++;
        nextEmissionTime += 1 / sourceFrequency;
    }
}

function updateWavefronts() {
    emitWavefronts();

    for (const wavefront of wavefronts) {
        if (!Number.isFinite(wavefront.emissionTime))
            continue;

        const age = simulationTime - wavefront.emissionTime;
        if (age < 0)
            continue;

        const radius = waveSpeed * age;
        wavefront.mesh.position.set(wavefront.sourceX, SOURCE_Y, 0.01);
        wavefront.mesh.scale.setScalar(Math.max(radius, 0.001));
        wavefront.mesh.visible = radius <= WORLD_WIDTH * 1.5;

        const distance = Math.hypot(observerHeadX() - wavefront.sourceX, SOURCE_Y);
        const gap = radius - distance;
        if (!wavefront.crossed && wavefront.previousGap < 0 && gap >= 0) {
            wavefront.crossed = true;
            recordArrival(wavefront, simulationTime);
        }
        wavefront.previousGap = gap;
    }
}

function simulate(dt) {
    simulationTime += dt;
    sourceX += sourceVelocity * dt;
    source.position.set(sourceX, SOURCE_Y, 0.04);
    updateWavefronts();
}

function resetSimulation() {
    simulationTime = 0;
    sourceX = SOURCE_INITIAL_X;
    isDraggingObserver = false;
    nextEmissionTime = 0;
    nextWavefrontIndex = 0;
    lastArrivalTime = null;

    for (const wavefront of wavefronts) {
        wavefront.emissionTime = Infinity;
        wavefront.previousGap = -Infinity;
        wavefront.crossed = false;
        wavefront.mesh.visible = false;
    }

    source.position.set(sourceX, SOURCE_Y, 0.04);
    graph.reset();
    simulation?.setBottomText('Drag the observer to change its position.');
}

simulation = Simulation
    .with({
        htmlDivId: 'dopplerEffectContainer',
        viewport: { aspectRatio: '2 / 1', parameterMenuCollapsed: false },
        camera: {
            position: new Vec3(0, 0, WORLD_HEIGHT),
            target: new Vec3(0, 0, 0),
            orthographic: true,
            controls: false
        },
        headUpDisplay: { enabled: false },
        lighting: { enabled: false },
        infoPanel: {
            text:
                '<strong>🔊 Doppler effect</strong><br/>' +
                'Drag the person horizontally to move the observer.<br/>' +
                'The expanding circles represent successive wavefronts.<br/><br/>' +
                '$$f_{obs}=f_{src}\\,\\frac{c}{c-v_s\\cos(\\theta)}$$'
        }
    })
    .runsEvery(0.01)
    .advancesBy(0.01)
    .onStep((_, dt) => simulate(dt))
    .addObject3D(wavefrontGroup)
    .addObject3D(source)
    .addObject3D(observer)
    .onPointer('pointerdown', (x) => {
        isDraggingObserver = true;
        updateObserver(x * WORLD_WIDTH);
    })
    .onPointer('pointermove', (x) => {
        if (isDraggingObserver)
            updateObserver(x * WORLD_WIDTH);
    })
    .onPointer('pointerup', () => isDraggingObserver = false)
    .onPointer('pointercancel', () => isDraggingObserver = false)
    .onReset(() => resetSimulation())
    .addGraph(graph)
    .append(new Slider('Source frequency')
        .withRange(new Range(0.1, 2, 0.05))
        .withValue(sourceFrequency)
        .onInput(value => sourceFrequency = value))
    .append(new Slider('Source velocity')
        .withRange(new Range(0, 1, 0.01))
        .withValue(sourceVelocity)
        .onInput(value => sourceVelocity = value))
    .append(new Slider('Wave speed')
        .withRange(new Range(0.1, 2, 0.05))
        .withValue(waveSpeed)
        .onInput(value => waveSpeed = value))
    .appendStartStopResetUI()
    .start();

simulation.setBottomText('Drag the observer to change its position.');
