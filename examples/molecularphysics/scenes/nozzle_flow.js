import { ShaderMaterial } from 'three';
import {
    LineSegment, LineSegmentsView, PointCloud, PointCloudView,
    Segments, Simulation, ThreeJsScene, Vec3
} from '../../../src/index.js';

const PARTICLE_COUNT = 25000;
const SIMULATION_SPEED = 0.5;
const SUBSTEPS = 5;
const STEP_SIZE = 0.01;

class Nozzle extends Segments {
    constructor(ratio = 0.25) {
        super();
        this.ratio = ratio;

        for (let i = 0; i < 199; i++) {
            const x1 = -2 + i * (5 / 199);
            const x2 = -2 + (i + 1) * (5 / 199);

            this.add(new LineSegment(
                new Vec3(x1, this.radius(x1), 0),
                new Vec3(x2, this.radius(x2), 0)
            ));
            this.add(new LineSegment(
                new Vec3(x1, -this.radius(x1), 0),
                new Vec3(x2, -this.radius(x2), 0)
            ));
        }
    }

    radius(x) {
        if (x < 0)
            return this.ratio + (0.5 - this.ratio / 2) / (1 + Math.exp(5 * x + 5)) + 0.057;

        return this.ratio + (1 - this.ratio) / (1 + Math.exp(-3 * x + 4.5)) + 0.05;
    }
}

class NozzleFlow extends PointCloud {
    constructor(nozzle) {
        const positions = [];
        const sizes = [];

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            positions.push(new Vec3(
                -2 - Math.random() * 3,
                (Math.random() - 0.5) * (1 + nozzle.ratio),
                0
            ));
            sizes.push(3);
        }

        super({ positions, sizes });
        this.nozzle = nozzle;
    }

    velocity(x, y) {
        const r = this.nozzle.radius(x);
        const exp = x < 0 ? Math.exp(5 * x + 5) : Math.exp(-3 * x + 4.5);
        const denom = (1 + exp) * (1 + exp);

        const dadx = x < 0
            ? -0.5 * (1 - this.nozzle.ratio) / denom * 5 * exp * y / r
            : -1.0 * (1 - this.nozzle.ratio) / denom * -3 * exp * y / r;

        const norm = Math.sqrt(1 + dadx * dadx);
        const speed = 1 + 2 * Math.exp(-x * x);

        return {
            x: speed / norm,
            y: speed * dadx / norm
        };
    }

    evolve() {
        for (let step = 0; step < SUBSTEPS; step++) {
            for (const particle of this._positions) {
                const velocity = this.velocity(particle.x, particle.y);
                particle.x += velocity.x * STEP_SIZE * SIMULATION_SPEED;
                particle.y += velocity.y * STEP_SIZE * SIMULATION_SPEED;

                if (particle.x > 3) {
                    particle.x = -2 - Math.random() * 2;
                    particle.y = (Math.random() - 0.5) * (1 + this.nozzle.ratio);
                }
            }
        }
    }

    reset() {
        for (const particle of this._positions) {
            particle.x = -2 - Math.random() * 3;
            particle.y = (Math.random() - 0.5) * (1 + this.nozzle.ratio);
            particle.z = 0;
        }
    }
}

const nozzle = new Nozzle();
const flow = new NozzleFlow(nozzle);

const particleMaterial = new ShaderMaterial({
    vertexColors: true,
    vertexShader: `
        attribute float size;
        varying vec3 vColor;

        void main() {
            vColor = color;
            gl_PointSize = size;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vColor;

        void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            gl_FragColor = vec4(vColor, 1.0);
        }
    `
});

const particleView = new PointCloudView({
    material: particleMaterial,
    colorMapper: (particles, index, color) => {
        const { x } = particles.positionAt(index);
        const mach = Math.min(3.0, 0.3 + 2.7 * (1 - Math.exp(-x * x)));
        const temperature = 1 / (1 + 0.2 * mach * mach);
        const density = Math.pow(temperature, 2.5);

        color.setRGB(mach / 3.0, density, 1.0 - density);
    }
});

const nozzleView = new LineSegmentsView({
    lineWidth: 2,
    colorMapper: {
        map: (_value, color) => color.set(0x00ffff)
    }
});

Simulation
    .with({
        htmlDivId: 'nozzleFlowContainer',
        viewport: { aspectRatio: '5 / 2' },
        camera: {
            position: new Vec3(0, 0, 5),
            target: new Vec3(0, 0, 0),
            orthographic: true,
            controls: false
        },
        scene: { background: ThreeJsScene.Background.TRANSPARENT },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false }
    })
    .bind(nozzle.alwaysWith(nozzleView))
    .bind(flow.alwaysWith(particleView))
    .runsEvery(1 / 60)
    .onStep(() => flow.evolve())
    .start();
