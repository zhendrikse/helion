import {
    Vec3, Simulation, Sphere, Floor, Vec2, AxialSymmetricBody, Bond, Cylinder
} from "../../../src/index.js";
import {Color, MeshStandardMaterial} from "three";

const g = 9.8;

class Pendulum extends AxialSymmetricBody {
    constructor({
        T,
        position,
        theta0 = Math.PI / 6,
        mass = 1,
        pivotY = -2
    } = {}) {
        super({
            position: new Vec3(position, 0, 0),
            axis: new Vec3(),
            radius: 0.1
        });
        this._xPosition = position;
        this._length = (T * T * 9.8) / (4 * Math.PI * Math.PI);

        this._omega = 0;
        this._theta = theta0;
        this._mass = mass;
        this._pivotY = pivotY;

        const anchor = new Vec3(position, pivotY, 0);
        this._rod = Bond.between(
            this.and({
                position: anchor,
                axis: new Vec3(0, 1, 0)
            }),
            1,
            0.01
        );

        this.updatePosition();
    }

    get rod() { return this._rod; }

    update(dt) {
        const alpha = (-g / this._length) * Math.sin(this._theta);
        this._omega += alpha * dt;
        this._theta += this._omega * dt;
        this.updatePosition();
    }

    updatePosition() {
        const newPos = new Vec3(
            this._xPosition,
            this._pivotY - this._length * Math.cos(this._theta),
            this._length * Math.sin(this._theta)
        );

        const pivot = new Vec3(x, this._pivotY, 0);
        this.axis = newPos.clone().sub(pivot);
        this.state.position.copy(newPos);
        this._rod.synchronize();
    }

    reset() {
        super.reset();
        this._omega = 0;
        this._theta = Math.PI / 6;
        this.updatePosition();
    }
}

const Tpw = 50;
const N = 15;
const total = 20;

const Tmax = Tpw / N;
const Lmax = (Tmax ** 2 * 9.8) / (4 * Math.PI ** 2);
const width = Lmax;

const pendulums = [];
for (let i = 0; i < total; i++) {
    const T = Tpw / (N + i);
    const x = width * (-0.5 + i / (total - 1));
    pendulums.push(new Pendulum({
        T,
        position: x,
        pivotY: -2
    }));
}

const simulation = Simulation
    .with({
        htmlDivId: "pendulumWaveContainer",
        cameraPosition: new Vec3(-5.5, -3.15, 1.8),
        background: Simulation.Background.FOG,
        headUpDisplay: true,
        shadowsEnabled: true,
        controlsTarget: new Vec3(0.2, -3.3, -0.4),
        fieldOfView: 50
    })
    .withMouseClickEventListener()
    .runsEvery(0.001)
    .substeps(25)
    .addObject3D(new Floor({
        position: new Vec3(0, -5, 0),
        planeSizeXy: new Vec2(200, 200),
        granularity: 20,
        type: Floor.Type.PAVING
    }))
    .onStep((clock, dt) => {
        for (const p of pendulums)
         p.update(dt);
    });

pendulums.forEach((pendulum, i) =>
    simulation.bind(pendulum.ball = pendulum.alwaysWith(
        new Sphere({
            radius: 0.1,
            castShadow: true,
            color: new Color().setHSL(i / (total - 1), 1, 0.5)
        }))
    )
);

pendulums.forEach(pendulum =>
    simulation.bind(pendulum.rod.alwaysWith(
        new Cylinder({
            color: 0xeeeeee,
            material: new MeshStandardMaterial({
                roughness: 0.8,
                metalness: 0.2
            }),
            castShadow: true
        }))
    )
);
